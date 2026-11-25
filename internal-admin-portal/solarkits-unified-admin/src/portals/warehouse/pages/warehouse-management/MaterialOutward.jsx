import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTruck, FaBoxes, FaUser, FaMapMarkerAlt, 
  FaCheckCircle, FaSearch, FaPlus, FaMinus, FaBarcode, 
  FaClipboardList, FaFileInvoice, FaArrowRight, FaClock, FaCheck, FaBuilding, FaExchangeAlt
} from 'react-icons/fa';

// Mock DB for sub/master dispatch
const initialSubDispatches = [
  {
    id: "DSP-SUB-2041",
    orderNo: "ORD-9843",
    projectNo: "PRJ-5402",
    partnerName: "Apex Solar Installers",
    location: "Jaipur, Rajasthan",
    status: "Ready for Dispatch",
    date: "2026-06-14",
    items: [
      { category: "Solar Panel", brand: "Tata Solar", specs: "540W Mono PERC", qty: 40, serials: ["TS-540-001", "TS-540-002"] }
    ]
  },
  {
    id: "DSP-SUB-2042",
    orderNo: "ORD-9844",
    projectNo: "PRJ-5403",
    partnerName: "Sunnovative Projects",
    location: "Sanganer Area",
    status: "Dispatched",
    date: "2026-06-15",
    items: [
      { category: "Inverter", brand: "Solis", specs: "50kW Three Phase", qty: 2, serials: ["SOL-50-881", "SOL-50-882"] }
    ]
  }
];

const initialMasterTransfers = [
  {
    id: "TRN-M-1001",
    destinationSub: "Sanganer Sub-Warehouse",
    status: "Sent",
    date: "2026-06-15",
    items: [
      { category: "Solar Panel", brand: "Waaree", specs: "550W TOPCon", qty: 100 },
      { category: "Inverter", brand: "Solis", specs: "50kW", qty: 2 }
    ]
  },
  {
    id: "TRN-M-1002",
    destinationSub: "Jodhpur Local Branch",
    status: "Draft",
    date: "2026-06-15",
    items: [
      { category: "ACDC Cables", brand: "Polycab", specs: "4 sq mm", qty: 50 }
    ]
  }
];

