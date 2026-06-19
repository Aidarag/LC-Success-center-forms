import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const formatTimeForPdf = (timeStr, term) => {
  if (!timeStr) return '—';
  if (term === 'Fall' || term === 'Spring') {
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  }
  return timeStr;
};

const addDays = (dateStr, n) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ─── Logo SVG ─────────────────────────────────────────────────────────────────

const logoSvg = `
  <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" stroke="#000" stroke-width="2.5" fill="#fff"/>
    <circle cx="50" cy="50" r="41" stroke="#000" stroke-width="1" fill="none"/>
    <path d="M22 36 L78 36 L50 22 Z" fill="#000"/>
    <rect x="24" y="38" width="52" height="4" fill="#000"/>
    <rect x="25" y="43" width="50" height="2" fill="#000"/>
    <rect x="29" y="46" width="5" height="24" fill="#000"/>
    <rect x="28" y="45" width="7" height="2" fill="#000"/>
    <rect x="28" y="70" width="7" height="2" fill="#000"/>
    <rect x="41" y="46" width="5" height="24" fill="#000"/>
    <rect x="40" y="45" width="7" height="2" fill="#000"/>
    <rect x="40" y="70" width="7" height="2" fill="#000"/>
    <rect x="54" y="46" width="5" height="24" fill="#000"/>
    <rect x="53" y="45" width="7" height="2" fill="#000"/>
    <rect x="53" y="70" width="7" height="2" fill="#000"/>
    <rect x="66" y="46" width="5" height="24" fill="#000"/>
    <rect x="65" y="45" width="7" height="2" fill="#000"/>
    <rect x="65" y="70" width="7" height="2" fill="#000"/>
    <rect x="22" y="72" width="56" height="4" fill="#000"/>
    <rect x="18" y="76" width="64" height="4" fill="#000"/>
    <rect x="14" y="80" width="72" height="4" fill="#000"/>
  </svg>
`;

// ─── Table header (shared across all weeks) ───────────────────────────────────

const tableHeader = `
  <thead>
    <tr style="background-color:#f2f2f2; border-bottom:2px solid #000; font-size:10px;
               text-transform:uppercase; font-weight:bold;">
      <th style="padding:6px; text-align:left; border-right:1px solid #000; width:85px;">DATE</th>
      <th style="padding:6px; text-align:center; border-right:1px solid #000; width:58px;">S1 IN</th>
      <th style="padding:6px; text-align:center; border-right:1px solid #000; width:58px;">S1 OUT</th>
      <th style="padding:6px; text-align:center; border-right:1px solid #000; width:58px;">S2 IN</th>
      <th style="padding:6px; text-align:center; border-right:1px solid #000; width:58px;">S2 OUT</th>
      <th style="padding:6px; text-align:center; border-right:1px solid #000; width:65px;">HOURS WORKED</th>
      <th style="padding:6px; text-align:left; border-right:1px solid #000; width:130px;">STUDENT</th>
      <th style="padding:6px; text-align:left; border-right:1px solid #000; width:170px;">SUBJECT / TOPIC</th>
      <th style="padding:6px; text-align:left;">PROGRESS NOTES</th>
    </tr>
  </thead>
`;

// ─── Row generator ────────────────────────────────────────────────────────────

const buildRows = (entries, startDate, term) =>
  entries.map((e, idx) => {
    const rowDate = e.date || (startDate ? addDays(startDate, idx) : '');
    return `
      <tr style="border-bottom:1px solid #000; font-size:10.5px; vertical-align:top;">
        <td style="padding:5px; border-right:1px solid #000; font-weight:bold; white-space:nowrap;">
          ${fmtDate(rowDate)}
        </td>
        <td style="padding:5px; text-align:center; border-right:1px solid #000;">${formatTimeForPdf(e.timeIn1, term)}</td>
        <td style="padding:5px; text-align:center; border-right:1px solid #000;">${formatTimeForPdf(e.timeOut1, term)}</td>
        <td style="padding:5px; text-align:center; border-right:1px solid #000;">${formatTimeForPdf(e.timeIn2, term)}</td>
        <td style="padding:5px; text-align:center; border-right:1px solid #000;">${formatTimeForPdf(e.timeOut2, term)}</td>
        <td style="padding:5px; text-align:center; border-right:1px solid #000; font-weight:bold;">
          ${Number(e.totalHours || 0).toFixed(2)}
        </td>
        <td style="padding:5px; border-right:1px solid #000; font-size:9.5px; text-transform:uppercase;">
          ${e.studentNameId || '—'}
        </td>
        <td style="padding:5px; border-right:1px solid #000; font-size:9.5px; word-break:break-word;">
          ${e.subject || '—'}
        </td>
        <td style="padding:5px; font-size:9.5px; font-style:italic; word-break:break-word;">
          ${e.notes || '—'}
        </td>
      </tr>
    `;
  }).join('');

