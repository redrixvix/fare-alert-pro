#!/usr/bin/env python3
"""
FareAlertPro Python Worker — Postgres edition
Writes flight price data to Neon Postgres instead of Convex.
"""
import json
import os
import re
import subprocess
import time
from datetime import datetime, timedelta, UTC
from pathlib import Path

import psycopg

ROOT = Path('/home/rixvix/.openclaw/workspace/fare-alert-pro')
STATE_DIR = ROOT / 'state'
LOG_DIR = ROOT / 'logs'
STATE_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

STATE_FILE = STATE_DIR / 'fare-worker-state.json'
LOG_FILE = LOG_DIR / 'fare-worker.log'

# ── Neon connection ───────────────────────────────────────────────
def get_conn():
    return psycopg.connect(
        host='ep-curly-cherry-anf8e3xu.c-6.us-east-1.aws.neon.tech',
        dbname='neondb',
        user='neondb_owner',
        password='npg_1pEZt0ewmQiJ',
        sslmode='require',
        connect_timeout=15,
    )


# ── Routes & config ──────────────────────────────────────────
ROUTES = [
    ('JFK','LAX'),('LAX','JFK'),('ORD','LGA'),('LGA','ORD'),
    ('ATL','LAX'),('LAX','ATL'),('DFW','LAX'),('LAX','DFW'),
    ('SFO','LAX'),('LAX','SFO'),
]
CABINS = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']
CABIN_CAPS = {
    'ECONOMY': 3000, 'PREMIUM_ECONOMY': 7000,
    'BUSINESS': 12000, 'FIRST': 20000,
}
MAX_DURATION_MIN = 24 * 60
MAX_OPTS_PER_DATE = 12
DAY_WINDOW = 60
BASE_SLEEP_SECONDS = 15 * 60
MAX_SLEEP_SECONDS = 20 * 60
TARGET_DATES_MISSING = 8
TARGET_DATES_COVERED = 4
FAILURE_BACKOFF_THRESHOLD = 3
POPULAR_ROUTES = set()
POPULAR_ROUTE_BONUS_PASSES = 0


# ── Logging ───────────────────────────────────────────────────
def log(msg: str):
    line = f"[{datetime.now(UTC).isoformat()}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


# ── Airline normalization ───────────────────────────────────────
def normalize_carrier(code):
    if not code:
        return None
    cleaned = str(code).strip().upper()
    return cleaned if re.match(r'^[A-Z0-9]{2,3}$', cleaned) else None


# ── FLI scraping ───────────────────────────────────────────────
def parse_fli_output(output: str):
    prices = []
    blocks = re.split(r'Option \d+ of \d+', output)
    for block in blocks[1:]:
        pm = re.search(r'Total Price\s+\$([0-9,]+(?:\.[0-9]{2})?)', block)
        if not pm:
            continue
        price = float(pm.group(1).replace(',', ''))
        dm = re.search(r'Total Duration\s+(\d+)h\s+(\d+)m', block)
        duration = int(dm.group(1)) * 60 + int(dm.group(2)) if dm else None
        sm = re.search(r'Total Stops\s+(\d+)', block)
        stops = int(sm.group(1)) if sm else None
        carrier_matches = re.findall(r'│\s*([A-Z0-9]{2,3})\s+\d+', block)
        airline = normalize_carrier(carrier_matches[0] if carrier_matches else None)
        prices.append({'price': price, 'airline': airline, 'duration': duration, 'stops': stops})
    return prices


def sanitize_prices(raw_prices, cabin):
    cap = CABIN_CAPS.get(cabin, 3000)
    valid = []
    for p in raw_prices:
        if not isinstance(p.get('price'), (int, float)) or p['price'] <= 0 or p['price'] > cap:
            continue
        duration = p.get('duration')
        stops = p.get('stops')
        if duration is not None and (duration <= 0 or duration > MAX_DURATION_MIN):
            continue
        if stops is not None and (stops < 0 or stops > 4):
            continue
        valid.append(p)
    if not valid:
        return []
    valid.sort(key=lambda x: (x['price'], x.get('duration') or 99999,
                               x.get('stops') if x.get('stops') is not None else 99))
    floor = valid[0]['price']
    relative_cap = {
        'ECONOMY': max(floor * 3, 800),
        'PREMIUM_ECONOMY': max(floor * 3.5, 2500),
        'BUSINESS': max(floor * 4, 5000),
        'FIRST': max(floor * 4, 12000),
    }.get(cabin, cap)
    capped = [p for p in valid if p['price'] <= relative_cap]
    deduped, seen = [], set()
    for p in capped:
        key = (p['price'], p.get('airline') or 'UNK',
               p.get('duration') or 'NA',
               p.get('stops') if p.get('stops') is not None else 'NA')
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)
        if len(deduped) >= MAX_OPTS_PER_DATE:
            break
    return deduped