export default function MaterialOutward() {
  const [warehouseMode, setWarehouseMode] = useState(localStorage.getItem('warehouseMode') || 'master');

  useEffect(() => {
    const handleModeChanged = () => {
      setWarehouseMode(localStorage.getItem('warehouseMode') || 'master');
    };
    window.addEventListener('warehouseModeChanged', handleModeChanged);
    return () => window.removeEventListener('warehouseModeChanged', handleModeChanged);
  }, []);

  // Sub tabs: 'sub-dispatch', 'sub-queue'
  // Master tabs: 'master-transfer', 'master-direct', 'transfer-queue'
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    setActiveTab(warehouseMode === 'sub' ? 'sub-dispatch' : 'master-transfer');
  }, [warehouseMode]);

  // Sub warehouse states
  const [subDispatches, setSubDispatches] = useState(initialSubDispatches);
  const [subForm, setSubForm] = useState({
    orderNo: '',
    projectNo: '',
    partnerName: '',
    location: '',
    category: 'Solar Panel',
    brand: 'Tata Solar',
    specs: '540W Mono PERC',
    qty: 10,
    serials: ''
  });

  // Master warehouse states
  const [masterTransfers, setMasterTransfers] = useState(initialMasterTransfers);
  const [transferForm, setTransferForm] = useState({
    destinationSub: 'Sanganer Sub-Warehouse',
    category: 'Solar Panel',
    brand: 'Waaree',
    specs: '550W TOPCon',
    qty: 50,
    serials: ''
  });

  const [directForm, setDirectForm] = useState({
    orderNo: '',
    partnerName: '',
    location: '',
    category: 'Solar Panel',
    brand: 'Tata Solar',
    qty: 20,
    serials: ''
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Checklist states
  const [checklist, setChecklist] = useState({
    physicalCheck: false,
    brandVerified: false,
    serialMatch: false,
  });

  // ----------------------------------------------------
  // SUBMISSION HANDLERS
  // ----------------------------------------------------
  const handleSubDispatchSubmit = (e) => {
    e.preventDefault();
    if (!checklist.physicalCheck || !checklist.brandVerified || !checklist.serialMatch) {
      alert("Please complete the validation checklist first!");
      return;
    }

    const newDispatch = {
      id: `DSP-SUB-20${subDispatches.length + 3}`,
      orderNo: subForm.orderNo,
      projectNo: subForm.projectNo,
      partnerName: subForm.partnerName,
      location: subForm.location,
      status: "Ready for Dispatch",
      date: new Date().toISOString().split('T')[0],
      items: [
        { 
          category: subForm.category, 
          brand: subForm.brand, 
          specs: subForm.specs, 
          qty: parseInt(subForm.qty), 
          serials: subForm.serials.split('\n').filter(s => s.trim())
        }
      ]
    };

    setSubDispatches([newDispatch, ...subDispatches]);
    setActiveTab('sub-queue');
    
    // Reset form
    setSubForm({
      orderNo: '',
      projectNo: '',
      partnerName: '',
      location: '',
      category: 'Solar Panel',
      brand: 'Tata Solar',
      specs: '540W Mono PERC',
      qty: 10,
      serials: ''
    });
    setChecklist({ physicalCheck: false, brandVerified: false, serialMatch: false });
  };

  const handleMasterTransferSubmit = (e) => {
    e.preventDefault();
    const newTransfer = {
      id: `TRN-M-10${masterTransfers.length + 3}`,
      destinationSub: transferForm.destinationSub,
      status: "Sent",
      date: new Date().toISOString().split('T')[0],
      items: [
        { 
          category: transferForm.category, 
          brand: transferForm.brand, 
          specs: transferForm.specs, 
          qty: parseInt(transferForm.qty)
        }
      ]
    };

    setMasterTransfers([newTransfer, ...masterTransfers]);
    setActiveTab('transfer-queue');
    
    // Reset form
    setTransferForm({
      destinationSub: 'Sanganer Sub-Warehouse',
      category: 'Solar Panel',
      brand: 'Waaree',
      specs: '550W TOPCon',
      qty: 50,
      serials: ''
    });
  };

  const handleMasterDirectSubmit = (e) => {
    e.preventDefault();
    // Direct dispatch from Master is logged as a special Sub-Dispatch equivalent on Master
    const newDispatch = {
      id: `DSP-MST-30${subDispatches.length + 1}`,
      orderNo: directForm.orderNo,
      projectNo: "DIRECT-MST",
      partnerName: directForm.partnerName,
      location: directForm.location,
      status: "Ready for Dispatch",
      date: new Date().toISOString().split('T')[0],
      items: [
        { 
          category: directForm.category, 
          brand: directForm.brand, 
          specs: 'Direct Stock Outward', 
          qty: parseInt(directForm.qty), 
          serials: directForm.serials.split('\n').filter(s => s.trim())
        }
      ]
    };

    setSubDispatches([newDispatch, ...subDispatches]);
    setActiveTab('sub-queue');

    // Reset Form
    setDirectForm({
      orderNo: '',
      partnerName: '',
      location: '',
      category: 'Solar Panel',
      brand: 'Tata Solar',
      qty: 20,
      serials: ''
    });
  };

  // ----------------------------------------------------
  // FILTERING LOGS
  // ----------------------------------------------------
  const filteredSubDispatches = useMemo(() => {
    return subDispatches.filter(d => 
      d.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subDispatches, searchQuery]);

  const filteredMasterTransfers = useMemo(() => {
    return masterTransfers.filter(t => 
      t.destinationSub.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [masterTransfers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <FaTruck className="text-primary" />
            {warehouseMode === 'sub' ? 'Sub-Warehouse Outward Dispatch' : 'Master-Warehouse Outward Control'}
          </h1>
          <p className="text-text-secondary text-sm">
            {warehouseMode === 'sub' 
              ? 'Dispatch customer orders, load vehicle calculation and schedule logistics.'
              : 'Bulk stock transfers to sub-warehouses and direct direct product dispatch.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-card p-1 rounded-xl border border-border shadow-xs">
          {warehouseMode === 'sub' ? (
            <>
              <button
                onClick={() => setActiveTab('sub-dispatch')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'sub-dispatch' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Order-wise Dispatch
              </button>
              <button
                onClick={() => setActiveTab('sub-queue')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'sub-queue' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Dispatch Queue ({subDispatches.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('master-transfer')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'master-transfer' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Stock Transfer (to Sub)
              </button>
              <button
                onClick={() => setActiveTab('master-direct')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'master-direct' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Direct Dispatch
              </button>
              <button
                onClick={() => setActiveTab('transfer-queue')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'transfer-queue' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Transfer Queue ({masterTransfers.length})
              </button>
              <button
                onClick={() => setActiveTab('sub-queue')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'sub-queue' 
                    ? 'gradient-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Direct Queue
              </button>
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------
          SUB WAREHOUSE VIEWS
          ---------------------------------------------------- */}
      {warehouseMode === 'sub' && (
        <AnimatePresence mode="wait">
          {activeTab === 'sub-dispatch' && (
            <motion.form 
              onSubmit={handleSubDispatchSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-6">
                {/* Form details */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                    <FaFileInvoice className="text-primary" />
                    Customer Order Dispatch Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Customer Order No</label>
                      <input 
                        type="text" required placeholder="e.g. ORD-9843"
                        value={subForm.orderNo}
                        onChange={e => setSubForm({...subForm, orderNo: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Project No</label>
                      <input 
                        type="text" required placeholder="e.g. PRJ-5402"
                        value={subForm.projectNo}
                        onChange={e => setSubForm({...subForm, projectNo: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Partner Name</label>
                      <input 
                        type="text" required placeholder="e.g. Apex Solar Installers"
                        value={subForm.partnerName}
                        onChange={e => setSubForm({...subForm, partnerName: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Installation Location</label>
                      <input 
                        type="text" required placeholder="e.g. Jaipur, Rajasthan"
                        value={subForm.location}
                        onChange={e => setSubForm({...subForm, location: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Specs</label>
                      <input 
                        type="text" required placeholder="e.g. 540W Mono PERC"
                        value={subForm.specs}
                        onChange={e => setSubForm({...subForm, specs: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Category</label>
                      <select 
                        value={subForm.category}
                        onChange={e => setSubForm({...subForm, category: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                      >
                        <option>Solar Panel</option>
                        <option>Inverter</option>
                        <option>Cables</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Quantity (Pcs)</label>
                      <input 
                        type="number" required min="1"
                        value={subForm.qty}
                        onChange={e => setSubForm({...subForm, qty: e.target.value})}
                        className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-text-secondary uppercase flex items-center gap-1">
                      <FaBarcode /> Serial Numbers to Dispatch (One per line)
                    </label>
                    <textarea 
                      rows={3} 
                      placeholder="Scan/type serials..."
                      value={subForm.serials}
                      onChange={e => setSubForm({...subForm, serials: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Checklist */}
              <div className="space-y-6">
                <div className="card p-6 space-y-4">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                    Dispatch Safety Verification
                  </h3>

                  <div className="space-y-3">
                    {[
                      { key: 'physicalCheck', label: 'Physical Check Completed' },
                      { key: 'brandVerified', label: 'Brand & Tech Verified' },
                      { key: 'serialMatch', label: 'Serial Numbers Mapped' }
                    ].map((chk) => (
                      <div 
                        key={chk.key}
                        onClick={() => setChecklist({ ...checklist, [chk.key]: !checklist[chk.key] })}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          checklist[chk.key] 
                            ? 'border-success bg-success/5 text-success' 
                            : 'border-border bg-bg text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          checklist[chk.key] ? 'bg-success border-success text-white' : 'border-border'
                        }`}>
                          {checklist[chk.key] && <FaCheck size={10} />}
                        </div>
                        <span className="text-xs font-semibold">{chk.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl gradient-primary text-white font-extrabold shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <FaTruck /> Confirm Dispatch Slip
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      )}

      {/* ----------------------------------------------------
          MASTER WAREHOUSE VIEWS
          ---------------------------------------------------- */}
      {warehouseMode === 'master' && (
        <AnimatePresence mode="wait">
          {/* BULK STOCK TRANSFER TO SUB */}
          {activeTab === 'master-transfer' && (
            <motion.form 
              onSubmit={handleMasterTransferSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 card p-6 space-y-4">
                <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                  <FaExchangeAlt className="text-primary" />
                  Request Stock Transfer to Sub-Warehouse
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Destination Sub-Warehouse</label>
                    <select
                      value={transferForm.destinationSub}
                      onChange={e => setTransferForm({...transferForm, destinationSub: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:border-primary"
                    >
                      <option>Sanganer Sub-Warehouse</option>
                      <option>Jodhpur Local Branch</option>
                      <option>Udaipur Sub-Hub</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Product Category</label>
                    <select
                      value={transferForm.category}
                      onChange={e => setTransferForm({...transferForm, category: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    >
                      <option>Solar Panel</option>
                      <option>Inverter</option>
                      <option>Cables</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Brand / Manufacturer</label>
                    <select
                      value={transferForm.brand}
                      onChange={e => setTransferForm({...transferForm, brand: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    >
                      <option>Waaree</option>
                      <option>Tata Solar</option>
                      <option>Solis</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Specifications</label>
                    <input 
                      type="text" required placeholder="e.g. 550W TOPCon"
                      value={transferForm.specs}
                      onChange={e => setTransferForm({...transferForm, specs: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Quantity (Units)</label>
                    <input 
                      type="number" required min="1"
                      value={transferForm.qty}
                      onChange={e => setTransferForm({...transferForm, qty: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase flex items-center gap-1">
                    <FaBarcode /> Serial Numbers to Transfer (One per line)
                  </label>
                  <textarea 
                    rows={3} 
                    placeholder="Scan pallet or type serial numbers..."
                    value={transferForm.serials}
                    onChange={e => setTransferForm({...transferForm, serials: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="card p-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 text-xs text-text-secondary space-y-3">
                  <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1">
                    <FaBuilding /> Compliance Notice
                  </h4>
                  <p className="leading-relaxed">
                    Stock Transfers between warehouses require immediate registration of E-Way bills. Ensure Accounts Login releases documentation before transit.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl gradient-primary text-white font-extrabold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <FaExchangeAlt /> Initiate Transfer to Sub
                </button>
              </div>
            </motion.form>
          )}

          {/* MASTER DIRECT DISPATCH */}
          {activeTab === 'master-direct' && (
            <motion.form 
              onSubmit={handleMasterDirectSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 card p-6 space-y-4">
                <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                  <FaTruck className="text-primary" />
                  Direct Project Delivery Dispatch
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Order No / Reference</label>
                    <input 
                      type="text" required placeholder="e.g. DIR-ORD-881"
                      value={directForm.orderNo}
                      onChange={e => setDirectForm({...directForm, orderNo: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Customer Partner Name</label>
                    <input 
                      type="text" required placeholder="e.g. SunTech Solar Ltd"
                      value={directForm.partnerName}
                      onChange={e => setDirectForm({...directForm, partnerName: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Installation Site Address</label>
                    <input 
                      type="text" required placeholder="e.g. Alwar Highway, RJ"
                      value={directForm.location}
                      onChange={e => setDirectForm({...directForm, location: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Category</label>
                    <select 
                      value={directForm.category}
                      onChange={e => setDirectForm({...directForm, category: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    >
                      <option>Solar Panel</option>
                      <option>Inverter</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Quantity (Pcs)</label>
                    <input 
                      type="number" required min="1"
                      value={directForm.qty}
                      onChange={e => setDirectForm({...directForm, qty: e.target.value})}
                      className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase flex items-center gap-1">
                    <FaBarcode /> Serial Numbers (One per line)
                  </label>
                  <textarea 
                    rows={3} 
                    placeholder="Scan serial barcodes..."
                    value={directForm.serials}
                    onChange={e => setDirectForm({...directForm, serials: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl gradient-primary text-white font-extrabold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <FaTruck /> Confirm Direct Dispatch
                </button>
              </div>
            </motion.form>
          )}

          {/* MASTER TRANSFER QUEUE */}
          {activeTab === 'transfer-queue' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="card overflow-hidden"
            >
              {/* Filter */}
              <div className="p-6 border-b border-border bg-linear-to-r from-primary/5 to-transparent">
                <input 
                  type="text" 
                  placeholder="Search transfer queue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-md pl-4 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                      <th className="p-4">Transfer ID</th>
                      <th className="p-4">Destination Sub-Warehouse</th>
                      <th className="p-4">Item details</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Documentation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredMasterTransfers.map(trn => (
                      <tr key={trn.id} className="hover:bg-primary/5 transition-colors">
                        <td className="p-4 font-bold text-primary">{trn.id}</td>
                        <td className="p-4 font-semibold text-text-primary">{trn.destinationSub}</td>
                        <td className="p-4">
                          {trn.items.map((it, i) => (
                            <div key={i} className="font-semibold text-text-primary">
                              {it.qty}x {it.brand} ({it.specs})
                            </div>
                          ))}
                        </td>
                        <td className="p-4 font-semibold text-text-secondary">{trn.date}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            trn.status === 'Sent' 
                              ? 'bg-primary/10 text-primary border-primary/10'
                              : 'bg-text-muted/10 text-text-muted border-text-muted/10'
                          }`}>
                            {trn.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button className="px-3 py-1 bg-surface border border-border text-[10px] font-bold rounded-lg text-primary hover:bg-primary/5 active:scale-95 transition-all">
                            Print Challan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ----------------------------------------------------
          COMMON QUEUE VIEW (SHARED FOR ACTIVE LOGS REVIEW)
          ---------------------------------------------------- */}
      {activeTab === 'sub-queue' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="card overflow-hidden"
        >
          {/* Search bar */}
          <div className="p-6 border-b border-border bg-linear-to-r from-primary/5 to-transparent">
            <input 
              type="text" 
              placeholder="Search dispatch queue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md pl-4 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                  <th className="p-4">Dispatch ID</th>
                  <th className="p-4">Order / Project</th>
                  <th className="p-4">Partner</th>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredSubDispatches.map(d => (
                  <tr key={d.id} className="hover:bg-primary/5 transition-colors">
                    <td className="p-4 font-bold text-primary">{d.id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-text-primary">{d.orderNo}</div>
                      <div className="text-[10px] text-text-secondary font-medium">{d.projectNo}</div>
                    </td>
                    <td className="p-4 font-semibold text-text-primary">
                      {d.partnerName}
                      <div className="text-[10px] text-text-secondary flex items-center gap-1 font-medium mt-0.5">
                        <FaMapMarkerAlt /> {d.location}
                      </div>
                    </td>
                    <td className="p-4">
                      {d.items.map((item, idx) => (
                        <div key={idx} className="font-semibold text-text-primary">
                          {item.qty}x {item.brand} ({item.specs})
                        </div>
                      ))}
                    </td>
                    <td className="p-4 font-semibold text-text-secondary">{d.date}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        d.status === 'Dispatched' ? 'bg-success/10 text-success border-success/20' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="px-3 py-1 bg-surface border border-border text-[10px] font-bold rounded-lg text-primary hover:bg-primary/5 active:scale-95 transition-all">
                        View slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
