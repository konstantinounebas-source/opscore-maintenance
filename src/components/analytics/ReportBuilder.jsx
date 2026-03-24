import React, { useState } from "react";
import { format, differenceInHours } from "date-fns";
import { FileDown, FileText, Table, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CLOSED_STATUSES } from "./kpiUtils";

const SUBJECTS = [
  { id: "operational", label: "Operational Metrics", output: ["PDF", "Excel"] },
  { id: "sla", label: "SLA Compliance", output: ["PDF", "Excel"] },
  { id: "incidents", label: "Incidents Detail", output: ["Excel"] },
  { id: "owr", label: "OWR Cases", output: ["PDF", "Excel"] },
  { id: "fmpi", label: "FMPI Cases", output: ["PDF", "Excel"] },
  { id: "assets", label: "Asset Performance", output: ["PDF", "Excel"] },
  { id: "failure", label: "Failure Type Analysis", output: ["PDF", "Excel"] },
  { id: "workorders", label: "Work Orders", output: ["Excel"] },
];

function generateCSV(data, subjects, dateFrom, dateTo) {
  const lines = [];
  const now = format(new Date(), "dd MMM yyyy HH:mm");
  const ref = `RPT-${Date.now()}`;
  lines.push(`"Report Reference","${ref}"`);
  lines.push(`"Generated","${now}"`);
  lines.push(`"Date Range","${dateFrom || "All"} to ${dateTo || "All"}"`);
  lines.push(`"Subjects","${subjects.join(", ")}"`);
  lines.push("");

  if (subjects.includes("incidents") || subjects.includes("sla") || subjects.includes("owr") || subjects.includes("fmpi")) {
    lines.push("--- INCIDENTS ---");
    lines.push('"ID","Title","Status","Priority","Reported Date","OWR","CA Status","Municipality","FMPI Done"');
    data.filteredIncidents.forEach(i => {
      lines.push(`"${i.incident_id}","${i.title || ""}","${i.status}","${i.priority}","${i.reported_date || ""}","${i.out_of_warranty || ""}","${i.ca_status || ""}","${i.municipality || ""}","${i.owr_fmpi_done ? "Yes" : "No"}"`);
    });
    lines.push("");
  }

  if (subjects.includes("assets") || subjects.includes("operational")) {
    lines.push("--- ASSETS ---");
    lines.push('"Asset ID","Status","City","Municipality","Installation Date","Shelter Type"');
    data.filteredAssets.forEach(a => {
      lines.push(`"${a.asset_id}","${a.status || ""}","${a.city || ""}","${a.municipality || ""}","${a.installation_date || ""}","${a.shelter_type || ""}"`);
    });
    lines.push("");
  }

  if (subjects.includes("workorders")) {
    lines.push("--- WORK ORDERS ---");
    lines.push('"WO ID","Title","Status","Priority","Assigned To","Due Date"');
    data.workOrders.forEach(w => {
      lines.push(`"${w.work_order_id}","${w.title || ""}","${w.status}","${w.priority}","${w.assigned_to || ""}","${w.due_date || ""}"`);
    });
  }

  return lines.join("\n");
}

