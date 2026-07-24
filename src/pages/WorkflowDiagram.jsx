import React from "react";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const WORKFLOW_CONTENT = `# Bus Shelter Management — Complete Workflow
# Assets → Incidents → Work Orders

Generated: 2026-07-24

---

## 1. OVERVIEW

This platform manages a bus shelter maintenance ecosystem by linking three core entities:

- **Assets** — Bus shelters installed at various locations.
- **Incidents** — Issues, faults, or damage reported against an asset.
- **Work Orders** — Maintenance tasks created to resolve incidents.

---

## 2. ENTITY RELATIONSHIPS

\`\`\`
Asset (Bus Shelter)
  │
  ├──< Incident (Issue reported)
  │        │
  │        ├──< Work Order (Make Safe — auto-created for P2)
  │        ├──< Work Order (Corrective — created after CA approval)
  │        ├──< Work Order (Inspection — created during assessment)
  │        │
  │        ├──< Form Submissions (CR+OMPI, FMPI, Checklists)
  │        ├──< Attachments (Evidence photos, documents)
  │        └──< Audit Trail (Full state transition history)
  │
  ├──< Child Assets (Components: glass, seating, lighting, etc.)
  ├──< Asset Attachments (Install photos, signed forms)
  └──< Asset Transactions (Lifecycle history)

\`\`\`

---

## 3. INCIDENT WORKFLOW STATES (Full Lifecycle)

### Stage 1: Initiation
1. **Awaiting_CR_OMPI** — Incident created, awaiting Confirmation Report + On-site Maintenance Preliminary Inspection.
   - SLA clock starts (24h acknowledgement window for P2).
   - If P2 priority: Make Safe Work Order auto-created.

2. **CR_OMPI_Submitted** — CR+OMPI form submitted, confirmation done.

### Stage 2: Inspection
3. **Awaiting_Inspection** — Waiting for detailed site inspection.

4. **Inspection Completed** (inspection_completed_at timestamped).

### Stage 3: Full Management Plan (FMPI)
5. **FMPI_Draft** — Full Management Plan being prepared.

6. **FMPI_Submitted** — FMPI submitted (digital or manual).
   - fmpi_submitted_at timestamped.

### Stage 4: CA Approval (Two-Stage)
7. **Awaiting_CA_Approval** — FMPI sent to Contract Authority for approval.

8a. **CA_Rejected** — CA rejects the FMPI. Returns to FMPI_Draft for revision.

8b. **CA_Initiation_Approved** — CA approves initiation of works.

### Stage 5: Corrective Works
9. **Works_In_Progress** — Maintenance crew executing the work.
   - works_started_at timestamped.

10. **Works_Completed** — Physical work finished.
    - works_completed_at timestamped.

### Stage 6: CA Completion Approval (Second Stage)
11. **Awaiting_CA_Completion_Approval** — Work evidence submitted to CA.

12a. **CA_Completion_Rejected** — CA rejects completion. Returns to Works_In_Progress.

12b. **CA_Completion_Approved** — CA approves the completed works.

### Stage 7: Closure
13. **Awaiting_Closure** — Final review pending.

14. **Closed** — Incident fully resolved and closed.
    - closed_at timestamped.

**Terminal State:**
15. **Cancelled** — Incident cancelled at any stage.

---

## 4. WORK ORDER TYPES

| Type          | Prefix   | Trigger                              | Auto? |
|---------------|----------|--------------------------------------|-------|
| Make Safe     | MSAFE-   | P2 incident created                  | Yes   |
| Corrective    | CORR-    | CA Initiation approved               | Manual/Auto |
| Inspection    | INSP-    | Inspection stage of workflow         | Manual|

### Work Order States
- **Open** → **In Progress** → **Completed**
- **Cancelled** (at any point)

---

## 5. WORK ORDER LIFECYCLE

\`\`\`
[Incident Created]
       │
       ├──(P2 priority)──> [Make Safe WO Auto-Created] ──> Open → Completed
       │
       ├──(Inspection)────> [Inspection WO Created] ──────> Open → Completed
       │
       └──(CA Approved)───> [Corrective WO Created] ──────> Open → In Progress → Completed
                                                                        │
                                                              (feeds back to Incident)
\`\`\`

---

## 6. SLA & PRIORITY

| Priority | Meaning        | SLA Response Window |
|----------|----------------|---------------------|
| P1       | Low / Standard | Standard timeline   |
| P2       | High / Urgent  | 24h Make Safe       |

- SLA clock starts at incident creation (incident_created_at).
- Acknowledgement deadline computed from priority.
- Make Safe deadline: 24h for P2 incidents.
- SLA status tracked: On Track → At Risk → Breached.

---

## 7. KEY AUTOMATIONS

1. **P2 Auto Make Safe** — Creating a P2 incident auto-generates a Make Safe Work Order with a 24h deadline.
2. **SLA Deadline Computation** — Deadlines calculated at incident creation based on priority and warranty status.
3. **Audit Trail Logging** — Every state transition is automatically logged with user, timestamp, and state before/after.
4. **Form PDF Generation** — Each form submission (CR+OMPI, FMPI, Checklists) generates a PDF attachment.
5. **Cache Sync** — Asset updates immediately sync to incident dialogs to prevent stale data.

---

## 8. NAVIGATION FLOW

\`\`\`
Assets Page
  │
  ├──> Click Asset ──> Asset Detail
  │                       ├──> Tab: Incidents (create/view)
  │                       ├──> Tab: Work Orders
  │                       ├──> Tab: Child Assets
  │                       ├──> Tab: Documents
  │                       └──> Tab: Audit History
  │
  ├──> Incidents Page
  │       └──> Click Incident ──> Incident Detail (full workflow)
  │
  └──> Work Orders Page
          └──> Click WO ID ──> Linked Incident Detail
\`\`\`

---

## 9. DATA MODEL SUMMARY

### Asset
- asset_id, asset_code, active_shelter_id
- location (address, city, municipality, lat/lng)
- shelter type, status, phase
- warranty dates (software, electronics, materials, structural)
- inspection dates

### Incident
- incident_id, title
- related_asset_id, related_asset_name
- status, priority (P1/P2), workflow_state
- SLA fields (deadlines, make_safe_deadline)
- CA approval fields (initiation + completion)
- Subsystem flags (structural, electrical, electronic, other)
- Evidence (files, photos)
- Timestamps for each workflow stage

### Work Order
- work_order_id
- incident_id (link to incident)
- related_asset_id, related_asset_name
- status, priority, assigned_to
- due_date, description

---

## 10. FORM SUBMISSIONS

| Form Type | Stage            | PDF Generated? |
|-----------|-----------------|----------------|
| CR+OMPI   | Initiation      | Yes            |
| FMPI      | Assessment      | Yes            |
| Make Safe Checklist | Make Safe WO | Yes     |
| Inspection Checklist | Inspection WO | Yes    |
| Corrective WO Checklist | Corrective WO | Yes |

- All forms support Digital First flow (persisted independently of PDF).
- PDF generation is atomic — success required before marking form as submitted.
- Duplicate PDF prevention via file_name check.

---

END OF DOCUMENT
`;

export default function WorkflowDiagram() {
  const handleDownload = () => {
    const blob = new Blob([WORKFLOW_CONTENT], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Bus_Shelter_Workflow_Documentation.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <TopHeader
        title="Workflow Documentation"
        subtitle="Complete workflow for Assets, Incidents & Work Orders"
        actions={
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
        }
      />
      <div className="p-6">
        <pre className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[calc(100vh-180px)] overflow-y-auto">
          {WORKFLOW_CONTENT}
        </pre>
      </div>
    </div>
  );
}