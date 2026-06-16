import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Printer, Send } from 'lucide-react';
import { saveTimesheetDraft, getTimesheetDraft, clearTimesheetDraft } from '../utils/storage';
import { generatePDF } from '../utils/pdfGenerator';
import EmailModal from './EmailModal';

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

export default function TimesheetForm() {
  // Form states
  const [employeeName, setEmployeeName] = useState('');
  const [departmentName] = useState('Success Center');
  const [beginningDate, setBeginningDate] = useState('');
  const [endingDate, setEndingDate] = useState('');
  const [entries, setEntries] = useState([
    { id: '1', date: '', timeIn1: '', timeOut1: '', timeIn2: '', timeOut2: '', totalHours: 0 }
  ]);

  // PDF Naming states
  const [pdfFileName, setPdfFileName] = useState('Employee_Timesheet_Month_Year.pdf');
  const [isFileNameEdited, setIsFileNameEdited] = useState(false);

  // UI States
  const [toastMessage, setToastMessage] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Load draft on mount
  useEffect(() => {
    const draft = getTimesheetDraft();
    if (draft) {
      setEmployeeName(draft.employeeName || '');
      setBeginningDate(draft.beginningDate || '');
      setEndingDate(draft.endingDate || '');
      if (draft.entries && draft.entries.length > 0) {
        setEntries(draft.entries);
      }
      if (draft.pdfFileName) {
        setPdfFileName(draft.pdfFileName);
        setIsFileNameEdited(true);
      }
      showToast('Restored draft timesheet progress.');
    }
  }, []);

  // Show a temporary banner notification
  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auto-generate filename when employeeName or beginningDate changes
  useEffect(() => {
    if (isFileNameEdited) return;

    const formattedName = (employeeName || 'Employee').trim().replace(/\s+/g, '_');
    const monthYear = getMonthYearStr(beginningDate);
    setPdfFileName(`${formattedName}_Timesheet_${monthYear}.pdf`);
  }, [employeeName, beginningDate, isFileNameEdited]);

  // Update a single row's entry fields
  const handleEntryChange = (id, field, value) => {
    const newEntries = entries.map((entry) => {
      if (entry.id !== id) return entry;

      const updated = { ...entry, [field]: value };
      
      // Re-calculate hours for this row
      const diff1 = calculateDiff(updated.timeIn1, updated.timeOut1);
      const diff2 = calculateDiff(updated.timeIn2, updated.timeOut2);
      updated.totalHours = diff1 + diff2;
      
      return updated;
    });
    setEntries(newEntries);
    
    // Autosave draft
    saveTimesheetDraft({
      employeeName,
      beginningDate,
      endingDate,
      entries: newEntries,
      pdfFileName
    });
  };

  // Add a new row to the table
  const addRow = () => {
    const newId = String(Date.now() + Math.random());
    const newEntries = [
      ...entries,
      { id: newId, date: '', timeIn1: '', timeOut1: '', timeIn2: '', timeOut2: '', totalHours: 0 }
    ];
    setEntries(newEntries);
    saveTimesheetDraft({ employeeName, beginningDate, endingDate, entries: newEntries, pdfFileName });
  };

  // Remove a row
  const removeRow = (id) => {
    if (entries.length === 1) {
      const cleared = [{ id: '1', date: '', timeIn1: '', timeOut1: '', timeIn2: '', timeOut2: '', totalHours: 0 }];
      setEntries(cleared);
      saveTimesheetDraft({ employeeName, beginningDate, endingDate, entries: cleared, pdfFileName });
      return;
    }
    const filtered = entries.filter((entry) => entry.id !== id);
    setEntries(filtered);
    saveTimesheetDraft({ employeeName, beginningDate, endingDate, entries: filtered, pdfFileName });
  };

  // Save manual draft trigger
  const handleSaveDraft = () => {
    const success = saveTimesheetDraft({
      employeeName,
      beginningDate,
      endingDate,
      entries,
      pdfFileName
    });
    if (success) {
      showToast('Autosave updated. Progress preserved in browser.');
    }
  };

  const totalHoursSum = entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

  // Validate form entries
  const validateForm = () => {
    const errors = {};
    if (!employeeName.trim()) errors.employeeName = 'Employee Name is required';
    if (!beginningDate) errors.beginningDate = 'Beginning Date is required';
    if (!endingDate) errors.endingDate = 'Ending Date is required';

    const rowErrors = [];
    entries.forEach((entry, idx) => {
      if (entry.date || entry.timeIn1 || entry.timeOut1 || entry.timeIn2 || entry.timeOut2) {
        if (!entry.date) rowErrors.push(`Row ${idx + 1}: Date is missing`);
        
        if ((entry.timeIn1 && !entry.timeOut1) || (!entry.timeIn1 && entry.timeOut1)) {
          rowErrors.push(`Row ${idx + 1}: Shift 1 requires both Time In and Time Out`);
        } else if (entry.timeIn1 && entry.timeOut1) {
          const decIn = timeToDecimal(entry.timeIn1);
          const decOut = timeToDecimal(entry.timeOut1);
          if (decOut <= decIn) {
            rowErrors.push(`Row ${idx + 1}: Shift 1 Time Out must be after Time In`);
          }
        }

        if ((entry.timeIn2 && !entry.timeOut2) || (!entry.timeIn2 && entry.timeOut2)) {
          rowErrors.push(`Row ${idx + 1}: Shift 2 requires both Time In and Time Out`);
        } else if (entry.timeIn2 && entry.timeOut2) {
          const decIn = timeToDecimal(entry.timeIn2);
          const decOut = timeToDecimal(entry.timeOut2);
          if (decOut <= decIn) {
            rowErrors.push(`Row ${idx + 1}: Shift 2 Time Out must be after Time In`);
          }
        }
      }
    });

    if (rowErrors.length > 0) {
      errors.rows = rowErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (!validateForm()) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }

    try {
      showToast('Generating official timesheet PDF...');
      const payload = {
        employeeName,
        departmentName,
        beginningDate,
        endingDate,
        entries,
        totalHours: totalHoursSum
      };
      await generatePDF('timesheet', payload, pdfFileName);
      showToast('Timesheet PDF downloaded successfully.');
    } catch (error) {
      showToast('PDF generation failed.', 'error');
    }
  };

  // Email/Submit PDF Handler
  const handleEmailPDF = async () => {
    if (!validateForm()) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }

    try {
      showToast('Preparing PDF package for supervisor submission...');
      const payload = {
        employeeName,
        departmentName,
        beginningDate,
        endingDate,
        entries,
        totalHours: totalHoursSum
      };
      
      // Trigger local pdf compile to verify
      const finalName = await generatePDF('timesheet', payload, pdfFileName);

      const bDateStr = beginningDate ? new Date(beginningDate).toLocaleDateString() : '';
      const eDateStr = endingDate ? new Date(endingDate).toLocaleDateString() : '';
      setEmailSubject(`Livingstone Success Center - Timesheet Submission - ${employeeName}`);
      setEmailBody(
        `Dear Mr. Davis,\n\nPlease find attached my Hourly Timesheet for the Success Center.\n\n` +
        `Reporting Period: ${bDateStr} to ${eDateStr}\n` +
        `Total Hours Worked: ${totalHoursSum.toFixed(2)} hours\n\n` +
        `Best regards,\n${employeeName}`
      );

      setIsEmailModalOpen(true);
    } catch (error) {
      showToast('Failed to compile timesheet.', 'error');
    }
  };

  // Print Form Handler
  const handlePrintForm = () => {
    window.print();
  };

  // Reset form
  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear this timesheet form?')) {
      setEmployeeName('');
      setBeginningDate('');
      setEndingDate('');
      setEntries([{ id: '1', date: '', timeIn1: '', timeOut1: '', timeIn2: '', timeOut2: '', totalHours: 0 }]);
      setPdfFileName('Employee_Timesheet_Month_Year.pdf');
      setIsFileNameEdited(false);
      clearTimesheetDraft();
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
        <h2 style={styles.formTitle}>Success Center Monthly Timesheet</h2>
        <p style={styles.subtext}>Department: Success Center • Salisbury, NC</p>
      </div>

      <div style={styles.formWrapper} className="form-wrapper-box">
        {/* Error Banner */}
        {Object.keys(formErrors).length > 0 && (
          <div style={styles.errorBanner} id="timesheet-error-banner" className="no-print">
            <p style={{ margin: '0 0 5px 0', fontWeight: '700' }}>Please review the following fields:</p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {formErrors.employeeName && <li>{formErrors.employeeName}</li>}
              {formErrors.beginningDate && <li>{formErrors.beginningDate}</li>}
              {formErrors.endingDate && <li>{formErrors.endingDate}</li>}
              {formErrors.rows && formErrors.rows.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Metadata Inputs */}
        <div style={styles.headerGrid}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="employee-name">Employee Name</label>
            <input
              id="employee-name"
              type="text"
              value={employeeName}
              placeholder="e.g. Aida Garba"
              onChange={(e) => {
                setEmployeeName(e.target.value);
                saveTimesheetDraft({ employeeName: e.target.value, beginningDate, endingDate, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Department Name</label>
            <input
              type="text"
              value={departmentName}
              disabled
              style={styles.disabledInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="beginning-date">Beginning Date</label>
            <input
              id="beginning-date"
              type="date"
              value={beginningDate}
              onChange={(e) => {
                setBeginningDate(e.target.value);
                saveTimesheetDraft({ employeeName, beginningDate: e.target.value, endingDate, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="ending-date">Ending Date</label>
            <input
              id="ending-date"
              type="date"
              value={endingDate}
              onChange={(e) => {
                setEndingDate(e.target.value);
                saveTimesheetDraft({ employeeName, beginningDate, endingDate: e.target.value, entries, pdfFileName });
              }}
              style={styles.textInput}
            />
          </div>
        </div>

        {/* Timesheet Entries Table */}
        <div style={styles.tableCard} className="table-card-box">
          <div style={styles.tableScroll}>
            <table style={styles.table} id="timesheet-table">
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.th, width: '160px' }}>Date</th>
                  <th style={styles.th}>Shift 1 In</th>
                  <th style={styles.th}>Shift 1 Out</th>
                  <th style={styles.th}>Shift 2 In</th>
                  <th style={styles.th}>Shift 2 Out</th>
                  <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>Daily Hours</th>
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
                        aria-label={`Date for shift ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'date', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeIn1}
                        aria-label={`Shift 1 In for shift ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeIn1', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeOut1}
                        aria-label={`Shift 1 Out for shift ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeOut1', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeIn2}
                        aria-label={`Shift 2 In for shift ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeIn2', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="time"
                        value={entry.timeOut2}
                        aria-label={`Shift 2 Out for shift ${idx + 1}`}
                        onChange={(e) => handleEntryChange(entry.id, 'timeOut2', e.target.value)}
                        style={styles.tableInput}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                      {entry.totalHours ? entry.totalHours.toFixed(2) : '0.00'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }} className="no-print">
                      <button 
                        type="button" 
                        onClick={() => removeRow(entry.id)} 
                        style={styles.rowDeleteBtn}
                        aria-label={`Delete row ${idx + 1}`}
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
              + Add Work Row
            </button>
          </div>
        </div>

        {/* Grand Total Bar */}
        <div style={styles.totalBar}>
          <span style={styles.totalLabel}>Grand Total worked hours:</span>
          <span style={styles.totalValue}>{totalHoursSum.toFixed(2)} hrs</span>
        </div>

        {/* Naming Configuration Box */}
        <div style={styles.namingCard} className="no-print">
          <label style={styles.namingLabel} htmlFor="pdf-filename-input">PDF File Name before downloading</label>
          <div style={styles.namingInputWrapper}>
            <input
              id="pdf-filename-input"
              type="text"
              value={pdfFileName}
              placeholder="Aida_Garba_Timesheet_June_2026.pdf"
              onChange={(e) => {
                setPdfFileName(e.target.value);
                setIsFileNameEdited(true);
                saveTimesheetDraft({ employeeName, beginningDate, endingDate, entries, pdfFileName: e.target.value });
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

      {/* Signature lines visible ONLY in browser printing (hidden on normal web layout via CSS print class, but rendered clean in window.print) */}
      <div className="print-only-signatures" style={styles.printSignatures}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ width: '45%', verticalAlign: 'bottom' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>EMPLOYEE SIGNATURE</div>
              </td>
              <td style={{ width: '10%', verticalAlign: 'bottom' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>DATE</div>
              </td>
              <td style={{ width: '35%', verticalAlign: 'bottom', paddingLeft: '20px' }}>
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>SUPERVISOR: BENJAMIN DAVIS</div>
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
        employeeName={employeeName}
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
    fontSize: '15px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#333333',
    marginTop: '4px',
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0
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
  disabledInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    cursor: 'not-allowed'
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
    display: 'none', // Hidden in web view, custom CSS shows it on print
    marginTop: '40px'
  }
};
