# Incident Module Stress-Test Checklist & QA Report
**Date:** 2026-04-27  
**Module:** Incident Management System  
**Focus:** Workflow correctness, evidence handling, approvals, forms, WOs, audit trail, duplicate prevention, permissions  
**Test Environment:** Contractor + CA + Government stakeholders  

---

## QA Test Matrix

| Test ID | Scenario | User Role | Status | Result | Pass/Fail | Severity | Issue | Fix |
|---------|----------|-----------|--------|--------|-----------|----------|-------|-----|
| 1.1 | Standard P1 / No OWR / No Inspection - Incident Create | Field Tech | Pending | | | | | |
| 1.2 | Standard P1 / No OWR / No Inspection - OMPI Submit | Contractor Admin | Pending | | | | | |
| 1.3 | Standard P1 / No OWR / No Inspection - Corrective WO Create | Field Tech | Pending | | | | | |
| 1.4 | Standard P1 / No OWR / No Inspection - Verify FMPI NOT required | Contractor Admin | Pending | | | | | |
| 1.5 | Standard P1 / No OWR / No Inspection - Work Complete + Evidence | Field Tech | Pending | | | | | |
| 1.6 | Standard P1 / No OWR / No Inspection - Close Incident | Contractor Admin | Pending | | | | | |
| 2.1 | P1 / OWR Yes / FMPI Required - Incident Create | Field Tech | Pending | | | | | |
| 2.2 | P1 / OWR Yes / FMPI Required - OMPI Submit | Contractor Admin | Pending | | | | | |
| 2.3 | P1 / OWR Yes / FMPI Required - Verify FMPI is required | Contractor Admin | Pending | | | | | |
| 2.4 | P1 / OWR Yes / FMPI Required - FMPI with cost/planning | Contractor Admin | Pending | | | | | |
| 2.5 | P1 / OWR Yes / FMPI Required - CA Approval Flow | CA User | Pending | | | | | |
| 2.6 | P1 / OWR Yes / FMPI Required - Corrective WO after approval | Field Tech | Pending | | | | | |
| 3.1 | P1 / Inspection Needed - Incident Create | Field Tech | Pending | | | | | |
| 3.2 | P1 / Inspection Needed - Inspection WO Auto-Create | Contractor Admin | Pending | | | | | |
| 3.3 | P1 / Inspection Needed - Inspection Photos Upload | Field Tech | Pending | | | | | |
| 3.4 | P1 / Inspection Needed - Mark Inspection Complete | Field Tech | Pending | | | | | |
| 3.5 | P1 / Inspection Needed - Verify Corrective WO only after inspection | Contractor Admin | Pending | | | | | |
| 4.1 | P1 / OWR / Inspection / CA Approval - Full Lifecycle Start | Field Tech | Pending | | | | | |
| 4.2 | P1 / OWR / Inspection / CA Approval - Inspection Complete | Field Tech | Pending | | | | | |
| 4.3 | P1 / OWR / Inspection / CA Approval - FMPI Create | Contractor Admin | Pending | | | | | |
| 4.4 | P1 / OWR / Inspection / CA Approval - CA Approves | CA User | Pending | | | | | |
| 4.5 | P1 / OWR / Inspection / CA Approval - Corrective WO + Evidence | Field Tech | Pending | | | | | |
| 4.6 | P1 / OWR / Inspection / CA Approval - Close | Contractor Admin | Pending | | | | | |
| 5.1 | P2 / Make-Safe Required - Incident Create | Field Tech | Pending | | | | | |
| 5.2 | P2 / Make-Safe Required - Make-Safe WO Auto-Create | Contractor Admin | Pending | | | | | |
| 5.3 | P2 / Make-Safe Required - Make-Safe Evidence Upload | Field Tech | Pending | | | | | |
| 5.4 | P2 / Make-Safe Required - Complete Make-Safe WO | Field Tech | Pending | | | | | |
| 5.5 | P2 / Make-Safe Required - Verify separate Corrective WO | Contractor Admin | Pending | | | | | |
| 6.1 | P2 / OWR Yes - Incident Create | Field Tech | Pending | | | | | |
| 6.2 | P2 / OWR Yes - Make-Safe + FMPI Both Required | Contractor Admin | Pending | | | | | |
| 6.3 | P2 / OWR Yes - Make-Safe Complete != Incident Close | Contractor Admin | Pending | | | | | |
| 6.4 | P2 / OWR Yes - FMPI with cost/planning | Contractor Admin | Pending | | | | | |
| 7.1 | P2 / Non-Working Day - No SLA Blocking | Contractor Admin | Pending | | | | | |
| 8.1 | CA Approval Required - Submit for Approval | Contractor Admin | Pending | | | | | |
| 8.2 | CA Approval Required - CA Approves | CA User | Pending | | | | | |
| 8.3 | CA Approval Required - Verify Audit Trail Records Approval | Auditor | Pending | | | | | |
| 9.1 | CA Approval Rejected - CA Rejects with Reason | CA User | Pending | | | | | |
| 9.2 | CA Approval Rejected - Incident Editable | Contractor Admin | Pending | | | | | |
| 9.3 | CA Approval Rejected - WO Cannot Proceed | Contractor Admin | Pending | | | | | |
| 10.1 | CA Approval Not Required - No Approval Form | Contractor Admin | Pending | | | | | |
| 11.1 | Duplicate Button Click - Incident Create Spam | Field Tech | Pending | | | | | |
| 11.2 | Duplicate Button Click - OMPI Spam | Contractor Admin | Pending | | | | | |
| 11.3 | Duplicate Button Click - FMPI Spam | Contractor Admin | Pending | | | | | |
| 11.4 | Duplicate Button Click - WO Spam | Field Tech | Pending | | | | | |
| 11.5 | Duplicate Button Click - File Upload Spam | Field Tech | Pending | | | | | |
| 12.1 | Reopen Existing Form - OMPI Draft Save | Contractor Admin | Pending | | | | | |
| 12.2 | Reopen Existing Form - Leave & Return | Contractor Admin | Pending | | | | | |
| 12.3 | Reopen Existing Form - Verify No New Form Created | Contractor Admin | Pending | | | | | |
| 13.1 | FMPI Duplicate Prevention - Create FMPI | Contractor Admin | Pending | | | | | |
| 13.2 | FMPI Duplicate Prevention - Click Create Again | Contractor Admin | Pending | | | | | |
| 13.3 | FMPI Duplicate Prevention - Verify Existing Opens | Contractor Admin | Pending | | | | | |
| 14.1 | WO Duplicate Prevention - Auto-Create Make-Safe | Contractor Admin | Pending | | | | | |
| 14.2 | WO Duplicate Prevention - Refresh + Edit | Contractor Admin | Pending | | | | | |
| 14.3 | WO Duplicate Prevention - No Recreate | Contractor Admin | Pending | | | | | |
| 15.1 | Multi-File Upload - 5 Files to Incident | Field Tech | Pending | | | | | |
| 15.2 | Multi-File Upload - 5 Files to OMPI | Contractor Admin | Pending | | | | | |
| 15.3 | Multi-File Upload - 5 Files to FMPI | Contractor Admin | Pending | | | | | |
| 15.4 | Multi-File Upload - 5 Files to WO | Field Tech | Pending | | | | | |
| 15.5 | Multi-File Upload - All Visible After Refresh | Contractor Admin | Pending | | | | | |
| 16.1 | Attachment Persistence - Upload + Edit Form | Contractor Admin | Pending | | | | | |
| 16.2 | Attachment Persistence - Save Form | Contractor Admin | Pending | | | | | |
| 16.3 | Attachment Persistence - Verify Old + New | Contractor Admin | Pending | | | | | |
| 17.1 | Attachment Permission - Tech Uploads | Field Tech | Pending | | | | | |
| 17.2 | Attachment Permission - Admin Reviews | Contractor Admin | Pending | | | | | |
| 17.3 | Attachment Permission - CA Views | CA User | Pending | | | | | |
| 17.4 | Attachment Permission - Unauthorized Delete Blocked | Contractor Supervisor | Pending | | | | | |
| 18.1 | PDF Export - OMPI | Contractor Admin | Pending | | | | | |
| 18.2 | PDF Export - FMPI | Contractor Admin | Pending | | | | | |
| 18.3 | PDF Export - Inspection Form | Contractor Admin | Pending | | | | | |
| 18.4 | PDF Export - Make-Safe Checklist | Field Tech | Pending | | | | | |
| 18.5 | PDF Export - Corrective WO Report | Contractor Admin | Pending | | | | | |
| 18.6 | PDF Export - Verify All Fields + Incident ID + Asset ID | Auditor | Pending | | | | | |
| 19.1 | Audit Trail - Full Lifecycle Completeness | Auditor | Pending | | | | | |
| 20.1 | Status Skipping - Open → Closed Blocked | Contractor Admin | Pending | | | | | |
| 20.2 | Status Skipping - Missing FMPI Blocks Close | Contractor Admin | Pending | | | | | |
| 20.3 | Status Skipping - Missing Inspection Blocks Close | Contractor Admin | Pending | | | | | |
| 20.4 | Status Skipping - Error Message Clear | Contractor Admin | Pending | | | | | |
| 21.1 | Partial Completion - WO Incomplete | Field Tech | Pending | | | | | |
| 21.2 | Partial Completion - Try to Close | Contractor Admin | Pending | | | | | |
| 21.3 | Partial Completion - System Shows Missing Req | Contractor Admin | Pending | | | | | |
| 22.1 | Wrong Parent Link - Multiple Incidents Same Asset | Contractor Admin | Pending | | | | | |
| 22.2 | Wrong Parent Link - Forms/WOs Linked Correctly | Contractor Admin | Pending | | | | | |
| 23.1 | Same Asset Multiple Incidents - Allow / Warn | Contractor Admin | Pending | | | | | |
| 23.2 | Same Asset Multiple Incidents - No Overwrite | Contractor Admin | Pending | | | | | |
| 24.1 | Asset / Child Asset Logic - Child in Incident | Field Tech | Pending | | | | | |
| 24.2 | Asset / Child Asset Logic - Child in WO/Form | Contractor Admin | Pending | | | | | |
| 24.3 | Asset / Child Asset Logic - Warranty/OWR Logic | Contractor Admin | Pending | | | | | |
| 25.1 | OWR Change After FMPI - Change OWR No | Contractor Admin | Pending | | | | | |
| 25.2 | OWR Change After FMPI - System Asks / Warns | Contractor Admin | Pending | | | | | |
| 25.3 | OWR Change After FMPI - Audit Trail Records | Auditor | Pending | | | | | |
| 26.1 | Priority Change After Make-Safe - Change Priority | Contractor Admin | Pending | | | | | |
| 26.2 | Priority Change After Make-Safe - Make-Safe Not Deleted | Contractor Admin | Pending | | | | | |
| 26.3 | Priority Change After Make-Safe - Audit Trail | Auditor | Pending | | | | | |
| 27.1 | CA User View - Permission Filtering | CA User | Pending | | | | | |
| 27.2 | CA User View - Cannot Edit Contractor Fields | CA User | Pending | | | | | |
| 27.3 | CA User View - Can Approve/Reject | CA User | Pending | | | | | |
| 28.1 | Technician View - Sees Assigned WOs | Field Tech | Pending | | | | | |
| 28.2 | Technician View - Can Upload Evidence | Field Tech | Pending | | | | | |
| 28.3 | Technician View - Cannot Approve | Field Tech | Pending | | | | | |
| 29.1 | Contractor Admin View - Sees All | Contractor Admin | Pending | | | | | |
| 29.2 | Contractor Admin View - Can Correct | Contractor Admin | Pending | | | | | |
| 29.3 | Contractor Admin View - Audited Actions | Auditor | Pending | | | | | |
| 30.1 | Long Lifecycle - P2 OWR Inspection CA Make-Safe | Contractor Admin | Pending | | | | | |
| 30.2 | Long Lifecycle - Multiple Attachments | Field Tech | Pending | | | | | |
| 30.3 | Long Lifecycle - Rejection + Resubmission | CA User | Pending | | | | | |
| 30.4 | Long Lifecycle - Verify All Requirements | Auditor | Pending | | | | | |
| 31.1 | Browser Refresh - Draft Data Preserved | Contractor Admin | Pending | | | | | |
| 31.2 | Browser Refresh - Warning Before Leave | Contractor Admin | Pending | | | | | |
| 32.1 | Mobile / Tablet - File Upload Works | Field Tech | Pending | | | | | |
| 32.2 | Mobile / Tablet - Camera Evidence | Field Tech | Pending | | | | | |
| 32.3 | Mobile / Tablet - Form Submission | Field Tech | Pending | | | | | |
| 33.1 | Error Handling - Unsupported File | Field Tech | Pending | | | | | |
| 33.2 | Error Handling - Missing Required Field | Contractor Admin | Pending | | | | | |
| 33.3 | Error Handling - Lost Internet During Upload | Field Tech | Pending | | | | | |
| 34.1 | Reporting Consistency - Incident Count | Auditor | Pending | | | | | |
| 34.2 | Reporting Consistency - Status Counts | Auditor | Pending | | | | | |
| 34.3 | Reporting Consistency - WO Counts | Auditor | Pending | | | | | |
| 35.1 | Regression - Simple Incident | Contractor Admin | Pending | | | | | |
| 35.2 | Regression - OWR Incident | Contractor Admin | Pending | | | | | |
| 35.3 | Regression - P2 Make-Safe | Contractor Admin | Pending | | | | | |
| 35.4 | Regression - CA Approval | CA User | Pending | | | | | |
| 35.5 | Regression - Multi-Attachment | Field Tech | Pending | | | | | |

