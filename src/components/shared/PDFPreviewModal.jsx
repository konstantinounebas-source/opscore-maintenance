import { useState, useRef } from "react";
import { X, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PDFPreviewModal({ html, fileName, onClose }) {
  const iframeRef = useRef();

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);
    await html2pdf()
      .set({
        margin: 0,
        filename: fileName || "form.pdf",
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
    document.body.removeChild(container);
  };

  const srcDoc = html;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
        <span className="text-sm font-medium text-white truncate max-w-md">{fileName || "Document Preview"}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      {/* Iframe viewer */}
      <div className="flex-1 overflow-hidden bg-slate-600 p-4">
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="w-full h-full bg-white rounded shadow-xl"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}