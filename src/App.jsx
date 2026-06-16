import React, { useState } from 'react';
import TimesheetForm from './components/TimesheetForm';
import LivingstoneLogo from './components/LivingstoneLogo';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFormSubmitSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div id="portal-root" style={styles.appWrapper}>
      {/* Navigation Header */}
      <header className="app-header">
        <div className="header-container" style={{ justifyContent: 'center' }}>
          <LivingstoneLogo 
            variant="horizontal" 
            size="md" 
            className="header-logo" 
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main" style={styles.mainContent}>
        <TimesheetForm 
          key={`timesheet-${refreshKey}`}
          onFormSubmitSuccess={handleFormSubmitSuccess} 
        />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <p style={{ fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Livingstone College
            </p>
            <p style={{ marginTop: '2px', color: '#cbd5e1' }}>
              Success Center Digital Forms Portal
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>© {new Date().getFullYear()} Livingstone College. All rights reserved.</p>
            <p style={{ marginTop: '2px', color: '#cbd5e1' }}>
              Designed for Salisbury, NC Campus Admin
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  appWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  mainContent: {
    flex: '1 0 auto'
  }
};
