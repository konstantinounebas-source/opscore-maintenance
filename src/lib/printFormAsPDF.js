/**
 * Opens a pre-built HTML string in a print window (for server-generated HTML PDFs).
 */
export function openHtmlPrintWindow(html, fileName) {
  // Download as HTML file - user can open and print from browser
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (fileName || 'document').replace(/\.pdf$/, '.html');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a styled A4 PDF from form data using jsPDF + html2canvas.
 * Renders content in a visible overlay to avoid blank canvas issues.
 */
export async function printFormAsPDF({ title, subtitle, sections, fileName }) {
  const checkmark = (val) => val ? '☑' : '☐';

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  const sectionsHtml = sections.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.type === 'checkbox') {
        return `<tr>
          <td colspan="2" style="padding:3px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">
            <span style="font-size:13px;">${checkmark(row.checked)}</span>&nbsp;${escapeHtml(String(row.label))}
          </td>
        </tr>`;
      }
      let displayVal;
      if (row.value === null || row.value === undefined || row.value === '') {
        displayVal = '<span style="color:#94a3b8;">—</span>';
      } else if (typeof row.value === 'boolean') {
        displayVal = row.value
          ? '<span style="color:#16a34a;font-weight:bold;">✓ Ναι</span>'
          : '<span style="color:#dc2626;font-weight:bold;">✗ Όχι</span>';
      } else {
        displayVal = escapeHtml(String(row.value));
      }
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(String(row.label))}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#1e293b;vertical-align:top;">${displayVal}</td>
      </tr>`;
    }).join('');

    return `<div style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:5px;overflow:hidden;break-inside:avoid;">
      <div style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:5px 10px;">
        <span style="font-size:10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.4px;">${escapeHtml(sec.heading || '')}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    </div>`;
  }).join('');

  const bodyHtml = `
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:white;padding:14px 18px;border-radius:6px;margin-bottom:14px;">
      <div style="font-size:15px;font-weight:700;">${escapeHtml(title)}</div>
      ${subtitle ? `<div style="font-size:10px;opacity:0.85;margin-top:3px;">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    ${sectionsHtml}
    <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:6px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;">
      <span>${escapeHtml(title)}</span>
      <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
    </div>
  `;

  // Create a visible overlay so html2canvas can render it
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:794px',
    'background:#fff', 'z-index:99999',
    'padding:24px 28px',
    'font-family:Arial,Helvetica,sans-serif',
    // Scroll the overlay into the viewport
    'overflow:visible',
  ].join(';');
  overlay.innerHTML = bodyHtml;
  document.body.appendChild(overlay);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(overlay, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageW = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297mm
    const margin = 8;
    const printW = pageW - margin * 2;
    const printH = pageH - margin * 2;

    const canvasAspect = canvas.height / canvas.width;
    const totalImgH = printW * canvasAspect;  // total rendered height in mm

    let yOffset = 0;
    let page = 0;

    while (yOffset < totalImgH) {
      if (page > 0) pdf.addPage();

      // Crop the portion of the canvas that fits on this page
      const srcY = (yOffset / totalImgH) * canvas.height;
      const srcH = Math.min((printH / totalImgH) * canvas.height, canvas.height - srcY);

      // Draw the slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceH = (srcH / canvas.height) * totalImgH;
      pdf.addImage(sliceData, 'PNG', margin, margin, printW, sliceH);

      yOffset += printH;
      page++;
    }

    pdf.save(`${fileName || 'form'}.pdf`);
  } finally {
    document.body.removeChild(overlay);
  }
}