---

## Test Scenario Details

### Group 1: Basic Workflows (Test 1-7)

**Test 1: Standard P1 / No OWR / No Inspection**
- **Steps:**
  1. Create incident, set priority P1, OWR = No, Inspection = No
  2. Submit OMPI form
  3. System should NOT require Inspection WO or FMPI
  4. Create Corrective WO manually if needed
  5. Field Tech completes work, uploads before/after photos
  6. Mark WO complete
  7. Close incident
- **Expected:** FMPI not required, closure only after corrective work + evidence
- **Actual:** [TO BE TESTED]
- **Critical Checks:** FMPI required field, WO dependency, Closure gate

**Test 2: P1 / OWR = Yes / FMPI Required**
- **Steps:**
  1. Create P1 incident, OWR = Yes
  2. Submit OMPI
  3. System enforces FMPI creation
  4. Fill FMPI with cost, planning, reasoning
  5. Check if CA approval gate is required
  6. If required: wait CA approval, then create Corrective WO
  7. Complete work + evidence
  8. Close
- **Expected:** No progression without FMPI, no work before CA approval if required
- **Actual:** [TO BE TESTED]
- **Critical Checks:** FMPI requirement trigger, CA gate enforcement, WO ordering

**Test 3: P1 / Inspection Needed**
- **Steps:**
  1. Create incident, mark Inspection Required = Yes
  2. System auto-creates Inspection WO or allows manual creation
  3. Technician completes inspection, uploads photos/findings
  4. Decide corrective action based on inspection
  5. Create Corrective WO
  6. Complete corrective work
  7. Close
