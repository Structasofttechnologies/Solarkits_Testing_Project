import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExchangeAlt, FaArrowRight, FaWarehouse, FaMapMarkerAlt, FaTruckLoading, FaUndoAlt, FaPlus, FaCheck, FaTimes } from "react-icons/fa";

const transferTypes = [
  { id: 'w2w', name: 'Warehouse to Warehouse', icon: <FaWarehouse />, description: 'Inter-warehouse inventory movement' },
  { id: 'c2c', name: 'Cluster to Cluster', icon: <FaMapMarkerAlt />, description: 'Moving stock between regional clusters' },
  { id: 'w2s', name: 'Warehouse to Site', icon: <FaTruckLoading />, description: 'Direct dispatch to installation site' },
  { id: 'return', name: 'Return to Warehouse', icon: <FaUndoAlt />, description: 'Unused or damaged stock returns' },
];

const initialTransfers = [
  { id: 'TRF-001', type: 'Warehouse to Warehouse', source: 'Jaipur Main Hub', destination: 'Ahmedabad GIDC Warehouse', item: 'Growatt Inverter 20kW', qty: 5, status: 'In Transit', date: '2026-05-20' },
  { id: 'TRF-002', type: 'Warehouse to Site', source: 'Mumbai Central', destination: 'Site A-102 (Jaipur)', item: '540W Mono PERC Panel', qty: 120, status: 'Completed', date: '2026-05-19' },
  { id: 'TRF-003', type: 'Return to Warehouse', source: 'Site B-99 (Pune)', destination: 'Mumbai Central', item: 'Mounting Rails', qty: 45, status: 'Pending Verification', date: '2026-05-21' },
];

export default function InventoryTransfer() {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [transferType, setTransferType] = useState('Warehouse to Warehouse');
  const [source, setSource] = useState('Jaipur Main Hub');
  const [destination, setDestination] = useState('Ahmedabad GIDC Warehouse');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(1);

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    if (!item.trim()) return;

    const newTrf = {
      id: `TRF-${Math.floor(100 + Math.random() * 900)}`,
      type: transferType,
      source,
      destination,
      item,
      qty: parseInt(qty) || 1,
      status: 'Pending Verification',
      date: new Date().toISOString().split('T')[0]
    };

    setTransfers([newTrf, ...transfers]);
    setIsFormOpen(false);
    setItem('');
  };

  const handleUpdateStatus = (id, newStatus) => {
    setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory Transfer</h1>
          <p className="text-text-secondary">Manage and track stock movement across locations</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold"
        >
          <FaExchangeAlt className="text-xl" />
          <span>Initiate Transfer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {transferTypes.map((type, index) => (
          <motion.div
            key={type.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card p-4 flex items-center gap-4 group cursor-pointer hover:border-primary/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white text-xl shadow-md group-hover:scale-105 transition-transform">
              {type.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-text-primary">{type.name}</h3>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">{type.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Transfer request creator */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.form 
              onSubmit={handleCreateTransfer}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <FaExchangeAlt className="text-primary" />
                  Initiate Inventory Transfer
                </h3>
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Transfer Type</label>
                  <select 
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  >
                    <option>Warehouse to Warehouse</option>
                    <option>Cluster to Cluster</option>
                    <option>Warehouse to Site</option>
                    <option>Return to Warehouse</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Item / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solis Inverter 50kW"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Source Location</label>
                  <select 
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  >
                    <option>Jaipur Main Hub</option>
                    <option>Ahmedabad GIDC Warehouse</option>
                    <option>Mumbai Central</option>
                    <option>Site B-99 (Pune)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase">Destination Location</label>
                  <select 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none"
                  >
                    <option>Ahmedabad GIDC Warehouse</option>
                    <option>Jaipur Main Hub</option>
                    <option>Mumbai Central</option>
                    <option>Site A-102 (Jaipur)</option>
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

              <button
                type="submit"
                className="w-full py-3 rounded-xl gradient-primary text-white font-bold shadow-md hover:brightness-105 transition-all text-sm flex items-center justify-center gap-2"
              >
                <FaExchangeAlt />
                <span>Create Transfer Request</span>
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer History Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border bg-linear-to-r from-primary/5 to-transparent flex items-center justify-between">
          <h3 className="font-bold text-text-primary text-sm">Recent Transfer Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                <th className="p-4">Transfer ID</th>
                <th className="p-4">Type</th>
                <th className="p-4">Item Details</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Source &rarr; Destination</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-bold text-primary">{t.id}</td>
                  <td className="p-4 text-text-secondary">{t.type}</td>
                  <td className="p-4 font-semibold text-text-primary">{t.item}</td>
                  <td className="p-4 font-bold text-text-primary">{t.qty}</td>
                  <td className="p-4">
                    <span className="font-semibold text-text-primary">{t.source}</span>
                    <span className="mx-2 text-text-muted">&rarr;</span>
                    <span className="font-semibold text-text-primary">{t.destination}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      t.status === 'Completed' ? 'bg-success/10 text-success border-success/20' :
                      t.status === 'In Transit' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {t.status !== 'Completed' ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'In Transit')}
                          className="px-2 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          Ship
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'Completed')}
                          className="px-2 py-1 bg-success/10 hover:bg-success text-success hover:text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          Complete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted flex items-center justify-center gap-1">
                        <FaCheck className="text-success" /> Done
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
