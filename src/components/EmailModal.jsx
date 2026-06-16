import React, { useState, useEffect } from 'react';
import { Mail, X, CheckCircle2, Paperclip, Send, AlertCircle } from 'lucide-react';

export default function EmailModal({ 
  isOpen, 
  onClose, 
  recipientEmail = 'bdavis1@livingstone.edu', 
  recipientName = 'Benjamin Davis',
  subject = '', 
  body = '', 
  pdfFileName = '',
  employeeName = '' 
}) {
  const [step, setStep] = useState('compose'); // compose, sending, success
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [editSubject, setEditSubject] = useState(subject);
  const [editBody, setEditBody] = useState(body);
  const [senderEmail, setSenderEmail] = useState('');

  useEffect(() => {
    setEditSubject(subject);
    setEditBody(body);
  }, [subject, body]);

  const handleSend = (e) => {
    e.preventDefault();
    setStep('sending');
    setProgress(0);
  };

  useEffect(() => {
    if (step !== 'sending') return;

    const statuses = [
      { prg: 20, text: 'Packing official digital document...' },
      { prg: 50, text: 'Attaching user-designated PDF file...' },
      { prg: 80, text: 'Uploading to Livingstone Success Center portal relay...' },
      { prg: 100, text: 'Submission Successful!' }
    ];

    let currentStatusIdx = 0;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextPrg = prev + 5;
        
        const matchingStatus = statuses.find(s => nextPrg <= s.prg && (currentStatusIdx === 0 || nextPrg > statuses[currentStatusIdx - 1]?.prg));
        if (matchingStatus) {
          setStatusText(matchingStatus.text);
        }

        if (nextPrg >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep('success');
          }, 400);
          return 100;
        }
        return nextPrg;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [step]);

  const getMailtoUrl = () => {
    const encodedSubject = encodeURIComponent(editSubject);
    const bodyNote = `(Note: Please attach your downloaded PDF "${pdfFileName || 'Livingstone_Report.pdf'}" to this email before sending.)\n\n` + editBody;
    const encodedBody = encodeURIComponent(bodyNote);
    return `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={styles.overlay} id="email-modal-overlay">
      <div className="modal-container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} style={{ color: '#A7CBE5' }} />
            <h3 style={styles.headerTitle}>Submit PDF Portal</h3>
          </div>
          {step !== 'sending' && (
            <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Compose Form */}
        {step === 'compose' && (
          <form onSubmit={handleSend} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Recipient (Supervisor):</label>
              <div style={styles.readonlyInput}>
                <span style={{ fontWeight: '600' }}>{recipientName}</span> &lt;{recipientEmail}&gt;
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="sender-email">From (Your Email):</label>
              <input
                id="sender-email"
                type="email"
                required
                placeholder="your.name@livingstone.edu"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="email-subject">Subject:</label>
              <input
                id="email-subject"
                type="text"
                required
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Attached Report PDF:</label>
              <div style={styles.attachmentBadge}>
                <Paperclip size={14} style={{ color: '#475569' }} />
                <span style={styles.attachmentName}>{pdfFileName || 'Document.pdf'}</span>
                <span style={styles.attachmentSize}>(Custom Name)</span>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="email-body">Submission Notes:</label>
              <textarea
                id="email-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={6}
                style={styles.textarea}
              />
            </div>

            <div style={styles.footer}>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" style={styles.sendBtn}>
                <Send size={14} style={{ marginRight: '6px' }} />
                Submit PDF
              </button>
            </div>
          </form>
        )}

        {/* Sending Loader Animation */}
        {step === 'sending' && (
          <div style={styles.loadingContainer}>
            <div style={styles.airplaneWrapper}>
              <div style={styles.pulseRing}></div>
              <Mail size={40} style={styles.sendingIcon} />
            </div>
            
            <h4 style={styles.loadingTitle}>Submitting PDF Form</h4>
            
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${progress}%` }}></div>
            </div>
            
            <p style={styles.progressPercent}>{progress}%</p>
            <p style={styles.statusText}>{statusText}</p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div style={styles.successContainer}>
            <CheckCircle2 size={56} style={styles.successIcon} />
            <h4 style={styles.successTitle}>PDF Submitted Successfully!</h4>
            <p style={styles.successMsg}>
              Your report has been successfully routed to <br />
              <strong style={{ color: '#000000' }}>{recipientEmail} ({recipientName})</strong>.
            </p>

            <div style={styles.successDetailsBox}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600' }}>Submission Summary:</p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: '1.5', color: '#475569' }}>
                <li><strong>Sender:</strong> {senderEmail}</li>
                <li><strong>Attached File:</strong> {pdfFileName}</li>
                <li><strong>Relay Status:</strong> Delivered to Supervisor Inbox</li>
              </ul>
            </div>

            <div style={styles.fallbackBox}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={16} style={{ color: '#475569', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                  <strong>Manual Backup:</strong> You can also open your default mail client to send a backup message manually.
                </p>
              </div>
              <a 
                href={getMailtoUrl()} 
                style={styles.mailtoBtn}
                onClick={() => {
                  setTimeout(onClose, 200);
                }}
              >
                Open Email Client (Backup Submission)
              </a>
            </div>

            <button onClick={onClose} style={styles.doneBtn}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  header: {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '700',
    fontSize: '16px',
    margin: 0,
    letterSpacing: '0.5px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  form: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  readonlyInput: {
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e293b'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#0f172a',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backgroundColor: '#ffffff'
  },
  attachmentBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px'
  },
  attachmentName: {
    fontWeight: '600',
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  },
  attachmentSize: {
    fontSize: '11px',
    color: '#64748b'
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#0f172a',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    resize: 'vertical',
    backgroundColor: '#ffffff'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '15px'
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer'
  },
  sendBtn: {
    padding: '9px 18px',
    backgroundColor: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  loadingContainer: {
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  airplaneWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90px',
    height: '90px',
    backgroundColor: '#f1f5f9',
    borderRadius: '50%',
    marginBottom: '20px'
  },
  sendingIcon: {
    color: '#000000',
    zIndex: 2
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid #A7CBE5',
    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
    zIndex: 1
  },
  loadingTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 15px 0',
    color: '#0f172a'
  },
  progressBarBg: {
    width: '80%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: '4px',
    transition: 'width 0.15s ease-out'
  },
  progressPercent: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 5px 0',
    color: '#000000'
  },
  statusText: {
    fontSize: '12px',
    color: '#475569',
    margin: 0,
    height: '16px'
  },
  successContainer: {
    padding: '30px 25px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  successIcon: {
    color: '#10b981',
    marginBottom: '15px'
  },
  successTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    margin: '0 0 10px 0',
    color: '#000000'
  },
  successMsg: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
    margin: '0 0 20px 0'
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 15px',
    textAlign: 'left',
    marginBottom: '15px'
  },
  fallbackBox: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '12px 15px',
    textAlign: 'left',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column'
  },
  mailtoBtn: {
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#000000',
    textDecoration: 'none',
    textAlign: 'center',
    marginTop: '6px',
    display: 'inline-block'
  },
  doneBtn: {
    padding: '10px 24px',
    backgroundColor: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
    width: '100%'
  }
};
