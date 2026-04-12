'use client';

import { useState } from 'react';

interface TelegramSettingsProps {
  user: {
    telegram_chat_id: string | null;
    telegram_username: string | null;
    plan: string;
  };
}

export default function TelegramSettings({ user }: TelegramSettingsProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isConnected = !!user.telegram_chat_id;

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const linkRes = await fetch('/api/telegram/link', { method: 'POST' });
      const linkData = await linkRes.json();
      if (!linkRes.ok || !linkData.link) {
        setMessage({ type: 'error', text: linkData.error || 'Failed to get Telegram link' });
        return;
      }
      setMessage({
        type: 'success',
        text: `📎 Click this link to connect: ${linkData.link}\n\nThen return here and we'll verify the connection automatically.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Telegram? You won\'t receive alerts until you reconnect.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/telegram/disconnect', { method: 'POST' });
      setMessage({ type: 'success', text: 'Telegram disconnected.' });
      window.location.reload();
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTest = async () => {
    setMessage(null);
    try {
      const r = await fetch('/api/telegram/test', { method: 'POST' });
      const d = await r.json();
      setMessage({
        type: d.success ? 'success' : 'error',
        text: d.success
          ? '✅ Test message sent! Check Telegram.'
          : (d.error || 'Failed'),
      });
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const msgClass = message
    ? `telegram-message telegram-message-${message.type}`
    : undefined;

  return (
    <section className="section">
      <h2>📱 Telegram Alerts</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
        Connect your Telegram to receive instant alerts when error fares are detected on your routes.
      </p>

      {isConnected ? (
        <div className="telegram-card telegram-card-connected">
          <div className="telegram-status-row">
            <div>
              <div className="telegram-status-label">✓ Telegram connected</div>
              <div className="telegram-status-sub">Alerts will be sent to your Telegram chat</div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className={`btn btn-danger-ghost${disconnecting ? ' btn-loading' : ''}`}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="telegram-card">
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <div style={{ color: 'var(--cabin-y)', fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>
              How to enable alerts:
            </div>
            <ol className="telegram-steps">
              <li>Open Telegram and search for <strong>@FareAlertProBot</strong></li>
              <li>Click <strong>Start</strong> to authorize alerts</li>
              <li>You&apos;ll receive a confirmation code — enter it on the next screen</li>
            </ol>
          </div>

          {message && (
            <div className={msgClass}>
              {message.text}
            </div>
          )}

          <div className="telegram-btn-row">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className={`telegram-btn${connecting ? ' btn-loading' : ''}`}
            >
              {connecting ? 'Getting link…' : '🔗 Get Telegram Link'}
            </button>
            <button
              onClick={handleTest}
              className="telegram-btn telegram-btn-ghost"
            >
              🧪 Test Alert
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
