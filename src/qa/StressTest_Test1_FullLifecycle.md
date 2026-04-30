# Stress Test: Test1 — Full Incident Lifecycle (P2 + OWR + FMPI + All Work Orders + Close)
**Date:** 2026-04-30  
**Tester:** QA  
**Incident Name:** Test1  
**Scenario Profile:** P2 (High/Urgent) · OWR = Yes · Make Safe = Yes · Inspection = Yes · CA Approval = Yes · All 3 Work Orders · Attachments at every step · Audit Trail verified · Close

---

## Scenario Overview

This single scenario exercises the **maximum complexity path** through the incident module:

```
Create Incident (Test1, attachment)
  → Submit CR+OMPI (P2, OWR, Make Safe, Inspection, attachment)
    → Make Safe WO (create, fill form, complete, attachment)
    → Inspection WO (create, fill form, complete, attachment)
    → FMPI Digital (fill, attachment, submit → triggers "Awaiting CA Approval")
    → CA Approval (approve, attachment)
    → Corrective WO (unlocked after CA, fill form, complete, attachment)
  → Close Incident (closure photos, notes)
  → Audit Trail verification
```

---

## Step-by-Step Test Execution

---

### STEP 1 — Create Incident

**Where:** Incidents page → "New Incident" button (or IncidentForm)

**Input data:**
- **Title:** `Test1`
- **Related Asset:** Any available asset (e.g. first one in list)
- **Reported Date:** Today (2026-04-30)
- **Description:** `Full lifecycle stress test incident. P2 + OWR + Make Safe + Inspection + CA Approval.`
- **Probable Cause:** Vandalism (or any)
- **Subsystem:** Structural (check at least one)
- **Attachment:** Upload any file (e.g. a photo or PDF) — label it `Test1_InitialPhoto.jpg`

**Expected result:**
- Incident created with unique `incident_id` (e.g. `INC-XXXX`)
- `workflow_state` = `Awaiting_CR_OMPI`
- `status` = `Open`
- Attachment visible in incident attachments list
- Audit trail entry: `"Incident Created"` with user + timestamp

**Actual result:** _______________

**Pass / Fail:** ___

**Issues found:**
- [ ] None

---

### STEP 2 — Submit CR + OMPI

**Where:** Incident Detail → Workflow panel → "Submit CR + OMPI" button

**Input data:**
- **Operational Priority:** P2 – High / Urgent
- **Warranty Status:** OWR (Εκτός Εγγύησης)
- **Make Safe Required:** Yes
- **Inspection Required:** Yes
- **Outline Plan Notes:** `Test1 — P2 OWR. Broken glass panel. Make Safe and Inspection required before corrective work.`
- **Attachment:** Upload a second file — `Test1_OMPI_Evidence.pdf`

**Expected result:**
- `workflow_state` advances to `CR_OMPI_Submitted`
- `operational_priority` = `P2`
- `warranty_status` = `OWR`
- `make_safe_required` = `true`
- `inspection_required` = `true`
- `fmpi_approval_required` = `true` (auto-set because OWR)
- `corrective_allowed` = `false` (blocked until CA approval)
- SLA CR+OMPI deadline shown as 24h from incident creation
- FMPI SLA deadline shown as 7 calendar days from now
- CR+OMPI form submission record created in `FormSubmissions` (form_type = `cr_ompi`)
- Attachment mirrored to `IncidentAttachments`
- Audit trail entry: `"CR+OMPI Submitted"` with priority, warranty, make safe, inspection details

**Actual result:** _______________

**Pass / Fail:** ___

**Issues found:**
- [ ] Check: does submitting CR+OMPI a second time create a duplicate `FormSubmissions` record or update the existing one?
- [ ] Check: is `corrective_allowed = false` correctly blocking the Corrective WO panel at this stage?

---

### STEP 3 — Make Safe Work Order

**Where:** Incident Detail → Work Orders section → "Make Safe WO" panel

#### 3a — Create Make Safe WO
**Action:** Click to expand Make Safe WO panel, click "Add Work Order" or "Create Make Safe WO"

**Expected result:**
- WO created with title containing "Make Safe"
- `incident_id` linked correctly
- WO status = `Open` or `In Progress`
- Audit trail entry for WO creation

**Actual result:** _______________  **Pass / Fail:** ___

#### 3b — Fill Make Safe Checklist Form
**Action:** Click the form button on the Make Safe WO → Fill MakeSafeChecklistForm

