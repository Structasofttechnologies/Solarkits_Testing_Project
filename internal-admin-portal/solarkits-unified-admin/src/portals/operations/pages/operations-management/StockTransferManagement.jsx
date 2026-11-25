import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaExchangeAlt, FaWarehouse, FaCheckCircle, FaExclamationTriangle, 
  FaArrowRight, FaCogs, FaClipboardCheck, FaTimesCircle, FaMapMarkerAlt, FaTruck
} from 'react-icons/fa';

// Mock inventory state for cluster warehouses
const initialWarehouseStocks = [
  { name: "Jaipur Main Hub (Master)", panels: 1800, inverters: 40, status: "Healthy" },
  { name: "Sanganer Sub-Warehouse", panels: 120, inverters: 3, status: "Understocked" },
  { name: "Jodhpur Local Branch", panels: 450, inverters: 8, status: "Healthy" },
  { name: "Udaipur Sub-Hub", panels: 80, inverters: 1, status: "Understocked" }
];

const initialPendingTransferRequests = [
  {
    id: "REQ-TRN-7071",
    from: "Jaipur Main Hub (Master)",
    to: "Sanganer Sub-Warehouse",
    items: "Solar Panels - 100 Pcs",
    dateRequested: "2026-06-15",
    initiatedBy: "Master Manager",
    status: "Awaiting Ops Approval"
  },
  {
    id: "REQ-TRN-7072",
    from: "Jodhpur Local Branch",
    to: "Udaipur Sub-Hub",
    items: "Inverter Solis 50kW - 1 Pc",
    dateRequested: "2026-06-14",
    initiatedBy: "Jodhpur Supervisor",
    status: "Approved"
  }
];

const initialTransitMovements = [
  {
    id: "TRN-M-1001",
    from: "Jaipur Main Hub",
    to: "Sanganer Sub-Warehouse",
    items: "Solar Panels - 100 Pcs",
    vehicleNo: "RJ-14-GB-9901",
    progress: "Out for Delivery",
    eta: "2 Hours"
  }
];