- **Expected:** Corrective WO only after inspection, closure blocked without inspection
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Inspection WO dependency, ordering constraint, closure gate

**Test 4: P1 / OWR / Inspection / CA Approval - Full Sequential Flow**
- **Steps:** All of above in sequence
- **Expected:** Correct sequential progression, no duplicates, all steps recorded in audit trail
- **Actual:** [TO BE TESTED]
- **Critical Checks:** All dependencies, all timestamps, no skipping

---

### Group 2: Approval Workflows (Test 8-10)

**Test 8: CA Approval Required & Granted**
- **Steps:**
  1. Create OWR incident requiring CA approval
  2. Submit FMPI
  3. System shows "Pending CA Approval" status
  4. CA User logs in, reviews FMPI + incident
  5. CA approves with optional notes
  6. System unlocks Corrective WO creation
  7. Work proceeds
- **Expected:** Approval date, approver name, decision recorded; work blocked until approval
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Approval permission gate, status change, audit log

**Test 9: CA Approval Rejected**
- **Steps:**
  1. Submit for CA approval
  2. CA rejects with mandatory reason
  3. Incident returns to "Awaiting Resubmission" state
  4. Contractor edits FMPI
  5. Resubmits for approval
  6. CA approves second attempt
- **Expected:** Rejection reason recorded, WO blocked, resubmission allowed, full audit trail
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Rejection recording, state rollback, resubmission gate

