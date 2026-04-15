// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';

interface StatusData {
  totalPrices: number;
  totalAlerts: number;
  alertsToday: number;
  routesTracked: number;
  lastCheck: string | null;
  coverage: Record<string, number>;
  cronIntervalSeconds?: number;
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

export default function StatusBar() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !status) return null;

  const coverage = status.coverage || {};
  const avgCoverage = Object.keys(coverage).length
    ? Object.values(coverage as Record<string, number>).reduce((s: number, v: number) => s + v, 0) / Object.keys(coverage as Record<string, number>).length
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
