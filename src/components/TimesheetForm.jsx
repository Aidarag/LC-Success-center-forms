import { useState, useEffect } from 'react';
import { Download, Printer, Send, Plus, X, Save, Trash2 } from 'lucide-react';
import { saveTimesheetDraft, getTimesheetDraft, clearTimesheetDraft } from '../utils/storage';
import { generatePDF } from '../utils/pdfGenerator';
import EmailModal from './EmailModal';
import SignaturePad from './SignaturePad';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToDecimal = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};


const isRowEmpty = (entry) => {
  return !(
    entry.date ||
    entry.timeIn1 ||
    entry.timeOut1 ||
    entry.timeIn2 ||
    entry.timeOut2 ||
    entry.studentNameId ||
    entry.subject ||
    entry.notes
  );
};

const getDayOfWeek = (dateStr) => {
  if (!dateStr) return -1;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return -1;
  return d.getDay();
};

const getOrAdjustValidDate = (dateStr) => {
  if (!dateStr) return '';
  let d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  let day = d.getDay();
  if (day === 6) {
    d.setDate(d.getDate() + 2);
  } else if (day === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
};

const getNextValidDate = (dateStr) => {
  if (!dateStr) return '';
  let d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 1);
  let day = d.getDay();
  if (day === 6) {
    d.setDate(d.getDate() + 2);
  } else if (day === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
};


const monthYearStr = (dateStr) => {
  if (!dateStr) return 'Month_Year';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Month_Year';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_');
};


// ─── ID factories ─────────────────────────────────────────────────────────────
let _rid = 0;
const mkRow = () => ({
  id: `r${++_rid}-${Date.now()}`,
  date: '',
  timeIn1: '', timeOut1: '',
  timeIn2: '', timeOut2: '',
  totalHours: 0,
  studentNameId: '', subject: '', notes: ''
});