def get_prices(origin: str, dest: str, date_str: str, cabin: str):
    try:
        out = subprocess.check_output(
            ['fli', 'flights', origin, dest, date_str, '--class', cabin],
            text=True, timeout=35,
        )
        return sanitize_prices(parse_fli_output(out), cabin), None
    except Exception as e:
        log(f'scrape failed {origin}-{dest} {date_str} {cabin}: {e}')
        return [], str(e)


# ── State ─────────────────────────────────────────────────────
def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        'routeIndex': 0,
        'consecutiveFailureCycles': 0,
        'routePassesRemaining': 0,
        'currentRoute': None,
    }


def save_state(state):
    STATE_FILE.write_text(json.dumps(state))


def compute_sleep_seconds(state):
    failures = int(state.get('consecutiveFailureCycles', 0) or 0)
    if failures < FAILURE_BACKOFF_THRESHOLD:
        return BASE_SLEEP_SECONDS
    extra = failures - FAILURE_BACKOFF_THRESHOLD + 1
    return min(MAX_SLEEP_SECONDS, BASE_SLEEP_SECONDS + extra * 60)


def pick_route(state):
    current = state.get('currentRoute')
    passes = int(state.get('routePassesRemaining', 0) or 0)
    if current and passes > 0:
        origin, dest = current.split('-')
        state['routePassesRemaining'] = passes - 1
        return origin, dest, current
    idx = state.get('routeIndex', 0) % len(ROUTES)
    origin, dest = ROUTES[idx]
    route = f'{origin}-{dest}'
    state['routeIndex'] = (idx + 1) % len(ROUTES)
    state['currentRoute'] = route
    state['routePassesRemaining'] = POPULAR_ROUTE_BONUS_PASSES if route in POPULAR_ROUTES else 0
    return origin, dest, route


# ── DB helpers ────────────────────────────────────────────────
def get_covered_dates(conn, route, cabin):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT search_date FROM prices
            WHERE route = %s AND cabin = %s AND price > 0
        """, (route, cabin))
        return {r[0] for r in cur.fetchall()}


def upsert_price(conn, route, cabin, date_str, p, origin):
    airline = p.get('airline')
    duration = p.get('duration')
    stops = p.get('stops') or 0
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id FROM prices
            WHERE route = %s AND cabin = %s AND search_date = %s
              AND price = %s AND (airline IS NOT DISTINCT FROM %s)
            LIMIT 1
        """, (route, cabin, date_str, p['price'], airline))
        if cur.fetchone():
            return False
        cur.execute("""
            INSERT INTO prices
              (route, cabin, search_date, price, currency, airline,
               duration_minutes, stops, fetched_at, departure_airport)
            VALUES (%s,%s,%s,%s,'USD',%s,%s,%s,NOW(),%s)
        """, (
            route, cabin, date_str, p['price'],
            airline,
            duration,
            stops,
            origin,
        ))
    conn.commit()
    return True


# ── Main cycle ─────────────────────────────────────────────────
def run_cycle():
    state = load_state()
    origin, dest, route = pick_route(state)
    inserted = 0
    checked = 0
    scrape_failures = 0
    today = datetime.now()
    conn = get_conn()

    log(f'cycle starting route={route}')

    try:
        for cabin in CABINS:
            covered = get_covered_dates(conn, route, cabin)

            missing = []
            for offset in range(DAY_WINDOW):
                d = (today + timedelta(days=offset)).strftime('%Y-%m-%d')
                if d not in covered:
                    missing.append(d)

            targets = missing[:TARGET_DATES_MISSING] if missing else [
                (today + timedelta(days=offset)).strftime('%Y-%m-%d')
                for offset in range(min(TARGET_DATES_COVERED, DAY_WINDOW))
            ]

            for date_str in targets:
                prices, err = get_prices(origin, dest, date_str, cabin)
                if err:
                    scrape_failures += 1
                for p in prices:
                    if upsert_price(conn, route, cabin, date_str, p, origin):
                        inserted += 1
                checked += 1
    finally:
        conn.close()

    state['lastCompletedRoute'] = route
    state['lastRunAt'] = datetime.now(UTC).isoformat()
    state['lastInserted'] = inserted
    state['lastChecked'] = checked
    state['lastScrapeFailures'] = scrape_failures
    state['consecutiveFailureCycles'] = (
        state.get('consecutiveFailureCycles', 0) + 1 if scrape_failures else 0
    )
    save_state(state)
    log(f'cycle done route={route} checked={checked} inserted={inserted} scrape_failures={scrape_failures}')
    return state


# ── Entry point ────────────────────────────────────────────────
def main():
    log('fare worker boot (postgres edition)')
    while True:
        try:
            state = run_cycle()
        except Exception as e:
            log(f'cycle fatal: {e}')
            state = load_state()
            state['consecutiveFailureCycles'] = state.get('consecutiveFailureCycles', 0) + 1
            save_state(state)
        sleep_seconds = compute_sleep_seconds(state)
        log(f'sleeping seconds={sleep_seconds} consecutive_failure_cycles={state.get("consecutiveFailureCycles", 0)}')
        time.sleep(sleep_seconds)


if __name__ == '__main__':
    main()
