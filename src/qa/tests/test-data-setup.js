/**
 * Test Data Setup Helpers
 * Pre-populates database with test assets and incidents for automation
 */

import { base44 } from '@/api/base44Client';

export const createTestAssets = async () => {
  const assets = [
    {
      asset_id: 'TEST-ASSET-001',
      asset_code: 'BS-001',
      location_address: '123 Main St, Test City',
      city: 'Test City',
      municipality: 'Test Municipality',
      status: 'Active',
      installation_date: '2023-01-15',
      structural_warranty_end_date: '2038-01-15',
    },
    {
      asset_id: 'TEST-ASSET-002',
      asset_code: 'BS-002',
      location_address: '456 Oak Ave, Test City',
      city: 'Test City',
      municipality: 'Test Municipality',
      status: 'Active',
      installation_date: '2020-06-10',
      structural_warranty_end_date: '2035-06-10',
    },
  ];

  for (const asset of assets) {
    try {
      await base44.asServiceRole.entities.Assets.create(asset);
      console.log(`✓ Created test asset: ${asset.asset_id}`);
    } catch (err) {
      console.log(`Asset ${asset.asset_id} may already exist or error: ${err.message}`);
    }
  }
};

export const createTestIncidents = async () => {
  const incidents = [
    {
      incident_id: 'TEST-INC-P1-001',
      title: 'Panel Crack - P1 In Warranty',
      related_asset_id: 'TEST-ASSET-001',
      status: 'Open',
      priority: 'High',
      operational_priority: 'P1',
      warranty_status: 'In Warranty',
      workflow_state: 'Awaiting_CR_OMPI',
      fmpi_required: true,
      inspection_required: true,
    },
    {
      incident_id: 'TEST-INC-P2-001',
      title: 'Loose Panel - P2 Safety Required',
      related_asset_id: 'TEST-ASSET-002',
      status: 'Open',
      priority: 'Critical',
      operational_priority: 'P2',
      warranty_status: 'In Warranty',
      workflow_state: 'Awaiting_CR_OMPI',
      make_safe_required: true,
      inspection_required: true,
    },
    {
      incident_id: 'TEST-INC-OWR-001',
      title: 'Electronic Failure - OWR',
      related_asset_id: 'TEST-ASSET-002',
      status: 'Open',
      priority: 'High',
      operational_priority: 'P1',
      warranty_status: 'OWR',
      workflow_state: 'Awaiting_CR_OMPI',
      fmpi_required: true,
      fmpi_approval_required: true,
    },
  ];

  for (const incident of incidents) {
    try {
      await base44.asServiceRole.entities.Incidents.create(incident);
      console.log(`✓ Created test incident: ${incident.incident_id}`);
    } catch (err) {
      console.log(`Incident ${incident.incident_id} may already exist or error: ${err.message}`);
    }
  }
};

export const cleanupTestData = async () => {
  try {
    // Delete test incidents
    const incidents = await base44.asServiceRole.entities.Incidents.filter({ 
      incident_id: { $regex: 'TEST-INC' } 
    });
    for (const inc of incidents) {
      await base44.asServiceRole.entities.Incidents.delete(inc.id);
    }
    
    // Delete test assets
    const assets = await base44.asServiceRole.entities.Assets.filter({ 
      asset_id: { $regex: 'TEST-ASSET' } 
    });
    for (const asset of assets) {
      await base44.asServiceRole.entities.Assets.delete(asset.id);
    }
    
    console.log('✓ Test data cleanup complete');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
};

export const setupTestEnvironment = async () => {
  console.log('Setting up test environment...');
  await createTestAssets();
  await createTestIncidents();
  console.log('✓ Test environment ready');
};