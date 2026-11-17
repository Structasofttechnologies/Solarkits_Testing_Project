import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExchangeAlt, FaShieldAlt, FaPlus, FaCheck, FaTimes, FaShippingFast, FaCheckCircle, FaTrash } from "react-icons/fa";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dropdown from "../../components/Dropdown";

const initialReplacements = [
  { id: 'REP-701', orderId: 'ORD-9843', serial: 'SN-TATA-540-00192', brand: 'Tata Solar', reason: 'Transit damage', status: 'Requested', date: '2026-05-18' },
  { id: 'REP-702', orderId: 'ORD-9845', serial: 'SN-WAA-550-9921', brand: 'Waaree', reason: 'Technical fault', status: 'Approved', date: '2026-05-19' },
  { id: 'REP-703', orderId: 'ORD-9842', serial: 'SN-SOL-50K-0021', brand: 'Solis', reason: 'Wrong product', status: 'Replaced', date: '2026-05-15' },
];

const brandOptions = [
  { value: 'Tata Solar', text: 'Tata Solar' },
  { value: 'Waaree', text: 'Waaree' },
  { value: 'Adani Solar', text: 'Adani Solar' },
  { value: 'Solis', text: 'Solis' }
];

const reasonOptions = [
  { value: 'Damaged', text: 'Damaged' },
  { value: 'Wrong product', text: 'Wrong product' },
  { value: 'Transit damage', text: 'Transit damage' },
  { value: 'Technical fault', text: 'Technical fault' },
  { value: 'Warranty replacement', text: 'Warranty replacement' }
];

const stateOptions = [
  { value: 'Uttar Pradesh', text: 'Uttar Pradesh' },
  { value: 'Maharashtra', text: 'Maharashtra' },
  { value: 'Rajasthan', text: 'Rajasthan' },
  { value: 'Madhya Pradesh', text: 'Madhya Pradesh' },
  { value: 'Gujarat', text: 'Gujarat' },
  { value: 'Delhi NCR', text: 'Delhi NCR' }
];

const TERRITORY_CLUSTER_MAP = {
  'Uttar Pradesh': [
    { value: 'Lucknow-Awadh', text: 'Lucknow-Awadh Cluster' },
    { value: 'Varanasi-Purvanchal', text: 'Varanasi-Purvanchal Cluster' },
    { value: 'Kanpur-Bundelkhand', text: 'Kanpur-Bundelkhand Cluster' }
  ],
  'Maharashtra': [
    { value: 'Bhiwandi-Thane', text: 'Bhiwandi-Thane Logistics Hub' },
    { value: 'Pune-PCMC', text: 'Pune-PCMC Industrial Cluster' },
    { value: 'Nagpur-Vidarbha', text: 'Nagpur-Vidarbha Cluster' }
  ],
  'Rajasthan': [
    { value: 'Jaipur-Marwar', text: 'Jaipur-Marwar Cluster' },
    { value: 'Jodhpur-Solar', text: 'Jodhpur Solar Belt Cluster' }
  ],
  'Madhya Pradesh': [
    { value: 'Indore-Malwa', text: 'Indore-Malwa Cluster' },
    { value: 'Bhopal-Central', text: 'Bhopal Cluster' }
  ],
  'Gujarat': [
    { value: 'Ahmedabad-Sanand', text: 'Ahmedabad-Sanand Logistics Cluster' },
    { value: 'Surat-South', text: 'Surat-South Gujarat Cluster' },
    { value: 'Vadodara-Central', text: 'Vadodara Cluster' }
  ],
  'Delhi NCR': [
    { value: 'Central-Delhi', text: 'Central Delhi Hub' },
    { value: 'Gurgaon-Manesar', text: 'Gurgaon-Manesar Tech Hub' },
    { value: 'Noida-GreaterNoida', text: 'Noida-Greater Noida Cluster' }
  ]
};

