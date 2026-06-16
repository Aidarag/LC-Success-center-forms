import React from 'react';
import TimesheetForm from './components/TimesheetForm';

export default function App() {
  return (
    <div id="portal-root" style={S.root}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header style={S.header} className="app-header no-print">
        <div style={S.headerInner}>

          {/* Logo + wordmark */}
          <div style={S.brand}>
            <img
              src="/lc-seal.png"
              alt="Livingstone College Official Seal"
              style={S.seal}
            />
            <div style={S.wordmark}>
              <span style={S.wordmarkCollege}>Livingstone College</span>
              <span style={S.wordmarkDept}>Success Center</span>
            </div>
          </div>

          {/* Right-side portal label */}
          <div style={S.portalLabel}>
            <span style={S.portalLabelText}>Staff Portal</span>
          </div>

        </div>
      </header>

      {/* ── Page title band ───────────────────────────────────────────── */}
      <div style={S.pageBand} className="no-print">
        <div style={S.pageBandInner}>
          <h1 style={S.pageTitle}>Monthly Timesheet</h1>
          <p style={S.pageSubtitle}>
            Department of Success Center &mdash; Salisbury, North Carolina 28144
          </p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <main style={S.main}>
        <TimesheetForm />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={S.footer} className="no-print">
        <div style={S.footerInner}>
          <div style={S.footerLeft}>
            <img src="/lc-seal.png" alt="" style={S.footerSeal} aria-hidden="true" />
            <div>
              <p style={S.footerName}>Livingstone College</p>
              <p style={S.footerAddr}>701 W. Monroe Street · Salisbury, NC 28144</p>
            </div>
          </div>
          <div style={S.footerRight}>
            <p style={S.footerCopy}>
              © {new Date().getFullYear()} Livingstone College. All rights reserved.
            </p>
            <p style={S.footerSystem}>Success Center Administrative System</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────
   Color palette derived from the official seal:
     --lc-black   #0f0f0f   (deep black of the seal ring)
     --lc-blue    #7da7c4   (Livingstone blue LC monogram)
     --lc-slate   #4a5568   (neutral dark text)
     --lc-bg      #f5f6f8   (light page background)
     --lc-rule    #dde1e7   (subtle dividers)
*/
const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f6f8',
    fontFamily: "'Inter', system-ui, sans-serif"
  },

  /* Header */
  header: {
    backgroundColor: '#0f0f0f',
    borderBottom: '3px solid #7da7c4',
  },
  headerInner: {
    maxWidth: 1380,
    margin: '0 auto',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* Brand */
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  seal: {
    width: 56,
    height: 56,
    objectFit: 'contain',
    flexShrink: 0,
    // The PNG has a white background — apply a subtle filter to
    // make it feel native on the dark header
    filter: 'brightness(1.05)',
  },
  wordmark: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  wordmarkCollege: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1.2,
    fontFamily: "'Inter', sans-serif",
  },
  wordmarkDept: {
    color: '#7da7c4',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },

  /* Portal label */
  portalLabel: {
    borderLeft: '1px solid #333',
    paddingLeft: 20,
  },
  portalLabelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },

  /* Page title band */
  pageBand: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #dde1e7',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  pageBandInner: {
    maxWidth: 1380,
    margin: '0 auto',
    padding: '20px 28px',
  },
  pageTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#0f0f0f',
    letterSpacing: '-0.01em',
    fontFamily: "'Inter', sans-serif",
  },
  pageSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#64748b',
    fontWeight: 400,
  },

  /* Main */
  main: {
    flex: '1 0 auto',
  },

  /* Footer */
  footer: {
    backgroundColor: '#0f0f0f',
    borderTop: '1px solid #1e1e1e',
    marginTop: 40,
  },
  footerInner: {
    maxWidth: 1380,
    margin: '0 auto',
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  footerSeal: {
    width: 32,
    height: 32,
    objectFit: 'contain',
    opacity: 0.7,
  },
  footerName: {
    margin: 0,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  footerAddr: {
    margin: '2px 0 0',
    color: '#64748b',
    fontSize: 11,
  },
  footerRight: {
    textAlign: 'right',
  },
  footerCopy: {
    margin: 0,
    color: '#475569',
    fontSize: 11,
  },
  footerSystem: {
    margin: '2px 0 0',
    color: '#334155',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
};
