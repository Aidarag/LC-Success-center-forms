import React, { useState } from 'react';
import { Clock, BookOpen } from 'lucide-react';
import TimesheetForm from './components/TimesheetForm';
import SessionRecordForm from './components/SessionRecordForm';
import LivingstoneLogo from './components/LivingstoneLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState('timesheet'); // Default to timesheet
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFormSubmitSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="portal-root" style={styles.appWrapper}>
      {/* Navigation Header */}
      <header className="app-header">
        <div className="header-container">
          <LivingstoneLogo 
            variant="horizontal" 
            size="md" 
            className="header-logo" 
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavigate('timesheet')} 
          />
          
          <nav className="nav-tabs" role="tablist">
            <button
              onClick={() => handleNavigate('timesheet')}
              className={`nav-tab ${activeTab === 'timesheet' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'timesheet'}
              id="tab-timesheet"
            >
              <Clock size={15} />
              Hourly Timesheet
            </button>
            <button
              onClick={() => handleNavigate('sessions')}
              className={`nav-tab ${activeTab === 'sessions' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'sessions'}
              id="tab-sessions"
            >
              <BookOpen size={15} />
              Student Session Records
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main" style={styles.mainContent}>
        {activeTab === 'timesheet' && (
          <TimesheetForm 
            key={`timesheet-${refreshKey}`}
            onFormSubmitSuccess={handleFormSubmitSuccess} 
          />
        )}
        {activeTab === 'sessions' && (
          <SessionRecordForm 
            key={`sessions-${refreshKey}`}
            onFormSubmitSuccess={handleFormSubmitSuccess} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <p style={{ fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Livingstone College
            </p>
            <p style={{ marginTop: '2px', color: '#cbd5e1' }}>
              Success Center Digital Forms Portal • MVP v1.0
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