**Test 10: CA Approval Not Required**
- **Steps:**
  1. Create incident where CA approval is NOT required (P1, non-OWR)
  2. Submit OMPI/FMPI
  3. System should skip approval gate
  4. Work can proceed immediately
- **Expected:** No unnecessary approval form, no pending status, immediate progression
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Condition logic, no phantom gates

---

### Group 3: Duplicate Prevention (Test 11-14)

**Test 11: Duplicate Button Click Prevention**
- **Sub-tests:**
  - Rapidly click "Create Incident" button → no duplicate incidents
  - Rapidly click "Submit OMPI" → no duplicate forms
  - Rapidly click "Create FMPI" → no duplicate FMPI
  - Rapidly click "Create WO" → no duplicate WO
  - Rapidly click file upload → no duplicate files
- **Expected:** Button disables during processing, existing records open on retry
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Button disabled state, ID uniqueness, idempotent API calls

**Test 12: Reopen Existing Form**
- **Steps:**
  1. Create OMPI, save as draft
  2. Navigate away from incident
  3. Return to incident, click "OMPI" again
  4. Edit OMPI
  5. Save
- **Expected:** Same OMPI opens (not new), edits update existing record
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Form ID lookup, no new form creation

**Test 13: FMPI Duplicate Prevention**
- **Steps:**
  1. Create FMPI for OWR incident, submit
  2. Return to incident, click "Create FMPI" again
  3. System should warn or open existing FMPI
- **Expected:** Existing FMPI opens, no new form created unless "Create Revision" selected
- **Actual:** [TO BE TESTED]
- **Critical Checks:** FMPI_done flag, form state lookup, revision logic

**Test 14: Work Order Duplicate Prevention**
- **Steps:**
  1. Auto-create Make-Safe WO or manually create
  2. Refresh incident
  3. Edit a non-related field (e.g., asset name)
  4. Save
  5. Check WO count
- **Expected:** Make-Safe WO not recreated, count remains 1
- **Actual:** [TO BE TESTED]
- **Critical Checks:** WO_done flag, idempotent creation, count consistency

---

### Group 4: File Handling (Test 15-17)

