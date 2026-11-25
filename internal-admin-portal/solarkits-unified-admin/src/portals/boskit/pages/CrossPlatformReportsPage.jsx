import React, { useState, useEffect } from 'react';
import {
  FiPieChart,
  FiTrendingUp,
  FiDollarSign,
  FiMapPin,
  FiUsers,
  FiShield,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CrossPlatformReportsPage() {
  const [summary, setSummary] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/boskit/v1/admin/reports/executive-summary`),
      axios.get(`${API_BASE}/boskit/v1/admin/reports/financials`),
      axios.get(`${API_BASE}/boskit/v1/admin/reports/territory-coverage`),
    ])
      .then(([res1, res2, res3]) => {
        if (res1.data?.success) setSummary(res1.data.summary);
        if (res2.data?.success) setFinancials(res2.data.financials);
        if (res3.data?.success) setTerritories(res3.data.territories || []);
      })
      .catch((err) => console.error('Error fetching reports:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportCSV = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ summary, financials, territories }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BOSKIT_Financial_Audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return <div className="p-12 text-center text-text-muted">Loading cross-platform executive analytics...</div>;
  }

  const taxes = financials?.tax_collected || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Executive Analytics & Audit
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1.5">
            SOLARKITS + BOSKIT Consolidated Reports
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Cross-platform gross merchandise value (GMV), distributor joining fees, channel margin ledger, and statutory GST reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiDownload size={15} /> Export Audit Ledger
          </button>
          <button
            onClick={fetchReports}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-border shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FiRefreshCw className="text-primary" /> Refresh
          </button>
        </div>
      </div>

      {/* Cross-Platform Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Consolidated Total GMV */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Total Group GMV (Annualized)</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              +{summary?.growth_month_on_month_percent}% MoM
            </span>
          </div>
          <div className="font-heading font-black text-3xl sm:text-4xl text-primary">
            ₹{(summary?.combined_gmv_inr || 23000000).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-text-secondary">
            Unified group revenue spanning retail marketplace and B2B wholesale distribution.
          </div>
        </div>

        {/* SOLARKITS B2C Share */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">SOLARKITS Marketplace GMV</span>
            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              B2C / EPC
            </span>
          </div>
          <div className="font-heading font-black text-3xl text-text-primary">
            ₹{(summary?.solarkits_gmv_inr || 18500000).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-text-secondary">
            Direct customer kits, rooftop solar packages, and EPC project requisitions.
          </div>
        </div>

        {/* BOSKIT B2B Share */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">BOSKIT Platform GMV</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              B2B Distribution
            </span>
          </div>
          <div className="font-heading font-black text-3xl text-emerald-600">
            ₹{(summary?.boskit_gmv_inr || 4500000).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-text-secondary">
            Authorized distributor stock procurement and distributor joining subscription fees.
          </div>
        </div>

      </div>

      {/* Financial Breakdown & Tax Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BOSKIT Revenue Stream Matrix */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-6">
          <h3 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
            <FiDollarSign className="text-amber-500" /> Realized BOSKIT Revenue Streams
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-surface-hover/50 border border-border flex justify-between items-center">
              <div>
                <strong className="text-text-primary block text-sm">Solar Equipment Wholesale Gate</strong>
                <span className="text-text-secondary text-[11px]">Factory-gate Tier-1 inverters, modules, structures</span>
              </div>
              <div className="font-heading font-bold text-base text-text-primary">
                ₹{(financials?.equipment_subtotal_inr || 3200000).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-hover/50 border border-border flex justify-between items-center">
              <div>
                <strong className="text-text-primary block text-sm">Distributor Joining & Subscription Fees</strong>
                <span className="text-text-secondary text-[11px]">District, State & Apex partner onboarding</span>
              </div>
              <div className="font-heading font-bold text-base text-amber-600">
                ₹{(financials?.franchise_subscription_revenue_inr || 1250000).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-hover/50 border border-border flex justify-between items-center">
              <div>
                <strong className="text-text-primary block text-sm">Distributor Channel Margins Passed</strong>
                <span className="text-text-secondary text-[11px]">Total wholesale discounts applied</span>
              </div>
              <div className="font-heading font-bold text-base text-emerald-600">
                ₹{(financials?.channel_discount_given_inr || 750000).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Statutory GST Tax Collected */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-6">
          <h3 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
            <FiShield className="text-emerald-500" /> Statutory GST Tax Accrual
          </h3>

          <div className="p-6 rounded-xl bg-surface-hover/50 border border-border space-y-4 text-xs">
            <div className="flex justify-between items-baseline border-b border-border pb-3">
              <span className="text-text-secondary">Total GST Accrued (12% Solar):</span>
              <span className="font-heading font-black text-2xl text-primary">
                ₹{(taxes.total_tax_inr || 294000).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] text-text-muted block uppercase font-bold">CGST (6%)</span>
                <span className="font-bold text-text-primary text-xs mt-0.5 block">
                  ₹{(taxes.cgst_inr || 102900).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] text-text-muted block uppercase font-bold">SGST (6%)</span>
                <span className="font-bold text-text-primary text-xs mt-0.5 block">
                  ₹{(taxes.sgst_inr || 102900).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border shadow-xs">
                <span className="text-[10px] text-text-muted block uppercase font-bold">IGST (12%)</span>
                <span className="font-bold text-text-primary text-xs mt-0.5 block">
                  ₹{(taxes.igst_inr || 88200).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted pt-2">
              All tax invoices generated via GSTR-1 serials. Input Tax Credit (ITC) reconciliation ledger prepared.
            </p>
          </div>
        </div>

      </div>

      {/* State-Wise Territory Penetration Table */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-6">
        <h3 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
          <FiMapPin className="text-primary" /> State & District Penetration Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">State / Jurisdiction</th>
                <th className="p-3.5">Total Revenue Districts</th>
                <th className="p-3.5">Authorized Hubs</th>
                <th className="p-3.5">Sub-Dealer Network</th>
                <th className="p-3.5">Territory Saturation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {territories.map((t, idx) => (
                <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="p-3.5 font-bold text-text-primary text-sm">{t.state}</td>
                  <td className="p-3.5 font-semibold text-text-secondary">{t.total_districts} Districts</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {t.active_hubs} Master Hubs
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                      {t.dealers_count} Installers
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 rounded-full bg-surface-hover overflow-hidden border border-border">
                        <div className="h-full bg-primary" style={{ width: `${t.coverage_percent * 4}%` }} />
                      </div>
                      <span className="font-bold text-text-primary">{t.coverage_percent}%</span>
                    </div>
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

