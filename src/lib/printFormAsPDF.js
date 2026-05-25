/**
 * Opens a styled print window and triggers the browser's Save as PDF dialog.
 * This approach is 100% reliable — no canvas rendering issues.
 */
export function printFormAsPDF({ title, subtitle, sections, fileName }) {
  const checkmark = (val) => val ? '&#9745;' : '&#9744;';

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  const sectionsHtml = sections.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.type === 'checkbox') {
        return `<tr>
          <td colspan="2" class="cb-row">
            <span class="cb">${checkmark(row.checked)}</span>&nbsp;${escapeHtml(String(row.label))}
          </td>
        </tr>`;
      }
      let displayVal;
      if (row.value === null || row.value === undefined || row.value === '') {
        displayVal = '<span class="empty">—</span>';
      } else if (typeof row.value === 'boolean') {
        displayVal = row.value
          ? '<span class="yes">✓ Ναι</span>'
          : '<span class="no">✗ Όχι</span>';
      } else {
        displayVal = escapeHtml(String(row.value));
      }
      return `<tr>
        <td class="label-cell">${escapeHtml(String(row.label))}</td>
        <td class="value-cell">${displayVal}</td>
      </tr>`;
    }).join('');

    return `
      <div class="section">
        <div class="section-heading">${escapeHtml(sec.heading || '')}</div>
        <table>${rowsHtml}</table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

    .doc-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 14px 18px;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    .doc-header h1 { font-size: 15px; font-weight: 700; }
    .doc-header p { font-size: 10px; opacity: 0.85; margin-top: 3px; }

    .section {
      margin-bottom: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-heading {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 10px;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    table { width: 100%; border-collapse: collapse; }
    tr:last-child td { border-bottom: none; }

    .label-cell {
      padding: 4px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      width: 38%;
      vertical-align: top;
    }
    .value-cell {
      padding: 4px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
      color: #1e293b;
      vertical-align: top;
    }
    .cb-row {
      padding: 3px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
      color: #1e293b;
    }
    .cb { font-size: 13px; }
    .empty { color: #94a3b8; }
    .yes { color: #16a34a; font-weight: bold; }
    .no  { color: #dc2626; font-weight: bold; }

    .doc-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 14px;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </div>

  ${sectionsHtml}

  <div class="doc-footer">
    <span>${escapeHtml(title)}</span>
    <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
  </div>

  <script>
    window.onload = function() {
      document.title = ${JSON.stringify(fileName || title)};
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}