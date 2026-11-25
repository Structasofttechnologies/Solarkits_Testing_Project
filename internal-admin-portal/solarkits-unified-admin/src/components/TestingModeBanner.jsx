import { useState, useMemo } from 'react';

export default function TestingModeBanner() {
  const [isMinimized, setIsMinimized] = useState(false);

  // Determine if current environment is testing / staging / development
  const isTestEnvironment = useMemo(() => {
    // 1. Explicit environment variable check
    const appEnv = import.meta.env.VITE_APP_ENV;
    if (appEnv === 'production') return false;
    if (appEnv === 'staging' || appEnv === 'development' || appEnv === 'test') return true;

    // 2. Vite mode check
    if (import.meta.env.MODE === 'staging' || import.meta.env.MODE === 'development') return true;

    // 3. Hostname check (Render, staging domain, or localhost)
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host.includes('solarkits.in') && !host.includes('test') && !host.includes('staging')) {
        return false; // Live production domain
      }
      return (
        host.includes('onrender.com') ||
        host.includes('staging') ||
        host.includes('test') ||
        host === 'localhost' ||
        host === '127.0.0.1'
      );
    }
    return false;
  }, []);

  if (!isTestEnvironment) {
    return null; // Do not render anything in live production
  }

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_ADMIN_API_URL ||
    'https://backend-evwd.onrender.com';

  const cleanBackendHost = backendUrl.replace(/^https?:\/\//, '').split('/')[0];

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        role="button"
        tabIndex={0}
        title="Click to view Testing Environment details"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#d97706',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#fef08a',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite',
          }}
        />
        TESTING DASHBOARD [STAGING]
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
        borderBottom: '2px solid #f59e0b',
        color: '#78350f',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 4px rgba(245, 158, 11, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#b45309',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#fef08a',
              display: 'inline-block',
            }}
          />
          Testing Dashboard
        </span>
        <span>
          <strong>Staging Isolation Active:</strong> All orders, changes & tests write to{' '}
          <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
            solarkits_staging_db
          </code>
          . Live dashboard on solarkits.in is protected.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#92400e',
          }}
        >
          Target API: <strong>{cleanBackendHost}</strong>
        </span>

        <button
          onClick={() => setIsMinimized(true)}
          type="button"
          style={{
            background: 'transparent',
            border: '1px solid #d97706',
            color: '#b45309',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          title="Minimize testing banner"
        >
          Minimize
        </button>
      </div>
    </div>
  );
}

