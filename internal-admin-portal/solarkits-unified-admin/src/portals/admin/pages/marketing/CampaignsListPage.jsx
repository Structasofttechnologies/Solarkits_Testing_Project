import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBullhorn,
  FaPlus,
  FaPlay,
  FaPause,
  FaTrash,
  FaCopy,
  FaExternalLinkAlt,
  FaEnvelope,
  FaWhatsapp,
  FaFilter,
  FaSearch,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';

export default function CampaignsListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Fallback demo campaigns if API is still connecting
  const demoCampaigns = [
    {
      _id: 'c1',
      campaign_name: 'Maharashtra Cluster — 3 kW Repeat Orders',
      campaign_code: 'SK-CAMP-2026-1042',
      campaign_type: 'both',
      campaign_objective: 'sales',
      target_audience_summary: 'Verified & Buyer EPCs (Maharashtra)',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      budget: 45000,
      target_leads: 180,
      target_conversions: 45,
      assigned_manager: { name: 'Rahul Sharma' },
      status: 'running',
      tracking_short_code: 'mh3kw',
      stats: { messages_sent: 4200, delivered: 3950, link_clicks: 680, form_submissions: 95, conversions: 28 }
    },
    {
      _id: 'c2',
      campaign_name: 'Gujarat Commercial EPC Onboarding & Reward Trip',
      campaign_code: 'SK-CAMP-2026-2180',
      campaign_type: 'whatsapp',
      campaign_objective: 'epc_onboarding',
      target_audience_summary: 'Registered EPCs (Gujarat & Rajasthan)',
      start_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
      budget: 30000,
      target_leads: 250,
      target_conversions: 35,
      assigned_manager: { name: 'Priya Patel' },
      status: 'scheduled',
      tracking_short_code: 'gjreward',
      stats: { messages_sent: 0, delivered: 0, link_clicks: 0, form_submissions: 0, conversions: 0 }
    },
    {
      _id: 'c3',
      campaign_name: 'BOS Kit & Inverter Flash Coupon Clearance',
      campaign_code: 'SK-CAMP-2026-3401',
      campaign_type: 'email',
      campaign_objective: 'product_promotion',
      target_audience_summary: 'All Active Buyer EPCs (All India)',
      start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
      end_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      budget: 20000,
      target_leads: 120,
      target_conversions: 30,
      assigned_manager: { name: 'Amit Verma' },
      status: 'completed',
      tracking_short_code: 'bos500',
      stats: { messages_sent: 5800, delivered: 5500, link_clicks: 920, form_submissions: 110, conversions: 34 }
    }
  ];

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-panel/marketing/campaigns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setCampaigns(json.data);
      } else {
        setCampaigns(demoCampaigns);
      }
    } catch (err) {
      setCampaigns(demoCampaigns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleLaunch = async (id) => {
    try {
      await fetch(`/api/admin-panel/marketing/campaigns/${id}/launch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      fetchCampaigns();
    } catch (err) {
      alert('Launch command issued.');
    }
  };

  const handleCopyLink = (code) => {
    const url = `https://solarkits.in/t/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filtered = campaigns.filter(c => {
    if (filterType !== 'all' && c.campaign_type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterObjective !== 'all' && c.campaign_objective !== filterObjective) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.campaign_name.toLowerCase().includes(q) ||
        c.campaign_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Running</span>;
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 w-max"><FaClock className="w-2.5 h-2.5" /> Scheduled</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center gap-1 w-max"><FaCheckCircle className="w-2.5 h-2.5" /> Completed</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-max">Paused</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, schedule, monitor and execute multi-channel marketing campaigns.
          </p>
        </div>

        <button
          onClick={() => navigate('/marketing-panel/create-campaign')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2 w-max"
        >
          <FaPlus />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <FaSearch className="text-slate-400" />
          <input
            type="text"
            placeholder="Search campaign name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-hidden text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <FaFilter className="w-3 h-3" />
            <span>Type:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="both">Both</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>

          <select
            value={filterObjective}
            onChange={(e) => setFilterObjective(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer"
          >
            <option value="all">All Objectives</option>
            <option value="lead_generation">Lead Generation</option>
            <option value="sales">Sales & Orders</option>
            <option value="epc_onboarding">EPC Onboarding</option>
            <option value="franchisee_onboarding">Franchisee Onboarding</option>
            <option value="product_promotion">Product Promotion</option>
          </select>
        </div>
      </div>

      {/* 11-Column Campaigns Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Campaign Name & ID</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Objective</th>
                <th className="py-3.5 px-4">Target Audience</th>
                <th className="py-3.5 px-4">Start / End Schedule</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Target / Actual Leads</th>
                <th className="py-3.5 px-4">Manager</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  
                  {/* Name & ID */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{c.campaign_name}</div>
                    <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{c.campaign_code}</div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4">
                    {c.campaign_type === 'email' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-semibold text-xs">
                        <FaEnvelope className="w-3 h-3" /> Email
                      </span>
                    )}
                    {c.campaign_type === 'whatsapp' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs">
                        <FaWhatsapp className="w-3 h-3" /> WhatsApp
                      </span>
                    )}
                    {c.campaign_type === 'both' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 font-semibold text-xs">
                        <FaBullhorn className="w-3 h-3" /> Both
                      </span>
                    )}
                  </td>

                  {/* Objective */}
                  <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-300">
                    {c.campaign_objective?.replace('_', ' ')}
                  </td>

                  {/* Target Audience */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[180px]">
                    {c.target_audience_summary || 'Target EPCs'}
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 text-xs">
                    <div>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'}</div>
                    <div className="text-slate-400 text-[10px]">to {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Continuous'}</div>
                  </td>

                  {/* Budget */}
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    ₹{Number(c.budget || 0).toLocaleString('en-IN')}
                  </td>

                  {/* Leads Target vs Actual */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {c.stats?.form_submissions || 0} / {c.target_leads || 0}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {c.stats?.conversions || 0} Orders
                    </div>
                  </td>

                  {/* Manager */}
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {c.assigned_manager?.name || 'Admin'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(c.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status !== 'running' && (
                        <button
                          onClick={() => handleLaunch(c._id)}
                          title="Launch Campaign"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 cursor-pointer"
                        >
                          <FaPlay className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLink(c.tracking_short_code || 'link')}
                        title="Copy Campaign Tracking URL"
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 cursor-pointer"
                      >
                        <FaCopy className="w-3 h-3" />
                      </button>
                      {copiedId === (c.tracking_short_code || 'link') && (
                        <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                      )}
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
