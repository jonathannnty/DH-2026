import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 24px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-card)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const logoStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 800,
  color: 'var(--text)',
  letterSpacing: '-0.01em',
};

const linkStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem',
  fontWeight: active ? 600 : 400,
  color: active ? 'var(--accent)' : 'var(--text-muted)',
  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
  transition: 'all 0.15s',
});

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const isHome = pathname === '/';
  const isDashboard = pathname === '/dashboard';

  return (
    <>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>PathFinder AI</Link>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link to="/" style={linkStyle(isHome)}>Home</Link>
          <Link to="/dashboard" style={linkStyle(isDashboard)}>Sessions</Link>
        </div>
      </nav>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </>
  );
}