**Input data:**
- Assessment fields: fill in damage details
- LOTO compliance: check relevant boxes
- Safety equipment: fill in
- Site action: "Removed broken glass, secured area with barriers"
- Upload attachment: `Test1_MakeSafe_Before.jpg`

**Expected result:**
- Form saves without error
- Attachment linked to incident
- Audit trail entry for form submission

**Actual result:** _______________  **Pass / Fail:** ___

#### 3c — Complete Make Safe WO
**Action:** Mark Make Safe WO as "Completed" (via WO status change or Close WO modal)

- Upload: `Test1_MakeSafe_After.jpg`
- Completion notes: `Make Safe complete. Glass removed, area secured.`

**Expected result:**
- WO status = `Completed`
- Audit trail entry: WO completed + attachment noted

**Actual result:** _______________  **Pass / Fail:** ___

---

### STEP 4 — Inspection Work Order

**Where:** Incident Detail → Work Orders section → "Inspection WO" panel

#### 4a — Create Inspection WO
**Action:** Expand Inspection WO panel → create WO

**Expected result:**
- WO created, linked to incident
- Audit trail entry

**Actual result:** _______________  **Pass / Fail:** ___

#### 4b — Fill Inspection Form
**Action:** Open form on Inspection WO

**Input data:**
- Inspection findings: `Glass panel fully shattered. Structural frame intact. Electrical system unaffected.`
- Recommended action: Replacement of glass panel
- Upload: `Test1_Inspection_Photos.jpg`

**Expected result:**
- Form saved
- Attachment linked

**Actual result:** _______________  **Pass / Fail:** ___

#### 4c — Complete Inspection WO
**Action:** Mark Inspection WO as "Completed"

- Notes: `Inspection complete. Replacement of glass panel recommended.`
- Upload: `Test1_Inspection_Complete.jpg`

**Expected result:**
- WO status = `Completed`
- Audit trail entry

**Actual result:** _______________  **Pass / Fail:** ___

---

### STEP 5 — Fill & Submit Digital FMPI

**Where:** Incident Detail → Administrative Actions → "Fill Digital FMPI"

**Input data (FMPI tab):**
- Incident: auto-selected (Test1)
- Asset: auto-filled from incident
- Outline Date: auto-filled from OMPI submission date (or enter today)
- Εκτός Εγγύησης (OWR): **ΝΑΙ**
- Απαιτείται Έγκριση CA: **ΝΑΙ** (auto because OWR)

**Input data (Pricing Order tab):**
- Row 1: Select from ChildCatalog dropdown (e.g. first active catalog item)
  - Qty: 2
  - Unit price: auto-filled from catalog
  - Confirmation: checked
  - Comments: `Glass panel replacement`
- Row 2: Add a second row, different child item
  - Qty: 1
  - Comments: `Labour cost`
- Upload photo: `Test1_FMPI_Evidence.jpg`
- Signature Name: `Test Engineer`
- Signature Service: `QA Team`
- Signature Date: today

**Action:** Click "Υποβολή" (Submit)

**Expected result:**
- FormSubmissions record created: `form_type = combined_fmpi_invoice`, `status = Submitted`
- `incident.workflow_state` advances to `Awaiting_CA_Approval`
- `incident.fmpi_submitted_at` is set
- `incident.fmpi_approval_required` = `true`
- `incident.corrective_allowed` = `false` (CA not yet approved)
- FMPI section in workflow panel shows green "Submitted" state
- CA Approval section becomes active (not locked)
- Attachment mirrored to `IncidentAttachments`
- Audit trail entry: `"FMPI & Pricing Order Submitted"`
- Total cost calculated correctly (sum of rows)

**Actual result:** _______________

**Pass / Fail:** ___

**Issues found:**
- [ ] Check: does the ChildCatalog dropdown populate? (This was recently migrated from ChildAssets — **verify items appear**)
- [ ] Check: does selecting a catalog item auto-fill the unit price from the catalog record?
- [ ] Check: is the Corrective WO panel still locked (lockedReason shown) at this point?
- [ ] Check: does `workflow_state` actually update to `Awaiting_CA_Approval`? (check Incidents entity)
- [ ] Check: does the FMPI section in the workflow UI reflect "Submitted" status after closing the form?

---

### STEP 6 — CA Approval

**Where:** Incident Detail → Administrative Actions → "Set CA Decision" button

**Input data:**
- Decision: **Approved** ✓
- Comment: `Test1 FMPI reviewed. Cost breakdown verified. Approved for corrective work.`
- Upload: `Test1_CA_SignedApproval.pdf`

**Action:** Click "Confirm Decision"