function generatePDFSummary(data, subjects, dateFrom, dateTo) {
  const { jsPDF } = window.jspdf || {};
  // Fallback: generate text summary as .txt if jsPDF not available
  const now = format(new Date(), "dd MMM yyyy HH:mm");
  const ref = `RPT-${Date.now()}`;
  const { filteredIncidents, filteredAssets, workOrders } = data;
  const closed = filteredIncidents.filter(i => CLOSED_STATUSES.includes(i.status));
  const owr = filteredIncidents.filter(i => i.out_of_warranty === "Yes");
  const activeAssets = filteredAssets.filter(a => a.status === "Active");

  const lines = [
    "ANALYTICS & KPI REPORT",
    "======================",
    `Reference: ${ref}`,
    `Generated: ${now}`,
    `Date Range: ${dateFrom || "All"} to ${dateTo || "All"}`,
    `Subjects: ${subjects.join(", ")}`,
    "",
    "SUMMARY",
    "-------",
    `Total Assets: ${filteredAssets.length}`,
    `Active Shelters: ${activeAssets.length}`,
    `Total Incidents: ${filteredIncidents.length}`,
    `Closed Incidents: ${closed.length}`,
    `Open Incidents: ${filteredIncidents.filter(i => ["Open","In Progress","On Hold"].includes(i.status)).length}`,
    `OWR Incidents: ${owr.length} (${filteredIncidents.length ? Math.round(owr.length/filteredIncidents.length*100) : 0}%)`,
    `Total Work Orders: ${workOrders.length}`,
  ];

  if (subjects.includes("owr")) {
    lines.push("", "OWR CASES", "---------");
    owr.slice(0, 20).forEach(i => lines.push(`${i.incident_id} | ${i.title} | ${i.status} | ${i.ca_status}`));
  }

  if (subjects.includes("fmpi")) {
    const fmpi = filteredIncidents.filter(i => i.owr_fmpi_done);
    lines.push("", "FMPI CASES", "----------");
    fmpi.slice(0, 20).forEach(i => lines.push(`${i.incident_id} | ${i.title} | CA: ${i.ca_status}`));
  }

  return lines.join("\n");
}

export default function ReportBuilder({ data, filters }) {
  const { toast } = useToast();
  const [selectedSubjects, setSelectedSubjects] = useState(["operational"]);
  const [outputFormat, setOutputFormat] = useState("Excel");
  const [reportDateFrom, setReportDateFrom] = useState(filters.dateFrom || "");
  const [reportDateTo, setReportDateTo] = useState(filters.dateTo || "");
  const [generating, setGenerating] = useState(false);

  const toggleSubject = (id) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const availableOutputs = [...new Set(SUBJECTS.filter(s => selectedSubjects.includes(s.id)).flatMap(s => s.output))];

  const handleGenerate = async () => {
    if (!selectedSubjects.length) { toast({ title: "Select at least one subject", variant: "destructive" }); return; }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 300));

    if (outputFormat === "Excel" || outputFormat === "Both") {
      const csv = generateCSV(data, selectedSubjects, reportDateFrom, reportDateTo);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_report_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (outputFormat === "PDF" || outputFormat === "Both") {
      const txt = generatePDFSummary(data, selectedSubjects, reportDateFrom, reportDateTo);
      const blob = new Blob([txt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_report_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({ title: "Report generated and downloaded" });
    setGenerating(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Report Builder</h2>
        <p className="text-xs text-slate-500">Select subjects, date range, and output format. Reports include metadata, filters, and source reference.</p>
      </div>

      {/* Subject Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">A. Subject Matter</h3>
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.map(s => (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSubjects.includes(s.id) ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <Checkbox checked={selectedSubjects.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
              <div>
                <div className="text-sm font-medium text-slate-700">{s.label}</div>
                <div className="text-xs text-slate-400">{s.output.join(" / ")}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">B. Date Range</h3>
        <div className="flex gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From</Label>
            <Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="h-8 text-xs w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To</Label>
            <Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="h-8 text-xs w-40" />
          </div>
        </div>
      </div>

      {/* Output Format */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">C. Output Format</h3>
        <div className="flex gap-3">
          {["Excel", "PDF", "Both"].map(fmt => (
            <button key={fmt} onClick={() => setOutputFormat(fmt)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${outputFormat === fmt ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
              {fmt === "Excel" ? <Table className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {fmt}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          PDF → executive summaries, compliance snapshots &nbsp;|&nbsp; Excel → detailed records, raw data, pivot-ready
        </p>
      </div>

      {/* Report Metadata Preview */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">Each report will include:</p>
        <p>• Report reference number &nbsp;|&nbsp; Date generated &nbsp;|&nbsp; Selected date range</p>
        <p>• Applied filters &nbsp;|&nbsp; Module/data sources &nbsp;|&nbsp; Export timestamp</p>
        <p>Records in scope: <span className="font-semibold text-slate-700">{data.filteredIncidents.length} incidents &nbsp;|&nbsp; {data.filteredAssets.length} assets &nbsp;|&nbsp; {data.workOrders.length} work orders</span></p>
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
        <FileDown className="w-4 h-4" />
        {generating ? "Generating..." : `Generate Report (${outputFormat})`}
      </Button>
    </div>
  );
}