import React, { useState, useEffect } from 'react';
import { Download, Printer, Send, Trash2 } from 'lucide-react';
import { saveTimesheetDraft, getTimesheetDraft, clearTimesheetDraft } from '../utils/storage';
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
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return 'Month_Year';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_');
};

const populateSequentialDates = (start) => {
  if (!start) return { w1: Array(7).fill(''), w2: Array(7).fill('') };
  const w1 = [];
  const w2 = [];
  const base = new Date(start + 'T00:00:00');
  if (isNaN(base.getTime())) return { w1: Array(7).fill(''), w2: Array(7).fill('') };
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    w1.push(d.toISOString().split('T')[0]);
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    w2.push(d.toISOString().split('T')[0]);
  }
  return { w1, w2 };
};

const defaultRow = (id, date = '') => ({
  id,
  date,
  timeIn1: '',
  timeOut1: '',
  timeIn2: '',
  timeOut2: '',
  totalHours: 0,
  studentNameId: '',
  subject: '',
  notes: ''
});

export default function TimesheetForm({ onFormSubmitSuccess }) {
  // Form metadata states
  const [employeeName, setEmployeeName] = useState('');
  const [beginningDate, setBeginningDate] = useState('');
  const [endingDate, setEndingDate] = useState('');

  // Weekly entries
  const [week1Entries, setWeek1Entries] = useState(
    Array.from({ length: 7 }, (_, i) => defaultRow(`w1-${i}`))
  );
  const [week2Entries, setWeek2Entries] = useState(
    Array.from({ length: 7 }, (_, i) => defaultRow(`w2-${i}`))
  );

  // Transient signatures (not saved in localStorage)
  const [employeeSignature, setEmployeeSignature] = useState(null);
  const [employerSignature, setEmployerSignature] = useState(null);
  const [payrollSignature, setPayrollSignature] = useState(null);

  // Dates for signatures
  const [employeeSignDate, setEmployeeSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [employerSignDate, setEmployerSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollSignDate, setPayrollSignDate] = useState(new Date().toISOString().split('T')[0]);

  // PDF Naming configuration
  const [pdfFileName, setPdfFileName] = useState('Employee_Timesheet_Month_Year.pdf');
  const [isFileNameEdited, setIsFileNameEdited] = useState(false);

  // UI status states
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
      if (draft.week1Entries && draft.week1Entries.length === 7) {
        setWeek1Entries(draft.week1Entries);
      }
      if (draft.week2Entries && draft.week2Entries.length === 7) {
        setWeek2Entries(draft.week2Entries);
      }
      if (draft.employeeSignDate) setEmployeeSignDate(draft.employeeSignDate);
      if (draft.employerSignDate) setEmployerSignDate(draft.employerSignDate);
      if (draft.payrollSignDate) setPayrollSignDate(draft.payrollSignDate);
      if (draft.pdfFileName) {
        setPdfFileName(draft.pdfFileName);
        setIsFileNameEdited(true);
      }
      showToast('Restored draft Timesheet progress.');
    }
  }, []);

  // Sync auto-dates when beginningDate changes
  useEffect(() => {
    if (!beginningDate) return;

    // Auto calculate ending date as beginningDate + 13 days
    const base = new Date(beginningDate + 'T00:00:00');
    if (!isNaN(base.getTime())) {
      const end = new Date(base);
      end.setDate(base.getDate() + 13);
      setEndingDate(end.toISOString().split('T')[0]);
    }

    // Populate daily rows
    const { w1, w2 } = populateSequentialDates(beginningDate);
    setWeek1Entries(prev => prev.map((entry, idx) => ({ ...entry, date: w1[idx] })));
    setWeek2Entries(prev => prev.map((entry, idx) => ({ ...entry, date: w2[idx] })));
  }, [beginningDate]);

  // Auto-generate filename when employeeName or beginningDate changes
  useEffect(() => {
    if (isFileNameEdited) return;

    const formattedName = (employeeName || 'Employee').trim().replace(/\s+/g, '_');
    const monthYear = getMonthYearStr(beginningDate);
    setPdfFileName(`${formattedName}_Timesheet_${monthYear}.pdf`);
  }, [employeeName, beginningDate, isFileNameEdited]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleEntryChange = (week, idx, field, value) => {
    const updateRow = (row) => {
      const updated = { ...row, [field]: value };
      if (['timeIn1', 'timeOut1', 'timeIn2', 'timeOut2'].includes(field)) {
        const diff1 = calculateDiff(updated.timeIn1, updated.timeOut1);
        const diff2 = calculateDiff(updated.timeIn2, updated.timeOut2);
        updated.totalHours = diff1 + diff2;
      }
      return updated;
    };

    if (week === 1) {
      const updatedEntries = week1Entries.map((row, i) => (i === idx ? updateRow(row) : row));
      setWeek1Entries(updatedEntries);
      saveTimesheetDraft({
        employeeName,
        beginningDate,
        endingDate,
        week1Entries: updatedEntries,
        week2Entries,
        employeeSignDate,
        employerSignDate,
        payrollSignDate,
        pdfFileName
      });
    } else {
      const updatedEntries = week2Entries.map((row, i) => (i === idx ? updateRow(row) : row));
      setWeek2Entries(updatedEntries);
      saveTimesheetDraft({
        employeeName,
        beginningDate,
        endingDate,
        week1Entries,
        week2Entries: updatedEntries,
        employeeSignDate,
        employerSignDate,
        payrollSignDate,
        pdfFileName
      });
    }
  };

  const totalHoursWeek1 = week1Entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
  const totalHoursWeek2 = week2Entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
  const totalHoursPeriod = totalHoursWeek1 + totalHoursWeek2;

  const validateForm = () => {
    const errors = {};
    if (!employeeName.trim()) errors.employeeName = 'Employee Name is required';
    if (!beginningDate) errors.beginningDate = 'Beginning Date is required';
    if (!endingDate) errors.endingDate = 'Ending Date is required';

    const checkShifts = (entry, idx, weekNum) => {
      const errorsList = [];
      const label = `Week ${weekNum} Day ${idx + 1}`;
      if ((entry.timeIn1 && !entry.timeOut1) || (!entry.timeIn1 && entry.timeOut1)) {
        errorsList.push(`${label}: Shift 1 requires both In and Out times.`);
      } else if (entry.timeIn1 && entry.timeOut1) {
        if (timeToDecimal(entry.timeOut1) <= timeToDecimal(entry.timeIn1)) {
          errorsList.push(`${label}: Shift 1 Out must be after In time.`);
        }
      }
      if ((entry.timeIn2 && !entry.timeOut2) || (!entry.timeIn2 && entry.timeOut2)) {
        errorsList.push(`${label}: Shift 2 requires both In and Out times.`);
      } else if (entry.timeIn2 && entry.timeOut2) {
        if (timeToDecimal(entry.timeOut2) <= timeToDecimal(entry.timeIn2)) {
          errorsList.push(`${label}: Shift 2 Out must be after In time.`);
        }
      }
      return errorsList;
    };

    let rowErrors = [];
    week1Entries.forEach((entry, idx) => {
      rowErrors = [...rowErrors, ...checkShifts(entry, idx, 1)];
    });
    week2Entries.forEach((entry, idx) => {
      rowErrors = [...rowErrors, ...checkShifts(entry, idx, 2)];
    });

    if (rowErrors.length > 0) {
      errors.rows = rowErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPayload = () => ({
    employeeName,
    departmentName: 'Success Center',
    beginningDate,
    endingDate,
    week1Entries,
    week2Entries,
    totalHoursWeek1,
    totalHoursWeek2,
    totalHoursPeriod,
    employeeSignature,
    employerSignature,
    payrollSignature,
    employeeSignDate,
    employerSignDate,
    payrollSignDate
  });

  const handleDownloadPDF = async () => {
    if (!validateForm()) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }
    try {
      showToast('Generating official Timesheet PDF...');
      await generatePDF('timesheet', getPayload(), pdfFileName);
      showToast('Timesheet PDF downloaded successfully.');
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
      await generatePDF('timesheet', getPayload(), pdfFileName);

      const bDateStr = beginningDate ? new Date(beginningDate + 'T00:00:00').toLocaleDateString() : '';
      const eDateStr = endingDate ? new Date(endingDate + 'T00:00:00').toLocaleDateString() : '';
      setEmailSubject(`Livingstone Success Center - Timesheet Submission - ${employeeName}`);
      setEmailBody(
        `Dear Mr. Davis,\n\nPlease find attached my Success Center Monthly Timesheet.\n\n` +
        `Reporting Period: ${bDateStr} to ${eDateStr}\n` +
        `Total worked hours this period: ${totalHoursPeriod.toFixed(2)} hours\n` +
        `  - Week 1: ${totalHoursWeek1.toFixed(2)} hours\n` +
        `  - Week 2: ${totalHoursWeek2.toFixed(2)} hours\n\n` +
        `Best regards,\n${employeeName}`
      );
      setIsEmailModalOpen(true);
    } catch (error) {
      showToast('Failed to compile timesheet.', 'error');
    }
  };

  const handlePrintForm = () => {
    window.print();
  };

  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear this entire timesheet form?')) {
      setEmployeeName('');
      setBeginningDate('');
      setEndingDate('');
      setWeek1Entries(Array.from({ length: 7 }, (_, i) => defaultRow(`w1-${i}`)));
      setWeek2Entries(Array.from({ length: 7 }, (_, i) => defaultRow(`w2-${i}`)));
      setEmployeeSignature(null);
      setEmployerSignature(null);
      setPayrollSignature(null);
      setEmployeeSignDate(new Date().toISOString().split('T')[0]);
      setEmployerSignDate(new Date().toISOString().split('T')[0]);
      setPayrollSignDate(new Date().toISOString().split('T')[0]);
      setPdfFileName('Employee_Timesheet_Month_Year.pdf');
      setIsFileNameEdited(false);
      clearTimesheetDraft();
      showToast('Timesheet cleared.');
    }
  };

  const renderTable = (entries, weekNum) => (
    <div style={styles.tableCard} className="table-card-box">
      <div style={styles.tableTitleRow}>
        Week {weekNum} Logs
      </div>
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={{ ...styles.th, width: '130px' }}>Date</th>
              <th style={styles.th}>Shift 1 In</th>
              <th style={styles.th}>Shift 1 Out</th>
              <th style={styles.th}>Shift 2 In</th>
              <th style={styles.th}>Shift 2 Out</th>
              <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Daily Hrs</th>
              <th style={{ ...styles.th, width: '150px' }}>Student Name & ID</th>
              <th style={{ ...styles.th, width: '150px' }}>Subject / Topic</th>
              <th style={{ ...styles.th, width: '180px' }}>Progress Notes / Comments</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id} style={styles.tableBodyRow}>
                <td style={styles.td}>
                  <input
                    type="date"
                    value={entry.date}
                    aria-label={`Week ${weekNum} Day ${idx + 1} Date`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'date', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={entry.timeIn1}
                    aria-label={`Week ${weekNum} Day ${idx + 1} Shift 1 In`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'timeIn1', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={entry.timeOut1}
                    aria-label={`Week ${weekNum} Day ${idx + 1} Shift 1 Out`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'timeOut1', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={entry.timeIn2}
                    aria-label={`Week ${weekNum} Day ${idx + 1} Shift 2 In`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'timeIn2', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={entry.timeOut2}
                    aria-label={`Week ${weekNum} Day ${idx + 1} Shift 2 Out`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'timeOut2', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>
                  {entry.totalHours ? entry.totalHours.toFixed(2) : '0.00'}
                </td>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={entry.studentNameId}
                    placeholder="e.g. John Doe (LC0012)"
                    aria-label={`Week ${weekNum} Day ${idx + 1} Student Details`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'studentNameId', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={entry.subject}
                    placeholder="e.g. Essay Review"
                    aria-label={`Week ${weekNum} Day ${idx + 1} Subject`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'subject', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="text"
                    value={entry.notes}
                    placeholder="Tutoring notes"
                    aria-label={`Week ${weekNum} Day ${idx + 1} Notes`}
                    onChange={(e) => handleEntryChange(weekNum, idx, 'notes', e.target.value)}
                    style={styles.tableInput}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={styles.weeklySummaryRow}>
        <span>Week {weekNum} Total Worked Hours:</span>
        <span style={styles.weeklySummaryVal}>{weekNum === 1 ? totalHoursWeek1.toFixed(2) : totalHoursWeek2.toFixed(2)} hrs</span>
      </div>
    </div>
  );

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

      {/* Official double underline Header */}
      <div className="printable-form-header" style={styles.officialHeader}>
        <h1 style={styles.collegeName}>Livingstone College</h1>
        <h2 style={styles.formTitle}>Success Center Monthly Timesheet</h2>
        <p style={styles.subtext}>Department: Success Center • Salisbury, North Carolina 28144</p>
      </div>

      <div style={styles.formWrapper} className="form-wrapper-box">
        {/* Validation Errors banner */}
        {Object.keys(formErrors).length > 0 && (
          <div style={styles.errorBanner} id="timesheet-error-banner" className="no-print">
            <p style={{ margin: '0 0 5px 0', fontWeight: '700' }}>Please review the following issues:</p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {formErrors.employeeName && <li>{formErrors.employeeName}</li>}
              {formErrors.beginningDate && <li>{formErrors.beginningDate}</li>}
              {formErrors.endingDate && <li>{formErrors.endingDate}</li>}
              {formErrors.rows && formErrors.rows.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* Metadata grid */}
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
                saveTimesheetDraft({
                  employeeName: e.target.value,
                  beginningDate,
                  endingDate,
                  week1Entries,
                  week2Entries,
                  employeeSignDate,
                  employerSignDate,
                  payrollSignDate,
                  pdfFileName
                });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Department Name</label>
            <input
              type="text"
              value="Success Center"
              disabled
              style={styles.disabledInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="beginning-date">Reporting Start Date</label>
            <input
              id="beginning-date"
              type="date"
              value={beginningDate}
              onChange={(e) => {
                setBeginningDate(e.target.value);
                saveTimesheetDraft({
                  employeeName,
                  beginningDate: e.target.value,
                  endingDate,
                  week1Entries,
                  week2Entries,
                  employeeSignDate,
                  employerSignDate,
                  payrollSignDate,
                  pdfFileName
                });
              }}
              style={styles.textInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel} htmlFor="ending-date">Reporting End Date</label>
            <input
              id="ending-date"
              type="date"
              value={endingDate}
              onChange={(e) => {
                setEndingDate(e.target.value);
                saveTimesheetDraft({
                  employeeName,
                  beginningDate,
                  endingDate: e.target.value,
                  week1Entries,
                  week2Entries,
                  employeeSignDate,
                  employerSignDate,
                  payrollSignDate,
                  pdfFileName
                });
              }}
              style={styles.textInput}
            />
          </div>
        </div>

        {/* Logs tables */}
        {renderTable(week1Entries, 1)}
        {renderTable(week2Entries, 2)}

        {/* Period Totals display */}
        <div style={styles.totalBar}>
          <span style={styles.totalLabel}>Total Hours Logged This Reporting Period:</span>
          <span style={styles.totalValue}>{totalHoursPeriod.toFixed(2)} hrs</span>
        </div>

        {/* Signature drawing pads grid */}
        <div style={styles.signatureSection} className="no-print">
          <h3 style={styles.signatureSectionTitle}>Signatures Required</h3>
          <div style={styles.signatureGrid}>
            {/* Employee Signature */}
            <div style={styles.sigCard}>
              <label style={styles.sigLabel}>1. Employee Signature</label>
              <SignaturePad
                key={employeeSignature ? 'employee-has' : 'employee-none'}
                onSave={(sigData) => setEmployeeSignature(sigData)}
                onClear={() => setEmployeeSignature(null)}
                width={380}
                height={100}
              />
              <div style={{ ...styles.formGroup, marginTop: '8px' }}>
                <label style={styles.sigDateLabel} htmlFor="employee-sign-date">Date Signed</label>
                <input
                  id="employee-sign-date"
                  type="date"
                  value={employeeSignDate}
                  onChange={(e) => {
                    setEmployeeSignDate(e.target.value);
                    saveTimesheetDraft({
                      employeeName,
                      beginningDate,
                      endingDate,
                      week1Entries,
                      week2Entries,
                      employeeSignDate: e.target.value,
                      employerSignDate,
                      payrollSignDate,
                      pdfFileName
                    });
                  }}
                  style={styles.sigDateInput}
                />
              </div>
            </div>

            {/* Employer Signature */}
            <div style={styles.sigCard}>
              <label style={styles.sigLabel}>2. Employer / Supervisor Signature</label>
              <SignaturePad
                key={employerSignature ? 'employer-has' : 'employer-none'}
                onSave={(sigData) => setEmployerSignature(sigData)}
                onClear={() => setEmployerSignature(null)}
                width={380}
                height={100}
              />
              <div style={{ ...styles.formGroup, marginTop: '8px' }}>
                <label style={styles.sigDateLabel} htmlFor="employer-sign-date">Date Signed</label>
                <input
                  id="employer-sign-date"
                  type="date"
                  value={employerSignDate}
                  onChange={(e) => {
                    setEmployerSignDate(e.target.value);
                    saveTimesheetDraft({
                      employeeName,
                      beginningDate,
                      endingDate,
                      week1Entries,
                      week2Entries,
                      employeeSignDate,
                      employerSignDate: e.target.value,
                      payrollSignDate,
                      pdfFileName
                    });
                  }}
                  style={styles.sigDateInput}
                />
              </div>
            </div>

            {/* Payroll Signature */}
            <div style={styles.sigCard}>
              <label style={styles.sigLabel}>3. Payroll Department Signature</label>
              <SignaturePad
                key={payrollSignature ? 'payroll-has' : 'payroll-none'}
                onSave={(sigData) => setPayrollSignature(sigData)}
                onClear={() => setPayrollSignature(null)}
                width={380}
                height={100}
              />
              <div style={{ ...styles.formGroup, marginTop: '8px' }}>
                <label style={styles.sigDateLabel} htmlFor="payroll-sign-date">Date Signed</label>
                <input
                  id="payroll-sign-date"
                  type="date"
                  value={payrollSignDate}
                  onChange={(e) => {
                    setPayrollSignDate(e.target.value);
                    saveTimesheetDraft({
                      employeeName,
                      beginningDate,
                      endingDate,
                      week1Entries,
                      week2Entries,
                      employeeSignDate,
                      employerSignDate,
                      payrollSignDate: e.target.value,
                      pdfFileName
                    });
                  }}
                  style={styles.sigDateInput}
                />
              </div>
            </div>
          </div>
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
                saveTimesheetDraft({
                  employeeName,
                  beginningDate,
                  endingDate,
                  week1Entries,
                  week2Entries,
                  employeeSignDate,
                  employerSignDate,
                  payrollSignDate,
                  pdfFileName: e.target.value
                });
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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ width: '28%', verticalAlign: 'bottom', position: 'relative' }}>
                {employeeSignature && (
                  <img 
                    src={employeeSignature} 
                    alt="Employee Signature" 
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
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>EMPLOYEE SIGNATURE</div>
                <div style={{ marginTop: '2px', fontStyle: 'italic', fontSize: '9px' }}>Date: {employeeSignDate || '—'}</div>
              </td>
              <td style={{ width: '36%', verticalAlign: 'bottom', paddingLeft: '15px', position: 'relative' }}>
                {employerSignature && (
                  <img 
                    src={employerSignature} 
                    alt="Employer Signature" 
                    style={{ 
                      position: 'absolute', 
                      bottom: '22px', 
                      left: '25px', 
                      height: '35px', 
                      pointerEvents: 'none' 
                    }} 
                  />
                )}
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>EMPLOYER / SUPERVISOR SIGNATURE</div>
                <div style={{ marginTop: '2px', fontStyle: 'italic', fontSize: '9px' }}>Date: {employerSignDate || '—'}</div>
              </td>
              <td style={{ width: '36%', verticalAlign: 'bottom', paddingLeft: '15px', position: 'relative' }}>
                {payrollSignature && (
                  <img 
                    src={payrollSignature} 
                    alt="Payroll Signature" 
                    style={{ 
                      position: 'absolute', 
                      bottom: '22px', 
                      left: '25px', 
                      height: '35px', 
                      pointerEvents: 'none' 
                    }} 
                  />
                )}
                <div style={{ borderBottom: '1px solid #000000', height: '35px', width: '90%' }}></div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>PAYROLL DEPT SIGNATURE</div>
                <div style={{ marginTop: '2px', fontStyle: 'italic', fontSize: '9px' }}>Date: {payrollSignDate || '—'}</div>
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Administrative Note Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          fontSize: '9px',
          borderTop: '1px solid #000000',
          paddingTop: '8px',
          textTransform: 'uppercase',
          color: '#333333',
          letterSpacing: '0.5px',
          fontFamily: 'sans-serif'
        }}>
          LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NORTH CAROLINA 28144 • SUPERVISOR: BENJAMIN DAVIS (bdavis1@livingstone.edu)
        </div>
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
    maxWidth: '1280px', // Expanded for tabular space
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    marginBottom: '24px'
  },
  tableTitleRow: {
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: '8px 16px',
    fontWeight: '700',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableScroll: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    minWidth: '950px' // Ensures horizontal scroll works on small viewports
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
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000'
  },
  weeklySummaryRow: {
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '700',
    fontSize: '13px'
  },
  weeklySummaryVal: {
    color: '#000000',
    fontSize: '14px'
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
  signatureSection: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    backgroundColor: '#fafafa'
  },
  signatureSectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#334155',
    marginBottom: '12px'
  },
  signatureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
  },
  sigCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sigLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#000000',
    letterSpacing: '0.5px'
  },
  sigDateLabel: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b'
  },
  sigDateInput: {
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#ffffff',
    color: '#000000',
    outline: 'none',
    width: '100%',
    maxWidth: '180px'
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
    display: 'none',
    marginTop: '40px'
  }
};
