import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiUsers,
  FiFileText,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiArrowRight,
  FiActivity,
  FiDollarSign,
  FiLayers,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function BoskitOverviewDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE}/boskit/v1/admin/stats`)
      .then((res) => {
        if (res.data?.success) setStats(res.data.data);
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading BOSKIT Overview...</div>;
  }

  const statCards = [
    {
      title: "Total Applications",
      value: stats?.total_applications || 0,
      icon: FiFileText,
      color: "text-amber-600",
      bg: "bg-surface border-border",
      link: "/admin-panel/solar-shop-bos-kits/india/distribution/applications",
    },
    {
      title: "Applications Under Review",
      value: stats?.pending_reviews || 0,
      icon: FiClock,
      color: "text-amber-600",
      bg: "bg-surface border-border",
      badge: "Action Required",
      link: "/admin-panel/solar-shop-bos-kits/india/distribution/applications?status=under_review",
    },
    {
      title: "Active Authorized Distributors",
      value: stats?.active_distributors || 0,
      icon: FiShield,
      color: "text-emerald-600",
      bg: "bg-surface border-border",
      link: "/admin-panel/solar-shop-bos-kits/india/distribution/distributors",
    },
    {
      title: "Active Dealer Network",
      value: stats?.active_dealers || 0,
      icon: FiUsers,
      color: "text-primary",
      bg: "bg-surface border-border",
      link: "/admin-panel/solar-shop-bos-kits/india/distribution/dealers",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiActivity className="animate-spin text-primary" /> Real-time Operations Overview
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            BOSKIT Distribution Management Console
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            Evaluate distributor onboarding dossiers, verify GST compliance, enforce territorial exclusivity, and govern sub-dealer procurement slabs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin-panel/solar-shop-bos-kits/india/distribution/applications"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all"
          >
            Review Applications ({stats?.pending_reviews || 0}) <FiArrowRight />
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link
              key={i}
              to={c.link}
              className={`p-6 rounded-2xl border ${c.bg} shadow-sm transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">{c.title}</span>
                <div className={`p-2.5 rounded-xl bg-surface-hover ${c.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-heading font-black text-3xl text-text-primary">{c.value}</span>
                {c.badge && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {c.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Applications Queue */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg text-text-primary">Recent Dealership Submissions</h3>
            <p className="text-xs text-text-secondary">Applications awaiting committee evaluation and territory assignment.</p>
          </div>
          <Link
            to="/admin-panel/solar-shop-bos-kits/india/distribution/applications"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All Applications <FiArrowRight />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">Distributor Entity</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Progress</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(stats?.recent_applications || []).map((app) => (
                <tr key={app.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="p-3.5 font-bold text-text-primary">
                    {app.business_name}
                  </td>
                  <td className="p-3.5 font-mono text-text-secondary">
                    {app.gst_number || 'Pending'}
                  </td>
                  <td className="p-3.5 text-text-secondary">
                    <div className="font-medium text-text-primary">{app.email}</div>
                    <div className="text-[11px] text-text-muted">{app.mobile}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-amber-600">Step {app.step_completed} / 17</span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : app.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Link
                      to={`/admin-panel/solar-shop-bos-kits/india/distribution/applications/${app.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-primary hover:text-white transition-all shadow-xs"
                    >
                      Inspect Dossier
                    </Link>
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

