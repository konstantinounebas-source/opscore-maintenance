/* global process */
import { test, expect } from '@playwright/test';
import { base44 } from '@/api/base44Client';

/**
 * Automated Test Suite: Core Incident Workflows (Tests 1-10)
 * Focus: P1/P2 workflows, CR/OMPI submissions, and Work Orders
 * 
 * Prerequisites:
 * - App must be running and accessible
 * - Test user(s) with appropriate roles must be created
 * - Assets must exist in database
 */

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// Test data helpers
const generateIncidentId = () => `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateWorkOrderId = () => `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// User roles for testing
const TEST_USERS = {
  fieldTech: { email: 'fieldtech@test.com', role: 'user' },
  contractor: { email: 'contractor@test.com', role: 'user' },
  caUser: { email: 'causer@test.com', role: 'user' },
  auditor: { email: 'auditor@test.com', role: 'admin' }
};

// ============================================================================
// TEST 1: Create P1 Incident (Low Priority, In Warranty)
// ============================================================================
test('Test 1: Create P1 Incident - Standard Workflow', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  await page.goto(`${APP_URL}/IncidentForm`);

  const incidentId = generateIncidentId();
  const assetId = 'TEST-ASSET-001'; // Assume this asset exists

  // Fill incident form
  await page.fill('input[name="title"]', `P1 Test Incident ${incidentId}`);
  await page.fill('input[name="related_asset_id"]', assetId);
  await page.fill('textarea[name="description"]', 'P1 incident in warranty - standard workflow');
  
  // Select P1 priority
  await page.click('select[name="operational_priority"]');
  await page.click('option[value="P1"]');
  
  // Select In Warranty
  await page.click('select[name="warranty_status"]');
  await page.click('option[value="In Warranty"]');

  // Submit form
  await page.click('button:has-text("Create Incident")');
  
  // Verify incident created
  await expect(page).toHaveURL(/\/IncidentDetail/);
  await expect(page.locator('text=Open')).toBeVisible();
});

// ============================================================================
// TEST 2: Create P2 Incident (High Priority, OWR)
// ============================================================================
test('Test 2: Create P2 Incident - OWR Workflow', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  await page.goto(`${APP_URL}/IncidentForm`);

  const incidentId = generateIncidentId();
  const assetId = 'TEST-ASSET-002';

  await page.fill('input[name="title"]', `P2 OWR Incident ${incidentId}`);
  await page.fill('input[name="related_asset_id"]', assetId);
  await page.fill('textarea[name="description"]', 'P2 urgent incident out of warranty');
  
  // Select P2 priority
  await page.click('select[name="operational_priority"]');
  await page.click('option[value="P2"]');
  
  // Select OWR
  await page.click('select[name="warranty_status"]');
  await page.click('option[value="OWR"]');

  await page.click('button:has-text("Create Incident")');
  
  await expect(page).toHaveURL(/\/IncidentDetail/);
  await expect(page.locator('text=P2')).toBeVisible();
});

// ============================================================================
// TEST 3: Submit CR+OMPI for P1 Incident
// ============================================================================
test('Test 3: Submit CR+OMPI Form', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  // Navigate to an existing incident
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  // Click "Submit CR+OMPI" button
  await page.click('button:has-text("Submit CR+OMPI")');
  
  // Modal should open
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  
  // Fill CR+OMPI form
  await page.fill('textarea[name="incident_description"]', 'Confirmed receipt - initial assessment complete');
  
  // Upload evidence
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('qa/test-data/evidence-sample.pdf');
  
  // Submit form
  await page.click('button:has-text("Submit")');
  
  // Verify workflow state changed
  await expect(page.locator('text=CR_OMPI_Submitted')).toBeVisible();
});

// ============================================================================
// TEST 4: Create Make Safe Work Order (P2 Safety)
// ============================================================================
test('Test 4: Create Make Safe Work Order', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P2-001`);
  
  // Open Work Order Panel
  await page.click('button:has-text("Work Orders")');
  
  // Click "New Make Safe Order"
  await page.click('button:has-text("New Make Safe Order")');
  
  const woId = generateWorkOrderId();
  await page.fill('input[name="work_order_id"]', woId);
  await page.fill('textarea[name="description"]', 'Make safe - secure loose panel');
  
  // Submit
  await page.click('button:has-text("Create Work Order")');
  
  // Verify work order created
  await expect(page.locator(`text=${woId}`)).toBeVisible();
  await expect(page.locator('text=Open')).toBeVisible();
});

// ============================================================================
// TEST 5: Submit Make Safe Checklist
// ============================================================================
test('Test 5: Submit Make Safe Checklist', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P2-001`);
  
  // Find and click Make Safe work order
  await page.click('text=Make Safe');
  
  // Click "Submit Checklist"
  await page.click('button:has-text("Submit Checklist")');
  
  // Modal opens - fill checklist
  await page.check('input[name="hazard_assessment"]');
  await page.check('input[name="ppe_used"]');
  await page.check('input[name="site_secured"]');
  
  // Upload photo
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('qa/test-data/photo-sample.jpg');
  
  // Sign off
  await page.fill('input[name="confirmed_by"]', 'Field Tech Name');
  
  // Submit
  await page.click('button:has-text("Submit Checklist")');
  
  // Verify checklist submitted
  await expect(page.locator('text=Completed')).toBeVisible();
});

