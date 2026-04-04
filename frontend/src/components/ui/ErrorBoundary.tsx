import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label for the section, used in the error message */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches unexpected React rendering errors and shows a recovery screen
 * instead of a blank/white page.
 *
 * Usage:
 *   <ErrorBoundary label="Results page">
 *     <Results />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Emit to console so dev tools / error monitoring can pick it up
    console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: 16,
        }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
            Something went wrong
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            maxWidth: 360,
            lineHeight: 1.6,
          }}>
            {this.props.label
              ? `An unexpected error occurred in the ${this.props.label}.`
              : 'An unexpected error occurred.'}
            {' '}Reload the page to continue.
          </p>
          <details style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            maxWidth: 480,
            textAlign: 'left',
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Technical details</summary>
            <pre style={{
              background: 'var(--bg-input)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.error.message}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
