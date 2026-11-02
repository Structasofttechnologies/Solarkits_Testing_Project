/**
 * EpcProfileDrawer.jsx
 * Interactive Slide-Over Drawer for EPC Profile & Behavior Management
 * Enables Admin & BDE to view live telemetry and modify EPC behavioral parameters.
 */

import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiUser,
  FiCheckCircle,
  FiAlertTriangle,
  FiSave,
  FiRefreshCw,
  FiPhone,
  FiMail,
  FiMapPin,
  FiShoppingCart,
  FiRepeat,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiEye,
  FiPercent,
  FiTag,
  FiShield,
} from 'react-icons/fi';
import { epcAnalyticsApi } from '../../../api/epcAnalyticsApi';

export default function EpcProfileDrawer({
  isOpen,
  onClose,
  epcId,
  bdeList = [],
  onProfileUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [profileData, setProfileData] = useState(null);

  // Editable Form State
  const [form, setForm] = useState({
    behavior_status: 'active',
    customer_tier: 'Standard EPC',
    assigned_bde_id: '',
    recovery_discount_pct: 0,
    recovery_followup_status: 'none',
    credit_limit_inr: 0,
    behavior_notes: '',
  });

  // Fetch Full Profile Telemetry on open
  useEffect(() => {
    if (!isOpen || !epcId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    epcAnalyticsApi
      .getEpcProfileDetail(epcId)
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setProfileData(res);
          const p = res.profile || {};
          setForm({
            behavior_status: p.behaviorStatus || p.behavior_status || 'active',
            customer_tier: p.customerTier || p.customer_tier || 'Standard EPC',
            assigned_bde_id: p.assignedBde?.id || '',
            recovery_discount_pct: p.recoveryDiscountPct || p.recovery_discount_pct || 0,
            recovery_followup_status: p.recoveryFollowupStatus || p.recovery_followup_status || 'none',
            credit_limit_inr: p.creditLimitInr || p.credit_limit_inr || 0,
            behavior_notes: p.behaviorNotes || p.behavior_notes || '',
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError('Failed to load EPC telemetry detail');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, epcId]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await epcAnalyticsApi.updateEpcBehavior(epcId, form);
      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(epcId, form);
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update EPC behavior');
    } finally {
      setSaving(false);
    }
  };

  const p = profileData?.profile || {};
  const t = profileData?.telemetry || {};
  const recentOrders = profileData?.recentOrders || [];
  const abandonmentHistory = profileData?.abandonmentHistory || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              <FiUser size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-text">{p.name || 'EPC Account Profile'}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${form.behavior_status === 'loyal_repeat'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : form.behavior_status === 'at_risk'
                        ? 'bg-rose-500/10 text-rose-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}
                >
                  {form.behavior_status?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {p.contactPerson} • {p.district}, {p.state} • GSTIN: {p.gstin || 'Unregistered'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
              <FiRefreshCw className="animate-spin text-primary" size={24} />
              <span>Loading complete EPC telemetry...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Success / Error Banners */}
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                  <FiCheckCircle size={15} />
                  <span>EPC behavior settings updated successfully in real-time!</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <FiAlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Real-Time Behavior Telemetry Strip */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  Store Engagement & Purchase Telemetry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                    <span className="text-[10px] text-text-muted block">Store Visits</span>
                    <span className="text-base font-black text-text">{t.storeVisits ?? 0}</span>
                  </div>
                  <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                    <span className="text-[10px] text-text-muted block">Datasheet Downloads</span>
                    <span className="text-base font-black text-blue-600">{t.datasheetDownloads ?? 0}</span>
                  </div>
                  <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                    <span className="text-[10px] text-text-muted block">Cart Abandonment Ratio</span>
                    <span className="text-base font-black text-rose-600">{t.cartAbandonmentRatio || '0.0%'}</span>
                  </div>
                  <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                    <span className="text-[10px] text-text-muted block">Repeat Purchases</span>
                    <span className="text-base font-black text-emerald-600">{t.repeatOrdersCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Abandoned Carts History */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  Cart Abandonment Log
                </span>
                <div className="space-y-2">
                  {abandonmentHistory.length === 0 ? (
                    <div className="text-text-muted p-3 bg-surface-subtle/20 rounded-xl text-center">
                      No active abandoned cart items recorded.
                    </div>
                  ) : (
                    abandonmentHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-surface-subtle/30 rounded-xl border border-border p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-text">{item.kit}</div>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {item.reason} • {item.abandonedDate}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-rose-600 text-xs block">{item.estimatedValue}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-bold">
                            {item.recoveryOfferApplied}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 3: EPC Behavior Management Form (Editable by Admin & BDE) */}
              <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-primary/20 p-4 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-primary" size={16} />
                    <span className="font-black text-text text-xs uppercase tracking-wider">
                      EPC Behavior & Commercial Settings
                    </span>
                  </div>
                  <span className="text-[10px] text-primary font-bold">Admin & BDE Control</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Behavior Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Behavior Status
                    </label>
                    <select
                      value={form.behavior_status}
                      onChange={(e) => setForm({ ...form, behavior_status: e.target.value })}
                      className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="active">Active / Healthy</option>
                      <option value="at_risk">High Cart Abandonment Risk</option>
                      <option value="loyal_repeat">Loyal Repeat Buyer</option>
                      <option value="dormant">Dormant / Needs Re-engagement</option>
                      <option value="suspended">Suspended / Inactive</option>
                    </select>
                  </div>

                  {/* Customer Tier */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Customer Tier
                    </label>
                    <select
                      value={form.customer_tier}
                      onChange={(e) => setForm({ ...form, customer_tier: e.target.value })}
                      className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="Standard EPC">Standard EPC</option>
                      <option value="Silver Partner">Silver Partner</option>
                      <option value="Gold Partner">Gold Partner</option>
                      <option value="Platinum Partner">Platinum Partner (VIP)</option>
                    </select>
                  </div>

                  {/* Assigned BDE */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Assigned BDE Manager
                    </label>
                    <select
                      value={form.assigned_bde_id}
                      onChange={(e) => setForm({ ...form, assigned_bde_id: e.target.value })}
                      className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="">Central BDE Pool</option>
                      {bdeList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.employeeCode || 'BDE'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Recovery Discount % */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Cart Recovery Incentive Discount (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={form.recovery_discount_pct}
                        onChange={(e) => setForm({ ...form, recovery_discount_pct: Number(e.target.value) })}
                        className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 pr-7 focus:outline-none focus:border-primary"
                        placeholder="e.g. 5"
                      />
                      <FiPercent className="absolute right-2.5 top-2.5 text-text-muted" size={14} />
                    </div>
                  </div>

                  {/* Recovery Follow-up Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Follow-up Outreach Status
                    </label>
                    <select
                      value={form.recovery_followup_status}
                      onChange={(e) => setForm({ ...form, recovery_followup_status: e.target.value })}
                      className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="none">None / Pending</option>
                      <option value="call_scheduled">Follow-up Call Scheduled</option>
                      <option value="offer_sent">Discount Offer Sent via WhatsApp</option>
                      <option value="re_engaged">Successfully Re-engaged</option>
                    </select>
                  </div>

                  {/* Credit Limit INR */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Credit Limit (INR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={form.credit_limit_inr}
                      onChange={(e) => setForm({ ...form, credit_limit_inr: Number(e.target.value) })}
                      className="w-full text-xs font-semibold bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
                      placeholder="e.g. 500000"
                    />
                  </div>
                </div>

                {/* Behavioral Notes & BDE Call Log */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-muted">
                    Behavior Notes & BDE Outreach Log
                  </label>
                  <textarea
                    rows={3}
                    value={form.behavior_notes}
                    onChange={(e) => setForm({ ...form, behavior_notes: e.target.value })}
                    className="w-full text-xs bg-bg text-text rounded-xl border border-border p-2.5 focus:outline-none focus:border-primary"
                    placeholder="Document call notes, reason for cart abandonment, pricing agreements, next steps..."
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <FiRefreshCw className="animate-spin" size={13} /> : <FiSave size={13} />}
                    <span>{saving ? 'Updating Behavior...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

