# FareAlertPro Worker

This machine runs the FareAlertPro Python ingestion worker with systemd.

## Files
- `fare_worker.py` — long-running route scanner and Convex ingester
- `fare-worker.service` — systemd unit file

## Install
The worker uses a dedicated local virtualenv on this machine.

```bash
sudo apt update
sudo apt install -y python3.12-venv

cd /home/rixvix/.openclaw/workspace/fare-alert-pro
python3 -m venv .venv-worker
./.venv-worker/bin/pip install convex

sudo cp /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare-worker.service /etc/systemd/system/fare-worker.service
sudo sed -i 's|ExecStart=/usr/bin/python3 /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare_worker.py|ExecStart=/home/rixvix/.openclaw/workspace/fare-alert-pro/.venv-worker/bin/python /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare_worker.py|' /etc/systemd/system/fare-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now fare-worker.service
```

## Logs
```bash
journalctl -u fare-worker.service -f
cat /home/rixvix/.openclaw/workspace/fare-alert-pro/logs/fare-worker.log
```

## Restart
```bash
sudo systemctl restart fare-worker.service
```

## Status
```bash
sudo systemctl status fare-worker.service --no-pager
```

## Notes
- The worker now targets a 5 minute base cycle instead of 15 minutes.
- It scans one route per cycle across all cabin classes, targeting missing future dates first.
- Popular routes get an extra immediate pass before the worker advances, so the busiest routes refresh more often than the long-haul set.
- If scrape failures spike for consecutive cycles, the worker automatically backs off its sleep interval up to 20 minutes.
- It stores logs in `logs/fare-worker.log` and simple progress state in `state/fare-worker-state.json`.
- If Convex backend code changes, run `npx convex deploy` so the worker and app stay in sync.
