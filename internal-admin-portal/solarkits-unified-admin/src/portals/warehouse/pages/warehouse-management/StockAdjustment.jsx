import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBoxes, FaPlus, FaMinus, FaHistory, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const initialAdjustments = [
  { id: 'ADJ-881', item: '540W Mono PERC Panel', qty: -5, type: 'Decrease', reason: 'QC Damage Check Failed', date: '2026-05-20', warehouse: 'Jaipur Main Hub' },
  { id: 'ADJ-882', item: 'Growatt Inverter 20kW', qty: 2, type: 'Increase', reason: 'Found during audit reconciliation', date: '2026-05-19', warehouse: 'Mumbai Central' },
  { id: 'ADJ-883', item: '4 sq mm DC Cable', qty: -20, type: 'Decrease', reason: 'Scrap & short piece deduction', date: '2026-05-21', warehouse: 'Ahmedabad GIDC Warehouse' },
];

export default function StockAdjustment() {
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [item, setItem] = useState('');
  const [warehouse, setWarehouse] = useState('Jaipur Main Hub');
  const [adjType, setAdjType] = useState('Decrease');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('Damaged in transit');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!item.trim()) return;

    const newAdj = {
      id: `ADJ-${Math.floor(884 + Math.random() * 100)}`,
      item,
      qty: adjType === 'Decrease' ? -Math.abs(parseInt(qty)) : Math.abs(parseInt(qty)),
      type: adjType,
      reason,
      date: new Date().toISOString().split('T')[0],
      warehouse
    };

    setAdjustments([newAdj, ...adjustments]);
    setIsFormOpen(false);
    setItem('');
    setQty(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stock Adjustment</h1>
          <p className="text-text-secondary">Reconcile discrepancies, damage, and audit differences</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold"
        >
          <FaPlus />
          <span>Record Adjustment</span>
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-linear-to-r from-danger/10 to-transparent border border-danger/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary uppercase font-semibold">Total Damage Deductions</span>
            <h3 className="text-2xl font-bold text-danger mt-1">
              {Math.abs(adjustments.filter(a => a.qty < 0).reduce((acc, a) => acc + a.qty, 0))} units
            </h3>
          </div>
          <FaMinus className="text-danger text-2xl" />
        </div>
        <div className="card p-5 bg-linear-to-r from-success/10 to-transparent border border-success/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary uppercase font-semibold">Total Reconciliation Adds</span>
            <h3 className="text-2xl font-bold text-success mt-1">
              {adjustments.filter(a => a.qty > 0).reduce((acc, a) => acc + a.qty, 0)} units
            </h3>
          </div>
          <FaPlus className="text-success text-2xl" />
        </div>
        <div className="card p-5 bg-linear-to-r from-primary/10 to-transparent border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary uppercase font-semibold">Total Adjustments Logged</span>
            <h3 className="text-2xl font-bold text-primary mt-1">{adjustments.length} logs</h3>
          </div>
          <FaHistory className="text-primary text-2xl" />
        </div>
      </div>

      {/* Adjustment Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
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
                  <FaBoxes className="text-primary" />
                  Record Stock Adjustment
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Item Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Solar Panel 540W"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Warehouse</label>
                  <select
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  >
                    <option>Jaipur Main Hub</option>
                    <option>Ahmedabad GIDC Warehouse</option>
                    <option>Mumbai Central</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase">Adjustment Type</label>
                    <select
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    >
                      <option value="Decrease">Deduct (Decrease)</option>
                      <option value="Increase">Add (Increase)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Adjustment Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  >
                    <option>Transit damage discovered</option>
                    <option>Found during audit reconciliation</option>
                    <option>Theft / Discrepancy check</option>
                    <option>Scrap & short-length trim</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl gradient-primary text-white font-bold shadow-md hover:brightness-105 transition-all text-sm flex items-center justify-center gap-2"
              >
                <FaCheckCircle />
                <span>Log Adjustment</span>
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Adjustments Log Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border bg-linear-to-r from-primary/5 to-transparent">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
            <FaHistory className="text-primary" />
            Adjustment Log History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                <th className="p-4">Log ID</th>
                <th className="p-4">Item details</th>
                <th className="p-4">Warehouse</th>
                <th className="p-4 text-center">Adjustment Qty</th>
                <th className="p-4">Reason / Notes</th>
                <th className="p-4">Log Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-primary/5 transition-all">
                  <td className="p-4 font-bold text-primary">{a.id}</td>
                  <td className="p-4 font-semibold text-text-primary">{a.item}</td>
                  <td className="p-4 font-medium text-text-secondary">{a.warehouse}</td>
                  <td className="p-4 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      a.qty < 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}>
                      {a.qty > 0 ? `+${a.qty}` : a.qty} units
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary font-medium">{a.reason}</td>
                  <td className="p-4 text-text-secondary">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