**Expected result:**
- `incident.ca_decision` = `Approved`
- `incident.ca_decision_at` = now
- `incident.workflow_state` = `Approved_For_Corrective`
- `incident.corrective_allowed` = `true`
- CA section shows green "✓ Approved" with timestamp
- Corrective WO panel is now **unlocked** (no lockedReason)
- Attachment created in `IncidentAttachments`
- Audit trail entry: `"CA Approved"` with comment

**Actual result:** _______________

**Pass / Fail:** ___

**Issues found:**
- [ ] Check: does the Corrective WO panel unlock immediately after CA approval without a page refresh?
- [ ] Check: is the CA decision comment saved to the audit trail entry?

---

### STEP 7 — Corrective Work Order

**Where:** Incident Detail → Work Orders → "Corrective WO" panel (should now be unlocked)

#### 7a — Create Corrective WO
**Action:** Expand Corrective WO panel → create WO

**Expected result:**
- WO created
- `incident_id` linked correctly
- Audit trail entry

**Actual result:** _______________  **Pass / Fail:** ___

#### 7b — Fill Corrective Work Order Form (WorkOrderFormF)
**Action:** Open form on Corrective WO

**Input data:**
- Work description: `Replace glass panel (2 units). Restore structural integrity.`
- Work rows: add 1-2 items
- Upload before photo: `Test1_Corrective_Before.jpg`
- Total cost: calculated from rows
- Notes: `Work carried out per approved FMPI.`

**Expected result:**
- Form saves
- Attachment linked

**Actual result:** _______________  **Pass / Fail:** ___

#### 7c — Complete Corrective WO
**Action:** Mark Corrective WO as "Completed"

- Upload: `Test1_Corrective_After.jpg`
- Completion notes: `Glass replacement complete. Site restored to full operational status.`

**Expected result:**
- WO status = `Completed`
- `incident.workflow_state` may advance to `Awaiting_Closure` or `Corrective_In_Progress`
- Audit trail entry: WO completed

**Actual result:** _______________  **Pass / Fail:** ___

---

### STEP 8 — Close Incident

**Where:** Incident Detail → Administrative Actions → "Close Incident" button

**Input data:**
- Upload closure photos: `Test1_Closure_Photo1.jpg`, `Test1_Closure_Photo2.jpg`
- Closing Notes: `Test1 — Full lifecycle complete. All work orders completed. Site inspected and restored.`

**Action:** Click "Close Incident"

**Expected result:**
- `incident.status` = `Closed`
- `incident.workflow_state` = `Closed`
- `incident.closed_at` = now
- `incident.closure_notes` set
- `incident.closure_evidence_uploaded` = `true`
- Workflow panel shows green "Incident Closed" banner with timestamp
- Audit trail entry: `"Incident Closed"` with notes + attachment metadata

**Actual result:** _______________

**Pass / Fail:** ___

**Issues found:**
- [ ] Check: are open WOs shown as a warning before closing?
- [ ] Note: `canClose = true` bypass is currently hardcoded — closure gate not enforcing WO completion check. **See Bug #1 below.**

---

### STEP 9 — Audit Trail Verification

**Where:** Incident Detail → Audit Trail section (AuditLog component)

**Expected entries (minimum, in order):**

| # | Action | Expected User | Expected Detail Contains |
|---|--------|---------------|--------------------------|
| 1 | Incident Created | tester email | title "Test1", asset |
| 2 | CR+OMPI Submitted | tester email | P2, OWR, Make Safe, Inspection, CA required |
| 3 | Make Safe WO — created | tester email | WO title |
| 4 | Make Safe Form Submitted | tester email | attachment |
| 5 | Make Safe WO — completed | tester email | completion notes |
| 6 | Inspection WO — created | tester email | WO title |
| 7 | Inspection Form Submitted | tester email | attachment |
| 8 | Inspection WO — completed | tester email | completion notes |
| 9 | FMPI & Pricing Order Submitted | tester email | form_type, total cost |
| 10 | CA Approved | tester email | decision, comment |
| 11 | Corrective WO — created | tester email | WO title |
| 12 | Corrective Form Submitted | tester email | attachment |
| 13 | Corrective WO — completed | tester email | completion notes |
| 14 | Incident Closed | tester email | closing notes |

**Minimum count:** 14 entries  
**Actual count found:** ___

**Pass / Fail:** ___

---

### STEP 10 — Attachment Verification

**Where:** Incident Detail → Documents / Attachments tab

**Expected files visible:**

