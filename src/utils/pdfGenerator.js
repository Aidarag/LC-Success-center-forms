import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to format dates nicely: e.g., '06/15/2026'
const formatDateStr = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Generates and downloads a professional PDF for the Success Center Monthly Timesheet.
 * @param {string} type - 'timesheet'
 * @param {object} data - Form data payload
 * @param {string} customFileName - User-defined file name
 */
export const generatePDF = async (type, data, customFileName) => {
  // Create a hidden container on the document body
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '820px'; // Expanded letter width to support student details column
  container.style.padding = '30px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Courier New', Courier, monospace, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

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

  // Helper to map log rows to HTML
  const generateWeekTableRows = (entries) => {
    return (entries || []).map((entry) => `
      <tr style="border-bottom: 1px solid #000000; font-size: 11px;">
        <td style="padding: 5px; text-align: left; border-right: 1px solid #000000; font-weight: bold;">${formatDateStr(entry.date) || '—'}</td>
        <td style="padding: 5px; text-align: center; border-right: 1px solid #000000;">${entry.timeIn1 || '—'}</td>
        <td style="padding: 5px; text-align: center; border-right: 1px solid #000000;">${entry.timeOut1 || '—'}</td>
        <td style="padding: 5px; text-align: center; border-right: 1px solid #000000;">${entry.timeIn2 || '—'}</td>
        <td style="padding: 5px; text-align: center; border-right: 1px solid #000000;">${entry.timeOut2 || '—'}</td>
        <td style="padding: 5px; text-align: center; border-right: 1px solid #000000; font-weight: bold;">${entry.totalHours ? Number(entry.totalHours).toFixed(2) : '0.00'}</td>
        <td style="padding: 5px; text-align: left; border-right: 1px solid #000000; text-transform: uppercase; font-size: 10px;">${entry.studentNameId || '—'}</td>
        <td style="padding: 5px; text-align: left; border-right: 1px solid #000000; text-transform: uppercase; font-size: 10px;">${entry.subject || '—'}</td>
        <td style="padding: 5px; text-align: left; font-style: italic; font-size: 10px;">${entry.notes || '—'}</td>
      </tr>
    `).join('');
  };

  const week1HtmlRows = generateWeekTableRows(data.week1Entries);
  const week2HtmlRows = generateWeekTableRows(data.week2Entries);

  const tableHeaderMarkup = `
    <thead>
      <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000000; font-size: 10px; text-transform: uppercase; font-weight: bold;">
        <th style="padding: 6px; text-align: left; border-right: 1px solid #000000; width: 90px;">DATE</th>
        <th style="padding: 6px; text-align: center; border-right: 1px solid #000000; width: 65px;">S1 IN</th>
        <th style="padding: 6px; text-align: center; border-right: 1px solid #000000; width: 65px;">S1 OUT</th>
        <th style="padding: 6px; text-align: center; border-right: 1px solid #000000; width: 65px;">S2 IN</th>
        <th style="padding: 6px; text-align: center; border-right: 1px solid #000000; width: 65px;">S2 OUT</th>
        <th style="padding: 6px; text-align: center; border-right: 1px solid #000000; width: 60px;">DAILY</th>
        <th style="padding: 6px; text-align: left; border-right: 1px solid #000000; width: 140px;">STUDENT INFO</th>
        <th style="padding: 6px; text-align: left; border-right: 1px solid #000000; width: 120px;">SUBJECT</th>
        <th style="padding: 6px; text-align: left;">NOTES</th>
      </tr>
    </thead>
  `;

  const contentHtml = `
    <!-- Header Box -->
    <div style="border: 2px solid #000000; padding: 15px; margin-bottom: 15px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 70px; vertical-align: middle;">${logoSvgHtml}</td>
          <td style="padding-left: 15px; vertical-align: middle;">
            <h1 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px;">LIVINGSTONE COLLEGE</h1>
            <h2 style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; color: #333333;">SUCCESS CENTER MONTHLY TIMESHEET</h2>
          </td>
          <td style="text-align: right; vertical-align: middle; width: 180px;">
            <div style="font-size: 9px; text-transform: uppercase; color: #555555;">DEPARTMENT</div>
            <div style="font-size: 12px; font-weight: bold; border: 1px solid #000000; padding: 4px 8px; margin-top: 4px; display: inline-block;">Success Center</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Metadata Table -->
    <div style="border: 1px solid #000000; margin-bottom: 15px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr>
          <td style="padding: 8px; width: 50%; border-right: 1px solid #000000;">
            <strong>EMPLOYEE NAME:</strong><br/>
            <span style="font-size: 12px; font-family: sans-serif; text-transform: uppercase; font-weight: bold;">${data.employeeName || '—'}</span>
          </td>
          <td style="padding: 8px; width: 50%;">
            <strong>REPORTING PERIOD:</strong><br/>
            <span style="font-size: 12px; font-family: sans-serif; font-weight: bold;">
              ${formatDateStr(data.beginningDate) || '—'} TO ${formatDateStr(data.endingDate) || '—'}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- WEEK 1 TABLE -->
    <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">WEEK 1 WORK DETAILS</div>
    <div style="border: 2px solid #000000; margin-bottom: 15px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${tableHeaderMarkup}
        <tbody>
          ${week1HtmlRows || '<tr><td colspan="9" style="padding: 10px; text-align: center; font-size: 11px;">No shifts logged for Week 1.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #000000; font-size: 11px; font-weight: bold; background-color: #fafafa;">
            <td colspan="5" style="padding: 6px; text-align: right; border-right: 1px solid #000000;">WEEK 1 TOTAL HOURS:</td>
            <td style="padding: 6px; text-align: center; border-right: 1px solid #000000; font-size: 12px;">${Number(data.totalHoursWeek1 || 0).toFixed(2)}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- WEEK 2 TABLE -->
    <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">WEEK 2 WORK DETAILS</div>
    <div style="border: 2px solid #000000; margin-bottom: 15px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${tableHeaderMarkup}
        <tbody>
          ${week2HtmlRows || '<tr><td colspan="9" style="padding: 10px; text-align: center; font-size: 11px;">No shifts logged for Week 2.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #000000; font-size: 11px; font-weight: bold; background-color: #fafafa;">
            <td colspan="5" style="padding: 6px; text-align: right; border-right: 1px solid #000000;">WEEK 2 TOTAL HOURS:</td>
            <td style="padding: 6px; text-align: center; border-right: 1px solid #000000; font-size: 12px;">${Number(data.totalHoursWeek2 || 0).toFixed(2)}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- PERIOD TOTAL BAR -->
    <div style="border: 2px solid #000000; background-color: #ffffff; padding: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 12px;">
      <span style="text-transform: uppercase;">TOTAL HOURS WORKED THIS PERIOD:</span>
      <span style="font-size: 14px; border-bottom: 3px double #000000; padding: 0 4px;">${Number(data.totalHoursPeriod || 0).toFixed(2)} HOURS</span>
    </div>

    <!-- SIGNATURES BLOCK -->
    <div style="border: 1px solid #000000; padding: 15px; font-size: 11px; margin-top: 15px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Employee Signature -->
          <td style="width: 30%; vertical-align: bottom; position: relative;">
            <div style="height: 35px; width: 90%; position: relative;">
              ${data.employeeSignature ? `<img src="${data.employeeSignature}" style="position: absolute; bottom: 2px; left: 10px; max-height: 40px; max-width: 180px;" />` : ''}
              <div style="border-bottom: 1px solid #000000; width: 100%; height: 100%;"></div>
            </div>
            <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Employee Signature</div>
            <div style="margin-top: 2px; font-style: italic; font-size: 9px; color: #555555;">Date: ${data.employeeSignDate || '—'}</div>
          </td>
          
          <!-- Employer / Supervisor Signature -->
          <td style="width: 35%; vertical-align: bottom; padding-left: 15px; position: relative;">
            <div style="height: 35px; width: 90%; position: relative;">
              ${data.employerSignature ? `<img src="${data.employerSignature}" style="position: absolute; bottom: 2px; left: 10px; max-height: 40px; max-width: 200px;" />` : ''}
              <div style="border-bottom: 1px solid #000000; width: 100%; height: 100%;"></div>
            </div>
            <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Supervisor Signature</div>
            <div style="margin-top: 2px; font-style: italic; font-size: 9px; color: #555555;">Date: ${data.employerSignDate || '—'}</div>
          </td>

          <!-- Payroll Signature -->
          <td style="width: 35%; vertical-align: bottom; padding-left: 15px; position: relative;">
            <div style="height: 35px; width: 90%; position: relative;">
              ${data.payrollSignature ? `<img src="${data.payrollSignature}" style="position: absolute; bottom: 2px; left: 10px; max-height: 40px; max-width: 200px;" />` : ''}
              <div style="border-bottom: 1px solid #000000; width: 100%; height: 100%;"></div>
            </div>
            <div style="margin-top: 5px; font-weight: bold; text-transform: uppercase;">Payroll Dept Signature</div>
            <div style="margin-top: 2px; font-style: italic; font-size: 9px; color: #555555;">Date: ${data.payrollSignDate || '—'}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Administrative Note Footer -->
    <div style="margin-top: 25px; text-align: center; font-size: 9px; border-top: 1px solid #000000; padding-top: 8px; text-transform: uppercase; color: #333333; letter-spacing: 0.5px;">
      LIVINGSTONE COLLEGE SUCCESS CENTER • SALISBURY, NORTH CAROLINA 28144 • SUPERVISOR: BENJAMIN DAVIS (bdavis1@livingstone.edu)
    </div>
  `;

  container.innerHTML = contentHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Retain high resolution for sharp prints
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
    let finalFileName = (customFileName || `Livingstone_Timesheet_report`).trim();
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