let _wid = 0;
const mkWeek = (num) => ({
  id: `w${++_wid}-${Date.now()}`,
  weekNum: num,
  startDate: '',
  entries: [mkRow()]
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimesheetForm() {
  const [employeeName, setEmployeeName]     = useState('');
  const [weeks, setWeeks]                   = useState([mkWeek(1)]);
  const [term, setTerm]                     = useState('Summer');

  // Signatures: session-only, not persisted
  const [employeeSignature, setEmployeeSignature] = useState(null);
  const [supervisorSignature, setSupervisorSignature] = useState(null);
  const [payrollSignature, setPayrollSignature] = useState(null);
  
  // Shared Approval Date
  const [approvalDate, setApprovalDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // PDF filename
  const [pdfFileName, setPdfFileName]     = useState('Employee_Timesheet_Month_Year.pdf');
  const [fileNameEdited, setFileNameEdited] = useState(false);

  // UI helpers
  const [toast, setToast]               = useState(null);
  const [formErrors, setFormErrors]     = useState({});
  const [emailOpen, setEmailOpen]       = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody]       = useState('');

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load draft on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const draft = getTimesheetDraft();
    if (!draft) return;
    if (draft.employeeName)     setEmployeeName(draft.employeeName);
    if (draft.weeks?.length > 0) setWeeks(draft.weeks);
    if (draft.approvalDate)     setApprovalDate(draft.approvalDate);
    if (draft.pdfFileName)      { setPdfFileName(draft.pdfFileName); setFileNameEdited(true); }
    if (draft.term)             setTerm(draft.term);
    showToast('A saved draft was found and restored.');
  }, []);

  // ── Auto-generate PDF filename ──────────────────────────────────────────────
  useEffect(() => {
    if (fileNameEdited) return;
    const name = (employeeName || 'Employee').trim().replace(/\s+/g, '_');
    const my   = monthYearStr(weeks[0]?.startDate);
    setPdfFileName(`${name}_Timesheet_${my}.pdf`);
  }, [employeeName, weeks, fileNameEdited]);

  // ── Persist draft (Manual save is used now) ─────────────────────────────────
  const persist = () => {};

  const handleSaveDraft = () => {
    const success = saveTimesheetDraft({
      employeeName,
      weeks,
      approvalDate,
      pdfFileName,
      term
    });
    if (success) {
      showToast('Draft saved successfully.');
    } else {
      showToast('Failed to save draft.', 'error');
    }
  };

  const handleClearDraft = () => {
    if (!window.confirm('Clear the saved draft and start over?')) return;
    clearTimesheetDraft();
    setEmployeeName('');
    setWeeks([mkWeek(1)]);
    setTerm('Summer');
    setEmployeeSignature(null);
    setSupervisorSignature(null);
    setPayrollSignature(null);
    setApprovalDate(new Date().toISOString().split('T')[0]);
    setPdfFileName('Employee_Timesheet_Month_Year.pdf');
    setFileNameEdited(false);
    showToast('Draft cleared.');
  };


  // ── Totals ──────────────────────────────────────────────────────────────────
  const weekTotals      = weeks.map(w => w.entries.filter(e => !isRowEmpty(e)).reduce((s, e) => s + (e.totalHours || 0), 0));
  const periodTotal     = weekTotals.reduce((s, t) => s + t, 0);

  // ── Week actions ────────────────────────────────────────────────────────────
  const handleAddWeek = () => {
    const updated = [...weeks, mkWeek(weeks.length + 1)];
    setWeeks(updated);
    persist({ weeks: updated });
  };

  const handleRemoveWeek = (weekId) => {
    if (weeks.length === 1) { showToast('At least one week is required.', 'error'); return; }
    const filtered   = weeks.filter(w => w.id !== weekId);
    const renumbered = filtered.map((w, i) => ({ ...w, weekNum: i + 1 }));
    setWeeks(renumbered);
    persist({ weeks: renumbered });
  };

  // ── Row actions ─────────────────────────────────────────────────────────────
  const handleAddRow = (weekId) => {
    const updated = weeks.map(w => {
      if (w.id !== weekId || w.entries.length >= 7) return w;
      const entries = w.entries;
      const lastEntry = entries[entries.length - 1];
      let nextDate = '';
      if (lastEntry && lastEntry.date) {
        nextDate = getNextValidDate(lastEntry.date, term);
      } else if (w.startDate) {
        nextDate = getOrAdjustValidDate(w.startDate, term);
      }
      return { ...w, entries: [...w.entries, { ...mkRow(), date: nextDate }] };
    });
    setWeeks(updated);
    persist({ weeks: updated });
  };

  const handleRemoveRow = (weekId, rowId) => {
    const updated = weeks.map(w => {
      if (w.id !== weekId || w.entries.length <= 1) return w;
      return { ...w, entries: w.entries.filter(e => e.id !== rowId) };
    });
    setWeeks(updated);
    persist({ weeks: updated });
  };

  // ── Field changes ───────────────────────────────────────────────────────────
  const handleWeekStartDate = (weekId, value) => {
    const updated = weeks.map(w => {
      if (w.id !== weekId) return w;
      let currentDate = getOrAdjustValidDate(value, term);
      const newEntries = w.entries.map((e, idx) => {
        if (idx === 0) {
          return { ...e, date: currentDate };
        } else {
          currentDate = getNextValidDate(currentDate, term);
          return { ...e, date: currentDate };
        }
      });
      return {
        ...w,
        startDate: value,
        entries: newEntries
      };
    });
    setWeeks(updated);
    persist({ weeks: updated });
  };

  const handleEntryChange = (weekId, rowId, field, value) => {
    let alertShown = false;
    const updated = weeks.map(w => {
      if (w.id !== weekId) return w;
      return {
        ...w,
        entries: w.entries.map(e => {
          if (e.id !== rowId) return e;
          const next = { ...e, [field]: value };

          // Real-time date validation
          if (field === 'date' && value) {
            const day = getDayOfWeek(value);
            if (day === 0 || day === 6) {
              if (term === 'Summer') {
                alert('Summer entries must be Monday through Friday.');
              } else {
                alert('Please select a valid workday.');
              }
            }
          }

          if (['timeIn1','timeOut1','timeIn2','timeOut2'].includes(field)) {
            const startHour = term === 'Summer' ? '09:00' : '08:00';
            const endHour = term === 'Summer' ? '17:00' : '20:00';
            const hourAlert = term === 'Summer'
              ? 'Summer hours must be between 9:00 AM and 5:00 PM.'
              : 'Fall/Spring hours must be between 8:00 AM and 8:00 PM.';

            // Check validation for shift 1
            if (next.timeIn1 && next.timeOut1) {
              const in1 = timeToDecimal(next.timeIn1);
              const out1 = timeToDecimal(next.timeOut1);
              if (out1 < in1) {
                if (!alertShown) {
                  alert('End time must be after start time.');
                  alertShown = true;
                }
              } else if (next.timeIn1 < startHour || next.timeOut1 > endHour) {
                if (!alertShown) {
                  alert(hourAlert);
                  alertShown = true;
                }
              }
            }
            // Check validation for shift 2
            if (next.timeIn2 && next.timeOut2) {
              const in2 = timeToDecimal(next.timeIn2);
              const out2 = timeToDecimal(next.timeOut2);
              if (out2 < in2) {
                if (!alertShown) {
                  alert('End time must be after start time.');
                  alertShown = true;
                }
              } else if (next.timeIn2 < startHour || next.timeOut2 > endHour) {
                if (!alertShown) {
                  alert(hourAlert);
                  alertShown = true;
                }
              }
            }

            // Calculation
            let h1 = 0;
            if (next.timeIn1 && next.timeOut1) {
              const in1 = timeToDecimal(next.timeIn1);
              const out1 = timeToDecimal(next.timeOut1);
              if (out1 >= in1 && next.timeIn1 >= startHour && next.timeOut1 <= endHour) {
                h1 = out1 - in1;
              }
            }

            let h2 = 0;
            if (next.timeIn2 && next.timeOut2) {
              const in2 = timeToDecimal(next.timeIn2);
              const out2 = timeToDecimal(next.timeOut2);
              if (out2 >= in2 && next.timeIn2 >= startHour && next.timeOut2 <= endHour) {
                h2 = out2 - in2;
              }
            }

            next.totalHours = h1 + h2;
          }
          return next;
        })
      };
    });
    setWeeks(updated);
    persist({ weeks: updated });
  };

  const validate = () => {
    const errors = {};
    if (!employeeName.trim()) errors.employeeName = 'Employee Name is required.';

    const rowErrs = [];
    weeks.forEach(w => {
      if (!w.startDate) rowErrs.push(`Week ${w.weekNum}: Week Start Date is required.`);
      w.entries.forEach((e, i) => {
        const lbl = `Week ${w.weekNum} Work Entry ${i + 1}`;
        
        // Only validate if any time, student info, or text is typed in this row
        const hasData = e.date || e.timeIn1 || e.timeOut1 || e.timeIn2 || e.timeOut2 || e.studentNameId || e.subject || e.notes;
        
        if (hasData) {
          if (!e.date) {
            rowErrs.push(`${lbl}: Please select a date.`);
          } else {
            const day = getDayOfWeek(e.date);
            if (day === 0 || day === 6) {
              const dayAlert = term === 'Summer'
                ? 'Summer entries must be Monday through Friday.'
                : 'Please select a valid workday.';
              rowErrs.push(`${lbl}: ${dayAlert}`);
            }
          }

          const startHour = term === 'Summer' ? '09:00' : '08:00';
          const endHour = term === 'Summer' ? '17:00' : '20:00';
          const hourAlert = term === 'Summer'
            ? 'Summer hours must be between 9:00 AM and 5:00 PM.'
            : 'Fall/Spring hours must be between 8:00 AM and 8:00 PM.';

          // Shift 1
          if (e.timeIn1 || e.timeOut1) {
            if (!e.timeIn1) {
              rowErrs.push(`${lbl}: Start time is required.`);
            } else if (!e.timeOut1) {
              rowErrs.push(`${lbl}: End time is required.`);
            } else {
              const in1 = timeToDecimal(e.timeIn1);
              const out1 = timeToDecimal(e.timeOut1);
              if (out1 <= in1) {
                rowErrs.push(`${lbl}: End time must be after start time.`);
              } else if (e.timeIn1 < startHour || e.timeOut1 > endHour) {
                rowErrs.push(`${lbl}: ${hourAlert}`);
              }
            }
          }

          // Shift 2
          if (e.timeIn2 || e.timeOut2) {
            if (!e.timeIn2) {
              rowErrs.push(`${lbl}: Start time is required.`);
            } else if (!e.timeOut2) {
              rowErrs.push(`${lbl}: End time is required.`);
            } else {
              const in2 = timeToDecimal(e.timeIn2);
              const out2 = timeToDecimal(e.timeOut2);
              if (out2 <= in2) {
                rowErrs.push(`${lbl}: End time must be after start time.`);
              } else if (e.timeIn2 < startHour || e.timeOut2 > endHour) {
                rowErrs.push(`${lbl}: ${hourAlert}`);
              }
            }
          }
        }
      });
    });

    if (rowErrs.length) errors.rows = rowErrs;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── PDF payload ─────────────────────────────────────────────────────────────
  const getPayload = () => ({
    employeeName,
    departmentName: 'Success Center',
    term,
    weeks,
    weekTotals,
    periodTotal,
    employeeSignature,
    supervisorSignature,
    payrollSignature,
    approvalDate
  });

  // ── PDF actions ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!validate()) { showToast('Please fix form errors before downloading.', 'error'); return; }
    try {
      showToast('Generating PDF…');
      await generatePDF('timesheet', getPayload(), pdfFileName);
      showToast('PDF downloaded successfully.');
    } catch { showToast('PDF generation failed.', 'error'); }
  };

  const handleSubmit = async () => {
    if (!validate()) { showToast('Please fix form errors before submitting.', 'error'); return; }
    try {
      showToast('Preparing PDF for submission…');
      await generatePDF('timesheet', getPayload(), pdfFileName);
      setEmailSubject(`Livingstone Success Center – Timesheet Submission – ${employeeName}`);
      setEmailBody(
        `Dear Mr. Davis,\n\nPlease find attached my Success Center Monthly Timesheet.\n\n` +
        `Total hours this period: ${periodTotal.toFixed(2)}\n` +
        weeks.map((w, i) => `  • Week ${w.weekNum}: ${weekTotals[i].toFixed(2)} hrs`).join('\n') +
        `\n\nBest regards,\n${employeeName}`
      );
      setEmailOpen(true);
    } catch { showToast('Failed to compile timesheet.', 'error'); }
  };


  // ── Render a single week block ───────────────────────────────────────────────
  const renderWeek = (week, idx) => {
    const wTotal   = weekTotals[idx];
    const atMax    = week.entries.length >= 7;
    const canRemRow = week.entries.length > 1;

    return (
      <div key={week.id} style={S.weekCard} className="week-card">
        {/* Week header bar */}
        <div style={S.weekHeader}>
          <div style={S.weekHeaderLeft}>
            <span style={S.weekBadge}>WEEK {week.weekNum}</span>
            <div style={S.startDateWrap}>
              <label style={S.startDateLabel} htmlFor={`wsd-${week.id}`}>
                Week Start Date
              </label>
              <input
                id={`wsd-${week.id}`}
                type="date"
                value={week.startDate}
                onChange={e => handleWeekStartDate(week.id, e.target.value)}
                style={S.startDateInput}
              />
            </div>
          </div>
          {weeks.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveWeek(week.id)}
              style={S.removeWeekBtn}
              title={`Remove Week ${week.weekNum}`}
            >
              <X size={13} style={{ marginRight: 4 }} /> Remove Week
            </button>
          )}
        </div>

        {/* Scrollable table */}
        <div style={S.tableScroll}>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={{ ...S.th, width: 112 }}>Date</th>
                <th style={{ ...S.th, width: 96 }}>Shift 1 In</th>
                <th style={{ ...S.th, width: 96 }}>Shift 1 Out</th>
                <th style={{ ...S.th, width: 96 }}>Shift 2 In</th>
                <th style={{ ...S.th, width: 96 }}>Shift 2 Out</th>
                <th style={{ ...S.th, width: 96, textAlign: 'center' }}>Hours Worked</th>
                <th style={{ ...S.th, width: 160 }}>Student Name & ID</th>
                <th style={{ ...S.th, width: 210 }}>Subject / Topic</th>
                <th style={{ ...S.th, width: 270 }}>Progress Notes</th>
                {canRemRow && <th style={{ ...S.th, width: 34 }}></th>}
              </tr>
            </thead>
            <tbody>
              {week.entries.map((entry, rowIdx) => {
                return (
                  <tr key={entry.id} style={S.tbodyRow}>
                    {/* Editable Date */}
                    <td style={S.td}>
                      <input
                        type="date"
                        value={entry.date || ''}
                        onChange={e => handleEntryChange(week.id, entry.id, 'date', e.target.value)}
                        style={S.dateInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} Date`}
                      />
                    </td>
                    <td style={S.td}>
                      <input type="time" value={entry.timeIn1}
                        onChange={e => handleEntryChange(week.id, entry.id, 'timeIn1', e.target.value)}
                        style={S.timeInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} S1In`} />
                    </td>
                    <td style={S.td}>
                      <input type="time" value={entry.timeOut1}
                        onChange={e => handleEntryChange(week.id, entry.id, 'timeOut1', e.target.value)}
                        style={S.timeInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} S1Out`} />
                    </td>
                    <td style={S.td}>
                      <input type="time" value={entry.timeIn2}
                        onChange={e => handleEntryChange(week.id, entry.id, 'timeIn2', e.target.value)}
                        style={S.timeInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} S2In`} />
                    </td>
                    <td style={S.td}>
                      <input type="time" value={entry.timeOut2}
                        onChange={e => handleEntryChange(week.id, entry.id, 'timeOut2', e.target.value)}
                        style={S.timeInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} S2Out`} />
                    </td>
                    <td style={S.td}>
                      <input
                        type="text"
                        value={(entry.totalHours || 0).toFixed(2)}
                        readOnly
                        style={{
                          ...S.timeInput,
                          textAlign: 'center',
                          fontWeight: 700,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                          cursor: 'not-allowed'
                        }}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} Hours Worked`}
                      />
                    </td>
                    <td style={S.td}>
                      <input type="text" value={entry.studentNameId}
                        placeholder="e.g. Jane Doe (LC0012)"
                        onChange={e => handleEntryChange(week.id, entry.id, 'studentNameId', e.target.value)}
                        style={S.cellTextInput}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} Student`} />
                    </td>
                    <td style={S.td}>
                      {/* Subject — ~2 sentences */}
                      <textarea
                        value={entry.subject}
                        placeholder="Subject area and brief description…"
                        onChange={e => handleEntryChange(week.id, entry.id, 'subject', e.target.value)}
                        style={S.subjectArea}
                        rows={2}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} Subject`}
                      />
                    </td>
                    <td style={S.td}>
                      {/* Notes — ~4 sentences */}
                      <textarea
                        value={entry.notes}
                        placeholder="Session progress, areas of improvement, topics covered…"
                        onChange={e => handleEntryChange(week.id, entry.id, 'notes', e.target.value)}
                        style={S.notesArea}
                        rows={4}
                        aria-label={`Wk${week.weekNum} R${rowIdx+1} Notes`}
                      />
                    </td>
                    {canRemRow && (
                      <td style={{ ...S.td, verticalAlign: 'top', paddingTop: 10 }}>
                        <button type="button"
                          onClick={() => handleRemoveRow(week.id, entry.id)}
                          style={S.removeRowBtn}
                          title="Remove row"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Week footer: Add Work Entry + weekly total */}
        <div style={S.weekFooter}>
          <button
            type="button"
            onClick={() => handleAddRow(week.id)}
            disabled={atMax}
            style={atMax ? S.addRowBtnDisabled : S.addRowBtn}
          >
            <Plus size={13} style={{ marginRight: 4 }} />
            {atMax ? 'Max 7 Work Entries Reached' : '+ Add Work Entry'}
          </button>
          <div style={S.weekTotal}>
            <span style={S.weekTotalLabel}>Total Hours This Week:</span>
            <span style={S.weekTotalVal}>{wTotal.toFixed(2)} hrs</span>
          </div>
        </div>
      </div>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="form-page-layout" style={S.page}>

      {/* Toast */}
      {toast && (
        <div style={{
          ...S.toast,
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#18181b'
        }}>
          {toast.text}
        </div>
      )}

      {/* Official header */}
      <div className="printable-form-header" style={S.officialHeader}>
        <h1 style={S.collegeName}>Livingstone College</h1>
        <h2 style={S.formTitle}>Success Center Monthly Timesheet</h2>
        <p style={S.subtext}>Department: Success Center • Salisbury, North Carolina 28144</p>
      </div>

      <div style={S.card} className="form-wrapper-box">

        {/* Error banner */}
        {Object.keys(formErrors).length > 0 && (
          <div style={S.errorBanner} id="timesheet-error-banner" className="no-print">
            <strong>Please fix the following before continuing:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {formErrors.employeeName && <li>{formErrors.employeeName}</li>}
              {(formErrors.rows || []).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Meta row */}
        <div style={S.metaRow}>
          <div style={S.formGroup}>
            <label style={S.formLabel} htmlFor="employee-name">Employee Name</label>
            <input
              id="employee-name"
              type="text"
              value={employeeName}
              placeholder="e.g. Aida Garba"
              onChange={e => {
                setEmployeeName(e.target.value);
                persist({ employeeName: e.target.value });
              }}
              style={S.metaInput}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel} htmlFor="select-term">Select Term</label>
            <select
              id="select-term"
              value={term}
              onChange={e => {
                setTerm(e.target.value);
                persist({ term: e.target.value });
              }}
              style={S.metaInput}
            >
              <option value="Summer">Summer</option>
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Department</label>
            <input type="text" value="Success Center" disabled style={S.metaInputDisabled} />
          </div>
        </div>

        {/* Weeks */}
        <div style={S.weeksWrap}>
          {weeks.map((w, i) => renderWeek(w, i))}
        </div>

        {/* Add Week */}
        <div style={S.addWeekRow} className="no-print">
          <button type="button" onClick={handleAddWeek} style={S.addWeekBtn}>
            <Plus size={14} style={{ marginRight: 6 }} />
            Add Week {weeks.length + 1}
          </button>
        </div>

        {/* Period total */}
        <div style={S.periodTotal} className="totalBar">
          <span style={S.totalLabel}>Total Hours Overall</span>
          <span style={S.totalValue}>{periodTotal.toFixed(2)} hrs</span>
        </div>

        {/* Dedicated Approval Section */}
        <div style={S.approvalSection} className="no-print">
          <div style={S.approvalHeader}>
            <span style={S.approvalTitle}>TUTORING LOG & TIMESHEET APPROVAL</span>
            <span style={S.approvalSub}>Please complete signatures below to process payroll</span>
          </div>

          <div style={S.approvalRow}>
            {/* Employee Signature */}
            <div style={S.sigCol}>
              <label style={S.formLabel}>Employee Signature</label>
              <SignaturePad
                key={employeeSignature ? 'has-emp-sig' : 'no-emp-sig'}
                onSave={d => setEmployeeSignature(d)}
                onClear={() => setEmployeeSignature(null)}
                width={360}
                height={100}
              />
            </div>

            {/* Supervisor Signature */}
            <div style={S.sigCol}>
              <label style={S.formLabel}>Supervisor Signature</label>
              <SignaturePad
                key={supervisorSignature ? 'has-sup-sig' : 'no-sup-sig'}
                onSave={d => setSupervisorSignature(d)}
                onClear={() => setSupervisorSignature(null)}
                width={360}
                height={100}
              />
            </div>

            {/* Payroll Signature */}
            <div style={S.sigCol}>
              <label style={S.formLabel}>Payroll Department Signature</label>
              <SignaturePad
                key={payrollSignature ? 'has-pay-sig' : 'no-pay-sig'}
                onSave={d => setPayrollSignature(d)}
                onClear={() => setPayrollSignature(null)}
                width={360}
                height={100}
              />
            </div>
          </div>

          {/* Shared Date Field */}
          <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #dde1e7' }}>
            <label style={S.sigDateLabel} htmlFor="approval-date">Approval Date</label>
            <input
              id="approval-date"
              type="date"
              value={approvalDate}
              onChange={e => {
                setApprovalDate(e.target.value);
                persist({ approvalDate: e.target.value });
              }}
              style={S.sigDateInput}
            />
          </div>
        </div>

        {/* PDF filename */}
        <div style={S.namingCard} className="no-print">
          <label style={S.namingLabel} htmlFor="pdf-filename">PDF Filename</label>
          <div style={S.namingRow}>
            <input
              id="pdf-filename"
              type="text"
              value={pdfFileName}
              onChange={e => {
                setPdfFileName(e.target.value);
                setFileNameEdited(true);
                persist({ pdfFileName: e.target.value });
              }}
              style={S.namingInput}
            />
            {fileNameEdited && (
              <button type="button" style={S.resetBtn}
                onClick={() => { setFileNameEdited(false); showToast('Filename reset to auto.'); }}>
                Reset Default
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={S.actionsBar} className="no-print">
          <button type="button" onClick={handleClearDraft} style={S.clearBtn}>
            <Trash2 size={15} style={{ marginRight: 6 }} /> Clear Draft
          </button>
          <div style={S.mainActions}>
            <button type="button" onClick={handleSaveDraft} style={S.saveDraftBtn}>
              <Save size={15} style={{ marginRight: 6 }} /> Save Draft
            </button>
            <button type="button" onClick={() => window.print()} style={S.printBtn}>
              <Printer size={15} style={{ marginRight: 6 }} /> Print Form
            </button>
            <button type="button" onClick={handleDownload} style={S.downloadBtn}>
              <Download size={15} style={{ marginRight: 6 }} /> Download PDF
            </button>
            <button type="button" onClick={handleSubmit} style={S.submitBtn}>
              <Send size={15} style={{ marginRight: 6 }} /> Submit PDF
            </button>
          </div>
        </div>
      </div>

      {/* Print-only signature line */}
      <div className="print-only-signatures" style={S.printSig}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '15px' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '30%' }}>
            {employeeSignature && (
              <img src={employeeSignature} alt="Signature"
                style={{ position: 'absolute', bottom: 20, left: 8, height: 36, pointerEvents: 'none' }} />
            )}
            <div style={{ borderBottom: '1px solid #000', height: 36, width: '100%' }} />
            <div style={{ marginTop: 5, fontWeight: 'bold', fontSize: 11 }}>EMPLOYEE SIGNATURE</div>
          </div>

          <div style={{ position: 'relative', display: 'inline-block', width: '30%' }}>
            {supervisorSignature && (
              <img src={supervisorSignature} alt="Signature"
                style={{ position: 'absolute', bottom: 20, left: 8, height: 36, pointerEvents: 'none' }} />
            )}
            <div style={{ borderBottom: '1px solid #000', height: 36, width: '100%' }} />
            <div style={{ marginTop: 5, fontWeight: 'bold', fontSize: 11 }}>SUPERVISOR SIGNATURE</div>
          </div>

          <div style={{ position: 'relative', display: 'inline-block', width: '30%' }}>
            {payrollSignature && (
              <img src={payrollSignature} alt="Signature"
                style={{ position: 'absolute', bottom: 20, left: 8, height: 36, pointerEvents: 'none' }} />
            )}
            <div style={{ borderBottom: '1px solid #000', height: 36, width: '100%' }} />
            <div style={{ marginTop: 5, fontWeight: 'bold', fontSize: 11 }}>PAYROLL SIGNATURE</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: '10px' }}>
          DATE SIGNED: {approvalDate || '—'}
        </div>
        <div style={S.printFooterNote}>
          LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NC 28144 • SUPERVISOR: BENJAMIN DAVIS (bdavis1@livingstone.edu)
        </div>
      </div>

      <EmailModal
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        pdfFileName={pdfFileName}
        subject={emailSubject}
        body={emailBody}
        employeeName={employeeName}
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// LC Design System palette:
//   #0f0f0f  deep black (seal ring)
//   #7da7c4  Livingstone blue (LC monogram)
//   #ddeaf3  blue tint (light wells)
//   #f5f6f8  page background
//   #ffffff  card surface
//   #dde1e7  rule / border
//   #111827  primary text
//   #374151  label text
//   #64748b  muted text

