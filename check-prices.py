#!/usr/bin/env python3
"""
FareAlertPro Price Checker
Pulls flight prices from fli CLI and pushes to Convex.
Run continuously: python3 check-prices.py
Run once:     python3 check-prices.py --once
"""

import subprocess, json, sys, time, re
from datetime import datetime, timedelta
import jwt

CONVEX_URL = "https://fiery-opossum-933.convex.cloud"
SECRET_HEX = "53d93a79c878a21a8676ee5c590f64cb88df2aa6834bcfc0f16548657a25b115"

ROUTES = [
    ("JFK","LAX"),("LAX","JFK"),("ORD","LGA"),("LGA","ORD"),
    ("ATL","LAX"),("LAX","ATL"),("DFW","LAX"),("LAX","DFW"),
    ("SFO","LAX"),("LAX","SFO"),("MIA","LAX"),("LAX","MIA"),
    ("SEA","LAX"),("LAX","SEA"),("BOS","LAX"),("LAX","BOS"),
    ("JFK","LHR"),("LHR","JFK"),("JFK","CDG"),("CDG","JFK"),
    ("JFK","FRA"),("FRA","JFK"),("IST","JFK"),("JFK","IST"),
    ("SIN","LAX"),("LAX","SIN"),("HND","LAX"),("LAX","HND"),
]

CABIN_MAP = {
    "economy": "ECONOMY",
    "premium_economy": "PREMIUM_ECONOMY",
    "business": "BUSINESS",
    "first": "FIRST"
}

def get_token():
    secret = bytes.fromhex(SECRET_HEX)
    payload = {
        "userId": 1, "email": "admin@farealertpro.com", "plan": "admin",
        "iat": int(time.time()), "exp": int(time.time()) + 86400 * 7
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def convexRpc(method, args, token):
    import urllib.request
    payload = json.dumps({"jsonrpc":"2.0","method":method,"params":args,"id":1}).encode()
    req = urllib.request.Request(
        f"{CONVEX_URL}/api/jsonrpc", data=payload,
        headers={"Content-Type":"application/json","Authorization":f"Bearer {token}"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.load(resp)
        if "error" in result:
            return None
        return result.get("result")

def parse_fli_output(output):
    """Parse fli flights output to extract price per option"""
    prices = []
    # Split into individual flight options
    blocks = re.split(r'Option \d+ of \d+', output)
    for block in blocks[1:]:
        # Extract total price
        pm = re.search(r'Total Price\s+\$([0-9,]+(?:\.[0-9]{2})?)', block)
        if not pm:
            continue
        price = float(pm.group(1).replace(',',''))
        
        # Extract first airline
        am = re.search(r'Flight\s+\|\s+([A-Z0-9]+)\s+\|', block)
        airline = am.group(1) if am else ""
        
        # Duration
        dm = re.search(r'Total Duration\s+([0-9]+)h\s+([0-9]+)m', block)
        duration = int(dm.group(1))*60 + int(dm.group(2)) if dm else 0
        
        # Stops
        sm = re.search(r'Total Stops\s+([0-9]+)', block)
        stops = int(sm.group(1)) if sm else 0
        
        prices.append({"price": price, "airline": airline, "duration": duration, "stops": stops})
    return prices

def fetch_prices(origin, dest, date):
    try:
        r = subprocess.run(
            ["fli", "flights", origin, dest, date],
            capture_output=True, text=True, timeout=20
        )
        if r.returncode != 0:
            return []
        return parse_fli_output(r.stdout)
    except:
        return []

def run_cycle(token, days=7):
    today = datetime.now()
    checked = inserted = 0
    
    for origin, dest in ROUTES:
        route = f"{origin}-{dest}"
        for offset in range(days):
            date = (today + timedelta(days=offset)).strftime("%Y-%m-%d")
            results = fetch_prices(origin, dest, date)
            
            for p in results:
                r = convexRpc("prices:insertPriceRecord", {
                    "route": route, "cabin": "ECONOMY", "search_date": date,
                    "price": p["price"], "currency": "USD", "airline": p["airline"],
                    "duration_minutes": p["duration"], "stops": p["stops"],
                    "departure_airport": origin
                }, token)
                if r:
                    inserted += 1
                checked += 1
            
            if checked % 20 == 0:
                print(f"  {checked} checks, {inserted} prices inserted")
    
    return checked, inserted

def main():
    args = sys.argv[1:]
    once = "--once" in args
    days = 7
    if "--days" in args:
        days = int(args[args.index("--days")+1])
    
    print(f"🚀 FareAlertPro Price Checker | {len(ROUTES)} routes, {days} days ahead")
    token = get_token()
    print("   Token ready")
    
    if once:
        checked, inserted = run_cycle(token, days)
        print(f"✅ Done: {checked} checks, {inserted} prices in Convex")
        return
    
    cycle = 0
    while True:
        cycle += 1
        print(f"\n🔄 Cycle {cycle} @ {datetime.now().strftime('%H:%M')}")
        checked, inserted = run_cycle(token, days)
        print(f"   {checked} checks, {inserted} prices inserted")
        print("   Sleeping 5 min...")
        time.sleep(300)

if __name__ == "__main__":
    main()