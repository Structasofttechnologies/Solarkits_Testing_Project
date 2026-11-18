import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaBuilding,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaLock,
  FaShieldAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBarcode,
  FaExclamationTriangle
} from 'react-icons/fa';
import Loader from '@/components/Loader';
import { authHeaderObj } from '@/app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

export default function CompanyProfileAndFy() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/invoice-do-settings?scope_type=global`, {
        headers: authHeaderObj()
      });
      if (res.data?.status === 'success' && res.data.data) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <Loader text="Loading Company Statutory Profile & FY..." />
      </div>
    );
  }

  const p = profile || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
              <FaBuilding size={20} />
            </span>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">
                Company Profile & Financial Year Governance
              </h1>
              <p className="text-xs text-slate-400">
                Statutory baseline, active GSTIN, corporate CIN, and financial year lockdown policies.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <FaCheckCircle size={12} /> Super Admin Verified
            </span>
          </div>
        </div>
      </div>

      {/* ── 2 COLUMN GRID: COMPANY PROFILE & FINANCIAL YEAR ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Company Legal Profile (2 spans) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FaShieldAlt className="text-orange-500" />
              Statutory & Corporate Credentials
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              Shared Enterprise Master
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Company Registered Name</span>
              <p className="font-bold text-slate-800">{p.company_name || 'SolarKits Energy Private Limited'}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Trade / Brand Name</span>
              <p className="font-bold text-slate-800">{p.trade_name || 'SolarKits India'}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">GSTIN Number</span>
              <p className="font-mono font-bold text-orange-600 bg-orange-50 inline-block px-2.5 py-1 rounded border border-orange-200">
                {p.gstin || '07AAAAA0000A1Z5'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Corporate CIN</span>
              <p className="font-mono font-bold text-slate-800 bg-slate-50 inline-block px-2.5 py-1 rounded border border-slate-200">
                {p.cin || 'U40106DL2026PTC123456'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Company PAN</span>
              <p className="font-mono font-bold text-slate-800">{p.pan || 'AAAAA0000A'}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">State & GST State Code</span>
              <p className="font-semibold text-slate-800">
                {p.state_name || 'Uttar Pradesh'} ({p.state_code || '09'})
              </p>
            </div>

            <div className="md:col-span-2">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Official Billing & Head Office Address</span>
              <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                <FaMapMarkerAlt className="text-slate-400 mt-1 shrink-0" />
                {p.billing_address || 'SolarKits Industrial Tech Hub, Sector 62, Noida, UP - 201301'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Billing Support Email</span>
              <p className="text-slate-700 font-semibold flex items-center gap-2">
                <FaEnvelope className="text-slate-400" />
                {p.support_email || 'billing@solarkits.com'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Support Hotline</span>
              <p className="text-slate-700 font-semibold flex items-center gap-2">
                <FaPhoneAlt className="text-slate-400" />
                {p.support_phone || '+91 98765 43210'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Year Controls & Lockdown (1 span) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FaCalendarAlt className="text-blue-600" />
              Company Financial Year
            </h2>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Active Financial Period</span>
              <div className="text-2xl font-black text-blue-900 font-mono">
                FY {p.current_fy || '2026-27'}
              </div>
              <p className="text-xs text-blue-700">
                1st April 2026 – 31st March 2027
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-semibold">Active Series Prefix</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {p.invoice_prefix || 'SK'}/
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-semibold">Books Lockdown Status</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <FaLock size={10} /> Open for FY 26-27
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-semibold">Invoice Generation Timing</span>
                <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-200 px-2 py-0.5 rounded">
                  {p.invoice_generation_trigger || 'warehouse_dispatch'}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <FaInfoCircle className="inline mr-1 text-amber-600" />
              Statutory company profile & FY numbering formats are governed by Super Admin. Account Managers use this validated master for all 19 registers and voucher entries.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
