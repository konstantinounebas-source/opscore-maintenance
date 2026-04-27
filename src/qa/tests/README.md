# Automated Test Suite: Incident Module Core Workflows

## Overview
This automated test suite covers Tests 1-10 from the stress-test matrix, focusing on:
- **P1/P2 incident creation** and workflow progression
- **CR+OMPI submissions** and workflow state transitions
- **Work order management** (Make Safe, Inspection, Corrective)
- **Duplicate prevention** (rapid button clicking)

## Prerequisites

### Install Dependencies
```bash
npm install --save-dev @playwright/test
```

### Setup
1. Ensure your Base44 app is running locally (`http://localhost:5173`)
2. Test users must exist in the system (or modify test credentials in `incident-core-automation.spec.js`)
3. Sample test data files must be in `qa/test-data/`:
   - `evidence-sample.pdf`
   - `photo-sample.jpg`
   - `inspection-photo-1.jpg`
   - `inspection-photo-2.jpg`
   - `fmpi-plan.pdf`

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test
```bash
npx playwright test incident-core-automation --grep "Test 1"
```

### Run with UI Mode (Visual Debugging)
```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Generate HTML Report
```bash
npx playwright show-report
```

## Test Coverage

| Test ID | Scenario | Status |
|---------|----------|--------|
| 1 | Create P1 Incident (In Warranty) | ✓ |
| 2 | Create P2 Incident (OWR) | ✓ |
| 3 | Submit CR+OMPI | ✓ |
| 4 | Create Make Safe Work Order | ✓ |
| 5 | Submit Make Safe Checklist | ✓ |
| 6 | Create Inspection Work Order | ✓ |
| 7 | Submit Inspection Report | ✓ |
| 8 | Submit FMPI | ✓ |
| 9 | CA Approval (OWR) | ✓ |
| 10 | Create Corrective Work Order | ✓ |
| Bonus | Duplicate Prevention | ✓ |

## Configuration

Edit `playwright.config.js` to customize:
- **baseURL**: Your app URL
- **workers**: Number of parallel test workers
- **retries**: Retry failed tests
- **screenshot/video**: Enable/disable visual artifacts

## Troubleshooting

### Tests Timing Out
- Increase `TEST_TIMEOUT` in test file
- Check if app is responsive
- Verify test data exists in database

### Selectors Not Found
- Update CSS selectors in tests to match your UI
- Use `page.locator()` for robust element selection
- Enable `--ui` mode to debug selector issues

### Authentication Issues
- Ensure test users are created with correct roles
- Verify app supports test user login
- Check `TEST_USERS` object matches your setup

## Next Steps

1. **Customize Selectors**: Update CSS selectors to match your actual UI elements
2. **Add Test Users**: Create test accounts for each role (field tech, contractor, CA, auditor)
3. **Prepare Test Data**: Upload sample evidence/photo files to `qa/test-data/`
4. **Run Initial Tests**: Execute tests in UI mode to validate selectors
5. **CI/CD Integration**: Add test command to your CI pipeline (GitHub Actions, etc.)

## Credits & Performance

- **Generation cost**: ~200-300 credits (code generation)
- **Per-run cost**: ~50-100 credits (database operations, API calls)
- **Runtime**: ~5-10 minutes for full suite
- **Parallelization**: Can run up to 4 workers for faster execution

---

For questions or issues, refer to [Playwright Documentation](https://playwright.dev)