| File | Uploaded At Step | Expected In |
|------|-----------------|-------------|
| Test1_InitialPhoto.jpg | Step 1 | IncidentAttachments |
| Test1_OMPI_Evidence.pdf | Step 2 | IncidentAttachments |
| Test1_MakeSafe_Before.jpg | Step 3b | IncidentAttachments |
| Test1_MakeSafe_After.jpg | Step 3c | IncidentAttachments |
| Test1_Inspection_Photos.jpg | Step 4b | IncidentAttachments |
| Test1_Inspection_Complete.jpg | Step 4c | IncidentAttachments |
| Test1_FMPI_Evidence.jpg | Step 5 | IncidentAttachments |
| Test1_CA_SignedApproval.pdf | Step 6 | IncidentAttachments |
| Test1_Corrective_Before.jpg | Step 7b | IncidentAttachments |
| Test1_Corrective_After.jpg | Step 7c | IncidentAttachments |
| Test1_Closure_Photo1.jpg | Step 8 | IncidentAttachments |
| Test1_Closure_Photo2.jpg | Step 8 | IncidentAttachments |

**Total expected:** 12 files  
**Total found:** ___

**Pass / Fail:** ___

---

## 🐛 BUGS & ISSUES FOUND

---

### BUG-001 — Closure Gate Bypassed (HIGH)
**Severity:** High  
**Location:** `components/incidents/IncidentWorkflow.jsx` line 238  
**Code:**
```js
// Testing bypass: always allow closure
const canClose = true;
```
**Description:** The `CloseIncidentModal` has `canClose = true` hardcoded, meaning the incident can be closed even if there are open Work Orders or missing required documents. The warning is shown (open WOs listed) but the "Close Incident" button is never actually disabled.  
**Impact:** Incident can be closed prematurely — audit trail, corrective completion, and CA approval gates are all rendered meaningless.  
**Fix:** Remove the bypass. Restore: `const canClose = openWOs.length === 0;` and also check that FMPI has been submitted and (if OWR) CA has approved.

---

### BUG-002 — FMPI Workflow State Not Checking CA Requirement Correctly (MEDIUM)
**Severity:** Medium  
**Location:** `components/forms/CombinedFMPIandInvoiceForm.jsx` line 374  
**Code:**
```js
const fmpiApprovalNeeded = data.apaiteitai_eggkrisi_ca === "Yes" || data.ektos_eggyhshs === "Yes";
```
**Description:** The FMPI form stores `ektos_eggyhshs` and `apaiteitai_eggkrisi_ca` as `"Yes"/"No"` (English, normalised in `handleSave`). However, when the form is submitted and the incident workflow state is updated, if the user set `owrValue = "ΝΑΙ"` (Greek), the conversion to `"Yes"` happens correctly in `handleSave` — BUT the incoming `data.ektos_eggyhshs` at the mutation level may still be `"ΝΑΙ"` depending on order-of-operations. If `"ΝΑΙ" === "Yes"` is `false`, `fmpiApprovalNeeded` would be `false`, and the incident would be set to `FMPI_Submitted` instead of `Awaiting_CA_Approval`, skipping the CA gate entirely.  
**Impact:** For OWR incidents, CA gate may be skipped — corrective work proceeds without approval.  
**Fix:** Normalise to English before the mutation check, or compare against both `"Yes"` and `"ΝΑΙ"`.

---

### BUG-003 — ChildCatalog Dropdown Migration (VERIFY)
**Severity:** Medium (newly introduced)  
**Location:** `components/forms/CombinedFMPIandInvoiceForm.jsx` — Pricing Order tab  
**Description:** The Pricing Order tab was recently migrated from `ChildAssets` (asset-specific) to `ChildCatalog` (configuration-based). Needs verification that:
1. `ChildCatalog` records exist and are active (`active !== false`)
2. The dropdown actually populates items
3. Selecting an item auto-fills `unit_price` from the catalog (Bundle uses `bundle_price`, Individual uses `unit_price`)
4. Submitting the form saves `catalog_id` (not `child_id`) in the rows array
5. Old submissions that had `child_id` on rows still load without errors (edit flow)  
**Impact:** If catalog is empty or field mismatch, the entire Pricing Order tab is non-functional.  
**Fix:** Ensure ChildCatalog has active entries. Confirm migration is complete.

---

