'use client';

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { getStatus } from '../../convex/status';

interface StatusData {
  totalPrices: number;
  totalAlerts: number;
  alertsToday: number;
  routesTracked: number;
  lastCheck: string | null;
  coverage: Record<string, number>;
}

function formatAge(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

const CRON_INTERVAL = 60;

export default function StatusBar() {
  const status = useQuery(getStatus, {});

  if (!status) return null;

  const avgCoverage = Object.values(status.coverage || {}).length
    ? Object.values(status.coverage).reduce((s, v) => s + v, 0) / Object.keys(status.coverage).length
    : 0;

  const dotClass = status.alertsToday > 0 ? 'status-dot-red' : 'status-dot-green';

  return (
    <div className="status-bar">
      <span className="status-item">
        <span>✈️</span>
        <strong style={{ color: 'var(--accent)' }}>{status.routesTracked}</strong>
        routes
      </span>
      <span className="status-item">
        <span>💰</span>
        <strong style={{ color: 'var(--text)' }}>{status.totalPrices.toLocaleString()}</strong>
        prices
      </span>
      <span className="status-item">
        <span>📅</span>
        <strong style={{ color: 'var(--cabin-y)' }}>{avgCoverage.toFixed(0)}</strong>
        avg/route
      </span>
      <span className="status-item">
        <span className={`status-dot ${dotClass}`} />
        <strong style={{ color: status.alertsToday > 0 ? 'var(--danger)' : 'var(--success)' }}>
          {status.alertsToday}
        </strong>
        today
      </span>
      <span className="status-item">
        <span>⏱</span>
        <strong style={{ color: 'var(--cabin-y)' }}>{formatAge(status.lastCheck)}</strong>
        ago
      </span>
      <span className="status-item">
        <span>→</span>
        <strong style={{ color: 'var(--text-muted)' }}>~{status.cronIntervalSeconds || 60}s</strong>
      </span>
    </div>
  );
}
