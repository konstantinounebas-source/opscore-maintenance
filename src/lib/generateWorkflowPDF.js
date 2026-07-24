import { jsPDF } from "jspdf";

/**
 * Generates the Bus Shelter Workflow Documentation PDF using jsPDF's
 * direct text API (no html2canvas) for reliable output.
 */
export async function generateWorkflowPDF() {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const marginTop = 20;
  const marginBottom = 18;
  const contentW = pageW - marginX * 2;
  let y = marginTop;

  function ensureSpace(needed) {
    if (y + needed > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function textBlock(text, opts = {}) {
    const { size = 10, bold = false, color = [30, 41, 59], indent = 0, gapAfter = 2 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW - indent);
    for (const line of lines) {
      ensureSpace(size * 0.45 + 1);
      doc.text(line, marginX + indent, y);
      y += size * 0.45 + 1;
    }
    y += gapAfter;
  }

  function heading(text, level = 2) {
    const sizes = { 1: 16, 2: 13, 3: 11 };
    const colors = { 1: [79, 70, 229], 2: [79, 70, 229], 3: [49, 46, 129] };
    y += 3;
    ensureSpace(8);
    if (level === 2) {
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y - 1, marginX + contentW, y - 1);
      y += 2;
    }
    textBlock(text, { size: sizes[level], bold: true, color: colors[level], gapAfter: 3 });
  }

  function bullet(text, indent = 6) {
    ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("•", marginX + indent - 3, y);
    const lines = doc.splitTextToSize(text, contentW - indent - 3);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(5);
      doc.text(lines[i], marginX + indent + 2, y);
      y += 5;
    }
    y += 1;
  }

  function numbered(n, text, indent = 6) {
    ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${n}.`, marginX + indent - 5, y);
    const lines = doc.splitTextToSize(text, contentW - indent - 5);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(5);
      doc.text(lines[i], marginX + indent + 2, y);
      y += 5;
    }
    y += 1;
  }

  function preBlock(text) {
    const lines = text.split("\n");
    y += 2;
    ensureSpace(6);
    const blockH = lines.length * 4.5 + 4;
    if (y + blockH > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, contentW, blockH, 2, 2, "FD");
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    let py = y + 4;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, contentW - 6);
      for (const wl of wrapped) {
        doc.text(wl, marginX + 3, py);
        py += 4.2;
      }
    }
    y = py + 3;
  }

  function table(headers, rows) {
    const colCount = headers.length;
    const colW = contentW / colCount;
    ensureSpace(10);
    doc.setFillColor(79, 70, 229);
    doc.rect(marginX, y, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], marginX + colW * i + 2, y + 5);
    }
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    for (let r = 0; r < rows.length; r++) {
      ensureSpace(7);
      if (r % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentW, 6, "F");
      }
      doc.setDrawColor(203, 213, 225);
      for (let i = 0; i < colCount; i++) {
        doc.line(marginX + colW * i, y, marginX + colW * i, y + 6);
        const cellLines = doc.splitTextToSize(rows[r][i] || "", colW - 4);
        doc.text(cellLines[0] || "", marginX + colW * i + 2, y + 4.5);
      }
      doc.line(marginX + contentW, y, marginX + contentW, y + 6);
      y += 6;
    }
    doc.line(marginX, y, marginX + contentW, y);
    y += 4;
  }

  function divider() {
    y += 2;
    ensureSpace(4);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, marginX + contentW, y);
    y += 4;
  }

  // === HEADER ===
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageW, 4, "F");
  textBlock("Bus Shelter Management", { size: 18, bold: true, color: [79, 70, 229], gapAfter: 1 });
  textBlock("Complete Workflow — Assets → Incidents → Work Orders", { size: 11, color: [100, 116, 139], gapAfter: 0 });
  textBlock("Generated: 2026-07-24", { size: 8, color: [148, 163, 184], gapAfter: 4 });
  divider();

  // === 1. OVERVIEW ===
  heading("1. Overview");
  textBlock("This platform manages a bus shelter maintenance ecosystem by linking three core entities:");
  bullet("Assets — Bus shelters installed at various locations.");
  bullet("Incidents — Issues, faults, or damage reported against an asset.");
  bullet("Work Orders — Maintenance tasks created to resolve incidents.");

  // === 2. ENTITY RELATIONSHIPS ===
  heading("2. Entity Relationships");
  preBlock(`Asset (Bus Shelter)
  │
  ├──< Incident (Issue reported)
  │        │
  │        ├──< Work Order (Make Safe — auto for P2)
  │        ├──< Work Order (Corrective — after CA approval)
  │        ├──< Work Order (Inspection — during assessment)
  │        │
  │        ├──< Form Submissions (CR+OMPI, FMPI, Checklists)
  │        ├──< Attachments (Evidence photos, documents)
  │        └──< Audit Trail (Full state transition history)
  │
  ├──< Child Assets (Components: glass, seating, lighting)
  ├──< Asset Attachments (Install photos, signed forms)
  └──< Asset Transactions (Lifecycle history)`);

  // === 3. WORKFLOW STATES ===
  heading("3. Incident Workflow States (Full Lifecycle)");
  heading("Stage 1: Initiation", 3);
  numbered(1, "Awaiting_CR_OMPI — Incident created, awaiting Confirmation Report + On-site Maintenance Preliminary Inspection. SLA clock starts (24h for P2). If P2: Make Safe WO auto-created.");
  numbered(2, "CR_OMPI_Submitted — CR+OMPI form submitted, confirmation done.");
  heading("Stage 2: Inspection", 3);
  numbered(3, "Awaiting_Inspection — Waiting for detailed site inspection.");
  numbered(4, "Inspection Completed (inspection_completed_at timestamped).");
  heading("Stage 3: Full Management Plan (FMPI)", 3);
  numbered(5, "FMPI_Draft — Full Management Plan being prepared.");
  numbered(6, "FMPI_Submitted — FMPI submitted (digital or manual). fmpi_submitted_at timestamped.");
  heading("Stage 4: CA Approval (Two-Stage)", 3);
  numbered(7, "Awaiting_CA_Approval — FMPI sent to Contract Authority for approval.");
  numbered(8, "CA_Rejected — CA rejects the FMPI. Returns to FMPI_Draft for revision.");
  numbered(9, "CA_Initiation_Approved — CA approves initiation of works.");
  heading("Stage 5: Corrective Works", 3);
  numbered(10, "Works_In_Progress — Maintenance crew executing the work. works_started_at timestamped.");
  numbered(11, "Works_Completed — Physical work finished. works_completed_at timestamped.");
  heading("Stage 6: CA Completion Approval", 3);
  numbered(12, "Awaiting_CA_Completion_Approval — Work evidence submitted to CA.");
  numbered(13, "CA_Completion_Rejected — CA rejects completion. Returns to Works_In_Progress.");
  numbered(14, "CA_Completion_Approved — CA approves the completed works.");
  heading("Stage 7: Closure", 3);
  numbered(15, "Awaiting_Closure — Final review pending.");
  numbered(16, "Closed — Incident fully resolved and closed. closed_at timestamped.");
  textBlock("Terminal State: Cancelled — Incident cancelled at any stage.", { bold: true, gapAfter: 3 });

  // === 4. WORK ORDER TYPES ===
  heading("4. Work Order Types");
  table(["Type", "Prefix", "Trigger", "Auto?"], [
    ["Make Safe", "MSAFE-", "P2 incident created", "Yes"],
    ["Corrective", "CORR-", "CA Initiation approved", "Manual/Auto"],
    ["Inspection", "INSP-", "Inspection stage", "Manual"],
  ]);
  textBlock("Work Order States: Open → In Progress → Completed · Cancelled (at any point)", { bold: true });

  // === 5. LIFECYCLE ===
  heading("5. Work Order Lifecycle");
  preBlock(`[Incident Created]
       │
       ├──(P2)──────────> [Make Safe WO Auto] ──> Open → Completed
       │
       ├──(Inspection)───> [Inspection WO] ─────> Open → Completed
       │
       └──(CA Approved)──> [Corrective WO] ─────> Open → In Progress → Completed
                                                              │
                                                    (feeds back to Incident)`);

  // === 6. SLA ===
  heading("6. SLA & Priority");
  table(["Priority", "Meaning", "SLA Response Window"], [
    ["P1", "Low / Standard", "Standard timeline"],
    ["P2", "High / Urgent", "24h Make Safe"],
  ]);
  bullet("SLA clock starts at incident creation (incident_created_at).");
  bullet("Acknowledgement deadline computed from priority.");
  bullet("Make Safe deadline: 24h for P2 incidents.");
  bullet("SLA status tracked: On Track → At Risk → Breached.");

  // === 7. AUTOMATIONS ===
  heading("7. Key Automations");
  numbered(1, "P2 Auto Make Safe — Creating a P2 incident auto-generates a Make Safe Work Order with a 24h deadline.");
  numbered(2, "SLA Deadline Computation — Deadlines calculated at incident creation based on priority and warranty status.");
  numbered(3, "Audit Trail Logging — Every state transition is automatically logged with user, timestamp, and state before/after.");
  numbered(4, "Form PDF Generation — Each form submission (CR+OMPI, FMPI, Checklists) generates a PDF attachment.");
  numbered(5, "Cache Sync — Asset updates immediately sync to incident dialogs to prevent stale data.");

  // === 8. NAVIGATION ===
  heading("8. Navigation Flow");
  preBlock(`Assets Page
  │
  ├──> Click Asset ──> Asset Detail
  │                      ├──> Tab: Incidents (create/view)
  │                      ├──> Tab: Work Orders
  │                      ├──> Tab: Child Assets
  │                      ├──> Tab: Documents
  │                      └──> Tab: Audit History
  │
  ├──> Incidents Page
  │       └──> Click Incident ──> Incident Detail
  │
  └──> Work Orders Page
          └──> Click WO ID ──> Linked Incident Detail`);

  // === 9. DATA MODEL ===
  heading("9. Data Model Summary");
  heading("Asset", 3);
  bullet("asset_id, asset_code, active_shelter_id");
  bullet("location (address, city, municipality, lat/lng)");
  bullet("shelter type, status, phase");
  bullet("warranty dates (software, electronics, materials, structural)");
  bullet("inspection dates");
  heading("Incident", 3);
  bullet("incident_id, title");
  bullet("related_asset_id, related_asset_name");
  bullet("status, priority (P1/P2), workflow_state");
  bullet("SLA fields (deadlines, make_safe_deadline)");
  bullet("CA approval fields (initiation + completion)");
  bullet("Subsystem flags (structural, electrical, electronic, other)");
  bullet("Evidence (files, photos)");
  bullet("Timestamps for each workflow stage");
  heading("Work Order", 3);
  bullet("work_order_id");
  bullet("incident_id (link to incident)");
  bullet("related_asset_id, related_asset_name");
  bullet("status, priority, assigned_to");
  bullet("due_date, description");

  // === 10. FORM SUBMISSIONS ===
  heading("10. Form Submissions");
  table(["Form Type", "Stage", "PDF?"], [
    ["CR+OMPI", "Initiation", "Yes"],
    ["FMPI", "Assessment", "Yes"],
    ["Make Safe Checklist", "Make Safe WO", "Yes"],
    ["Inspection Checklist", "Inspection WO", "Yes"],
    ["Corrective WO Checklist", "Corrective WO", "Yes"],
  ]);
  bullet("All forms support Digital First flow (persisted independently of PDF).");
  bullet("PDF generation is atomic — success required before marking form as submitted.");
  bullet("Duplicate PDF prevention via file_name check.");

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Bus Shelter Maintenance Platform — Workflow Documentation", marginX, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, pageH - 8, { align: "right" });
  }

  doc.save("Bus_Shelter_Workflow_Documentation.pdf");
}