export default function StockTransferManagement() {
  const [activeTab, setActiveTab] = useState('balancing'); // 'balancing', 'approvals', 'tracking'
  const [warehouseStocks, setWarehouseStocks] = useState(initialWarehouseStocks);
  const [transferRequests, setTransferRequests] = useState(initialPendingTransferRequests);
  const [transitMovements, setTransitMovements] = useState(initialTransitMovements);

  // New transfer form state
  const [form, setForm] = useState({
    from: 'Jaipur Main Hub (Master)',
    to: 'Sanganer Sub-Warehouse',
    category: 'Solar Panel',
    specs: '540W Mono PERC',
    qty: 50
  });

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    const reqId = `REQ-TRN-${Math.floor(7000 + Math.random() * 900)}`;
    const newReq = {
      id: reqId,
      from: form.from,
      to: form.to,
      items: `${form.category} (${form.specs}) - ${form.qty} Pcs`,
      dateRequested: new Date().toISOString().split('T')[0],
      initiatedBy: "Cluster Operations Manager",
      status: "Awaiting Ops Approval"
    };

    setTransferRequests([newReq, ...transferRequests]);
    setActiveTab('approvals');
    
    // Reset Form
    setForm({
      from: 'Jaipur Main Hub (Master)',
      to: 'Sanganer Sub-Warehouse',
      category: 'Solar Panel',
      specs: '540W Mono PERC',
      qty: 50
    });
  };

  const handleApprove = (req) => {
    // Approve transfer request
    setTransferRequests(transferRequests.map(t => 
      t.id === req.id ? { ...t, status: "Approved" } : t
    ));

    // Deduct stock from origin and add to transit
    setWarehouseStocks(warehouseStocks.map(w => {
      if (w.name === req.from) {
        return { ...w, panels: Math.max(0, w.panels - 100) };
      }
      return w;
    }));

    // Create transit movement
    const newMovement = {
      id: req.id.replace("REQ-", ""),
      from: req.from,
      to: req.to,
      items: req.items,
      vehicleNo: `DL-01-XX-${Math.floor(1000 + Math.random() * 9000)}`,
      progress: "Dispatched",
      eta: "5 Hours"
    };
    setTransitMovements([newMovement, ...transitMovements]);
    alert(`Transfer request ${req.id} approved. Dispatch transit logged!`);
  };

  const handleReject = (req) => {
    setTransferRequests(transferRequests.map(t => 
      t.id === req.id ? { ...t, status: "Rejected" } : t
    ));
    alert(`Transfer request ${req.id} rejected.`);
  };

  // Trigger quick balance fill
  const handleQuickBalance = (warehouseName) => {
    setForm({
      from: 'Jaipur Main Hub (Master)',
      to: warehouseName,
      category: 'Solar Panel',
      specs: '550W TOPCon',
      qty: 200
    });
    setActiveTab('balancing');
    // Scroll to form or highlight
    const element = document.getElementById("transfer-form-card");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <FaExchangeAlt className="text-primary" />
            Stock Transfer & Balancing Controller
          </h1>
          <p className="text-text-secondary text-sm">
            Balance solar panels and inverter stock across cluster nodes and approve transfer dispatches.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-card p-1 rounded-xl border border-border shadow-xs">
          <button
            onClick={() => setActiveTab('balancing')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'balancing' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Stock Balancing Board
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'approvals' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pending Approvals ({transferRequests.filter(t => t.status === "Awaiting Ops Approval").length})
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tracking' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Transit Tracking ({transitMovements.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* BALANCING BOARD & CREATE TRANSFER FORM */}
        {activeTab === 'balancing' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Warehouse Stock List */}
            <div className="lg:col-span-2 card p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
                <FaWarehouse className="text-primary" />
                Cluster Warehouses Inventory Level
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouseStocks.map((wh, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-xl bg-bg flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-text-primary text-xs">{wh.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wh.status === 'Healthy' 
                            ? 'bg-success/15 text-success'
                            : 'bg-danger/15 text-danger animate-pulse'
                        }`}>
                          {wh.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-text-secondary">
                        <div>
                          <span>Solar Panels:</span>
                          <strong className="block text-text-primary font-black mt-0.5">{wh.panels} Pcs</strong>
                        </div>
                        <div>
                          <span>Inverters:</span>
                          <strong className="block text-text-primary font-black mt-0.5">{wh.inverters} Pcs</strong>
                        </div>
                      </div>
                    </div>

                    {wh.status === 'Understocked' && (
                      <button
                        onClick={() => handleQuickBalance(wh.name)}
                        className="w-full py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold hover:bg-primary/25 active:scale-98 transition-all flex items-center justify-center gap-1"
                      >
                        <FaCogs /> Quick Rebalance
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Create Inter-Warehouse Request */}
            <div id="transfer-form-card" className="card p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-3 flex items-center gap-1.5">
                <FaExchangeAlt className="text-primary" />
                Initialize Stock Transfer
              </h3>

              <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-text-secondary uppercase">From Warehouse (Source)</label>
                  <select 
                    value={form.from}
                    onChange={e => setForm({...form, from: e.target.value})}
                    className="w-full mt-1 p-2 rounded-lg border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  >
                    <option>Jaipur Main Hub (Master)</option>
                    <option>Jodhpur Local Branch</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-secondary uppercase">To Warehouse (Destination)</label>
                  <select 
                    value={form.to}
                    onChange={e => setForm({...form, to: e.target.value})}
                    className="w-full mt-1 p-2 rounded-lg border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  >
                    <option>Sanganer Sub-Warehouse</option>
                    <option>Udaipur Sub-Hub</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-secondary uppercase">Category</label>
                  <select 
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full mt-1 p-2 rounded-lg border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  >
                    <option>Solar Panel</option>
                    <option>Inverter</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-secondary uppercase">Specifications</label>
                  <input 
                    type="text" required
                    value={form.specs}
                    onChange={e => setForm({...form, specs: e.target.value})}
                    className="w-full mt-1 p-2 rounded-lg border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-text-secondary uppercase">Quantity (Units)</label>
                  <input 
                    type="number" required min="1"
                    value={form.qty}
                    onChange={e => setForm({...form, qty: e.target.value})}
                    className="w-full mt-1 p-2 rounded-lg border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg gradient-primary text-white font-extrabold text-xs shadow-sm hover:brightness-105"
                >
                  Create Transfer Request
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* PENDING APPROVAL WORKFLOW */}
        {activeTab === 'approvals' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                    <th className="p-4">Request ID</th>
                    <th className="p-4">Source Warehouse</th>
                    <th className="p-4">Destination Sub</th>
                    <th className="p-4">Transfer Items</th>
                    <th className="p-4">Initiated By</th>
                    <th className="p-4">Request Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {transferRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{req.id}</td>
                      <td className="p-4 font-semibold text-text-primary">{req.from}</td>
                      <td className="p-4 font-semibold text-text-primary">{req.to}</td>
                      <td className="p-4 font-medium text-text-secondary">{req.items}</td>
                      <td className="p-4 font-semibold text-text-secondary">{req.initiatedBy}</td>
                      <td className="p-4 text-text-secondary font-semibold">{req.dateRequested}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          req.status === 'Approved' ? 'bg-success/15 text-success border-success/10' :
                          req.status === 'Rejected' ? 'bg-danger/15 text-danger border-danger/10' :
                          'bg-warning/15 text-warning border-warning/10 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        {req.status === 'Awaiting Ops Approval' ? (
                          <>
                            <button
                              onClick={() => handleReject(req)}
                              className="px-2 py-1 border border-danger/20 hover:bg-danger/5 text-danger text-[10px] font-bold rounded-lg transition-all active:scale-95"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              className="px-2.5 py-1 gradient-primary text-white text-[10px] font-bold rounded-lg shadow-xs transition-all active:scale-95"
                            >
                              Approve
                            </button>
                          </>
                        ) : (
                          <span className="text-text-muted italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TRANSIT MOVEMENTS TRACKING */}
        {activeTab === 'tracking' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
              <FaTruck className="text-primary" />
              Active Inventory Movement Tracking
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transitMovements.map(m => (
                <div key={m.id} className="p-4 border border-border rounded-xl bg-bg space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-primary">{m.id}</span>
                    <span className="text-success">{m.progress}</span>
                  </div>
                  <div className="text-text-secondary leading-relaxed">
                    <strong>Route:</strong> {m.from} ➔ {m.to} <br />
                    <strong>Payload:</strong> {m.items} <br />
                    <strong>Vehicle No:</strong> <span className="font-mono">{m.vehicleNo}</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center text-[10px] text-text-muted border-t border-border/50">
                    <span>ETA Destination:</span>
                    <strong className="text-text-primary font-bold">{m.eta}</strong>
                  </div>
                </div>
              ))}
              {transitMovements.length === 0 && (
                <div className="p-8 text-center text-text-muted italic col-span-2">
                  No active stock transfers currently in transit.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
