import React, { useState } from 'react';
import {
  FaBolt,
  FaPlus,
  FaWhatsapp,
  FaEnvelope,
  FaClock,
  FaCheckCircle,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTrash,
  FaExclamationCircle,
  FaShoppingCart,
  FaUserCheck,
  FaShieldAlt
} from 'react-icons/fa';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([
    {
      _id: 'auto-1',
      title: 'Abandoned Kit Cart Recovery (WhatsApp)',
      description: 'Triggered when an EPC clicks a campaign tracking link, adds a Solar Kit to cart, but exits without confirming payment or PO order.',
      triggerEvent: 'Cart Abandoned for 24 Hours',
      channel: 'WhatsApp Business API',
      action: 'Send WhatsApp reminder with instant ₹2,500 voucher & 1-click checkout link',
      delay: '24 Hours',
      isActive: true,
      stats: { triggered: 840, converted: 198, conversionRate: '23.5%', recoveredRevenue: '₹28.4L' }
    },
    {
      _id: 'auto-2',
      title: 'Unopened Promotional Email Multi-Channel Fallback',
      description: 'If a high-priority promotional email campaign remains unopened after 72 hours, fallback to WhatsApp template with PDF brochure.',
      triggerEvent: 'Email Unopened after 72h',
      channel: 'WhatsApp Fallback',
      action: 'Send approved Meta Template with 3kW/5kW specification brochure attachment',
      delay: '72 Hours',
      isActive: true,
      stats: { triggered: 2450, converted: 412, conversionRate: '16.8%', recoveredRevenue: '₹14.4L' }
    },
    {
      _id: 'auto-3',
      title: 'Instant Website Form Auto-Responder & BDE Lead Routing',
      description: 'Instant lead capture on website landing page forms (Become an EPC, Franchisee Enquiry, Custom Quote).',
      triggerEvent: 'Form Submission Received',
      channel: 'Email + WhatsApp',
      action: 'Dispatch instant WhatsApp thank-you brochure + push lead to CRM & notify Cluster BDE',
      delay: 'Instant (0 mins)',
      isActive: true,
      stats: { triggered: 310, converted: 145, conversionRate: '46.8%', recoveredRevenue: '₹34.5L' }
    },
    {
      _id: 'auto-4',
      title: 'Sales Team Lead Contact SLA Escalation',
      description: 'Monitors lead contact time. If a fresh website EPC lead is not contacted within the configured SLA window, auto-escalates to Cluster Operations Manager.',
      triggerEvent: 'Lead Uncontacted > SLA Limit',
      channel: 'Internal SMS / Alert',
      action: 'Send high-priority escalation ping to Cluster Manager & Admin panel dashboard',
      delay: '4 Hours',
      isActive: true,
      stats: { triggered: 18, converted: 14, conversionRate: '77.7%', recoveredRevenue: 'N/A' }
    },
    {
      _id: 'auto-5',
      title: 'VIP EPC Partner 45-Day Inactivity Re-engagement',
      description: 'Monitors repeat orders. If an established EPC buyer has not purchased a solar kit for 45 days, dispatches re-engagement catalog.',
      triggerEvent: 'No Order in 45 Days',
      channel: 'WhatsApp API',
      action: 'Send tailored wholesale catalog with latest tier discounts + alert Key Account Manager',
      delay: '45 Days',
      isActive: false,
      stats: { triggered: 142, converted: 45, conversionRate: '31.7%', recoveredRevenue: '₹18.2L' }
    }
  ]);

  const toggleStatus = (id) => {
    setAutomations(prev =>
      prev.map(item => (item._id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaBolt className="w-3.5 h-3.5" />
            <span>Smart Automation Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Automation & Follow-up Rules</h1>
          <p className="text-sm text-slate-500">Configure behavior-driven drip marketing, abandoned cart recovery, SLA escalations, and automated WhatsApp follow-ups.</p>
        </div>

        <button
          onClick={() => alert('New Automation Rule Builder: You can configure custom triggers, delays, and WhatsApp/Email responses.')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
        >
          <FaPlus />
          <span>New Automation Rule</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Rules</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {automations.filter(a => a.isActive).length} of {automations.length}
          </div>
          <span className="text-[11px] text-slate-500">Auto-evaluating live events</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Automated Dispatches</div>
          <div className="text-2xl font-black">3,760</div>
          <span className="text-[11px] text-slate-500">Messages sent via rules</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Attributed Revenue</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹61.0L</div>
          <span className="text-[11px] text-emerald-600 font-semibold">From recovered pipelines</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Conversion Rate</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">24.2%</div>
          <span className="text-[11px] text-slate-500">Omnichannel follow-ups</span>
        </div>
      </div>

      {/* Automation Rules List */}
      <div className="space-y-4">
        {automations.map((item) => (
          <div
            key={item._id}
            className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all ${
              item.isActive
                ? 'border-slate-200 dark:border-slate-700/60 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                  }`}>
                    {item.isActive ? 'Active & Monitoring' : 'Paused'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1">
                    <FaClock className="w-2.5 h-2.5" /> Delay: {item.delay}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20">
                    {item.channel}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div>
                    <span className="text-slate-400 font-medium">Trigger Condition: </span>
                    <strong className="text-slate-700 dark:text-slate-200 font-semibold">{item.triggerEvent}</strong>
                  </div>
                  <div className="hidden sm:block text-slate-300">|</div>
                  <div>
                    <span className="text-slate-400 font-medium">Automated Action: </span>
                    <strong className="text-slate-700 dark:text-slate-200 font-semibold">{item.action}</strong>
                  </div>
                </div>
              </div>

              {/* Performance Metrics & Toggle */}
              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Triggered</div>
                    <div className="text-sm font-bold">{item.stats.triggered}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Converted</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.stats.converted}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Rate</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.stats.conversionRate}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStatus(item._id)}
                    className="cursor-pointer text-2xl transition-transform active:scale-95"
                    title={item.isActive ? 'Deactivate rule' : 'Activate rule'}
                  >
                    {item.isActive ? (
                      <FaToggleOn className="text-emerald-500" />
                    ) : (
                      <FaToggleOff className="text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => alert(`Editing configuration for ${item.title}`)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 text-xs"
                    title="Edit Rule"
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