const CLUSTER_ORDERS_MAP = {
  'Lucknow-Awadh': [
    { value: 'ORD-2026-1044', text: 'ORD-2026-1044 (5kW Tata Solar On-Grid Kit)' },
    { value: 'ORD-2026-1082', text: 'ORD-2026-1082 (3.3kW Waaree DCR Kit)' },
    { value: 'ORD-2026-1109', text: 'ORD-2026-1109 (10kW Commercial Hybrid Kit)' }
  ],
  'Varanasi-Purvanchal': [
    { value: 'ORD-2026-2011', text: 'ORD-2026-2011 (3kW Residential Rooftop Kit)' },
    { value: 'ORD-2026-2035', text: 'ORD-2026-2035 (5kW Luminous Smart Kit)' }
  ],
  'Bhiwandi-Thane': [
    { value: 'ORD-2026-3041', text: 'ORD-2026-3041 (6kW Growatt Dual MPPT Kit)' },
    { value: 'ORD-2026-3078', text: 'ORD-2026-3078 (12kW Microtek Industrial Kit)' }
  ]
};

const ORDER_COMPONENTS_MAP = {
  'ORD-2026-1044': [
    { value: 'Solar PV Panels - Waaree 540W Mono PERC', text: 'Solar PV Panels - Waaree 540W Mono PERC', brand: 'Waaree' },
    { value: 'Solar Inverter - Growatt 5kW Dual MPPT', text: 'Solar Inverter - Growatt 5kW Dual MPPT', brand: 'Growatt' },
    { value: 'Galvanized MMS Structure - 3-Leg Heavy Duty', text: 'Galvanized MMS Structure - 3-Leg Heavy Duty', brand: 'Tata Solar' },
    { value: 'ACDB / DCDB Protection Box with Type II SPD', text: 'ACDB / DCDB Protection Box with Type II SPD', brand: 'Havells' }
  ],
  'ORD-2026-1082': [
    { value: 'Solar PV Modules - Tata Solar 400W DCR', text: 'Solar PV Modules - Tata Solar 400W DCR', brand: 'Tata Solar' },
    { value: 'Grid-Tie Inverter - Luminous 3.3kW', text: 'Grid-Tie Inverter - Luminous 3.3kW', brand: 'Luminous' },
    { value: 'DC Solar Cable 4 sq mm', text: 'DC Solar Cable 4 sq mm', brand: 'Polycab' }
  ]
};

const DEFAULT_KIT_COMPONENTS = [
  { value: 'Solar PV Panels (DCR / Non-DCR)', text: 'Solar PV Panels (DCR / Non-DCR)' },
  { value: 'Solar Grid Inverter', text: 'Solar Grid Inverter' },
  { value: 'Module Mounting Structure (MMS)', text: 'Module Mounting Structure (MMS)' },
  { value: 'ACDB / DCDB Protection Box', text: 'ACDB / DCDB Protection Box' },
  { value: 'DC Solar Cable / Connectors', text: 'DC Solar Cable / Connectors' }
];

