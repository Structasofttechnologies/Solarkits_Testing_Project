import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FiZap,
  FiDollarSign,
  FiUsers,
  FiMapPin,
  FiPackage,
  FiArrowUpRight,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPlus,
  FiCreditCard,
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ResellerDashboardHome() {
  const { reseller } = useOutletContext();
  const [wallet, setWallet] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [epcs, setEpcs] = useState([]);
  const token = localStorage.getItem("reseller_token");

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch Wallet
    axios.get(`${API_BASE}/india/v1/reseller/wallet/me`, { headers })
      .then((res) => { if (res.data?.status === "success") setWallet(res.data.data); })
      .catch(() => {});

    // Fetch Territories
    axios.get(`${API_BASE}/india/v1/reseller/territories`, { headers })
      .then((res) => { if (res.data?.status === "success") setTerritories(res.data.data); })
      .catch(() => {});

    // Fetch EPCs
    axios.get(`${API_BASE}/india/v1/reseller/epc-buyers/list`, { headers })
      .then((res) => { if (res.data?.status === "success") setEpcs(res.data.data); })
      .catch(() => {});
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary-hover p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
            Partner Operating Mode: {reseller?.commercial_mode} Mode
          </div>
          <h1 className="text-2xl font-bold">Welcome back, {reseller?.business_name || "Partner"}!</h1>
          <p className="text-sm opacity-90">
            Manage your solar business pipeline, onboard EPC buyers, and track wallet commission payouts.
          </p>
        </div>
      </div>

      {/* KYC Alert Banner if Pending */}
      {reseller?.kyc_status !== "verified" && (
        <div className="p-4 rounded-2xl bg-warning-soft border border-warning/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-warning flex-shrink-0" size={24} />
            <div>
              <div className="font-bold text-sm text-text-primary">KYC Verification Required</div>
              <div className="text-xs text-text-muted">Please submit your GST and PAN verification documents to unlock sub-account onboarding.</div>
            </div>
          </div>
          <Link to="/reseller-portal/kyc" className="px-4 py-2 bg-warning text-white rounded-xl text-xs font-semibold hover:bg-warning-hover transition-colors flex-shrink-0">
            Complete KYC
          </Link>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-soft text-success flex items-center justify-center">
            <FiDollarSign size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Wallet Balance</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">₹{(wallet?.available_balance || 0).toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-info-soft text-info flex items-center justify-center">
            <FiArrowUpRight size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Earned</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">₹{(wallet?.total_earned || 0).toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
            <FiUsers size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">EPC Buyers</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">{epcs.length}</div>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning-soft text-warning flex items-center justify-center">
            <FiMapPin size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Territories</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">{territories.length} Active</div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions Card */}
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Business Quick Actions</h3>
          <div className="space-y-2.5">
            <Link
              to="/reseller-portal/epc-buyers"
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg hover:bg-surface-hover transition-colors text-sm font-semibold text-text-primary"
            >
              <span className="flex items-center gap-2.5"><FiPlus className="text-primary" /> Register New EPC Buyer</span>
              <span className="text-xs text-text-muted">Sub-Account</span>
            </Link>

            <Link
              to="/reseller-portal/wallet"
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg hover:bg-surface-hover transition-colors text-sm font-semibold text-text-primary"
            >
              <span className="flex items-center gap-2.5"><FiCreditCard className="text-success" /> Wallet & Payouts</span>
              <span className="text-xs text-text-muted">Wallet</span>
            </Link>

            <Link
              to="/reseller-portal/catalog"
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg hover:bg-surface-hover transition-colors text-sm font-semibold text-text-primary"
            >
              <span className="flex items-center gap-2.5"><FiPackage className="text-warning" /> Browse Authorized Catalog</span>
              <span className="text-xs text-text-muted">Products</span>
            </Link>
          </div>
        </div>

        {/* Assigned Territories Preview */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Active Geographic Scope</h3>
            <Link to="/reseller-portal/territories" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>

          {territories.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">No explicit territory restrictions assigned (Defaulting to registered GST state)</div>
          ) : (
            <div className="space-y-2">
              {territories.slice(0, 3).map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-border bg-bg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-text-primary">
                    <FiMapPin className="text-primary" />
                    <span className="capitalize">{t.scope_level} Level: {t.location_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold capitalize">
                    {t.precedence_source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