// ============================================================================
// TEST 6: Create Inspection Work Order
// ============================================================================
test('Test 6: Create Inspection Work Order', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  await page.click('button:has-text("Work Orders")');
  await page.click('button:has-text("New Inspection")');
  
  const woId = generateWorkOrderId();
  await page.fill('input[name="work_order_id"]', woId);
  await page.fill('textarea[name="description"]', 'Full structural inspection required');
  
  await page.click('button:has-text("Create Work Order")');
  
  await expect(page.locator(`text=${woId}`)).toBeVisible();
  await expect(page.locator('text=Inspection')).toBeVisible();
});

// ============================================================================
// TEST 7: Submit Inspection Report
// ============================================================================
test('Test 7: Submit Inspection Report', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  await page.click('text=Inspection');
  await page.click('button:has-text("Submit Report")');
  
  // Fill inspection findings
  await page.fill('textarea[name="findings"]', 'Structural damage confirmed - repair required');
  
  // Upload inspection photos
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    'qa/test-data/inspection-photo-1.jpg',
    'qa/test-data/inspection-photo-2.jpg'
  ]);
  
  await page.click('button:has-text("Submit Report")');
  
  await expect(page.locator('text=Submitted')).toBeVisible();
});

// ============================================================================
// TEST 8: Submit FMPI (Full Management Plan)
// ============================================================================
test('Test 8: Submit FMPI Form', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  await page.click('button:has-text("FMPI")');
  await page.click('button:has-text("New FMPI")');
  
  // Fill FMPI details
  await page.fill('input[name="repair_scope"]', 'Replace damaged panel and re-secure');
  await page.fill('input[name="estimated_cost"]', '1500.00');
  await page.fill('input[name="timeline"]', '5 working days');
  
  // Add work items
  await page.click('button:has-text("Add Work Item")');
  await page.fill('input[name="work_item_description"]', 'Panel replacement');
  await page.fill('input[name="work_item_cost"]', '1000.00');
  
  // Upload FMPI document
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('qa/test-data/fmpi-plan.pdf');
  
  await page.click('button:has-text("Submit FMPI")');
  
  await expect(page.locator('text=FMPI_Submitted')).toBeVisible();
});

// ============================================================================
// TEST 9: CA Approval (OWR incidents)
// ============================================================================
test('Test 9: CA Approval Workflow', async ({ page, context }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  // Simulate CA user login
  const caPage = await context.newPage();
  await caPage.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-OWR-001`);
  
  // CA should see "Review & Approve" button
  await expect(caPage.locator('button:has-text("Review & Approve")')).toBeVisible();
  
  await caPage.click('button:has-text("Review & Approve")');
  
  // Approve FMPI
  await caPage.fill('textarea[name="ca_decision_comment"]', 'Approved - plan is acceptable');
  await caPage.click('input[name="approve"]');
  
  await caPage.click('button:has-text("Submit Decision")');
  
  // Verify approval reflected
  await expect(caPage.locator('text=Approved_For_Corrective')).toBeVisible();
});

// ============================================================================
// TEST 10: Create Corrective Work Order
// ============================================================================
test('Test 10: Create Corrective Work Order', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-APPROVED-001`);
  
  await page.click('button:has-text("Work Orders")');
  await page.click('button:has-text("New Corrective Work")');
  
  const woId = generateWorkOrderId();
  await page.fill('input[name="work_order_id"]', woId);
  await page.fill('textarea[name="description"]', 'Execute approved corrective repairs');
  
  // Link to FMPI
  await page.fill('input[name="linked_fmpi"]', 'FMPI-001');
  
  await page.click('button:has-text("Create Work Order")');
  
  await expect(page.locator(`text=${woId}`)).toBeVisible();
  await expect(page.locator('text=Corrective')).toBeVisible();
});

// ============================================================================
// BONUS: Duplicate Prevention Test
// ============================================================================
test('Duplicate Prevention: Rapid Button Clicks', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT);
  
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  // Rapidly click "Submit CR+OMPI" multiple times
  const button = page.locator('button:has-text("Submit CR+OMPI")');
  
  for (let i = 0; i < 5; i++) {
    await button.click({ force: true });
  }
  
  // Verify only ONE submission was created
  await page.goto(`${APP_URL}/IncidentDetail?incident_id=TEST-INC-P1-001`);
  
  const submissions = await page.locator('[data-testid="cr-ompi-submission"]').count();
  expect(submissions).toBe(1);
});