**Test 15: Multi-File Upload to Multiple Locations**
- **Sub-tests:**
  - Upload 5 files to incident
  - Upload 5 files to OMPI form
  - Upload 5 files to FMPI form
  - Upload 5 files to Corrective WO
  - All 20 files visible after browser refresh
- **Expected:** All files saved, all visible, each with name/size/uploader/date/URL in audit trail
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Parallel upload handling, metadata completeness, persistence

**Test 16: Attachment Persistence After Edit**
- **Steps:**
  1. Upload 3 files to FMPI
  2. Edit cost field in FMPI
  3. Upload 2 more files
  4. Save
  5. Check total files
- **Expected:** 5 files total, old files remain, new files appended
- **Actual:** [TO BE TESTED]
- **Critical Checks:** No overwrite, append-only logic, metadata retained

**Test 17: Attachment Permission Control**
- **Sub-tests:**
  - Field Tech uploads evidence
  - Contractor Admin views, downloads
  - CA views attachment list
  - Unauthorized user tries to delete → blocked
- **Expected:** Correct RBAC, evidence immutable after upload, all views have access
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Permission checks, delete guard, role filtering

---

### Group 5: Export & Documentation (Test 18)

**Test 18: PDF/Download Export for All Forms**
- **Sub-tests for each form (OMPI, FMPI, Inspection, Make-Safe, Corrective, Preventive):**
  1. Fill form with all fields
  2. Upload attachments
  3. Click "Download PDF"
  4. Verify PDF contains:
     - All entered data
     - Incident ID
     - Asset ID
     - Attachment list with URLs
     - Approval status (where applicable)
     - Timestamps
     - Responsible user name/signature
     - Greek labels (if applicable)
- **Expected:** Complete, printable PDF suitable for government records
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Field inclusion, metadata completeness, layout correctness

---

### Group 6: Audit Trail Completeness (Test 19)

**Test 19: Full Incident Lifecycle Audit Trail**
- **Steps:** Execute complex incident end-to-end, review IncidentAuditTrail entity
- **Expected Audit Entries:**
  - Incident created (ID, creator, timestamp)
  - Priority set/changed (before/after values)
  - OWR set/changed
  - Inspection required decision
  - OMPI created/submitted (timestamp, user)
  - Inspection WO created/completed (dates)
  - FMPI created/submitted (dates)
  - CA approval submitted/approved/rejected (approver, date, reason)
  - WO created/completed (multiple WOs tracked separately)
  - Attachments uploaded (file names, sizes, users, dates)
  - Status changes (each transition recorded)
  - Incident closed (date, closer, closure notes)
- **Expected:** No gaps, no out-of-order entries, all users recorded
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Audit trail table completeness, timestamp accuracy, user attribution

---

### Group 7: Workflow Validation (Test 20-26)

**Test 20: Status Skipping Prevention**
- **Sub-tests:**
  - Try Open → Closed without any work → blocked
  - Try OWR Yes → Closed without FMPI → blocked
  - Try Inspection Required → Closed without Inspection WO → blocked
  - Try CA Approval Required → Work in Progress without approval → blocked
- **Expected:** Clear error message explaining missing requirement
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Gate logic, error messages, workflow state machine

**Test 21: Partial Completion Blocking**
- **Steps:**
  1. Create OWR incident with FMPI + Corrective WO required
  2. Complete FMPI
  3. Approve (if CA required)
  4. Create Corrective WO
  5. Try to close without completing WO
- **Expected:** Closure blocked with message "Complete all required Work Orders"
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Completion status check, error message clarity

**Test 22: Wrong Parent Link Prevention**
- **Steps:**
  1. Create 2 incidents for same asset (INC-001, INC-002)
  2. Create FMPI for INC-001
  3. Create Corrective WO for INC-002
  4. Verify no cross-contamination
- **Expected:** FMPI linked only to INC-001, WO linked only to INC-002
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Foreign key integrity, relationship uniqueness

**Test 23: Same Asset Multiple Incidents**
- **Steps:**
  1. Create Incident 1 for Asset X (status: Open)
  2. Attempt to create Incident 2 for Asset X
- **Expected:** System allows but displays warning "Asset X already has 1 open incident"
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Duplicate incident prevention vs. legitimate scenarios

**Test 24: Child Asset / Component Logic**
- **Steps:**
  1. Create incident on parent asset
  2. Specify child component (e.g., "Solar Panel #2")
  3. Create Corrective WO
  4. Verify WO shows correct component
  5. Verify warranty/OWR logic uses child component data
- **Expected:** Child asset correctly carried through, costs/warranty calculated per component
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Asset hierarchy, warranty lookup, cost rollup

