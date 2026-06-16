import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Printer, Send } from 'lucide-react';
import { saveSessionsDraft, getSessionsDraft, clearSessionsDraft } from '../utils/storage';
import { generatePDF } from '../utils/pdfGenerator';
import EmailModal from './EmailModal';
import SignaturePad from './SignaturePad';

// Helper to convert time strings "HH:MM" to decimal hours
const timeToDecimal = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

// Helper to calculate total hours between two "HH:MM" times
const calculateDiff = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  const decIn = timeToDecimal(timeIn);
  const decOut = timeToDecimal(timeOut);
  if (decOut <= decIn) return 0;
  return decOut - decIn;
};

// Helper to format string dates to human Month Year
const getMonthYearStr = (dateStr) => {
  if (!dateStr) return 'Month_Year';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Month_Year';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_');
};

const RECOMMENDED_SKILLS = [
  'Intro to Economics Homework',
  'Test Preparation',
  'Essay Review',
  'Study Skills',
  'Math Tutoring (Algebra/Calculus)',
  'Science Lab Report Review',
  'English Literature Composition',
  'Time Management & Organization'
];

export default function SessionRecordForm() {
  // Form header state
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [semester, setSemester] = useState('Fall 2026');
  const [mentorName, setMentorName] = useState('');

  // Table entries state
  const [entries, setEntries] = useState([
    { id: '1', date: '', timeIn: '', timeOut: '', duration: 0, skills: '', notes: '' }
  ]);

  // PDF Naming states
  const [pdfFileName, setPdfFileName] = useState('Student_Academic_Report_Month_Year.pdf');
  const [isFileNameEdited, setIsFileNameEdited] = useState(false);

  // UI States
  const [signature, setSignature] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);

  // Load draft on mount
  useEffect(() => {
    const draft = getSessionsDraft();
    if (draft) {
      setStudentName(draft.studentName || '');
      setStudentId(draft.studentId || '');
      setSemester(draft.semester || 'Fall 2026');
      setMentorName(draft.mentorName || '');
      if (draft.entries && draft.entries.length > 0) {
        setEntries(draft.entries);
      }
      if (draft.pdfFileName) {
        setPdfFileName(draft.pdfFileName);
        setIsFileNameEdited(true);
      }
      showToast('Restored draft student progress logs.');
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auto-generate filename when studentName or first date entry changes
  useEffect(() => {
    if (isFileNameEdited) return;

    const formattedName = (studentName || 'Student').trim().replace(/\s+/g, '_');
    const firstRowDate = entries[0]?.date || '';
    const monthYear = getMonthYearStr(firstRowDate);
    setPdfFileName(`${formattedName}_Academic_Report_${monthYear}.pdf`);
  }, [studentName, entries[0]?.date, isFileNameEdited]);

  const handleEntryChange = (id, field, value) => {
    const newEntries = entries.map((entry) => {
      if (entry.id !== id) return entry;

      const updated = { ...entry, [field]: value };
      
      // Calculate single session duration
      if (field === 'timeIn' || field === 'timeOut') {
        updated.duration = calculateDiff(updated.timeIn, updated.timeOut);
      }

      return updated;
    });
    setEntries(newEntries);
    
    // Autosave
    saveSessionsDraft({
      studentName,
      studentId,
      semester,
      mentorName,
      entries: newEntries,
      pdfFileName
    });
  };

  const addRow = () => {
    const newId = String(Date.now() + Math.random());
    const newEntries = [
      ...entries,
      { id: newId, date: '', timeIn: '', timeOut: '', duration: 0, skills: '', notes: '' }
    ];
    setEntries(newEntries);
    saveSessionsDraft({ studentName, studentId, semester, mentorName, entries: newEntries, pdfFileName });
  };

  const removeRow = (id) => {
    if (entries.length === 1) {
      const cleared = [{ id: '1', date: '', timeIn: '', timeOut: '', duration: 0, skills: '', notes: '' }];
      setEntries(cleared);
      saveSessionsDraft({ studentName, studentId, semester, mentorName, entries: cleared, pdfFileName });
      return;
    }
    const filtered = entries.filter((entry) => entry.id !== id);
    setEntries(filtered);
    saveSessionsDraft({ studentName, studentId, semester, mentorName, entries: filtered, pdfFileName });
  };

  const totalDurationSum = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

  const validateForm = () => {
    const errors = {};
    if (!studentName.trim()) errors.studentName = 'Student Name is required';
    if (!studentId.trim()) errors.studentId = 'Student ID is required';
    if (!semester.trim()) errors.semester = 'Semester & Year is required';
    if (!mentorName.trim()) errors.StaffName = 'Staff Member Name is required';

    const rowErrors = [];
    entries.forEach((entry, idx) => {
      if (entry.date || entry.timeIn || entry.timeOut || entry.skills || entry.notes) {
        if (!entry.date) rowErrors.push(`Row ${idx + 1}: Date is missing`);
        
        if ((entry.timeIn && !entry.timeOut) || (!entry.timeIn && entry.timeOut)) {
          rowErrors.push(`Row ${idx + 1}: Session requires both Time In and Time Out`);
        } else if (entry.timeIn && entry.timeOut) {
          const decIn = timeToDecimal(entry.timeIn);
          const decOut = timeToDecimal(entry.timeOut);
          if (decOut <= decIn) {
            rowErrors.push(`Row ${idx + 1}: Time Out must be after Time In`);
          }
        }
        if (!entry.skills.trim()) {
          rowErrors.push(`Row ${idx + 1}: Skills / Assignments worked on is required`);
        }
      }
    });

    if (rowErrors.length > 0) {
      errors.rows = rowErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDownloadPDF = async () => {
    if (!validateForm()) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }

    try {
      showToast('Generating official progress record PDF...');
      const payload = {
        studentName,
        studentId,
        semester,
        mentorName,
        entries,
        totalDuration: totalDurationSum,
        signature
      };
      await generatePDF('sessions', payload, pdfFileName);
      showToast('Session record PDF downloaded successfully.');
    } catch (error) {
      showToast('PDF generation failed.', 'error');
    }
  };

  const handleEmailPDF = async () => {
    if (!validateForm()) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }

    try {
      showToast('Preparing PDF package for supervisor submission...');
      const payload = {
        studentName,
        studentId,
        semester,
        mentorName,
        entries,
        totalDuration: totalDurationSum,
        signature
      };
      
      const finalName = await generatePDF('sessions', payload, pdfFileName);

      setEmailSubject(`Livingstone Success Center - Student Progress Record - ${studentName} (${studentId})`);
      setEmailBody(
        `Dear Mr. Davis,\n\nPlease find attached the Student Session & Progress Record for tutor academic support.\n\n` +
        `Student: ${studentName} (${studentId})\n` +
        `Semester/Year: ${semester}\n` +
        `Tutor/Mentor: ${mentorName}\n` +
        `Total Academic Mentoring Hours: ${totalDurationSum.toFixed(2)} hours\n\n` +
        `Best regards,\n${mentorName}`
      );

      setIsEmailModalOpen(true);
    } catch (error) {
      showToast('Failed to compile session records.', 'error');
    }
  };

  const handlePrintForm = () => {
    window.print();
  };

  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear this progress record form?')) {
      setStudentName('');
      setStudentId('');
      setSemester('Fall 2026');
      setMentorName('');
      setEntries([{ id: '1', date: '', timeIn: '', timeOut: '', duration: 0, skills: '', notes: '' }]);
      setPdfFileName('Student_Academic_Report_Month_Year.pdf');
      setIsFileNameEdited(false);
      setSignature(null);
      clearSessionsDraft();
      showToast('Form cleared.');
    }
  };

  return (
    <div className="form-page-layout" style={styles.container}>
      {toastMessage && (
        <div 
          style={{
            ...styles.toast,
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#000000',
            color: '#ffffff'
          }}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Official Form Header */}
      <div className="printable-form-header" style={styles.officialHeader}>
        <h1 style={styles.collegeName}>Livingstone College</h1>
        <h2 style={styles.formTitle}>Academic Support Center Student Session & Progress Record</h2>
        <p style={styles.subtext}>Department: Success Center • Salisbury, NC</p>
      </div>

      <div style={styles.formWrapper} className="form-wrapper-box">
        {/* Error Banner */}
        {Object.keys(formErrors).length > 0 && (
          <div style={styles.errorBanner} id="sessions-error-banner" className="no-print">
            <p style={{ margin: '0 0 5px 0', fontWeight: '700' }}>Please review the following fields:</p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {formErrors.studentName && <li>{formErrors.studentName}</li>}
              {formErrors.studentId && <li>{formErrors.studentId}</li>}
              {formErrors.semester && <li>{formErrors.semester}</li>}
              {formErrors.StaffName && <li>{formErrors.StaffName}</li>}
              {formErrors.rows && formErrors.rows.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Metadata Inputs */}
        <div style={styles.headerGrid}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="student-name">Student Name</label>
            <input
              id="student-name"
              type="text"
              value={studentName}
              placeholder="e.g. Aida Garba"
              onChange={(e) => {
                setStudentName(e.target.value);
                saveSessionsDraft({ studentName: e.target.value, studentId, semester, mentorName, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="student-id">Student ID</label>
            <input
              id="student-id"
              type="text"
              value={studentId}
              placeholder="e.g. LC0012345"
              onChange={(e) => {
                setStudentId(e.target.value);
                saveSessionsDraft({ studentName, studentId: e.target.value, semester, mentorName, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="semester-select">Semester & Year</label>
            <select
              id="semester-select"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                saveSessionsDraft({ studentName, studentId, semester: e.target.value, mentorName, entries, pdfFileName });
              }}
              style={styles.selectInput}
            >
              <option value="Summer 2026">Summer 2026</option>
              <option value="Fall 2026">Fall 2026</option>
              <option value="Spring 2027">Spring 2027</option>
              <option value="Fall 2027">Fall 2027</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="mentor-name">Staff Member / Tutor</label>
            <input
              id="mentor-name"
              type="text"
              value={mentorName}
              placeholder="Your full name"
              onChange={(e) => {
                setMentorName(e.target.value);
                saveSessionsDraft({ studentName, studentId, semester, mentorName: e.target.value, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
        </div>

        {/* Sessions Logs Table */}
        <div style={styles.tableCard} className="table-card-box">
          <div style={styles.tableScroll}>
            <table style={styles.table} id="sessions-table">
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.th, width: '140px' }}>Date</th>
                  <th style={{ ...styles.th, width: '100px' }}>Time In</th>
                  <th style={{ ...styles.th, width: '100px' }}>Time Out</th>
                  <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Hours</th>
                  <th style={{ ...styles.th, width: '220px' }}>Skills / Assignments Worked On</th>
                  <th style={styles.th}>Progress Notes / Comments</th>
                  <th style={{ ...styles.th, width: '50px' }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.id} style={styles.tableBodyRow}>
                    <td style={styles.td}>
                      <input
                        type="date"
                        value={entry.date}
                        aria-label={`Date for session ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'date', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeIn}
                        aria-label={`Time In for session ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeIn', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeOut}
                        aria-label={`Time Out for session ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeOut', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>
                      {entry.duration ? entry.duration.toFixed(2) : '0.00'}
                    </td>
                    <td style={{ ...styles.td, position: 'relative' }}>
                      <input
                        type="text"
                        value={entry.skills}
                        placeholder="e.g. Essay Review"
                        aria-label={`Skills for session ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'skills', e.target.value)}
                        onFocus={() => setActiveSuggestionRow(entry.id)}
                        onBlur={() => {
                          setTimeout(() => setActiveSuggestionRow(null), 200);
                        }}
                        style={styles.tableInput}
                      />
                      {activeSuggestionRow === entry.id && (
                        <div style={styles.suggestionBox} id={`suggestions-${entry.id}`} className="no-print">
                          <div style={styles.suggestionTitle}>Quick Recommendations</div>
                          {RECOMMENDED_SKILLS.filter(skill => 
                            !entry.skills || skill.toLowerCase().includes(entry.skills.toLowerCase())
                          ).map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onMouseDown={() => {
                                handleEntryChange(entry.id, 'skills', skill);
                                setActiveSuggestionRow(null);
                              }}
                              style={styles.suggestionItem}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        value={entry.notes}
                        placeholder="Progress comments"
                        aria-label={`Notes for session ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'notes', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }} className="no-print">
                      <button 
                        type="button" 
                        onClick={() => removeRow(entry.id)} 
                        style={styles.rowDeleteBtn}
                        aria-label={`Delete session row ${idx + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.tableFooter} className="no-print">
            <button type="button" onClick={addRow} style={styles.addRowBtn}>
              + Add Session Entry
            </button>
          </div>
        </div>

        {/* Total Mentoring Hours Bar */}
        <div style={styles.totalBar}>
          <span style={styles.totalLabel}>Total Support Hours Logged:</span>
          <span style={styles.totalValue}>{totalDurationSum.toFixed(2)} hrs</span>
        </div>

        {/* Signature drawing pad */}
        <div style={styles.signatureCard} className="no-print">
          <label style={styles.signatureLabel}>Staff / Tutor Signature (Draw below)</label>
          <SignaturePad
            key={signature ? 'has-sig' : 'no-sig'}
            onSave={(sigData) => setSignature(sigData)}
            onClear={() => setSignature(null)}
          />
        </div>

        {/* Naming Configuration Box */}
        <div style={styles.namingCard} className="no-print">
          <label style={styles.namingLabel} htmlFor="pdf-filename-input">PDF File Name before downloading</label>
          <div style={styles.namingInputWrapper}>
            <input
              id="pdf-filename-input"
              type="text"
              value={pdfFileName}
              placeholder="Aida_Garba_Academic_Report_June_2026.pdf"
              onChange={(e) => {
                setPdfFileName(e.target.value);
                setIsFileNameEdited(true);
                saveSessionsDraft({ studentName, studentId, semester, mentorName, entries, pdfFileName: e.target.value });
              }}
              style={styles.namingInput}
            />
            {isFileNameEdited && (
              <button 
                type="button" 
                onClick={() => {
                  setIsFileNameEdited(false);
                  showToast('Reset filename to auto-generation.');
                }}
                style={styles.resetNameBtn}
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        {/* Form Action Controls */}
        <div style={styles.actionsBar} className="no-print">
          <button type="button" onClick={handleClearForm} style={styles.clearBtn}>
            Reset Form
          </button>
          <div style={styles.mainActions}>
            <button type="button" onClick={handlePrintForm} style={styles.printBtn}>
              <Printer size={15} /> Print Form
            </button>
            <button type="button" onClick={handleDownloadPDF} style={styles.downloadBtn}>
              <Download size={15} /> Download PDF
            </button>
            <button type="button" onClick={handleEmailPDF} style={styles.submitBtn}>
              <Send size={15} /> Submit PDF
            </button>
          </div>
        </div>
      </div>

      {/* Signature lines visible ONLY in browser printing */}
      <div className="print-only-signatures" style={styles.printSignatures}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '45%', verticalAlign: 'bottom', position: 'relative' }}>
                {signature && (
                  <img 
                    src={signature} 
                    alt="Staff / Tutor Signature" 
                    style={{ 
                      position: 'absolute', 
                      bottom: '22px', 
                      left: '10px', 
                      height: '35px', 
                      pointerEvents: 'none' 
                    }} 
                  />
                )}
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>STAFF / TUTOR SIGNATURE</div>
              </td>
              <td style={{ width: '10%', verticalAlign: 'bottom' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>DATE</div>
              </td>
              <td style={{ width: '35%', verticalAlign: 'bottom', paddingLeft: '20px' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>SUPERVISOR APPROVAL</div>
              </td>
              <td style={{ width: '10%', verticalAlign: 'bottom' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>DATE</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        pdfFileName={pdfFileName}
        subject={emailSubject}
        body={emailBody}
        employeeName={mentorName}
      />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px 16px'
  },
  officialHeader: {
    textAlign: 'center',
    marginBottom: '24px',
    borderBottom: '3px double #000000',
    paddingBottom: '15px'
  },
  collegeName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '28px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#000000',
    margin: 0
  },
  formTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#333333',
    marginTop: '4px',
    margin: 0
  },
  subtext: {
    fontSize: '12px',
    color: '#555555',
    marginTop: '4px'
  },
  formWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    padding: '24px'
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px'
  },
  headerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#475569'
  },
  textInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000'
  },
  selectInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#ffffff',
    color: '#000000',
    outline: 'none',
    cursor: 'pointer'
  },
  tableCard: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  tableScroll: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #cbd5e1'
  },
  th: {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#475569'
  },
  tableBodyRow: {
    borderBottom: '1px solid #e2e8f0'
  },
  td: {
    padding: '8px 12px'
  },
  tableInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000'
  },
  suggestionBox: {
    position: 'absolute',
    top: '100%',
    left: '10px',
    right: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 10,
    maxHeight: '160px',
    overflowY: 'auto',
    marginTop: '2px'
  },
  suggestionTitle: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94a3b8',
    padding: '8px 12px 4px 12px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #f1f5f9'
  },
  suggestionItem: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: '12px',
    color: '#334155',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'background-color 0.15s',
    outline: 'none',
    ':hover': {
      backgroundColor: '#f1f5f9'
    }
  },
  rowDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
    ':hover': {
      color: '#ef4444'
    }
  },
  tableFooter: {
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0'
  },
  addRowBtn: {
    padding: '7px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000000',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  totalBar: {
    backgroundColor: '#000000',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  totalLabel: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  totalValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '18px',
    fontWeight: '800',
    color: '#A7CBE5'
  },
  namingCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  signatureCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  signatureLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#475569',
    letterSpacing: '0.5px'
  },
  namingLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#475569',
    letterSpacing: '0.5px'
  },
  namingInputWrapper: {
    display: 'flex',
    gap: '8px'
  },
  namingInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000'
  },
  resetNameBtn: {
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer'
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '20px'
  },
  clearBtn: {
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer'
  },
  mainActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  printBtn: {
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#000000',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  downloadBtn: {
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#000000',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  submitBtn: {
    padding: '10px 18px',
    backgroundColor: '#000000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1001,
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'slideIn 0.3s ease-out'
  },
  printSignatures: {
    display: 'none',
    marginTop: '40px'
  }
};
