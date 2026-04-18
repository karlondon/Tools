'use client';
import { useEffect, useState } from 'react';

interface MaintenanceState {
  active: boolean;
  message: string;
  type: 'info' | 'warning' | 'error';
  endsAt: string | null;
}

const COLOURS = {
  info:    { bg: '#1a1200', border: '#c9a84c', text: '#e8cc7a', icon: '🔧' },
  warning: { bg: '#1a0e00', border: '#f59e0b', text: '#fcd34d', icon: '⚠' },
  error:   { bg: '#1a0000', border: '#e57373', text: '#fca5a5', icon: '⚠' },
};

export default function MaintenanceBanner() {
  const [state, setState] = useState<MaintenanceState | null>(null);

  const fetchStatus = async () => {
    try {
      const r = await fetch('/api/maintenance/status');
      if (r.ok) setState(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!state?.active) return null;

  const c = COLOURS[state.type] || COLOURS.warning;

  const endsAtFormatted = state.endsAt
    ? new Date(state.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{
      background: c.bg,
      borderBottom: `1px solid ${c.border}`,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '16px' }}>{c.icon}</span>
      <span style={{ color: c.text, fontSize: '13px', letterSpacing: '0.02em', textAlign: 'center' }}>
        <strong style={{ marginRight: '6px' }}>Scheduled Maintenance:</strong>
        {state.message}
        {endsAtFormatted && (
          <span style={{ color: '#888', marginLeft: '8px' }}>· Expected completion: {endsAtFormatted}</span>
        )}
      </span>
    </div>
  );
}
