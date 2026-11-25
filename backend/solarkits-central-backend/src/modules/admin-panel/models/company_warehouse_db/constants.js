const WAREHOUSE_VALIDATION_STATUSES = {
  1: { id: 1, code: 'WH_V_001', label: 'Pending Validation Setup', color: '#ff9800' },
  2: { id: 2, code: 'WH_V_002', label: 'Awaiting Information', color: '#2196f3' },
  3: { id: 3, code: 'WH_V_003', label: 'In Review', color: '#9c27b0' },
  4: { id: 4, code: 'WH_V_004', label: 'Verified', color: '#4caf50' },
  5: { id: 5, code: 'WH_V_005', label: 'Rejected', color: '#f44336' },
};

module.exports = { WAREHOUSE_VALIDATION_STATUSES };
