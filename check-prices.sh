#!/bin/bash
# Cron wrapper: ensures only one check-prices process runs at a time
LOCK="/tmp/fare-alert-check.lock"

if [ -f "$LOCK" ]; then
  LOCKPID=$(cat "$LOCK")
  if kill -0 "$LOCKPID" 2>/dev/null; then
    echo "$(date): already running (PID $LOCKPID), skipping"
    exit 0
  fi
  echo "$(date): stale lock, removing"
  rm -f "$LOCK"
fi

echo $$ > "$LOCK"
trap "rm -f '$LOCK'" EXIT

curl -s -o /dev/null -w "check-prices: %{http_code} in %{time_total}s\n" http://localhost:3000/api/check-prices
