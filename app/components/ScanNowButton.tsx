'use client';

import { useState } from 'react';

export default function ScanNowButton() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/check-prices');
      const data = await res.json();
      const r = data.results || {};
      setResult(
        `✓ Checked ${r.checked || 0} pairs · ${r.alerts || 0} alerts · ${r.errors || 0} errors`
      );
    } catch (e: any) {
      setResult(`✗ Error: ${e.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="scan-now-wrap">
      <button
        onClick={handleScan}
        disabled={scanning}
        className={`telegram-btn${scanning ? ' btn-loading' : ''}`}
        style={{ background: scanning ? '#3a3d4a' : undefined }}
      >
        {scanning ? '⏳ Scanning…' : '🔄 Scan Now'}
      </button>
      {result && (
        <span className={`scan-result ${result.startsWith('✓') ? 'scan-result-ok' : 'scan-result-err'}`}>
          {result}
        </span>
      )}
    </div>
  );
}