const S = {
  // ── Page wrapper ─────────────────────────────────────────────────────────
  page: {
    maxWidth: 1380,
    margin: '0 auto',
    padding: '28px 24px 64px'
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'fixed', top: 18, right: 18,
    padding: '11px 20px',
    color: '#fff', borderRadius: 6,
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
    zIndex: 1001,
    animation: 'slideIn 0.25s ease-out',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.01em'
  },

  // ── Print-only form header ─────────────────────────────────────────────────
  officialHeader: { display: 'none' },
  collegeName: { margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, textTransform: 'uppercase' },
  formTitle:   { margin: '4px 0 0', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5 },
  subtext:     { fontSize: 11, color: '#555', marginTop: 3 },

  // ── Main card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    border: '1px solid #dde1e7',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '28px 28px 24px'
  },

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderLeft: '3px solid #dc2626',
    color: '#991b1b',
    padding: '12px 16px', borderRadius: 6,
    fontSize: 13, marginBottom: 22,
    fontFamily: "'Inter', sans-serif"
  },

  // ── Metadata row ──────────────────────────────────────────────────────────
  metaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18, marginBottom: 28,
    padding: '20px',
    backgroundColor: '#f5f6f8',
    border: '1px solid #dde1e7',
    borderRadius: 6
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  formLabel: {
    fontSize: 13, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#0f0f0f', fontFamily: "'Inter', sans-serif",
    marginBottom: 6
  },
  metaInput: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 5, fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    color: '#111827', backgroundColor: '#fff',
    outline: 'none'
  },
  metaInputDisabled: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 5, fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed'
  },

  // ── Weeks container ───────────────────────────────────────────────────────
  weeksWrap: { display: 'flex', flexDirection: 'column', gap: 20 },

  // ── Week card ─────────────────────────────────────────────────────────────
  weekCard: {
    border: '1px solid #dde1e7',
    borderRadius: 7,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  weekHeader: {
    backgroundColor: '#0f0f0f',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '11px 18px'
  },
  weekHeaderLeft: { display: 'flex', alignItems: 'center', gap: 18 },
  weekBadge: {
    color: '#7da7c4', fontWeight: 700, fontSize: 12,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    fontFamily: "'Inter', sans-serif"
  },
  startDateWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  startDateLabel: {
    color: '#ffffff', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap'
  },
  startDateInput: {
    padding: '5px 9px',
    border: '1px solid #2d3748',
    borderRadius: 4, fontSize: 12,
    backgroundColor: '#1a1a1a',
    color: '#e2e8f0', outline: 'none',
    fontFamily: "'Inter', sans-serif",
    colorScheme: 'dark'
  },
  removeWeekBtn: {
    display: 'flex', alignItems: 'center',
    padding: '5px 11px', borderRadius: 4,
    backgroundColor: 'transparent',
    border: '1px solid #374151',
    color: '#9ca3af', cursor: 'pointer',
    fontSize: 11, fontWeight: 500,
    fontFamily: "'Inter', sans-serif"
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableScroll: { overflowX: 'auto' },
  table: {
    width: '100%', borderCollapse: 'collapse', textAlign: 'left',
    minWidth: 1100
  },
  thead: {
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #dde1e7'
  },
  th: {
    padding: '9px 11px', fontSize: 10,
    fontWeight: 600, textTransform: 'uppercase',
    color: '#374151', letterSpacing: '0.06em',
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap'
  },
  tbodyRow: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '7px 10px', verticalAlign: 'top' },

  dateChip: {
    display: 'inline-block',
    padding: '5px 9px',
    backgroundColor: '#ddeaf3',
    border: '1px solid #b8d4e8',
    borderRadius: 4, fontSize: 12,
    fontWeight: 600, color: '#0f4c75',
    whiteSpace: 'nowrap',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.02em'
  },
  datePlaceholder: {
    padding: '5px 9px',
    color: '#9ca3af', fontSize: 13
  },
  dateInput: {
    width: '100%', minWidth: 125, padding: '7px 8px',
    border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#111827',
    backgroundColor: '#fff'
  },

  timeInput: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#111827',
    backgroundColor: '#fff'
  },
  cellTextInput: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#111827',
    backgroundColor: '#fff'
  },
  subjectArea: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none', resize: 'vertical',
    fontFamily: "'Inter', sans-serif", color: '#111827',
    backgroundColor: '#fff', lineHeight: 1.5,
    minHeight: 60
  },
  notesArea: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none', resize: 'vertical',
    fontFamily: "'Inter', sans-serif", color: '#111827',
    backgroundColor: '#fff', lineHeight: 1.5,
    minHeight: 100
  },
  removeRowBtn: {
    padding: '4px 6px', borderRadius: 4,
    backgroundColor: '#fff',
    border: '1px solid #fca5a5',
    color: '#dc2626', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  // ── Week footer ───────────────────────────────────────────────────────────
  weekFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #dde1e7'
  },
  addRowBtn: {
    display: 'flex', alignItems: 'center',
    padding: '7px 14px',
    backgroundColor: '#fff',
    border: '1px solid #7da7c4',
    borderRadius: 5, fontSize: 12, fontWeight: 600,
    color: '#0f4c75', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  addRowBtnDisabled: {
    display: 'flex', alignItems: 'center',
    padding: '7px 14px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 5, fontSize: 12, fontWeight: 500,
    color: '#9ca3af', cursor: 'not-allowed',
    fontFamily: "'Inter', sans-serif"
  },
  weekTotal: { display: 'flex', alignItems: 'center', gap: 8 },
  weekTotalLabel: {
    fontSize: 12, fontWeight: 500,
    color: '#6b7280', fontFamily: "'Inter', sans-serif"
  },
  weekTotalVal: {
    fontSize: 16, fontWeight: 700,
    color: '#0f0f0f', fontFamily: "'Inter', sans-serif"
  },

  // ── Add Week ─────────────────────────────────────────────────────────────
  addWeekRow: { margin: '18px 0', display: 'flex' },
  addWeekBtn: {
    display: 'flex', alignItems: 'center',
    padding: '9px 18px',
    backgroundColor: '#0f0f0f',
    border: '1px solid #0f0f0f',
    borderRadius: 6, fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },

  // ── Period total bar ──────────────────────────────────────────────────────
  periodTotal: {
    backgroundColor: '#0f0f0f',
    borderRadius: 6,
    padding: '16px 22px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 26,
    borderLeft: '4px solid #7da7c4'
  },
  totalLabel: {
    fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#94a3b8', fontFamily: "'Inter', sans-serif"
  },
  totalValue: {
    fontSize: 22, fontWeight: 700,
    color: '#7da7c4', fontFamily: "'Inter', sans-serif",
    letterSpacing: '-0.02em'
  },

  // ── Approval section ──────────────────────────────────────────────────────
  approvalSection: {
    border: '1px solid #dde1e7',
    borderRadius: 6, padding: '20px',
    marginBottom: 22, backgroundColor: '#f9fafb'
  },
  approvalHeader: {
    display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 18
  },
  approvalTitle: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#0f0f0f',
    fontFamily: "'Inter', sans-serif"
  },
  approvalSub: { fontSize: 11, color: '#64748b', fontFamily: "'Inter', sans-serif" },
  approvalRow: {
    display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'space-between'
  },
  sigCol: {
    flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 8
  },
  sigDateLabel: {
    display: 'block', fontSize: 13, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#0f0f0f', marginBottom: 6,
    fontFamily: "'Inter', sans-serif"
  },
  sigDateInput: {
    padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: 5,
    fontSize: 12, fontFamily: "'Inter', sans-serif",
    color: '#111827', outline: 'none', maxWidth: 180
  },

  // ── PDF filename card ─────────────────────────────────────────────────────
  namingCard: {
    backgroundColor: '#f5f6f8',
    border: '1px solid #dde1e7',
    borderRadius: 6, padding: '16px 20px',
    marginBottom: 22
  },
  namingLabel: {
    display: 'block', fontSize: 13, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#0f0f0f', marginBottom: 6,
    fontFamily: "'Inter', sans-serif"
  },
  namingRow: { display: 'flex', gap: 8 },
  namingInput: {
    flex: 1, padding: '10px 12px',
    border: '1px solid #d1d5db', borderRadius: 5,
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    color: '#111827', outline: 'none', backgroundColor: '#fff'
  },
  resetBtn: {
    padding: '9px 14px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 5, fontSize: 11, fontWeight: 600,
    color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: "'Inter', sans-serif"
  },

  // ── Actions bar ───────────────────────────────────────────────────────────
  actionsBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 12,
    borderTop: '1px solid #e5e7eb', paddingTop: 20
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '9px 16px', backgroundColor: '#fff',
    border: '1px solid #e5e7eb', borderRadius: 5,
    fontSize: 13, fontWeight: 500,
    color: '#6b7280', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  saveDraftBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '1px solid #7da7c4',
    borderRadius: 5, fontSize: 13, fontWeight: 600,
    color: '#0f4c75', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  mainActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  printBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 5, fontSize: 13, fontWeight: 600,
    color: '#374151', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  downloadBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '1px solid #7da7c4',
    borderRadius: 5, fontSize: 13, fontWeight: 600,
    color: '#0f4c75', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  submitBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#0f0f0f',
    border: '1px solid #0f0f0f',
    borderRadius: 5, fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },

  // ── Print-only signature block ────────────────────────────────────────────
  printSig: { display: 'none', marginTop: 40 },
  printFooterNote: {
    marginTop: 32,
    textAlign: 'center', fontSize: 9,
    borderTop: '1px solid #000', paddingTop: 7,
    textTransform: 'uppercase', color: '#333',
    letterSpacing: 0.5, fontFamily: 'sans-serif'
  }
};