### BUG-004 — Corrective WO Lock Uses `hasFMPISubmitted` Not `corrective_allowed` Correctly (LOW-MEDIUM)
**Severity:** Low-Medium  
**Location:** `components/incidents/IncidentWorkflow.jsx` lines 593-597  
**Code:**
```js
} else if (panel.woType === "corrective") {
  if (fmpiApprovalRequired && incident.ca_decision !== "Approved") {
    lockedReason = "CA Approval required before corrective work";
  } else if (!fmpiApprovalRequired && !hasFMPISubmitted) {
    lockedReason = "Submit FMPI before corrective work";
  }
}
```
**Description:** Logic is mostly correct, BUT `fmpiApprovalRequired` is derived from `incident.fmpi_approval_required ?? (warrantyStatus === "OWR")`. If `warrantyStatus` is null (e.g. CR+OMPI not submitted yet), `fmpiApprovalRequired` defaults to `false`, meaning the corrective WO may not be locked when it should be.  
**Impact:** Edge case — if the incident was created without CR+OMPI, corrective WO may appear unlocked.  
**Fix:** Add a guard: if `workflowState === "Awaiting_CR_OMPI"`, lock all WOs (this already exists as a top-level check — so impact is minimal, but worth noting).

---

### BUG-005 — `allChildAssets` Still Fetched in IncidentWorkflow (MINOR)
**Severity:** Low  
**Location:** `components/incidents/IncidentWorkflow.jsx` line 343  
**Code:**
```js
const { data: allChildAssets = [] } = useQuery({
  queryKey: ["allChildAssets"],
  queryFn: () => base44.entities.ChildAssets.list(),
  enabled: showFMPIForm
});
```
And line 637:
```js
childAssets={allChildAssets}
```
**Description:** Now that `CombinedFMPIandInvoiceForm` uses `ChildCatalog` internally, the `childAssets` prop is no longer used inside the form. This query and prop are dead code.  
**Impact:** Unnecessary DB query when FMPI form opens. No functional breakage.  
**Fix:** Remove the `allChildAssets` query and the `childAssets` prop from `IncidentWorkflow`.

---

### BUG-006 — CR+OMPI Duplicate Prevention Uses Wrong form_type Lookup (VERIFY)
**Severity:** Medium  
**Location:** `components/incidents/CROMPIForm.jsx` line 194-196  
**Code:**
```js
const existingCROMPI = await base44.entities.FormSubmissions.filter({
  incident_id: incidentId,
  form_type: "cr_ompi"
});
```
**Description:** The CR+OMPI form correctly checks for an existing submission before creating a new one. However, the `OutlineManagementForm` component (if still used as an alternative path) uses `form_type: "outline_management_incident_plan"`. If the FMPI form queries for OMPI data using that type (line 197 in CombinedFMPIandInvoiceForm), there may be a mismatch where no OMPI is found and the auto-fill of `owrValue` and `outlineDate` fails.  
**Impact:** If CR+OMPI was submitted via `CROMPIForm` (type: `cr_ompi`) but FMPI form queries for type `outline_management_incident_plan`, the auto-fill does not work — user must manually enter OWR and outline date.  
**Fix:** Either align the `form_type` values or query for both types in the FMPI form.

---

## Summary Score

| Step | Status | Notes |
|------|--------|-------|
| 1 — Create Incident | 🔲 Pending | |
| 2 — CR+OMPI Submit | 🔲 Pending | |
| 3 — Make Safe WO | 🔲 Pending | |
| 4 — Inspection WO | 🔲 Pending | |
| 5 — FMPI Submit | 🔲 Pending | Verify ChildCatalog dropdown |
| 6 — CA Approval | 🔲 Pending | |
| 7 — Corrective WO | 🔲 Pending | |
| 8 — Close Incident | 🔲 Pending | Bypass bug noted |
| 9 — Audit Trail | 🔲 Pending | Target: 14+ entries |
| 10 — Attachments | 🔲 Pending | Target: 12 files |

---

## Bugs Summary

| Bug ID | Title | Severity | Fix Priority |
|--------|-------|----------|-------------|
| BUG-001 | Closure gate bypassed (`canClose = true`) | High | Immediate |
| BUG-002 | FMPI OWR value comparison may skip CA gate | Medium | Before Production |
| BUG-003 | ChildCatalog migration — verify dropdown works | Medium | Immediate |
| BUG-004 | Corrective WO lock edge case with null warrantyStatus | Low-Medium | Next Sprint |
| BUG-005 | Dead `allChildAssets` query in IncidentWorkflow | Low | Cleanup |
| BUG-006 | CR+OMPI form_type mismatch prevents FMPI auto-fill | Medium | Next Sprint |

---

## Sign-Off

**Tested by:** ________________  **Date:** ___________  
**Dev response:** ________________  **Date:** ___________  

---
*End of Test1 Stress Test Scenario*