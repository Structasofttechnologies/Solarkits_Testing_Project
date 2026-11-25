import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBoxes, FaWarehouse, FaCheckCircle, FaExclamationTriangle, FaSearch, FaFilter, FaTruck } from "react-icons/fa";

import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dropdown from "../../components/Dropdown";

const initialOrders = [
  { id: 'ORD-9901', projectNo: 'PRJ-102', partner: 'Apex Solar Installers', items: '540W Mono Panels (100 pcs)', qty: 100, kws: 54.0, warehouse: 'Unassigned', status: 'Pending Assignment' },
  { id: 'ORD-9902', projectNo: 'PRJ-103', partner: 'Sunnovative Projects', items: 'Growatt Inverter 20kW (2 pcs)', qty: 2, kws: 40.0, warehouse: 'Jaipur Main Hub', status: 'Warehouse Assigned' },
  { id: 'ORD-9903', projectNo: 'PRJ-104', partner: 'Go Green Power Ltd', items: '550W Bifacial Panels (200 pcs)', qty: 200, kws: 110.0, warehouse: 'Unassigned', status: 'Pending Assignment' },
  { id: 'ORD-9904', projectNo: 'PRJ-105', partner: 'Solar Horizon India', items: 'Solis Inverter 50kW (1 pc)', qty: 1, kws: 50.0, warehouse: 'Mumbai Central', status: 'Warehouse Assigned' },
];

const warehouseStocks = {
  'Jaipur Main Hub': { panels: 850, inverters: 8 },
  'Mumbai Central': { panels: 410, inverters: 4 },
  'Ahmedabad GIDC Warehouse': { panels: 1200, inverters: 15 },
};

const filterOptions = [
  { value: 'All', text: 'All Allocation Hubs' },
  { value: 'Unassigned', text: 'Unassigned Orders' },
  { value: 'Jaipur Main Hub', text: 'Jaipur Main Hub' },
  { value: 'Mumbai Central', text: 'Mumbai Central' },
  { value: 'Ahmedabad GIDC Warehouse', text: 'Ahmedabad GIDC Warehouse' }
];

const assignOptions = [
  { value: 'Unassigned', text: 'Unassigned' },
  { value: 'Jaipur Main Hub', text: 'Jaipur Main Hub' },
  { value: 'Mumbai Central', text: 'Mumbai Central' },
  { value: 'Ahmedabad GIDC Warehouse', text: 'Ahmedabad GIDC Warehouse' }
];

export default function OrderFulfillment() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('All');
  const [alert, setAlert] = useState(null);

  const handleAssignWarehouse = (orderId, whName) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          warehouse: whName,
          status: whName === 'Unassigned' ? 'Pending Assignment' : 'Warehouse Assigned' 
        };
      }
      return o;
    }));
    setAlert(`Order ${orderId} successfully assigned to ${whName}!`);
    setTimeout(() => setAlert(null), 3000);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.partner.toLowerCase().includes(search.toLowerCase());
      const matchWarehouse = filterWarehouse === 'All' || o.warehouse === filterWarehouse;
      return matchSearch && matchWarehouse;
    });
  }, [orders, search, filterWarehouse]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Order Fulfillment Allocation</h1>
        <p className="text-text-secondary">Determine which order gets fulfilled from which regional warehouse and check live availability</p>
      </div>

      {alert && (
        <div className="p-3.5 bg-success/10 border border-success/20 text-success rounded-xl font-semibold text-sm">
          {alert}
        </div>
      )}

      {/* Warehouse Stocks Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(warehouseStocks).map(([wh, stock]) => (
          <div key={wh} className="card p-4 border border-border bg-linear-to-r from-primary/5 to-transparent">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <FaWarehouse className="text-primary" />
              {wh}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-bg rounded-lg border border-border">
                <span className="text-text-secondary">Solar Panels</span>
                <p className="font-bold text-text-primary mt-0.5">{stock.panels} pcs</p>
              </div>
              <div className="p-2 bg-bg rounded-lg border border-border">
                <span className="text-text-secondary">Inverters</span>
                <p className="font-bold text-text-primary mt-0.5">{stock.inverters} pcs</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Filter & Action List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm">
            <CustomInput
              placeholder="Search Order No, Partner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<FaSearch className="text-text-muted text-sm mt-0.5" />}
              inputClassName="py-2 text-xs pl-10"
            />
          </div>

          <Dropdown
            value={filterWarehouse}
            onChange={(val) => setFilterWarehouse(val)}
            options={filterOptions}
            className="w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                <th className="p-4">Order Ref</th>
                <th className="p-4">Customer Partner</th>
                <th className="p-4">Materials Required</th>
                <th className="p-4">Total KWs</th>
                <th className="p-4">Assigned Warehouse</th>
                <th className="p-4">Fulfillment Status</th>
                <th className="p-4 text-center w-64">Fulfill Warehouse Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-primary/5 transition-all">
                  <td className="p-4 font-bold text-primary">
                    {o.id}
                    <div className="text-xs font-semibold text-text-secondary">{o.projectNo}</div>
                  </td>
                  <td className="p-4 font-semibold text-text-primary">{o.partner}</td>
                  <td className="p-4 text-text-secondary font-medium">{o.items}</td>
                  <td className="p-4 font-bold text-text-primary">{o.kws} KW</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      o.warehouse === 'Unassigned' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                    }`}>
                      {o.warehouse}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      o.status === 'Warehouse Assigned' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 flex justify-center">
                    <Dropdown
                      value={o.warehouse}
                      onChange={(val) => handleAssignWarehouse(o.id, val)}
                      options={assignOptions}
                      className="w-52"
                    />
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
