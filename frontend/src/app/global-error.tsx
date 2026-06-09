'use client'

/**
 * Root-level error boundary. Triggered when something throws above the regular
 * page boundary (in layout / providers). Renders its own <html>+<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, background: 'var(--mdd-bg)',
          fontFamily: "'Inter', system-ui, sans-serif", color: '#1D1D1F',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FDECEB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A81C13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.4 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 24px', textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
            An unexpected error crashed the page. We&apos;ve logged it. You can try again or head back home.
          </p>
          {error.digest && (
            <code style={{ fontSize: 11, color: '#AEAEB2', marginBottom: 20, fontFamily: 'ui-monospace, monospace' }}>
              ref: {error.digest}
            </code>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={reset}
              style={{
                appearance: 'none', border: 'none',
                background: '#0071E3', color: '#fff',
                padding: '12px 22px', borderRadius: 12,
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(0,113,227,0.25)',
              }}
            >
              Try again
            </button>
            <a href="/" style={{
              padding: '12px 22px', borderRadius: 12,
              background: 'var(--mdd-card)', color: '#1D1D1F',
              fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 0 0 1.5px rgba(0,0,0,0.10)',
            }}>
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