**Test 25: OWR Change After FMPI**
- **Steps:**
  1. Create incident, OWR = Yes, FMPI created and submitted
  2. Change OWR to No
  3. System should prompt: "FMPI was created for OWR. Update or delete?"
- **Expected:** No silent deletion, full audit trail of change, user decision recorded
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Change gate, confirmation dialog, audit entry

**Test 26: Priority Change After Make-Safe WO**
- **Steps:**
  1. Create P2 incident, Make-Safe WO created
  2. Change priority to P1
  3. Check if Make-Safe WO remains or prompts
- **Expected:** Make-Safe WO not deleted, system asks if still required, full audit trail
- **Actual:** [TO BE TESTED]
- **Critical Checks:** WO orphaning prevention, prompt logic, audit trail

---

### Group 8: User Permissions (Test 27-29)

**Test 27: CA User View Restrictions**
- **Expected Behavior:**
  - Sees only incidents with OWR=Yes or requiring CA approval
  - Cannot edit incident priority, OWR status, or incident details
  - CAN approve/reject FMPI and other forms requiring CA approval
  - CAN view all evidence/attachments for decision making
  - CAN add approval notes/comments
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Query filtering, field-level edit guard, action button visibility

**Test 28: Field Technician View & Permissions**
- **Expected Behavior:**
  - Sees assigned Work Orders
  - CAN create incident initially
  - CAN upload evidence to assigned WOs
  - CANNOT approve CA forms
  - CANNOT close incident (only mark WO complete)
  - CANNOT edit incident after creation
- **Actual:** [TO BE TESTED]
- **Critical Checks:** WO assignment filtering, button visibility, form restrictions

**Test 29: Contractor Admin View & Permissions**
- **Expected Behavior:**
  - Sees all incidents in organization
  - CAN create/edit incidents (except after submission)
  - CAN submit OMPI/FMPI
  - CAN create/manage Work Orders
  - CAN override/re-assign WOs (if permitted)
  - CAN close incidents (when all gates passed)
  - All actions fully audited
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Organization filtering, administrative actions, audit completeness

---

### Group 9: Complex & Regression Tests (Test 30-35)

**Test 30: Long Lifecycle Complex Incident**
- **Incident Profile:** P2 + OWR Yes + Inspection Required + CA Approval + Make-Safe + Corrective + Multiple Attachments + Rejection + Resubmission
- **Steps:**
  1. Create P2 incident, OWR = Yes, Inspection = Yes, Make-Safe = Yes (auto)
  2. Submit OMPI
  3. Tech completes Inspection WO, uploads photos
  4. Contractor Admin creates FMPI with full cost breakdown
  5. Submit for CA approval
  6. CA rejects due to cost concern
  7. Contractor Admin revises FMPI (cost reduction)
  8. Resubmit to CA
  9. CA approves
  10. Create Make-Safe WO (separate from corrective)
  11. Tech completes Make-Safe, uploads before/after
  12. Create Corrective WO
  13. Tech completes Corrective, uploads before/after photos
  14. Incident closes
- **Expected:**
  - No broken statuses at any point
  - No duplicate forms (FMPI v2, not v1.1)
  - No lost files throughout
  - Audit trail shows all 15+ actions in correct order
  - Incident closes only after ALL requirements (Inspection + Make-Safe + Corrective + CA Approval) satisfied
- **Actual:** [TO BE TESTED]
- **Critical Checks:** State machine integrity, file persistence, audit completeness, closure logic

**Test 31: Browser Refresh & Session Recovery**
- **Steps:**
  1. Open FMPI form, fill 5 fields, do NOT submit
  2. Press F5 (refresh browser)
  3. Return to incident
  4. Check if draft data is preserved or warning is shown
- **Expected:** Draft saved (if autosave exists) OR clear warning "Unsaved changes will be lost" before leaving
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Autosave logic, browser warning, data recovery

**Test 32: Mobile / Tablet Usability**
- **Steps (on tablet/mobile device):**
  1. Create incident
  2. Open Corrective WO
  3. Upload evidence (camera + file picker)
  4. Fill form fields (text, dropdowns, dates)
  5. Submit WO
- **Expected:** All features functional, no layout issues, file upload from camera works, form submission works
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Responsive layout, touch interactions, file handling

**Test 33: Error Handling Robustness**
- **Sub-tests:**
  - Upload .exe or unsupported file → clear error "Only images, PDFs, and documents accepted"
  - Submit FMPI missing required "Cost" field → highlight field and error message
  - Lose internet during file upload → show retry option, no partial record creation
- **Expected:** User-friendly errors, no phantom data, safe retry mechanism
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Validation messages, transaction safety, retry logic

**Test 34: Reporting Consistency**
- **Steps:**
  1. Create and close 5 incidents (various types)
  2. Run incident report
  3. Verify counts: Total=5, Closed=5, Open=0, Pending Approval=0
  4. Verify WO counts match linked records
  5. Verify OWR breakdown