// ─── Week HTML block ──────────────────────────────────────────────────────────

const buildWeekBlock = (week, weekTotal, term) => {
  const rows = buildRows(week.entries, week.startDate, term);
  return `
    <div style="font-size:11px; font-weight:bold; margin-bottom:4px; text-transform:uppercase;">
      WEEK ${week.weekNum} WORK DETAILS
      ${week.startDate ? `<span style="font-size:10px; font-weight:normal; color:#555; margin-left:8px;">
        (Starting ${fmtDate(week.startDate)})
      </span>` : ''}
    </div>
    <div style="border:2px solid #000; margin-bottom:16px;">
      <table style="width:100%; border-collapse:collapse;">
        ${tableHeader}
        <tbody>
          ${rows || '<tr><td colspan="9" style="padding:10px; text-align:center; font-size:11px;">No entries logged.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #000; font-size:11px; font-weight:bold; background:#fafafa;">
            <td colspan="5" style="padding:6px; text-align:right; border-right:1px solid #000;">
              TOTAL HOURS THIS WEEK:
            </td>
            <td style="padding:6px; text-align:center; border-right:1px solid #000; font-size:12px;">
              ${Number(weekTotal || 0).toFixed(2)}
            </td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

// ─── Signature block ──────────────────────────────────────────────────────────

const buildSignatureBlock = (data) => `
  <div style="border:1px solid #000; padding:15px; font-size:11px; margin-top:15px; page-break-inside:avoid;">
    <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
      <tr>
        <td style="width:30%; padding-right:15px; vertical-align:bottom;">
          <div style="height:36px; position:relative; border-bottom:1px solid #000;">
            ${data.employeeSignature
              ? `<img src="${data.employeeSignature}"
                   style="position:absolute; bottom:2px; left:6px;
                          max-height:36px; max-width:180px;"/>`
              : ''}
          </div>
          <div style="margin-top:5px; font-weight:bold; text-transform:uppercase;">Employee Signature</div>
        </td>
        <td style="width:30%; padding-right:15px; vertical-align:bottom;">
          <div style="height:36px; position:relative; border-bottom:1px solid #000;">
            ${data.supervisorSignature
              ? `<img src="${data.supervisorSignature}"
                   style="position:absolute; bottom:2px; left:6px;
                          max-height:36px; max-width:180px;"/>`
              : ''}
          </div>
          <div style="margin-top:5px; font-weight:bold; text-transform:uppercase;">Supervisor Signature</div>
        </td>
        <td style="width:30%; vertical-align:bottom;">
          <div style="height:36px; position:relative; border-bottom:1px solid #000;">
            ${data.payrollSignature
              ? `<img src="${data.payrollSignature}"
                   style="position:absolute; bottom:2px; left:6px;
                          max-height:36px; max-width:180px;"/>`
              : ''}
          </div>
          <div style="margin-top:5px; font-weight:bold; text-transform:uppercase;">Payroll Signature</div>
        </td>
      </tr>
    </table>
    <div style="font-weight:bold; text-transform:uppercase; font-size:10.5px;">
      Approval Date: ${data.approvalDate || '—'}
    </div>
  </div>
`;

// ─── Footer note ──────────────────────────────────────────────────────────────

const footerNote = `
  <div style="margin-top:22px; text-align:center; font-size:9px;
              border-top:1px solid #000; padding-top:7px;
              text-transform:uppercase; color:#333; letter-spacing:0.5px;">
    LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NORTH CAROLINA 28144
    • SUPERVISOR: BENJAMIN DAVIS (bdavis1@livingstone.edu)
  </div>
`;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates and downloads a PDF for the dynamic monthly timesheet.
 * @param {string} type        - 'timesheet'
 * @param {object} data        - Form payload
 * @param {string} fileName    - User-defined file name
 */
export const generatePDF = async (type, data, fileName) => {
  const container = document.createElement('div');
  container.style.cssText = `
    position:absolute; left:-9999px; top:0;
    width:860px; padding:28px;
    background:#fff; color:#000;
    font-family:'Courier New',Courier,monospace,Arial,sans-serif;
    box-sizing:border-box;
  `;

  // Build all week blocks
  const weeksHtml = (data.weeks || []).map((week, idx) =>
    buildWeekBlock(week, (data.weekTotals || [])[idx] || 0, data.term)
  ).join('');

  container.innerHTML = `
    <!-- Header -->
    <div style="border:2px solid #000; padding:14px; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="width:70px; vertical-align:middle;">${logoSvg}</td>
          <td style="padding-left:14px; vertical-align:middle;">
            <h1 style="font-family:Arial,sans-serif; font-size:18px; font-weight:900;
                       margin:0; text-transform:uppercase; letter-spacing:1px;">
              LIVINGSTONE COLLEGE
            </h1>
            <h2 style="font-family:Arial,sans-serif; font-size:12px; font-weight:700;
                       margin:4px 0 0; text-transform:uppercase; letter-spacing:0.5px; color:#333;">
              SUCCESS CENTER MONTHLY TIMESHEET
            </h2>
          </td>
          <td style="text-align:right; vertical-align:middle; width:160px;">
            <div style="font-size:9px; text-transform:uppercase; color:#555;">DEPARTMENT</div>
            <div style="font-size:12px; font-weight:bold; border:1px solid #000;
                        padding:4px 8px; margin-top:4px; display:inline-block;">
              Success Center
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Employee metadata -->
    <div style="border:1px solid #000; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <tr>
          <td style="padding:8px; width:50%; border-right:1px solid #000;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong>EMPLOYEE NAME:</strong><br/>
                <span style="font-size:12px; font-family:sans-serif;
                             text-transform:uppercase; font-weight:bold;">
                  ${data.employeeName || '—'}
                </span>
              </div>
              <div style="text-align:right; padding-right:12px;">
                <strong>TERM:</strong><br/>
                <span style="font-size:12px; font-family:sans-serif;
                             text-transform:uppercase; font-weight:bold;">
                  ${data.term || 'Summer'}
                </span>
              </div>
            </div>
          </td>
          <td style="padding:8px;">
            <strong>REPORTING PERIOD WEEKS:</strong><br/>
            <span style="font-size:11px; font-family:sans-serif;">
              ${(data.weeks || []).map(w =>
                `Week ${w.weekNum}${w.startDate ? ': starts ' + fmtDate(w.startDate) : ''}`
              ).join('  |  ')}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- All weeks -->
    ${weeksHtml}

    <!-- Period Total -->
    <div style="border:2px solid #000; background:#fff; padding:10px; margin-bottom:22px;
                display:flex; justify-content:space-between; align-items:center;
                font-weight:bold; font-size:12px;">
      <span style="text-transform:uppercase;">TOTAL HOURS OVERALL:</span>
      <span style="font-size:14px; border-bottom:3px double #000; padding:0 4px;">
        ${Number(data.periodTotal || 0).toFixed(2)} HOURS
      </span>
    </div>

    <!-- Signature -->
    ${buildSignatureBlock(data)}

    <!-- Footer -->
    ${footerNote}
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
    });

    const imgData  = canvas.toDataURL('image/jpeg', 1.0);
    const pdf      = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pdfW     = pdf.internal.pageSize.getWidth();
    const pdfH     = pdf.internal.pageSize.getHeight();
    const imgH     = (canvas.height * pdfW) / canvas.width;

    let heightLeft = imgH;
    let position   = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfW, imgH);
    heightLeft -= pdfH;

    while (heightLeft > 0) {
      position   = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfW, imgH);
      heightLeft -= pdfH;
    }

    let finalName = (fileName || 'Livingstone_Timesheet').trim();
    if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';
    pdf.save(finalName);
    return finalName;
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
};
