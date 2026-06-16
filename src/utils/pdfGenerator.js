import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to format dates nicely: e.g., '06/15/2026'
const formatDateStr = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Generates and downloads a professional PDF for either timesheets or session logs.
 * @param {string} type - 'timesheet' or 'sessions'
 * @param {object} data - Form data
 * @param {string} customFileName - User-defined file name
 */
export const generatePDF = async (type, data, customFileName) => {
  // Create a hidden container on the document body
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '780px'; // Letter size printable area width
  container.style.padding = '30px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Courier New', Courier, monospace, Arial, sans-serif"; // Classic official monospaced text style
  container.style.boxSizing = 'border-box';

  const isTimesheet = type === 'timesheet';

  // SVG emblem string for the PDF template (rendered directly as HTML)
  const logoSvgHtml = `
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#000000" stroke-width="2.5" fill="#FFFFFF" />
      <circle cx="50" cy="50" r="41" stroke="#000000" stroke-width="1" fill="none" />
      <path d="M22 36 L78 36 L50 22 Z" fill="#000000" />
      <rect x="24" y="38" width="52" height="4" fill="#000000" />
      <rect x="25" y="43" width="50" height="2" fill="#000000" />
      <rect x="29" y="46" width="5" height="24" fill="#000000" />
      <rect x="28" y="45" width="7" height="2" fill="#000000" />
      <rect x="28" y="70" width="7" height="2" fill="#000000" />
      <rect x="41" y="46" width="5" height="24" fill="#000000" />
      <rect x="40" y="45" width="7" height="2" fill="#000000" />
      <rect x="40" y="70" width="7" height="2" fill="#000000" />
      <rect x="54" y="46" width="5" height="24" fill="#000000" />
      <rect x="53" y="45" width="7" height="2" fill="#000000" />
      <rect x="53" y="70" width="7" height="2" fill="#000000" />
      <rect x="66" y="46" width="5" height="24" fill="#000000" />
      <rect x="65" y="45" width="7" height="2" fill="#000000" />
      <rect x="65" y="70" width="7" height="2" fill="#000000" />
      <rect x="22" y="72" width="56" height="4" fill="#000000" />
      <rect x="18" y="76" width="64" height="4" fill="#000000" />
      <rect x="14" y="80" width="72" height="4" fill="#000000" />
    </svg>
  `;

  let contentHtml = '';

  if (isTimesheet) {
    // Generate Timesheet table rows
    const rowsHtml = (data.entries || []).map((entry) => `
      <tr style="border-bottom: 1px solid #000000; font-size: 12px;">
        <td style="padding: 6px; text-align: left; border-right: 1px solid #000000;">${formatDateStr(entry.date) || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000;">${entry.timeIn1 || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000;">${entry.timeOut1 || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000;">${entry.timeIn2 || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000;">${entry.timeOut2 || '—'}</td>
        <td style="padding: 6px; text-align: right; font-weight: bold;">${entry.totalHours ? Number(entry.totalHours).toFixed(2) : '0.00'}</td>
      </tr>
    `).join('');

    contentHtml = `
      <!-- Header Block -->
      <div style="border: 2px solid #000000; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 70px; vertical-align: middle;">${logoSvgHtml}</td>
            <td style="padding-left: 15px; vertical-align: middle;">
              <h1 style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px;">LIVINGSTONE COLLEGE</h1>
              <h2 style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; color: #333333;">SUCCESS CENTER MONTHLY TIMESHEET</h2>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 180px;">
              <div style="font-size: 10px; text-transform: uppercase; color: #555555;">DEPARTMENT NAME</div>
              <div style="font-size: 13px; font-weight: bold; border: 1px solid #000000; padding: 4px 8px; margin-top: 4px; display: inline-block;">${data.departmentName || 'Success Center'}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Metadata Box -->
      <div style="border: 1px solid #000000; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 8px; width: 50%; border-right: 1px solid #000000;">
              <strong>EMPLOYEE NAME:</strong><br/>
              <span style="font-size: 13px; font-family: sans-serif; text-transform: uppercase; font-weight: bold;">${data.employeeName || '—'}</span>
            </td>
            <td style="padding: 8px; width: 50%;">
              <strong>REPORTING PERIOD:</strong><br/>
              <span style="font-size: 13px; font-family: sans-serif; font-weight: bold;">
                ${formatDateStr(data.beginningDate) || '—'} TO ${formatDateStr(data.endingDate) || '—'}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Log Table -->
      <div style="border: 2px solid #000000; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #ffffff; border-bottom: 2px solid #000000; font-size: 11px; text-transform: uppercase; font-weight: bold;">
              <th style="padding: 8px; text-align: left; border-right: 1px solid #000000; width: 140px;">DATE</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000;">SHIFT 1 IN</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000;">SHIFT 1 OUT</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000;">SHIFT 2 IN</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000;">SHIFT 2 OUT</th>
              <th style="padding: 8px; text-align: right; width: 110px;">DAILY HOURS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding: 15px; text-align: center; font-size: 12px;">No work shifts logged.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000000; font-size: 13px; font-weight: bold;">
              <td colspan="5" style="padding: 10px; text-align: right; border-right: 1px solid #000000; text-transform: uppercase;">GRAND TOTAL MONTHLY HOURS:</td>
              <td style="padding: 10px; text-align: right; font-size: 14px;">${Number(data.totalHours || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Signature Lines Block -->
      <div style="border: 1px solid #000000; padding: 20px; font-size: 12px; margin-top: 40px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Employee Signature</div>
            </td>
            <td style="width: 10%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Date</div>
            </td>
            <td style="width: 35%; vertical-align: bottom; padding-left: 20px;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Supervisor: Benjamin Davis</div>
            </td>
            <td style="width: 10%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Date</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Administrative Note Footer -->
      <div style="margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px solid #000000; padding-top: 10px; text-transform: uppercase; color: #333333;">
        LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NORTH CAROLINA 28144 • SUPERVISOR: BENJAMIN DAVIS
      </div>
    `;
  } else {
    // Generate Student Session table rows
    const rowsHtml = (data.entries || []).map((entry) => `
      <tr style="border-bottom: 1px solid #000000; font-size: 11px; vertical-align: top;">
        <td style="padding: 6px; text-align: left; border-right: 1px solid #000000;">${formatDateStr(entry.date) || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000; white-space: nowrap;">${entry.timeIn || '—'} - ${entry.timeOut || '—'}</td>
        <td style="padding: 6px; text-align: center; border-right: 1px solid #000000; font-weight: bold;">${entry.duration ? Number(entry.duration).toFixed(2) : '0.00'}</td>
        <td style="padding: 6px; text-align: left; border-right: 1px solid #000000; font-weight: bold; text-transform: uppercase;">${entry.skills || '—'}</td>
        <td style="padding: 6px; text-align: left; font-style: italic;">${entry.notes || '—'}</td>
      </tr>
    `).join('');

    contentHtml = `
      <!-- Header Block -->
      <div style="border: 2px solid #000000; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 70px; vertical-align: middle;">${logoSvgHtml}</td>
            <td style="padding-left: 15px; vertical-align: middle;">
              <h1 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">LIVINGSTONE COLLEGE</h1>
              <h2 style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; color: #111111;">ACADEMIC SUPPORT CENTER STUDENT SESSION & PROGRESS RECORD</h2>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 140px;">
              <div style="font-size: 9px; text-transform: uppercase; color: #555555;">SEMESTER / YEAR</div>
              <div style="font-size: 12px; font-weight: bold; border: 1px solid #000000; padding: 4px 8px; margin-top: 4px; display: inline-block;">${data.semester || '—'}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Metadata Box -->
      <div style="border: 1px solid #000000; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 8px; width: 40%; border-right: 1px solid #000000;">
              <strong>STUDENT NAME:</strong><br/>
              <span style="font-size: 12px; font-family: sans-serif; text-transform: uppercase; font-weight: bold;">${data.studentName || '—'}</span>
            </td>
            <td style="padding: 8px; width: 30%; border-right: 1px solid #000000;">
              <strong>STUDENT ID:</strong><br/>
              <span style="font-size: 12px; font-family: sans-serif; font-weight: bold;">${data.studentId || '—'}</span>
            </td>
            <td style="padding: 8px; width: 30%;">
              <strong>STAFF MEMBER / TUTOR:</strong><br/>
              <span style="font-size: 12px; font-family: sans-serif; text-transform: uppercase; font-weight: bold;">${data.mentorName || '—'}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Session Log Table -->
      <div style="border: 2px solid #000000; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #ffffff; border-bottom: 2px solid #000000; font-size: 10px; text-transform: uppercase; font-weight: bold;">
              <th style="padding: 8px; text-align: left; border-right: 1px solid #000000; width: 100px;">DATE</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000; width: 120px;">TIME</th>
              <th style="padding: 8px; text-align: center; border-right: 1px solid #000000; width: 70px;">HOURS</th>
              <th style="padding: 8px; text-align: left; border-right: 1px solid #000000; width: 180px;">SKILLS / ASSIGNMENTS</th>
              <th style="padding: 8px; text-align: left;">PROGRESS NOTES</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="padding: 15px; text-align: center; font-size: 12px;">No support sessions logged.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000000; font-size: 12px; font-weight: bold;">
              <td colspan="2" style="padding: 8px; text-align: right; border-right: 1px solid #000000; text-transform: uppercase;">TOTAL SUPPORT HOURS:</td>
              <td style="padding: 8px; text-align: center; border-right: 1px solid #000000; font-size: 13px;">${Number(data.totalDuration || 0).toFixed(2)}</td>
              <td colspan="2" style="padding: 8px; font-size: 10px; font-weight: normal; color: #555555; text-transform: uppercase;">
                ${data.entries?.length || 0} TUTORING SESSIONS COMPLETED
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Signature Lines Block -->
      <div style="border: 1px solid #000000; padding: 20px; font-size: 11px; margin-top: 40px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Staff / Tutor Signature</div>
            </td>
            <td style="width: 10%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Date</div>
            </td>
            <td style="width: 35%; vertical-align: bottom; padding-left: 20px;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Supervisor Approval</div>
            </td>
            <td style="width: 10%; vertical-align: bottom;">
              <div style="border-bottom: 1px solid #000000; height: 35px; width: 90%;"></div>
              <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Date</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Administrative Note Footer -->
      <div style="margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px solid #000000; padding-top: 10px; text-transform: uppercase; color: #333333;">
        LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NORTH CAROLINA 28144 • SUPERVISOR: BENJAMIN DAVIS
      </div>
    `;
  }

  container.innerHTML = contentHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Double resolution for sharp printing quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // US Letter format (612 pt x 792 pt)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Ensure customFileName ends in .pdf
    let finalFileName = (customFileName || `Livingstone_${type}_report`).trim();
    if (!finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    pdf.save(finalFileName);
    return finalFileName;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    throw err;
  } finally {
    // Cleanup temporary elements
    document.body.removeChild(container);
  }
};
