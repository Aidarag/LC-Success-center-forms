import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', color: '#b91c1c', backgroundColor: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '8px', margin: '20px' }}>
          <h2>Something went wrong in the Portal.</h2>
          <p style={{ fontWeight: 'bold', fontSize: '16px' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '20px', fontSize: '12px', color: '#450a0a' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '20px', fontSize: '12px', color: '#450a0a' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }} 
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Browser Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