- **Expected:** All numbers match actual database records
- **Actual:** [TO BE TESTED]
- **Critical Checks:** Report query accuracy, count logic, data consistency

**Test 35: Post-Fix Regression Suite** (Run after each fix)
- **Mini-tests:**
  1. Simple P1 incident (quick cycle)
  2. OWR incident with FMPI
  3. P2 Make-Safe incident
  4. Incident with CA approval
  5. Incident with 10 attachments
- **Expected:** All complete successfully with no errors
- **Actual:** [TO BE TESTED]
- **Critical Checks:** No side effects, backward compatibility

---

## Critical Issues & Findings

| Issue ID | Issue Description | Severity | Impact | Component | Reproduction | Recommended Fix |
|----------|-------------------|----------|--------|-----------|---------------|-----------------|
| CRIT-001 | [TO BE FILLED] | Critical | Workflow blocks, incidents cannot close | Incidents, WorkOrders | [TO BE FILLED] | [TO BE FILLED] |
| CRIT-002 | [TO BE FILLED] | Critical | Duplicate incidents/forms created | Incidents, Forms | [TO BE FILLED] | [TO BE FILLED] |
| HIGH-001 | [TO BE FILLED] | High | Missing required form blocking progression | Forms, Workflow | [TO BE FILLED] | [TO BE FILLED] |
| HIGH-002 | [TO BE FILLED] | High | Files lost after form edit | Attachments | [TO BE FILLED] | [TO BE FILLED] |
| HIGH-003 | [TO BE FILLED] | High | CA approval not blocking work | Approvals | [TO BE FILLED] | [TO BE FILLED] |
| MED-001 | [TO BE FILLED] | Medium | Audit trail missing fields | AuditTrail | [TO BE FILLED] | [TO BE FILLED] |
| LOW-001 | [TO BE FILLED] | Low | Greek labels not rendering in PDF | Reports | [TO BE FILLED] | [TO BE FILLED] |

---

## Risk Assessment Summary

### High-Risk Workflow Gaps
1. **Approval Gate Enforcement** - CA approval may not block work creation
2. **Duplicate Prevention** - Rapid clicking may bypass ID uniqueness checks
3. **Attachment Persistence** - Files may be lost on form edits
4. **Closure Logic** - Incident may close with incomplete WOs
5. **Child Asset Tracking** - Component-specific warranty may not apply correctly

### Duplicate Creation Risks
1. **Incident Duplication** - No unique constraint on incident_id generation
2. **Form Duplication** - OMPI/FMPI may create multiple records if submitted twice
3. **WO Duplication** - Auto-created WOs may duplicate on incident refresh
4. **Attachment Duplication** - Same file uploaded twice may create 2 records

### Attachment & Evidence Risks
1. **Loss on Edit** - Editing form may not preserve existing attachments
2. **Permission Bypass** - Attachments may be viewable by unauthorized roles
3. **Missing Metadata** - Uploader/date not tracked for forensic purposes
4. **Orphaned Files** - If form deleted, files not cleaned up

### Permission & Security Risks
1. **Field Tech Overreach** - Technician may be able to close incidents
2. **CA Insufficient Access** - CA may not see required evidence for decisions
3. **Audit Trail Tampering** - No immutability on audit entries (if mutable in DB)
4. **Role Confusion** - Supervisor vs Admin permissions unclear

### Data Integrity Risks
1. **Wrong Incident Link** - Forms/WOs may link to wrong incident
2. **Status Inconsistency** - Incident status may be editable after submission
3. **OWR Retroactive Change** - FMPI not updated if OWR changed after creation
4. **Priority Change Fallout** - Make-Safe WO may become orphaned if priority lowered

---

## Recommended Fix Priority Order

### Phase 1: Critical Blocking Issues (Fix Immediately)
1. **Duplicate Prevention for Incidents & Forms**
   - Add database unique constraints on incident_id
   - Add API idempotency checks (same user + same ID = update, not create)
   - Disable buttons during submission
   - Use optimistic locking on form submissions

2. **Closure Gate Validation**
   - Before closing, verify ALL required WOs are complete (make_safe_done, inspection_done, corrective_done)
   - Verify ALL required documents submitted (FMPI for OWR, inspection for inspection_required)
   - Query linked WOs, check their statuses
   - Block closure with clear error message showing missing requirements

3. **CA Approval Gate Enforcement**
   - Set workflow_state to "Awaiting_CA_Approval" only if fmpi_approval_required = true
   - Block corrective_allowed until ca_decision = "Approved"
   - Add pre-save check: if CA approval required but not done, prevent state transitions
   - Test in IncidentWorkflow component and backend validation