export default function ProductReplacement() {
  const [replacements, setReplacements] = useState(initialReplacements);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states with State -> Cluster -> Order -> Component selection
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [selectedCluster, setSelectedCluster] = useState('Lucknow-Awadh');
  const [orderId, setOrderId] = useState('ORD-2026-1044');
  const [selectedComponent, setSelectedComponent] = useState('Solar PV Panels - Waaree 540W Mono PERC');
  const [serial, setSerial] = useState('SN-TATA-540-0012');
  const [brand, setBrand] = useState('Tata Solar');
  const [reason, setReason] = useState('Damaged');
  const [warrantyChecked, setWarrantyChecked] = useState(false);
  const [warrantyValid, setWarrantyValid] = useState(null);

  const [liveClusters, setLiveClusters] = useState([]);

  // Live cluster fetch from Admin Franchisee Cluster module
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await axios.get(`${API_BASE}/franchise-clusters/list`, {
          headers: authHeaderObj()
        });
        if (res.data?.status === 'success' || Array.isArray(res.data?.data)) {
          setLiveClusters(res.data.data || []);
        }
      } catch (e) {
        console.warn('Could not load clusters in ProductReplacement:', e);
      }
    };
    fetchClusters();
  }, []);

  // Available states dynamically computed combining live clusters and standard states
  const allStateOptions = useMemo(() => {
    const fromClusters = liveClusters.map(c => c.state_name || c.state_id?.name).filter(Boolean);
    const combined = Array.from(new Set([...fromClusters, ...stateOptions.map(s => s.value)])).sort();
    return combined.map(st => ({ value: st, text: st }));
  }, [liveClusters]);

  // Available clusters dynamically computed for selected state
  const clusterOptions = useMemo(() => {
    const liveForState = liveClusters.filter(c => 
      (c.state_name || '').toLowerCase() === selectedState.toLowerCase()
    ).map(c => ({ value: c.cluster_name, text: `${c.cluster_name} (${c.cluster_code || 'Live'})` }));

    if (liveForState.length > 0) {
      return liveForState;
    }
    return TERRITORY_CLUSTER_MAP[selectedState] || [
      { value: 'General-Cluster', text: `${selectedState} Central Cluster` }
    ];
  }, [liveClusters, selectedState]);

  // Available orders for selected cluster
  const orderOptions = CLUSTER_ORDERS_MAP[selectedCluster] || [
    { value: 'ORD-GEN-1001', text: 'ORD-GEN-1001 (5kW Standard Solar Kit)' },
    { value: 'ORD-GEN-1002', text: 'ORD-GEN-1002 (3kW Standard Solar Kit)' }
  ];

  // Available components for selected order
  const componentOptions = ORDER_COMPONENTS_MAP[orderId] || DEFAULT_KIT_COMPONENTS;

  const checkWarranty = () => {
    if (!serial.trim()) return;
    // Mock validation logic
    const isValid = serial.startsWith('SN-');
    setWarrantyValid(isValid);
    setWarrantyChecked(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderId.trim() || !serial.trim() || !warrantyValid) {
      alert("Please validate serial warranty status before submitting!");
      return;
    }

    const newReq = {
      id: `REP-${704 + Math.floor(Math.random() * 90)}`,
      orderId,
      serial,
      brand,
      reason,
      status: 'Requested',
      date: new Date().toISOString().split('T')[0]
    };

    setReplacements([newReq, ...replacements]);
    setIsModalOpen(false);
    setOrderId('');
    setSerial('');
    setWarrantyChecked(false);
    setWarrantyValid(null);
  };

  const handleUpdateStatus = (id, nextStatus) => {
    setReplacements(replacements.map(r => r.id === id ? { ...r, status: nextStatus } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Product Replacement Workflow</h1>
          <p className="text-text-secondary">Validate warranty claims, process replacements against customer orders, and track pickup logistics</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          leftIcon={<FaPlus />}
        >
          New Replacement Request
        </Button>
      </div>

      {/* Replacement Claims Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border bg-bg/50">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
            <FaExchangeAlt className="text-primary" />
            Active Claims & Return Statuses
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                <th className="p-4">Claim ID</th>
                <th className="p-4">Customer Order</th>
                <th className="p-4">Product Serial</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Logistics Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {replacements.map(r => (
                <tr key={r.id} className="hover:bg-primary/5 transition-all">
                  <td className="p-4 font-bold text-primary">{r.id}</td>
                  <td className="p-4 font-semibold text-text-primary">{r.orderId}</td>
                  <td className="p-4 font-mono text-xs text-text-secondary">{r.serial}</td>
                  <td className="p-4 text-text-secondary font-medium">{r.brand}</td>
                  <td className="p-4 text-text-secondary font-medium">{r.reason}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      r.status === 'Replaced' || r.status === 'Closed' ? 'bg-success/10 text-success border-success/20' :
                      r.status === 'Approved' || r.status === 'Material Picked' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      {r.status === 'Requested' && (
                        <Button
                          onClick={() => handleUpdateStatus(r.id, 'Approved')}
                          variant="success"
                          size="sm"
                        >
                          Approve Claim
                        </Button>
                      )}
                      {r.status === 'Approved' && (
                        <Button
                          onClick={() => handleUpdateStatus(r.id, 'Material Picked')}
                          variant="primary"
                          size="sm"
                          leftIcon={<FaShippingFast />}
                        >
                          Pick Material
                        </Button>
                      )}
                      {r.status === 'Material Picked' && (
                        <Button
                          onClick={() => handleUpdateStatus(r.id, 'Out for Delivery')}
                          variant="warning"
                          size="sm"
                        >
                          Dispatch Replacement
                        </Button>
                      )}
                      {r.status === 'Out for Delivery' && (
                        <Button
                          onClick={() => handleUpdateStatus(r.id, 'Replaced')}
                          variant="success"
                          size="sm"
                          leftIcon={<FaCheckCircle />}
                        >
                          Confirm Replacement
                        </Button>
                      )}
                      {r.status === 'Replaced' && (
                        <Button
                          onClick={() => handleUpdateStatus(r.id, 'Closed')}
                          variant="secondary"
                          size="sm"
                        >
                          Close Ticket
                        </Button>
                      )}
                      {r.status === 'Closed' && (
                        <span className="text-xs text-text-muted">Ticket Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Replacement Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FaExchangeAlt className="text-primary" />
                  Request Replacement
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Territory State & Cluster Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <Dropdown
                    label="Territory / State *"
                    value={selectedState}
                    onChange={(val) => {
                      setSelectedState(val);
                      const liveForState = liveClusters.filter(c => 
                        (c.state_name || '').toLowerCase() === val.toLowerCase()
                      );
                      if (liveForState.length > 0) {
                        setSelectedCluster(liveForState[0].cluster_name);
                      } else {
                        const newClusters = TERRITORY_CLUSTER_MAP[val] || [];
                        if (newClusters.length > 0) {
                          setSelectedCluster(newClusters[0].value);
                          const orders = CLUSTER_ORDERS_MAP[newClusters[0].value] || [];
                          if (orders.length > 0) {
                            setOrderId(orders[0].value);
                          }
                        }
                      }
                    }}
                    options={allStateOptions}
                    className="w-full"
                  />
                  <Dropdown
                    label="Cluster Name *"
                    value={selectedCluster}
                    onChange={(val) => {
                      setSelectedCluster(val);
                      const orders = CLUSTER_ORDERS_MAP[val] || [];
                      if (orders.length > 0) {
                        setOrderId(orders[0].value);
                      }
                    }}
                    options={clusterOptions}
                    className="w-full"
                  />
                </div>

                {/* 2. Customer Order Selection */}
                <Dropdown
                  label="Customer Order No (Existing Orders) *"
                  value={orderId}
                  onChange={(val) => {
                    setOrderId(val);
                    const comps = ORDER_COMPONENTS_MAP[val] || DEFAULT_KIT_COMPONENTS;
                    if (comps.length > 0) {
                      setSelectedComponent(comps[0].value);
                      if (comps[0].brand) setBrand(comps[0].brand);
                    }
                  }}
                  options={orderOptions}
                  className="w-full"
                />

                {/* 3. Kit / Component Selection */}
                <Dropdown
                  label="Solar Kit Component to Replace *"
                  value={selectedComponent}
                  onChange={(val) => {
                    setSelectedComponent(val);
                    const found = componentOptions.find(c => c.value === val);
                    if (found?.brand) setBrand(found.brand);
                  }}
                  options={componentOptions}
                  className="w-full"
                />

                {/* 4. Brand & Reason */}
                <div className="grid grid-cols-2 gap-4">
                  <Dropdown
                    label="Manufacturer / Brand"
                    value={brand}
                    onChange={(val) => setBrand(val)}
                    options={brandOptions}
                    className="w-full"
                  />
                  <Dropdown
                    label="Replacement Reason"
                    value={reason}
                    onChange={(val) => setReason(val)}
                    options={reasonOptions}
                    className="w-full"
                  />
                </div>

                {/* 5. Product Serial & Warranty Verification */}
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Product Serial No *</label>
                  <div className="flex items-end gap-2">
                    <CustomInput
                      placeholder="e.g. SN-TATA-540-0012"
                      value={serial}
                      onChange={(e) => {
                        setSerial(e.target.value);
                        setWarrantyChecked(false);
                        setWarrantyValid(null);
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={checkWarranty}
                      variant="outline"
                      size="md"
                      leftIcon={<FaShieldAlt />}
                      className="shrink-0"
                    >
                      Verify
                    </Button>
                  </div>
                  {warrantyChecked && (
                    <div className={`mt-2 text-xs font-semibold ${warrantyValid ? 'text-success' : 'text-danger'}`}>
                      {warrantyValid ? '✅ Warranty Verified: Serial Number is valid and covered under SolarKits warranty policy.' : '❌ Invalid Serial Code: Serial must start with "SN-".'}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!warrantyValid}
                variant="primary"
                fullWidth
                leftIcon={<FaExchangeAlt />}
              >
                Submit Replacement Claim
              </Button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
