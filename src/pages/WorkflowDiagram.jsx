import React from "react";
import html2pdf from "html2pdf.js";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const PDF_HTML = `
<div style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 24px; font-size: 12px; line-height: 1.6;">
  <div style="text-align:center; margin-bottom: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 16px;">
    <h1 style="font-size: 22px; color: #4f46e5; margin: 0;">Bus Shelter Management</h1>
    <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Complete Workflow — Assets → Incidents → Work Orders</p>
    <p style="font-size: 10px; color: #94a3b8; margin: 2px 0 0 0;">Generated: 2026-07-24</p>
  </div>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">1. Overview</h2>
  <p>This platform manages a bus shelter maintenance ecosystem by linking three core entities:</p>
  <ul>
    <li><b>Assets</b> — Bus shelters installed at various locations.</li>
    <li><b>Incidents</b> — Issues, faults, or damage reported against an asset.</li>
    <li><b>Work Orders</b> — Maintenance tasks created to resolve incidents.</li>
  </ul>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2. Entity Relationships</h2>
  <pre style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; font-size:11px; white-space:pre-wrap; font-family: 'Courier New', monospace;">Asset (Bus Shelter)
  │
  ├──&lt; Incident (Issue reported)
  │        │
  │        ├──&lt; Work Order (Make Safe — auto-created for P2)
  │        ├──&lt; Work Order (Corrective — created after CA approval)
  │        ├──&lt; Work Order (Inspection — created during assessment)
  │        │
  │        ├──&lt; Form Submissions (CR+OMPI, FMPI, Checklists)
  │        ├──&lt; Attachments (Evidence photos, documents)
  │        └──&lt; Audit Trail (Full state transition history)
  │
  ├──&lt; Child Assets (Components: glass, seating, lighting, etc.)
  ├──&lt; Asset Attachments (Install photos, signed forms)
  └──&lt; Asset Transactions (Lifecycle history)</pre>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3. Incident Workflow States (Full Lifecycle)</h2>

  <p style="font-weight:bold; color:#312e81;">Stage 1: Initiation</p>
  <ol>
    <li><b>Awaiting_CR_OMPI</b> — Incident created, awaiting Confirmation Report + On-site Maintenance Preliminary Inspection.
      <ul><li>SLA clock starts (24h acknowledgement window for P2).</li><li>If P2 priority: Make Safe Work Order auto-created.</li></ul>
    </li>
    <li><b>CR_OMPI_Submitted</b> — CR+OMPI form submitted, confirmation done.</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 2: Inspection</p>
  <ol start="3">
    <li><b>Awaiting_Inspection</b> — Waiting for detailed site inspection.</li>
    <li><b>Inspection Completed</b> (inspection_completed_at timestamped).</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 3: Full Management Plan (FMPI)</p>
  <ol start="5">
    <li><b>FMPI_Draft</b> — Full Management Plan being prepared.</li>
    <li><b>FMPI_Submitted</b> — FMPI submitted (digital or manual). fmpi_submitted_at timestamped.</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 4: CA Approval (Two-Stage)</p>
  <ol start="7">
    <li><b>Awaiting_CA_Approval</b> — FMPI sent to Contract Authority for approval.</li>
    <li><b>CA_Rejected</b> — CA rejects the FMPI. Returns to FMPI_Draft for revision.</li>
    <li><b>CA_Initiation_Approved</b> — CA approves initiation of works.</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 5: Corrective Works</p>
  <ol start="9">
    <li><b>Works_In_Progress</b> — Maintenance crew executing the work. works_started_at timestamped.</li>
    <li><b>Works_Completed</b> — Physical work finished. works_completed_at timestamped.</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 6: CA Completion Approval (Second Stage)</p>
  <ol start="11">
    <li><b>Awaiting_CA_Completion_Approval</b> — Work evidence submitted to CA.</li>
    <li><b>CA_Completion_Rejected</b> — CA rejects completion. Returns to Works_In_Progress.</li>
    <li><b>CA_Completion_Approved</b> — CA approves the completed works.</li>
  </ol>

  <p style="font-weight:bold; color:#312e81;">Stage 7: Closure</p>
  <ol start="13">
    <li><b>Awaiting_Closure</b> — Final review pending.</li>
    <li><b>Closed</b> — Incident fully resolved and closed. closed_at timestamped.</li>
  </ol>
  <p><b>Terminal State:</b> <b>Cancelled</b> — Incident cancelled at any stage.</p>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">4. Work Order Types</h2>
  <table style="width:100%; border-collapse:collapse; font-size:11px;">
    <thead>
      <tr style="background:#4f46e5; color:white;">
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Type</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Prefix</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Trigger</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Auto?</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">Make Safe</td><td style="border:1px solid #cbd5e1; padding:6px;">MSAFE-</td><td style="border:1px solid #cbd5e1; padding:6px;">P2 incident created</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
      <tr style="background:#f8fafc;"><td style="border:1px solid #cbd5e1; padding:6px;">Corrective</td><td style="border:1px solid #cbd5e1; padding:6px;">CORR-</td><td style="border:1px solid #cbd5e1; padding:6px;">CA Initiation approved</td><td style="border:1px solid #cbd5e1; padding:6px;">Manual/Auto</td></tr>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">Inspection</td><td style="border:1px solid #cbd5e1; padding:6px;">INSP-</td><td style="border:1px solid #cbd5e1; padding:6px;">Inspection stage of workflow</td><td style="border:1px solid #cbd5e1; padding:6px;">Manual</td></tr>
    </tbody>
  </table>
  <p><b>Work Order States:</b> Open → In Progress → Completed · Cancelled (at any point)</p>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">5. Work Order Lifecycle</h2>
  <pre style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; font-size:11px; white-space:pre-wrap; font-family: 'Courier New', monospace;">[Incident Created]
       │
       ├──(P2 priority)──&gt; [Make Safe WO Auto-Created] ──&gt; Open → Completed
       │
       ├──(Inspection)────&gt; [Inspection WO Created] ──────&gt; Open → Completed
       │
       └──(CA Approved)───&gt; [Corrective WO Created] ──────&gt; Open → In Progress → Completed
                                                                        │
                                                              (feeds back to Incident)</pre>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">6. SLA &amp; Priority</h2>
  <table style="width:100%; border-collapse:collapse; font-size:11px;">
    <thead>
      <tr style="background:#4f46e5; color:white;">
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Priority</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Meaning</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">SLA Response Window</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">P1</td><td style="border:1px solid #cbd5e1; padding:6px;">Low / Standard</td><td style="border:1px solid #cbd5e1; padding:6px;">Standard timeline</td></tr>
      <tr style="background:#f8fafc;"><td style="border:1px solid #cbd5e1; padding:6px;">P2</td><td style="border:1px solid #cbd5e1; padding:6px;">High / Urgent</td><td style="border:1px solid #cbd5e1; padding:6px;">24h Make Safe</td></tr>
    </tbody>
  </table>
  <ul>
    <li>SLA clock starts at incident creation (incident_created_at).</li>
    <li>Acknowledgement deadline computed from priority.</li>
    <li>Make Safe deadline: 24h for P2 incidents.</li>
    <li>SLA status tracked: On Track → At Risk → Breached.</li>
  </ul>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">7. Key Automations</h2>
  <ol>
    <li><b>P2 Auto Make Safe</b> — Creating a P2 incident auto-generates a Make Safe Work Order with a 24h deadline.</li>
    <li><b>SLA Deadline Computation</b> — Deadlines calculated at incident creation based on priority and warranty status.</li>
    <li><b>Audit Trail Logging</b> — Every state transition is automatically logged with user, timestamp, and state before/after.</li>
    <li><b>Form PDF Generation</b> — Each form submission (CR+OMPI, FMPI, Checklists) generates a PDF attachment.</li>
    <li><b>Cache Sync</b> — Asset updates immediately sync to incident dialogs to prevent stale data.</li>
  </ol>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">8. Navigation Flow</h2>
  <pre style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; font-size:11px; white-space:pre-wrap; font-family: 'Courier New', monospace;">Assets Page
  │
  ├──&gt; Click Asset ──&gt; Asset Detail
  │                       ├──&gt; Tab: Incidents (create/view)
  │                       ├──&gt; Tab: Work Orders
  │                       ├──&gt; Tab: Child Assets
  │                       ├──&gt; Tab: Documents
  │                       └──&gt; Tab: Audit History
  │
  ├──&gt; Incidents Page
  │       └──&gt; Click Incident ──&gt; Incident Detail (full workflow)
  │
  └──&gt; Work Orders Page
          └──&gt; Click WO ID ──&gt; Linked Incident Detail</pre>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">9. Data Model Summary</h2>
  <p style="font-weight:bold; color:#312e81;">Asset</p>
  <ul><li>asset_id, asset_code, active_shelter_id</li><li>location (address, city, municipality, lat/lng)</li><li>shelter type, status, phase</li><li>warranty dates (software, electronics, materials, structural)</li><li>inspection dates</li></ul>
  <p style="font-weight:bold; color:#312e81;">Incident</p>
  <ul><li>incident_id, title</li><li>related_asset_id, related_asset_name</li><li>status, priority (P1/P2), workflow_state</li><li>SLA fields (deadlines, make_safe_deadline)</li><li>CA approval fields (initiation + completion)</li><li>Subsystem flags (structural, electrical, electronic, other)</li><li>Evidence (files, photos)</li><li>Timestamps for each workflow stage</li></ul>
  <p style="font-weight:bold; color:#312e81;">Work Order</p>
  <ul><li>work_order_id</li><li>incident_id (link to incident)</li><li>related_asset_id, related_asset_name</li><li>status, priority, assigned_to</li><li>due_date, description</li></ul>

  <h2 style="font-size: 15px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">10. Form Submissions</h2>
  <table style="width:100%; border-collapse:collapse; font-size:11px;">
    <thead>
      <tr style="background:#4f46e5; color:white;">
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Form Type</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Stage</th>
        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">PDF Generated?</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">CR+OMPI</td><td style="border:1px solid #cbd5e1; padding:6px;">Initiation</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
      <tr style="background:#f8fafc;"><td style="border:1px solid #cbd5e1; padding:6px;">FMPI</td><td style="border:1px solid #cbd5e1; padding:6px;">Assessment</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">Make Safe Checklist</td><td style="border:1px solid #cbd5e1; padding:6px;">Make Safe WO</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
      <tr style="background:#f8fafc;"><td style="border:1px solid #cbd5e1; padding:6px;">Inspection Checklist</td><td style="border:1px solid #cbd5e1; padding:6px;">Inspection WO</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
      <tr><td style="border:1px solid #cbd5e1; padding:6px;">Corrective WO Checklist</td><td style="border:1px solid #cbd5e1; padding:6px;">Corrective WO</td><td style="border:1px solid #cbd5e1; padding:6px;">Yes</td></tr>
    </tbody>
  </table>
  <ul>
    <li>All forms support Digital First flow (persisted independently of PDF).</li>
    <li>PDF generation is atomic — success required before marking form as submitted.</li>
    <li>Duplicate PDF prevention via file_name check.</li>
  </ul>

  <div style="text-align:center; margin-top:24px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8;">END OF DOCUMENT — Bus Shelter Maintenance Platform</div>
</div>
`;

export default function WorkflowDiagram() {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = () => {
    setDownloading(true);
    const container = document.createElement("div");
    container.innerHTML = PDF_HTML;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    document.body.appendChild(container);

    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: "Bus_Shelter_Workflow_Documentation.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(container)
      .save()
      .then(() => {
        document.body.removeChild(container);
        setDownloading(false);
      })
      .catch(() => {
        document.body.removeChild(container);
        setDownloading(false);
      });
  };

  return (
    <div>
      <TopHeader
        title="Workflow Documentation"
        subtitle="Complete workflow for Assets, Incidents & Work Orders"
        actions={
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleDownload} disabled={downloading}>
            <Download className="w-3.5 h-3.5" /> {downloading ? "Generating..." : "Download PDF"}
          </Button>
        }
      />
      <div className="p-6">
        <div
          className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-700 leading-relaxed max-h-[calc(100vh-180px)] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: PDF_HTML }}
        />
      </div>
    </div>
  );
}