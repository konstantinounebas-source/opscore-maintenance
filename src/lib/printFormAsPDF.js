/**
 * Renders a form's current data as a styled A4 PDF and downloads it.
 */
export async function printFormAsPDF({ title, subtitle, sections, fileName }) {
  const checkmark = (val) => val ? '☑' : '☐';

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  const sectionsHtml = sections.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.type === 'checkbox') {
        return `<tr><td colspan="2" style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">
          <span style="font-size:14px;">${checkmark(row.checked)}</span>&nbsp;${escapeHtml(String(row.label))}
        </td></tr>`;
      }
      let displayVal;
      if (row.value === null || row.value === undefined || row.value === '') {
        displayVal = '<span style="color:#94a3b8;">—</span>';
      } else if (typeof row.value === 'boolean') {
        displayVal = row.value ? '<span style="color:#16a34a;font-weight:bold;">✓ Ναι</span>' : '<span style="color:#dc2626;">✗ Όχι</span>';
      } else {
        displayVal = escapeHtml(String(row.value));
      }
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(String(row.label))}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#1e293b;vertical-align:top;">${displayVal}</td>
      </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:14px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:7px 12px;">
          <span style="font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(sec.heading || '')}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      </div>`;
  }).join('');

  // Build the wrapper div (NOT a full HTML doc — html2pdf renders from a DOM element)
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
  `;

  wrapper.innerHTML = `
    <div style="padding:24px 28px;background:#fff;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:white;padding:16px 20px;border-radius:8px;margin-bottom:18px;">
        <div style="font-size:16px;font-weight:700;">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="font-size:10px;opacity:0.85;margin-top:3px;">${escapeHtml(subtitle)}</div>` : ''}
      </div>

      <!-- Sections -->
      ${sectionsHtml}

      <!-- Footer -->
      <div style="border-top:1px solid #e2e8f0;margin-top:18px;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;">
        <span>${escapeHtml(title)}</span>
        <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `${fileName || 'form'}.pdf`,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] },
      })
      .from(wrapper)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}