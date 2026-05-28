/**
 * Opens a pre-built HTML string in a print window for professional A4 PDF output.
 * The HTML must be fully self-contained (inline styles, no external deps).
 */
export function openHtmlPrintWindow(html, _fileName) {
  const win = window.open("", "_blank", "width=900,height=750,scrollbars=yes");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

/**
 * Generates a polished A4 PDF from structured form data using jsPDF + html2canvas.
 * Renders into an off-screen, fixed-position container at exactly 794px (A4 screen width)
 * to avoid blank canvas and scaling issues.
 */
export async function printFormAsPDF({ title, subtitle, sections, fileName }) {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

  const checkmark = (val) => val ? "☑" : "☐";

  const sectionsHtml = sections.map(sec => {
    const rowsHtml = sec.rows.map(row => {
      if (row.type === "checkbox") {
        return `<tr>
          <td colspan="2" style="padding:4px 10px;border-bottom:1px solid #f1f5f9;font-size:10px;">
            <span style="font-size:12px;margin-right:4px">${checkmark(row.checked)}</span>${esc(String(row.label))}
          </td>
        </tr>`;
      }
      let displayVal;
      if (row.value === null || row.value === undefined || row.value === "") {
        displayVal = '<span style="color:#94a3b8;">—</span>';
      } else if (typeof row.value === "boolean") {
        displayVal = row.value
          ? '<span style="color:#16a34a;font-weight:700;">✓ Ναι</span>'
          : '<span style="color:#dc2626;font-weight:700;">✗ Όχι</span>';
      } else {
        displayVal = esc(String(row.value));
      }
      return `<tr>
        <td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${esc(String(row.label))}</td>
        <td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;font-size:10px;color:#1e293b;vertical-align:top;">${displayVal}</td>
      </tr>`;
    }).join("");

    return `<div style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:5px 10px;">
        <span style="font-size:9px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">${esc(sec.heading || "")}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    </div>`;
  }).join("");

  const bodyHtml = `
    <div style="background:#1e3a8a;color:white;padding:14px 18px;border-radius:5px;margin-bottom:14px;">
      <div style="font-size:14px;font-weight:700;">${esc(title)}</div>
      ${subtitle ? `<div style="font-size:9px;opacity:0.85;margin-top:3px;">${esc(subtitle)}</div>` : ""}
    </div>
    ${sectionsHtml}
    <div style="border-top:1px solid #e2e8f0;margin-top:14px;padding-top:6px;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;">
      <span>${esc(title)}</span>
      <span>Generated: ${new Date().toLocaleString("el-GR")}</span>
    </div>
  `;

  // Fixed overlay at A4 screen width — must be visible for html2canvas
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:794px",
    "min-height:10px",
    "background:#fff",
    "z-index:999999",
    "padding:28px 30px",
    "font-family:Arial,Helvetica,sans-serif",
    "overflow:visible",
    "visibility:visible",
    "opacity:1",
  ].join(";");
  overlay.innerHTML = bodyHtml;
  document.body.appendChild(overlay);

  // Force a reflow so html2canvas sees the rendered DOM
  overlay.getBoundingClientRect();

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(overlay, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const pageW = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297mm
    const marginX = 12;
    const marginY = 12;
    const printW = pageW - marginX * 2;               // 186mm
    const printH = pageH - marginY * 2;               // 273mm

    // Total rendered height in mm (proportional to canvas aspect ratio)
    const canvasMmH = (canvas.height / canvas.width) * printW;

    // Pixels per mm on canvas
    const pxPerMm = canvas.width / printW;

    let yMm = 0;
    let pageNum = 0;

    while (yMm < canvasMmH) {
      if (pageNum > 0) pdf.addPage();

      const srcYpx = Math.round(yMm * pxPerMm);
      const sliceHpx = Math.min(Math.round(printH * pxPerMm), canvas.height - srcYpx);
      if (sliceHpx <= 0) break;

      const sliceMmH = sliceHpx / pxPerMm;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHpx;
      const ctx = sliceCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcYpx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

      const sliceData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(sliceData, "PNG", marginX, marginY, printW, sliceMmH);

      yMm += printH;
      pageNum++;
    }

    pdf.save(`${fileName || "form"}.pdf`);
  } finally {
    document.body.removeChild(overlay);
  }
}