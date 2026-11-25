import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  FaChartBar, FaGlobe, FaTruckLoading, FaHandsHelping, FaWarehouse, 
  FaCalendarAlt, FaBolt, FaFilter, FaMoneyBillWave, FaClock, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('orders');

  // Filters state
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterTech, setFilterTech] = useState('All');

  return (
    <div className="space-y-6">
      {/* Header and Global Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Regional Operations Analytics</h1>
          <p className="text-text-secondary">Analyze pipeline health, regional KW capacity allocations, logistical efficiency, and vendor KPIs</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center bg-card border border-border p-2 rounded-xl text-xs">
          <div className="flex items-center gap-1">
            <FaFilter className="text-primary" />
            <span className="font-bold text-text-secondary uppercase text-[10px]">Filters:</span>
          </div>
          <select 
            value={filterBrand} 
            onChange={(e) => setFilterBrand(e.target.value)}
            className="p-1 rounded bg-bg text-text-primary border border-border focus:outline-none"
          >
            <option>All Brands</option>
            <option>Tata Solar</option>
            <option>Waaree</option>
            <option>Adani Solar</option>
          </select>
          <select 
            value={filterRegion} 
            onChange={(e) => setFilterRegion(e.target.value)}
            className="p-1 rounded bg-bg text-text-primary border border-border focus:outline-none"
          >
            <option>All Regions</option>
            <option>Rajasthan</option>
            <option>Gujarat</option>
            <option>Maharashtra</option>
          </select>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-border text-sm font-bold">
        {[
          { id: 'orders', name: 'Order Analytics', icon: <FaChartBar /> },
          { id: 'regional', name: 'Regional Analytics', icon: <FaGlobe /> },
          { id: 'deliveries', name: 'Delivery Analytics', icon: <FaTruckLoading /> },
          { id: 'partners', name: 'Partner Metrics', icon: <FaHandsHelping /> },
          { id: 'suppliers', name: 'Supplier KPIs', icon: <FaWarehouse /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === t.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.icon}
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Order Analytics */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Pending Orders</span>
              <h3 className="text-2xl font-bold text-warning mt-1">48</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Processing</span>
              <h3 className="text-2xl font-bold text-primary mt-1">112</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Delivered</span>
              <h3 className="text-2xl font-bold text-success mt-1">982</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Cancelled</span>
              <h3 className="text-2xl font-bold text-danger mt-1">12</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Age Widget */}
            <div className="card p-6 space-y-4">
              <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Orders by Days in Pipeline</h4>
              <div className="space-y-3">
                {[
                  { label: '0–3 days', value: 85, pct: 60, color: 'bg-success' },
                  { label: '4–7 days', value: 34, pct: 25, color: 'bg-primary' },
                  { label: '8–15 days', value: 18, pct: 10, color: 'bg-warning' },
                  { label: '15+ days (Critical)', value: 8, pct: 5, color: 'bg-danger' },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-text-secondary">
                      <span>{item.label}</span>
                      <span>{item.value} orders ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand/Product Wise Distribution */}
            <div className="card p-6 space-y-4">
              <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Solar Brand Demand Allocation</h4>
              <div className="space-y-3">
                {[
                  { label: 'Tata Solar (Mono PERC)', value: '450 kW', pct: 45 },
                  { label: 'Waaree (Bifacial)', value: '300 kW', pct: 30 },
                  { label: 'Adani Solar (TOPCon)', value: '180 kW', pct: 18 },
                  { label: 'Others', value: '70 kW', pct: 7 },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-text-secondary">
                      <span>{item.label}</span>
                      <span>{item.value} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Regional Analytics */}
      {activeTab === 'regional' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">KWs Capacity Installed by State</h4>
            <div className="space-y-3">
              {[
                { label: 'Rajasthan', value: '1,240 kW', pct: 50 },
                { label: 'Gujarat', value: '780 kW', pct: 32 },
                { label: 'Maharashtra', value: '420 kW', pct: 18 },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-text-secondary">
                    <span>{item.label}</span>
                    <span>{item.value} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Technology Demand Distribution</h4>
            <div className="space-y-3">
              {[
                { label: 'TOPCon (Ultra High Efficiency)', pct: 40 },
                { label: 'Mono PERC', pct: 35 },
                { label: 'Bifacial Double Sided', pct: 20 },
                { label: 'N-Type Modules', pct: 5 },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-text-secondary">
                    <span>{item.label}</span>
                    <span>{item.pct}%</span>
                  </div>
                  <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Delivery Analytics */}
      {activeTab === 'deliveries' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Avg Delivery Duration</span>
              <h3 className="text-xl font-bold text-text-primary mt-1">4.2 Hours</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">On-Time Delivery %</span>
              <h3 className="text-xl font-bold text-success mt-1">94.8%</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Vehicle Utilization</span>
              <h3 className="text-xl font-bold text-primary mt-1">82.3%</h3>
            </div>
            <div className="card p-4 text-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Delivery Cost / Order</span>
              <h3 className="text-xl font-bold text-text-primary mt-1">₹1,450</h3>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Logistics Allocation Modes</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-bg border border-border rounded-xl">
                <span className="text-xs text-text-secondary">Self Fleet</span>
                <p className="text-base font-bold text-primary mt-1">55%</p>
              </div>
              <div className="p-3 bg-bg border border-border rounded-xl">
                <span className="text-xs text-text-secondary">Third-Party 3PL</span>
                <p className="text-base font-bold text-primary mt-1">25%</p>
              </div>
              <div className="p-3 bg-bg border border-border rounded-xl">
                <span className="text-xs text-text-secondary">Customer Self Pickup</span>
                <p className="text-base font-bold text-primary mt-1">12%</p>
              </div>
              <div className="p-3 bg-bg border border-border rounded-xl">
                <span className="text-xs text-text-secondary">Partner Delivery</span>
                <p className="text-base font-bold text-primary mt-1">8%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Partner Metrics */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Partner Tier Orders Volume</h4>
              <div className="space-y-3">
                {[
                  { label: 'Gold Tier Partners (Avg order size: ₹8 Lakhs)', pct: 55 },
                  { label: 'Platinum Partners (Avg order size: ₹15 Lakhs)', pct: 30 },
                  { label: 'Silver Partners (Avg order size: ₹3 Lakhs)', pct: 15 },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-text-secondary">
                      <span>{item.label}</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Partner Types Distribution</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-xs text-text-secondary">Franchise Partners</span>
                  <p className="text-base font-bold text-text-primary mt-1">42 Orders</p>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-xs text-text-secondary">Retail Dealers</span>
                  <p className="text-base font-bold text-text-primary mt-1">18 Orders</p>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-xs text-text-secondary">Local EPC Subcontractors</span>
                  <p className="text-base font-bold text-text-primary mt-1">29 Orders</p>
                </div>
                <div className="p-3 bg-bg border border-border rounded-xl">
                  <span className="text-xs text-text-secondary">Verified Installers</span>
                  <p className="text-base font-bold text-text-primary mt-1">15 Orders</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Supplier KPIs */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 space-y-3">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FaClock className="text-primary" /> Manufacturers Supply Days
              </h4>
              <div className="text-2xl font-bold text-text-primary">6.4 Days Avg</div>
              <p className="text-[10px] text-text-muted font-medium">From Invoice creation to GRN verification in warehouse.</p>
            </div>
            <div className="card p-5 space-y-3">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FaExclamationCircle className="text-danger" /> Damage Inward Rate
              </h4>
              <div className="text-2xl font-bold text-danger">0.82% Damage</div>
              <p className="text-[10px] text-text-muted font-medium">Percentage of panels received with micro-cracks or frame bends.</p>
            </div>
            <div className="card p-5 space-y-3">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FaBolt className="text-success" /> Supplier Fulfillment Speed
              </h4>
              <div className="text-2xl font-bold text-success">98.4% Speed</div>
              <p className="text-[10px] text-text-muted font-medium">On-time ETA fulfillment rate across raw glass and cell suppliers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
