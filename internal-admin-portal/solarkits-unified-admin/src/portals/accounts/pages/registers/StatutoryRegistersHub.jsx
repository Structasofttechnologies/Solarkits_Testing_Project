import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FaBook,
  FaFileInvoiceDollar,
  FaBoxes,
  FaHandshake,
  FaSearch,
  FaDownload,
  FaSyncAlt,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaExchangeAlt,
  FaReceipt,
  FaMoneyBillWave,
  FaWarehouse,
  FaExternalLinkAlt
} from 'react-icons/fa';
import Loader from '@/components/Loader';
import { authHeaderObj } from '@/app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

const REGISTER_CATEGORIES = [
  {
    key: 'sales',
    label: 'Sales & Customer Registers',
    icon: FaFileInvoiceDollar,
    color: 'emerald',
    subRegisters: [
      { key: 'invoices', label: '1. Sales Invoice Register (GST Bills)' },
      { key: 'quotes', label: '2. Quotation Register' },
      { key: 'proforma', label: '3. Proforma Invoice (PI) Register' },
      { key: 'orders', label: '4. Sales Order Register' },
      { key: 'delivery_notes', label: '5. Delivery Note / Challan Register' },
      { key: 'credit_notes', label: '6. Credit Note Register' },
      { key: 'outstanding', label: '7. Customer Outstanding Register (AR)' },
      { key: 'advances', label: '8. Customer Advance Register' },
    ]
  },
  {
    key: 'purchase',
    label: 'Purchase & Supplier Registers',
    icon: FaHandshake,
    color: 'amber',
    subRegisters: [
      { key: 'purchase_orders', label: '9. Purchase Order (PO) Register' },
      { key: 'purchase_invoices', label: '10. Purchase Invoice Register (Inwards)' },
      { key: 'debit_notes', label: '11. Debit Note Register' },
      { key: 'outstanding', label: '12. Supplier Outstanding Register (AP)' },
      { key: 'advances', label: '13. Supplier Advance Register' },
    ]
  },
  {
    key: 'accounts',
    label: 'Accounts & Banking Registers',
    icon: FaReceipt,
    color: 'blue',
    subRegisters: [
      { key: 'receipts', label: '14. Receipt Register (Inflows)' },
      { key: 'payments', label: '15. Payment Register (Outflows)' },
      { key: 'expenses', label: '16. Expense Register (Vouchers)' },
      { key: 'journals', label: '17. Journal Register (Adjustment JVs)' },
      { key: 'contra', label: '18. Contra Register (Bank/Cash Transfers)' },
    ]
  },
  {
    key: 'stock',
    label: 'Stock & Warehouse Registers',
    icon: FaWarehouse,
    color: 'purple',
    subRegisters: [
      { key: 'stock_ledger', label: '19. Stock & Warehouse Register (Valuation)' }
    ]
  }
];

export default function StatutoryRegistersHub() {
  const [activeCategory, setActiveCategory] = useState('sales');
  const [activeSubRegister, setActiveSubRegister] = useState('invoices');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);
  const [dataPayload, setDataPayload] = useState({ rows: [], totals: {}, total_records: 0 });

  // When changing category, auto-select its first sub-register
  const handleCategoryChange = (catKey) => {
    setActiveCategory(catKey);
    const cat = REGISTER_CATEGORIES.find(c => c.key === catKey);
    if (cat && cat.subRegisters.length > 0) {
      setActiveSubRegister(cat.subRegisters[0].key);
    }
  };

  useEffect(() => {
    fetchRegisterData();
  }, [activeCategory, activeSubRegister, dateRange]);

  const fetchRegisterData = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/registers/data?category=${activeCategory}&type=${activeSubRegister}&date_range=${dateRange}&search=${encodeURIComponent(search)}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === 'success' && res.data.data) {
        setDataPayload(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load register data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegisterData();
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (!dataPayload.rows || dataPayload.rows.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(dataPayload.rows[0]);
    const csvRows = [
      headers.join(','),
      ...dataPayload.rows.map(row =>
        headers.map(field => JSON.stringify(row[field] ?? '')).join(',')
      )
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeCategory}_${activeSubRegister}_register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentCategoryObj = REGISTER_CATEGORIES.find(c => c.key === activeCategory) || REGISTER_CATEGORIES[0];
  const currentSubObj = currentCategoryObj.subRegisters.find(s => s.key === activeSubRegister) || currentCategoryObj.subRegisters[0];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
              <FaBook size={20} />
            </span>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">
                Statutory & Operational Registers Hub
              </h1>
              <p className="text-xs text-slate-400">
                19 Centralized Sales, Purchase, Banking, and Warehouse stock ledgers for compliance and audit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <FaDownload size={12} /> Export CSV / Excel
            </button>
            <button
              onClick={fetchRegisterData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Refresh"
            >
              <FaSyncAlt size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 CATEGORY TABS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {REGISTER_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon size={15} />
              </span>
              <div>
                <span className={`text-xs font-bold block leading-tight ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {cat.label.split(' ')[0]} Registers
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {cat.subRegisters.length} Sub-Registers
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── SUB-REGISTER SELECTOR BAR ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
          Registers:
        </span>
        {currentCategoryObj.subRegisters.map(sub => {
          const isSelected = activeSubRegister === sub.key;
          return (
            <button
              key={sub.key}
              onClick={() => setActiveSubRegister(sub.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* ── FILTER BAR & METRICS STRIP ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder={`Search ${currentSubObj?.label || 'records'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-orange-500 font-medium"
            />
          </form>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <FaCalendarAlt size={11} /> Period:
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Records</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month (Nov 2026)</option>
              <option value="this_fy">Current FY (2026-27)</option>
            </select>
          </div>
        </div>

        {/* Totals Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Total Entries</span>
            <span className="font-bold text-slate-900 text-sm font-mono">{dataPayload.total_records || 0}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Taxable Base</span>
            <span className="font-bold text-slate-900 text-sm font-mono">
              ₹{(dataPayload.totals?.taxable || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Total Tax (GST/ITC)</span>
            <span className="font-bold text-blue-600 text-sm font-mono">
              ₹{(dataPayload.totals?.tax || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Total Gross Value</span>
            <span className="font-bold text-emerald-600 text-sm font-mono">
              ₹{(dataPayload.totals?.gross || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* ── TABULAR REGISTER DATA ────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 flex justify-center items-center"><Loader text="Streaming register ledger..." /></div>
        ) : !dataPayload.rows || dataPayload.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No records found for this register and period filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  {Object.keys(dataPayload.rows[0]).map(col => (
                    <th key={col} className="p-2.5 font-bold whitespace-nowrap">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataPayload.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-all font-medium text-slate-700">
                    {Object.keys(row).map(key => {
                      const val = row[key];
                      const isMoney = typeof val === 'number' && (key.includes('amt') || key.includes('value') || key.includes('rate') || key.includes('due') || key.includes('billed') || key.includes('paid'));
                      const isStatus = key.includes('status') || key.includes('stage');

                      return (
                        <td key={key} className="p-2.5 whitespace-nowrap">
                          {isStatus ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                              {val}
                            </span>
                          ) : isMoney ? (
                            <span className="font-mono font-bold text-slate-900">
                              ₹{Number(val).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            String(val ?? '-')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
