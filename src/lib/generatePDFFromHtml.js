/**
 * Renders a FULL HTML document string (with <!DOCTYPE>, <head>, <style>, <body>)
 * into a hidden iframe, then captures it with html2canvas + jsPDF.
 *
 * This is necessary because html2pdf.js / html2canvas cannot apply <style> blocks
 * from a full HTML document when set via innerHTML — resulting in blank PDFs.
 */
export async function generatePDFFromHtml(fullHtmlDocument, fileName, { autoSave = true } = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(fullHtmlDocument);
      doc.close();

      // Wait for the iframe to fully render
      await new Promise(r => setTimeout(r, 500));
      // Wait for images to load
      const imgs = Array.from(iframe.contentWindow.document.images || []);
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
      // Extra reflow time
      await new Promise(r => setTimeout(r, 300));

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const bodyEl = iframe.contentWindow.document.body;

      const canvas = await html2canvas(bodyEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });

      document.body.removeChild(iframe);

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const marginY = 10;
      const printW = pageW - marginX * 2;
      const printH = pageH - marginY * 2;

      const canvasMmH = (canvas.height / canvas.width) * printW;
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

      if (autoSave) {
        pdf.save(`${fileName || "document"}.pdf`);
      }

      // Also return a blob for upload
      const blob = pdf.output("blob");
      resolve(blob);
    } catch (err) {
      reject(err);
    }
  });
}