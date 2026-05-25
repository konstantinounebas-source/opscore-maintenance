/**
 * Renders a form's current data as a styled HTML document and downloads it as PDF.
 * @param {string} title - Document title
 * @param {string} subtitle - Document subtitle
 * @param {Array<{heading?: string, rows: Array<{label: string, value: any, checked?: boolean}>}>} sections
 * @param {string} fileName - Output file name (without .pdf)
 */
export async function printFormAsPDF({ title, subtitle, sections, fileName }) {
  const checkmark = (val) => val ? '☑' : '☐';

  const renderValue = (row) => {
    if (row.checked !== undefined) {
      return `<span style="font-size:16px;">${checkmark(row.checked)}</span> ${escapeHtml(String(row.label))}`;
    }
    if (row.value === null || row.value === undefined || row.value === '') return '<span style="color:#94a3b8;">—</span>';
    if (typeof row.value === 'boolean') return row.value ? '<span style="color:#16a34a;font-weight:bold;">✓ Ναι</span>' : '<span style="color:#dc2626;">✗ Όχι</span>';
    return escapeHtml(String(row.value));
  };

  const sectionsHtml = sections.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.type === 'checkbox') {
        return `<tr><td colspan="2" style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">
          <span style="font-size:15px;">${checkmark(row.checked)}</span>&nbsp;${escapeHtml(String(row.label))}
        </td></tr>`;
      }
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(String(row.label))}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#1e293b;vertical-align:top;">${renderValue(row)}</td>
      </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:14px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:7px 12px;">
          <span style="font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(sec.heading || '')}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 0; }
  .page { padding: 24px 28px; max-width: 800px; margin: 0 auto; }
  .doc-header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 18px 22px; border-radius: 8px; margin-bottom: 18px; }
  .doc-header h1 { font-size: 16px; font-weight: 700; }
  .doc-header p { font-size: 10px; opacity: 0.85; margin-top: 3px; }
  .doc-footer { border-top: 1px solid #e2e8f0; margin-top: 18px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </div>
  ${sectionsHtml}
  <div class="doc-footer">
    <span>${escapeHtml(title)}</span>
    <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
  </div>
</div>
</body>
</html>`;

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(container);

  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .set({
      margin: 0,
      filename: `${fileName || 'form'}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}