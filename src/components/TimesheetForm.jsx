import React, { useState, useEffect } from 'react';
import { Download, Printer, Send, Plus, X } from 'lucide-react';
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

const calcDiff = (inT, outT) => {
  if (!inT || !outT) return 0;
  const diff = timeToDecimal(outT) - timeToDecimal(inT);
  return diff > 0 ? diff : 0;
};

const addDays = (dateStr, n) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const displayDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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

  // Signature: session-only, not persisted
  const [employeeSignature, setEmployeeSignature] = useState(null);
  const [employeeSignDate, setEmployeeSignDate]   = useState(
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

  // ── Load draft on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const draft = getTimesheetDraft();
    if (!draft) return;
    if (draft.employeeName)     setEmployeeName(draft.employeeName);
    if (draft.weeks?.length > 0) setWeeks(draft.weeks);
    if (draft.employeeSignDate) setEmployeeSignDate(draft.employeeSignDate);
    if (draft.pdfFileName)      { setPdfFileName(draft.pdfFileName); setFileNameEdited(true); }
    showToast('Restored your saved draft.');
  }, []);

  // ── Auto-generate PDF filename ──────────────────────────────────────────────
  useEffect(() => {
    if (fileNameEdited) return;
    const name = (employeeName || 'Employee').trim().replace(/\s+/g, '_');
    const my   = monthYearStr(weeks[0]?.startDate);
    setPdfFileName(`${name}_Timesheet_${my}.pdf`);
  }, [employeeName, weeks, fileNameEdited]);

  // ── Persist draft ───────────────────────────────────────────────────────────
  const persist = (patch = {}) => {
    saveTimesheetDraft({
      employeeName, weeks, employeeSignDate, pdfFileName, ...patch
    });
  };

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const weekTotals      = weeks.map(w => w.entries.reduce((s, e) => s + (e.totalHours || 0), 0));
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
      return { ...w, entries: [...w.entries, mkRow()] };
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
    const updated = weeks.map(w => w.id === weekId ? { ...w, startDate: value } : w);
    setWeeks(updated);
    persist({ weeks: updated });
  };

  const handleEntryChange = (weekId, rowId, field, value) => {
    const updated = weeks.map(w => {
      if (w.id !== weekId) return w;
      return {
        ...w,
        entries: w.entries.map(e => {
          if (e.id !== rowId) return e;
          const next = { ...e, [field]: value };
          if (['timeIn1','timeOut1','timeIn2','timeOut2'].includes(field)) {
            next.totalHours = calcDiff(next.timeIn1, next.timeOut1)
                            + calcDiff(next.timeIn2, next.timeOut2);
          }
          return next;
        })
      };
    });
    setWeeks(updated);
    persist({ weeks: updated });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!employeeName.trim()) errors.employeeName = 'Employee Name is required.';

    const rowErrs = [];
    weeks.forEach(w => {
      if (!w.startDate) rowErrs.push(`Week ${w.weekNum}: Week Start Date is required.`);
      w.entries.forEach((e, i) => {
        const lbl = `Week ${w.weekNum} Row ${i + 1}`;
        if ((e.timeIn1 && !e.timeOut1) || (!e.timeIn1 && e.timeOut1))
          rowErrs.push(`${lbl}: Shift 1 needs both In and Out.`);
        else if (e.timeIn1 && e.timeOut1 && timeToDecimal(e.timeOut1) <= timeToDecimal(e.timeIn1))
          rowErrs.push(`${lbl}: Shift 1 Out must be after Shift 1 In.`);

        if ((e.timeIn2 && !e.timeOut2) || (!e.timeIn2 && e.timeOut2))
          rowErrs.push(`${lbl}: Shift 2 needs both In and Out.`);
        else if (e.timeIn2 && e.timeOut2 && timeToDecimal(e.timeOut2) <= timeToDecimal(e.timeIn2))
          rowErrs.push(`${lbl}: Shift 2 Out must be after Shift 2 In.`);
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
    weeks,
    weekTotals,
    periodTotal,
    employeeSignature,
    employeeSignDate
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

  const handleClear = () => {
    if (!window.confirm('Clear the entire timesheet form?')) return;
    setEmployeeName('');
    setWeeks([mkWeek(1)]);
    setEmployeeSignature(null);
    setEmployeeSignDate(new Date().toISOString().split('T')[0]);
    setPdfFileName('Employee_Timesheet_Month_Year.pdf');
    setFileNameEdited(false);
    clearTimesheetDraft();
    showToast('Timesheet cleared.');
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
                <th style={{ ...S.th, width: 72, textAlign: 'center' }}>Daily Hrs</th>
                <th style={{ ...S.th, width: 160 }}>Student Name & ID</th>
                <th style={{ ...S.th, width: 210 }}>Subject / Topic</th>
                <th style={{ ...S.th, width: 270 }}>Progress Notes</th>
                {canRemRow && <th style={{ ...S.th, width: 34 }}></th>}
              </tr>
            </thead>
            <tbody>
              {week.entries.map((entry, rowIdx) => {
                const rowDate = week.startDate ? addDays(week.startDate, rowIdx) : '';
                return (
                  <tr key={entry.id} style={S.tbodyRow}>
                    {/* Auto-computed date — read only */}
                    <td style={S.td}>
                      <div style={rowDate ? S.dateChip : S.datePlaceholder}>
                        {rowDate ? displayDate(rowDate) : '—'}
                      </div>
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
                    <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
                      {(entry.totalHours || 0).toFixed(2)}
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

        {/* Week footer: Add Row + weekly total */}
        <div style={S.weekFooter}>
          <button
            type="button"
            onClick={() => handleAddRow(week.id)}
            disabled={atMax}
            style={atMax ? S.addRowBtnDisabled : S.addRowBtn}
          >
            <Plus size={13} style={{ marginRight: 4 }} />
            {atMax ? 'Max 7 Rows Reached' : '+ Add Row'}
          </button>
          <div style={S.weekTotal}>
            <span style={S.weekTotalLabel}>Week {week.weekNum} Total:</span>
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
          <span style={S.totalLabel}>Total Hours This Reporting Period</span>
          <span style={S.totalValue}>{periodTotal.toFixed(2)} hrs</span>
        </div>

        {/* Employee Signature */}
        <div style={S.sigSection} className="no-print">
          <div style={S.sigSectionHeader}>
            <span style={S.sigSectionTitle}>Employee Signature</span>
            <span style={S.sigSectionHint}>Draw with mouse or finger</span>
          </div>
          <div style={S.sigCard}>
            <SignaturePad
              key={employeeSignature ? 'has-sig' : 'no-sig'}
              onSave={d => setEmployeeSignature(d)}
              onClear={() => setEmployeeSignature(null)}
              width={420}
              height={110}
            />
            <div style={{ marginTop: 10 }}>
              <label style={S.sigDateLabel} htmlFor="emp-sign-date">Date Signed</label>
              <input
                id="emp-sign-date"
                type="date"
                value={employeeSignDate}
                onChange={e => {
                  setEmployeeSignDate(e.target.value);
                  persist({ employeeSignDate: e.target.value });
                }}
                style={S.sigDateInput}
              />
            </div>
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
          <button type="button" onClick={handleClear} style={S.clearBtn}>Reset Form</button>
          <div style={S.mainActions}>
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
        <div style={{ position: 'relative', display: 'inline-block', width: '38%' }}>
          {employeeSignature && (
            <img src={employeeSignature} alt="Signature"
              style={{ position: 'absolute', bottom: 20, left: 8, height: 36, pointerEvents: 'none' }} />
          )}
          <div style={{ borderBottom: '1px solid #000', height: 36, width: '90%' }} />
          <div style={{ marginTop: 5, fontWeight: 'bold', fontSize: 11 }}>EMPLOYEE SIGNATURE</div>
          <div style={{ marginTop: 2, fontStyle: 'italic', fontSize: 9 }}>Date: {employeeSignDate || '—'}</div>
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

const S = {
  page: {
    maxWidth: 1380,
    margin: '0 auto',
    padding: '24px 16px 60px'
  },
  toast: {
    position: 'fixed', top: 20, right: 20,
    padding: '12px 22px',
    color: '#fff', borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    zIndex: 1001,
    animation: 'slideIn 0.3s ease-out'
  },
  officialHeader: {
    textAlign: 'center',
    borderBottom: '3px double #000',
    paddingBottom: 14,
    marginBottom: 22
  },
  collegeName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: 1,
    color: '#000', margin: 0
  },
  formTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 2,
    color: '#333', marginTop: 4, margin: 0
  },
  subtext: { fontSize: 12, color: '#555', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    padding: 24
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '12px 16px', borderRadius: 8,
    fontSize: 13, marginBottom: 20
  },

  metaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16, marginBottom: 24
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  formLabel: {
    fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.5, color: '#475569'
  },
  metaInput: {
    padding: '10px 12px', border: '1px solid #cbd5e1',
    borderRadius: 6, fontSize: 13,
    fontFamily: "'Inter', sans-serif", outline: 'none', color: '#000'
  },
  metaInputDisabled: {
    padding: '10px 12px', border: '1px solid #cbd5e1',
    borderRadius: 6, fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed'
  },

  weeksWrap: { display: 'flex', flexDirection: 'column', gap: 24 },

  weekCard: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    overflow: 'hidden'
  },
  weekHeader: {
    backgroundColor: '#000',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px'
  },
  weekHeaderLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  weekBadge: {
    color: '#fff', fontWeight: 800, fontSize: 12,
    letterSpacing: 1, textTransform: 'uppercase'
  },
  startDateWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  startDateLabel: {
    color: '#a0aec0', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap'
  },
  startDateInput: {
    padding: '5px 8px', border: '1px solid #4a5568',
    borderRadius: 5, fontSize: 12, backgroundColor: '#1a1a1a',
    color: '#fff', outline: 'none',
    colorScheme: 'dark'
  },
  removeWeekBtn: {
    display: 'flex', alignItems: 'center',
    padding: '5px 10px', borderRadius: 5,
    backgroundColor: 'transparent', border: '1px solid #4a5568',
    color: '#a0aec0', cursor: 'pointer', fontSize: 11, fontWeight: 600
  },

  tableScroll: { overflowX: 'auto' },
  table: {
    width: '100%', borderCollapse: 'collapse', textAlign: 'left',
    minWidth: 1100
  },
  thead: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: {
    padding: '10px 12px', fontSize: 10,
    fontWeight: 700, textTransform: 'uppercase',
    color: '#475569', letterSpacing: 0.4
  },
  tbodyRow: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 10px', verticalAlign: 'top' },

  dateChip: {
    padding: '6px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: 5, fontSize: 12,
    fontWeight: 600, color: '#0f172a',
    whiteSpace: 'nowrap'
  },
  datePlaceholder: {
    padding: '6px 8px',
    color: '#94a3b8', fontSize: 13
  },

  timeInput: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #cbd5e1', borderRadius: 5,
    fontSize: 12, outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#000',
    backgroundColor: '#fff'
  },
  cellTextInput: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #cbd5e1', borderRadius: 5,
    fontSize: 12, outline: 'none',
    fontFamily: "'Inter', sans-serif", color: '#000',
    backgroundColor: '#fff'
  },
  subjectArea: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #cbd5e1', borderRadius: 5,
    fontSize: 12, outline: 'none', resize: 'vertical',
    fontFamily: "'Inter', sans-serif", color: '#000',
    backgroundColor: '#fff', lineHeight: 1.45,
    minHeight: 58
  },
  notesArea: {
    width: '100%', padding: '7px 8px',
    border: '1px solid #cbd5e1', borderRadius: 5,
    fontSize: 12, outline: 'none', resize: 'vertical',
    fontFamily: "'Inter', sans-serif", color: '#000',
    backgroundColor: '#fff', lineHeight: 1.45,
    minHeight: 96
  },
  removeRowBtn: {
    padding: '4px 6px', borderRadius: 4,
    backgroundColor: '#fff', border: '1px solid #fca5a5',
    color: '#ef4444', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  weekFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0'
  },
  addRowBtn: {
    display: 'flex', alignItems: 'center',
    padding: '7px 14px',
    backgroundColor: '#fff', border: '1px solid #000',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    color: '#000', cursor: 'pointer'
  },
  addRowBtnDisabled: {
    display: 'flex', alignItems: 'center',
    padding: '7px 14px',
    backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
    color: '#94a3b8', cursor: 'not-allowed'
  },
  weekTotal: { display: 'flex', alignItems: 'center', gap: 8 },
  weekTotalLabel: { fontSize: 12, fontWeight: 600, color: '#475569' },
  weekTotalVal: {
    fontSize: 15, fontWeight: 800, color: '#000',
    fontFamily: "'Outfit', sans-serif"
  },

  addWeekRow: { margin: '16px 0', display: 'flex' },
  addWeekBtn: {
    display: 'flex', alignItems: 'center',
    padding: '9px 18px',
    backgroundColor: '#000', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer'
  },

  periodTotal: {
    backgroundColor: '#000', color: '#fff',
    borderRadius: 8, padding: '14px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24
  },
  totalLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20, fontWeight: 800, color: '#A7CBE5'
  },

  sigSection: {
    border: '1px solid #cbd5e1', borderRadius: 8,
    padding: 16, marginBottom: 24, backgroundColor: '#fafafa'
  },
  sigSectionHeader: {
    display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12
  },
  sigSectionTitle: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.5, color: '#000'
  },
  sigSectionHint: { fontSize: 11, color: '#64748b' },
  sigCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0', borderRadius: 8, padding: 14
  },
  sigDateLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', color: '#64748b', marginBottom: 4
  },
  sigDateInput: {
    padding: '8px 10px', border: '1px solid #cbd5e1',
    borderRadius: 6, fontSize: 12,
    fontFamily: "'Inter', sans-serif",
    color: '#000', outline: 'none', maxWidth: 180
  },

  namingCard: {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: 16, marginBottom: 24
  },
  namingLabel: {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.5,
    color: '#475569', marginBottom: 6
  },
  namingRow: { display: 'flex', gap: 8 },
  namingInput: {
    flex: 1, padding: '10px 12px',
    border: '1px solid #cbd5e1', borderRadius: 6,
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    color: '#000', outline: 'none', backgroundColor: '#fff'
  },
  resetBtn: {
    padding: '8px 12px',
    backgroundColor: '#fff', border: '1px solid #cbd5e1',
    borderRadius: 6, fontSize: 11, fontWeight: 600,
    color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap'
  },

  actionsBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 12,
    borderTop: '1px solid #f1f5f9', paddingTop: 20
  },
  clearBtn: {
    padding: '10px 16px', backgroundColor: '#fff',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, fontWeight: 500, color: '#64748b', cursor: 'pointer'
  },
  mainActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  printBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px', backgroundColor: '#fff',
    border: '1px solid #000', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: '#000', cursor: 'pointer'
  },
  downloadBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px', backgroundColor: '#fff',
    border: '1px solid #000', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: '#000', cursor: 'pointer'
  },
  submitBtn: {
    display: 'flex', alignItems: 'center',
    padding: '10px 18px', backgroundColor: '#000',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer'
  },

  // Print-only signature block (hidden until print media query)
  printSig: { display: 'none', marginTop: 40 },
  printFooterNote: {
    marginTop: 36,
    textAlign: 'center', fontSize: 9,
    borderTop: '1px solid #000', paddingTop: 7,
    textTransform: 'uppercase', color: '#333',
    letterSpacing: 0.5, fontFamily: 'sans-serif'
  }
};
