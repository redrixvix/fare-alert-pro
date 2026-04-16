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
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function StatCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="status-stat">
      <span className="stat-value" style={{ color: color || 'var(--text)' }}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
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

  const hasAlerts = status.alertsToday > 0;
  const dotClass = hasAlerts ? 'status-dot-red' : 'status-dot-green';

  return (
    <div className="status-bar">
      <StatCard value={status.routesTracked.toString()} label="Routes" color="var(--green)" />
      <StatCard value={status.totalPrices.toLocaleString()} label="Prices" />
      <StatCard value={avgCoverage.toFixed(0)} label="Avg/Rt" color="var(--gold)" />
      <StatCard value={status.totalAlerts.toString()} label="Alerts" color="var(--accent)" />
      <StatCard
        value={status.alertsToday.toString()}
        label="Today"
        color={hasAlerts ? 'var(--danger)' : 'var(--success)'}
      />
      <StatCard value={formatAge(status.lastCheck)} label="Updated" />
    </div>
  );
}