### Phase 2: High-Risk Data Issues (Fix This Sprint)
1. **Attachment Persistence**
   - Modify form save logic: never overwrite attachment arrays
   - Use append-only pattern in entity.update()
   - Test with unit tests: upload 3 files, edit form, upload 2 more, verify 5 total

2. **WO Duplicate Prevention**
   - Check make_safe_done, inspection_done, corrective_done flags before creating new WOs
   - If flag = true, WO already exists; skip creation
   - Add database index on (incident_id, wo_type) to prevent duplicate queries

3. **Audit Trail Completeness**
   - Use createAuditEntry() helper for ALL state changes
   - Verify attachment_metadata includes uploader + timestamp + URL
   - Test with Auditor user: full lifecycle should have 20+ audit entries
   - Add test for missing entries

### Phase 3: Permission & Role Validation (Fix Before Prod)
1. **RBAC Enforcement**
   - Field Tech: can create incident, upload evidence, mark WO complete; CANNOT close incident
   - Contractor Admin: can create/edit incidents, submit forms, close incidents
   - Contractor Supervisor: can review/reassign; check if different from Admin
   - CA: can only approve/reject, cannot edit incident data
   - Add role checks at API level, not just frontend

2. **Evidence Access Control**
   - CA must see evidence to make approval decision
   - Non-CA users cannot delete evidence
   - Add permission checks before attachment delete
   - Test with each role

### Phase 4: UI/UX Improvements (Nice to Have)
1. **Browser Refresh Warning** - Add unsavedChanges state, warn before leaving
2. **Mobile Optimization** - Test upload from camera, form responsiveness
3. **PDF Export** - Verify Greek labels, incident ID, asset ID, all fields included
4. **Error Messages** - Ensure clear guidance on what's missing

---

## Testing Checklist for QA Team

Before Each Test:
- [ ] Clear browser cache / session
- [ ] Fresh incident or note the asset/incident ID
- [ ] Logged in as correct user role
- [ ] Network connectivity good
- [ ] All dependencies loaded (forms, configs)

After Each Test:
- [ ] Document actual result
- [ ] Note pass/fail
- [ ] Screenshot any errors
- [ ] Check audit trail for corresponding entries
- [ ] Verify no duplicate records created
- [ ] Check file system for orphaned attachments

Critical Test Checklist (Do Not Skip):
- [ ] Test 11 (Duplicate Button) - Full spam test with 10+ clicks
- [ ] Test 13 (FMPI Duplicate) - Reopen existing FMPI twice
- [ ] Test 14 (WO Duplicate) - Create, refresh, edit, verify count = 1
- [ ] Test 15 (Multi-File) - Upload 20 files total, refresh, verify all present
- [ ] Test 19 (Audit Trail) - Full lifecycle, export audit table, verify 20+ entries
- [ ] Test 20 (Status Skip) - Try to close without FMPI, FMPI already exists, WITHOUT making required correction. Expect blocked.
- [ ] Test 30 (Complex) - Execute full P2+OWR+Inspection+CA+Make-Safe+Rejection+Resubmission
- [ ] Test 35 (Regression) - After any fix, run 5 mini-tests

---

## Sign-Off

**QA Lead:** ________________  **Date:** ___________  
**Dev Lead:** ________________  **Date:** ___________  
**Product Owner:** ________________  **Date:** ___________  
**CA Representative:** ________________  **Date:** ___________  

---

## Appendix: Test Data Templates

### Template: Simple P1 Incident
```
Incident ID: [AUTO]
Asset: Bus Stop #001
Priority: P1 (Low)
OWR: No
Inspection Required: No
Make-Safe: No
Reported By: Tech123
Reported Date: Today
Description: "Light fixture broken"
```

### Template: OWR P1 Incident
```
Incident ID: [AUTO]
Asset: Bus Stop #005
Priority: P1 (Low)
OWR: Yes
Inspection Required: No
Make-Safe: No
Reported By: Tech456
FMPI Cost: €5000
FMPI Planning: "Replace solar panels"
```

### Template: P2 Make-Safe Incident
```
Incident ID: [AUTO]
Asset: Bus Stop #010
Priority: P2 (High)
OWR: No
Inspection Required: Yes
Make-Safe: Yes (Auto)
Reported By: Tech789
Make-Safe Action: "Remove broken glass, secure area"
```

### Template: P2 + OWR + CA Approval
```
Incident ID: [AUTO]
Asset: Bus Stop #015
Priority: P2 (High)
OWR: Yes
Inspection Required: Yes
Make-Safe: Yes (Auto)
CA Approval Required: Yes (OWR=Yes)
FMPI Cost: €8000
FMPI Planning: "Full shelter replacement"
Expected Duration: 15 days
Approved By: CA User (upon submission)
```

---

**End of QA Stress-Test Specification**