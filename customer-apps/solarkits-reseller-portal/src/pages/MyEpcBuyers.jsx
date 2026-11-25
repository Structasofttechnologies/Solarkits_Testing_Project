import { useState, useEffect, useRef } from "react";
import {
  FiUsers, FiPlus, FiCheckCircle, FiClock, FiXCircle,
  FiLoader, FiMail, FiPhone, FiShield, FiBriefcase,
  FiUser, FiLock, FiMapPin, FiArrowRight, FiRefreshCw, FiAlertCircle, FiX,
  FiShoppingCart, FiDollarSign
} from "react-icons/fi";
import api from "../services/api";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const GST_STATE_MAP = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh (New)", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

export default function MyEpcBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [tabFilter, setTabFilter] = useState("all"); // 'all' | 'assigned_bde' | 'self'
  const [typeFilter, setTypeFilter] = useState("all");
  const [epcTypes, setEpcTypes] = useState([
    { name: "Government Contractor", code: "govt_contractor" },
    { name: "Tender Bidder", code: "tender_bidder" },
    { name: "New EPC", code: "new_epc" },
    { name: "Experienced EPC", code: "experienced_epc" },
  ]);

  // Registration Multi-Step State
  const [step, setStep] = useState(1); // 1 = GST verify, 2 = EPC details form
  const [gstInput, setGstInput] = useState("");
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstError, setGstError] = useState("");
  const [gstResult, setGstResult] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    company_name: "",
    password: "",
    state_id: "",
    district_id: "",
    epc_type: "New EPC",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const gstInputRef = useRef(null);

  const fetchBuyers = () => {
    setLoading(true);
    api.get('/india/v1/reseller/epc-buyers/list')
      .then((res) => { if (res.data?.status === "success") setBuyers(res.data.data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBuyers();
    api.get('/india/v1/franchise-clusters/my-cluster-info')
      .then((res) => {
        if (res.data?.status === "success" && res.data.data) {
          setClusterInfo(res.data.data);
        }
      })
      .catch(() => { });

    api.get('/india/v1/reseller/territories')
      .then((res) => {
        if (res.data?.status === "success" && res.data.data?.length > 0) {
          setTerritories(res.data.data);
          const first = res.data.data[0];
          setForm((f) => ({
            ...f,
            state_id: first.state_id || first.state?.id || "",
            district_id: first.district_id || first.district?.id || "",
          }));
        }
      })
      .catch(() => { });

    api.get('/india/v1/reseller/plans/my-subscription')
      .then((res) => {
        if (res.data?.status === "success" && res.data.data) {
          setPlan(res.data.data.plan || res.data.data);
        }
      })
      .catch(() => { });

    api.get('/epc-types/active')
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEpcTypes(res.data.data);
        }
      })
      .catch(() => {
        api.get('/india/v1/epc-types/active')
          .then((res2) => {
            if (res2.data?.status === "success" && Array.isArray(res2.data.data) && res2.data.data.length > 0) {
              setEpcTypes(res2.data.data);
            }
          })
          .catch(() => { });
      });
  }, []);

  const filteredBuyers = buyers.filter((b) => {
    if (tabFilter === "assigned_bde" && !b.is_assigned_by_bde) return false;
    if (tabFilter === "self" && b.is_assigned_by_bde) return false;
    if (typeFilter !== "all" && (b.epc_type || "New EPC").toLowerCase() !== typeFilter.toLowerCase()) return false;
    return true;
  });

  const gstStateName = gstInput.length >= 2
    ? (GST_STATE_MAP[gstInput.substring(0, 2).toUpperCase()] || null)
    : null;

  // ── Step 1: Verify GST ───────────────────────────────────────────────────────
  const handleVerifyGst = async () => {
    const gstin = gstInput.trim().toUpperCase();
    setGstError("");

    if (!gstin) { setGstError("Please enter EPC buyer's GSTIN."); return; }
    if (!GSTIN_REGEX.test(gstin)) {
      setGstError("Invalid GSTIN format. Example: 27ABCDE1234F1Z5");
      return;
    }

    setGstVerifying(true);
    try {
      const res = await api.post("/india/v1/reseller/gst/verify", { gstin, context: "epc_onboarding" });
      if (res.data?.status === "success") {
        const d = res.data.data;
        setGstResult(d);
        const bizName = d.legal_name || d.trade_name || "";
        setForm((f) => ({
          ...f,
          company_name: bizName,
        }));
      } else {
        setGstError(res.data?.message || "GST verification failed.");
      }
    } catch (err) {
      setGstError(err.response?.data?.message || "Could not verify GSTIN. Please check format.");
    } finally {
      setGstVerifying(false);
    }
  };

  const handleResetGst = () => {
    setGstResult(null);
    setGstError("");
    setGstInput("");
    setStep(1);
    setTimeout(() => gstInputRef.current?.focus(), 100);
  };

  const handleOpenModal = () => {
    setModal(true);
    setStep(1);
    setGstInput("");
    setGstResult(null);
    setGstError("");
    setError("");
    setForm({ name: "", email: "", whatsapp: "", company_name: "", password: "", state_id: form.state_id, district_id: form.district_id, epc_type: "New EPC" });
  };

  // ── Step 2: Register Submit ──────────────────────────────────────────────────
  const handleRegisterEpc = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        company_name: form.company_name.trim(),
        password: form.password,
        state_id: form.state_id,
        district_id: form.district_id,
        epc_type: form.epc_type || "New EPC",
        gstin: gstResult?.gstin || null,
        gstin_verified: !!gstResult,
        gstin_trade_name: gstResult?.trade_name || null,
        gstin_legal_name: gstResult?.legal_name || null,
      };

      const res = await api.post("/india/v1/reseller/epc-buyers/register", payload);
      if (res.data?.status === "success") {
        setModal(false);
        fetchBuyers();
      } else {
        setError(res.data?.message || "Registration failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please verify buyer details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FiUsers className="text-blue-600" size={28} />
            My Buyers
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Register and manage wholesale buyer accounts in your authorized territory.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/30 cursor-pointer"
        >
          <FiPlus size={18} /> Register New Buyer
        </button>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <FiUsers size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Buyers</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{buyers.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <FiCheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Accounts</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {buyers.filter((b) => b.status === "approved" || b.status === "active").length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <FiShoppingCart size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buyer Orders</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {buyers.reduce((sum, b) => sum + (b.orders_count || 0), 0)} Orders
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <FiDollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Order Volume</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              ₹{buyers.reduce((sum, b) => sum + (b.total_order_value_inr || 0), 0).toLocaleString("en-IN")}
            </h3>
          </div>
        </div>
      </div>

      {/* Plan Scope & Territory Authorization Banner */}
      {(() => {
        const clusters = clusterInfo?.clusters || (clusterInfo?.cluster ? [clusterInfo.cluster] : []);
        return (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                <FiShield size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Franchisee Territory Onboarding Rights
                  </span>
                  {clusters.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                      Cluster-Wise Scope
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 leading-relaxed">
                  {plan ? (
                    <>
                      <span className="text-blue-600 font-extrabold">{plan.name}</span> ({plan.territory_level?.toUpperCase()} Plan) — Authorized to onboard EPC Buyers across{" "}
                      {clusters.length > 0 ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5 align-middle mt-1">
                          {clusters.map((c, cIdx) => {
                            const distNames = (c.districts || c.district_ids || c.district_names || []).map(d => typeof d === 'string' ? d : d.name);
                            return (
                              <span
                                key={c._id || c.cluster_code || cIdx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black"
                              >
                                <span className="text-blue-700 font-black">{c.cluster_name}</span>
                                <span className="text-[10px] text-slate-500 font-mono font-medium">({c.cluster_code}):</span>
                                <span className="text-emerald-700 font-extrabold">{distNames.join(", ")}</span>
                              </span>
                            );
                          })}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-black">
                          {territories.map((t) => t.location_name || t.state?.name || t.district?.name).join(", ") || "Authorized Territories"}
                        </span>
                      )}
                    </>
                  ) : (
                    "Authorized to onboard EPC Buyers across registered franchise clusters & territories"
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button
                onClick={() => setTabFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${tabFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All EPCs ({buyers.length})
              </button>
              <button
                onClick={() => setTabFilter('assigned_bde')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${tabFilter === 'assigned_bde' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
              >
                <span>Assigned by BDE</span>
                <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {buyers.filter((b) => b.is_assigned_by_bde).length}
                </span>
              </button>
              <button
                onClick={() => setTabFilter('self')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${tabFilter === 'self' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Self Onboarded
              </button>

              {/* EPC Type Dropdown Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All EPC Types</option>
                {epcTypes.map((t) => (
                  <option key={t.id || t.code || t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })()}

      {/* EPC List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold gap-2">
            <FiLoader className="animate-spin text-blue-600" size={24} /> Loading onboarded EPC buyers...
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div className="py-20 text-center text-slate-600 text-sm font-semibold space-y-2">
            <div>No EPC buyers found in this view.</div>
            <p className="text-xs text-slate-400 font-normal">EPCs assigned by your regional BDE or onboarded directly will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">Company / EPC Name</th>
                  <th className="text-left text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">District</th>
                  <th className="text-left text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">GSTIN</th>
                  <th className="text-left text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">Attribution Source</th>
                  <th className="text-center text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">Orders / Value</th>
                  <th className="text-center text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">Commission</th>
                  <th className="text-center text-slate-700 font-extrabold px-5 py-4 uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBuyers.map((b) => (
                  <tr key={b.id || b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900">{b.company_name || b.name}</span>
                        {b.epc_type && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            {b.epc_type}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1 space-y-0.5">
                        <div>
                          Contact: <span className="font-semibold text-slate-700">{b.contact_person || b.name}</span>
                          {(b.whatsapp || b.mobile) && (
                            <span className="font-mono text-slate-600"> • {b.whatsapp || b.mobile}</span>
                          )}
                        </div>
                        {b.email && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            Email: <span className="text-blue-600 font-mono font-medium">{b.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{b.district_name || 'Regional'}</div>
                      <div className="text-xs text-slate-400">{b.state_name}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                      {b.gstin ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {b.gstin}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {b.is_assigned_by_bde ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Assigned by BDE
                          </span>
                          {b.assigned_by_bde_name && (
                            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {b.assigned_by_bde_name} {b.assigned_by_bde_id ? `(${b.assigned_by_bde_id})` : ''}
                            </div>
                          )}
                          {b.assignment_date && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(b.assignment_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Self Onboarded
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="font-bold text-slate-900">{b.orders_count || 0} Orders</div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        ₹{(b.total_order_value_inr || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        100% Eligible
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold capitalize ${b.status === 'approved' || b.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {b.status === 'approved' || b.status === 'active' ? (
                          <FiCheckCircle size={13} />
                        ) : b.status === 'pending' ? (
                          <FiClock size={13} />
                        ) : (
                          <FiXCircle size={13} />
                        )}
                        {b.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GST-First Registration Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 w-full max-w-xl space-y-6 shadow-2xl relative">
            <button onClick={() => setModal(false)} className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <FiX size={20} />
            </button>

            {/* Modal Title & Step Bar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FiUsers size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Register EPC Buyer Sub-Account</h3>
                  <p className="text-xs text-slate-500">GST-validated onboarding for client EPC sub-accounts</p>
                </div>
              </div>

              {/* Steps */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > 1 ? <FiCheckCircle size={14} /> : 1}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-blue-700' : 'text-slate-400'}`}>
                    GST Verification
                  </span>
                </div>
                <div className={`w-10 h-1 rounded-full ${step > 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    2
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>
                    EPC Details
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: GST Verification */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    EPC Buyer GSTIN Number *
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={gstInputRef}
                      type="text"
                      maxLength={15}
                      placeholder="27ABCDE1234F1Z5"
                      value={gstInput}
                      onChange={(e) => {
                        setGstInput(e.target.value.toUpperCase());
                        setGstError("");
                        setGstResult(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyGst()}
                      className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyGst}
                      disabled={gstVerifying}
                      className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {gstVerifying ? <FiLoader className="animate-spin" size={16} /> : <><FiShield size={14} /> Verify GST</>}
                    </button>
                  </div>

                  {gstStateName && !gstResult && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <FiMapPin className="text-blue-600" size={13} />
                      State detected: <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{gstStateName}</span>
                    </div>
                  )}

                  {gstError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <FiAlertCircle className="text-red-500 flex-shrink-0" size={16} />
                      <span>{gstError}</span>
                    </div>
                  )}
                </div>

                {gstResult && (
                  <>
                    {/* Case 1: Territory Mismatch */}
                    {gstResult.territory_matched === false ? (
                      <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiXCircle className="text-red-600 flex-shrink-0" size={22} />
                            <span className="text-xs font-black text-red-900 uppercase tracking-wider">
                              ⛔ Territory Mismatch — Registration Blocked
                            </span>
                          </div>
                          <button type="button" onClick={handleResetGst} className="text-xs font-bold text-slate-600 bg-white border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                            <FiRefreshCw size={11} /> Change GST
                          </button>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-red-200 space-y-2 text-xs">
                          <p className="font-semibold text-red-800 leading-relaxed">
                            {gstResult.territory_reason || `This EPC company's GST is registered in ${gstResult.gst_state_name || "another state"}, which is outside your authorized territory boundary.`}
                          </p>
                          <div className="pt-2 border-t border-red-100 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Your Authorized Territories ({gstResult.territory_level ? `${gstResult.territory_level.toUpperCase()} Plan` : "Assigned Scope"}):</span>
                            <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {(gstResult.authorized_territories || []).join(", ") || "Your Territory"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : gstResult.is_unique === false ? (
                      /* Case 2: Duplicate EPC / Exclusivity Conflict */
                      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiAlertCircle className="text-amber-600 flex-shrink-0" size={22} />
                            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                              ⛔ EPC Exclusivity Conflict — Registration Blocked
                            </span>
                          </div>
                          <button type="button" onClick={handleResetGst} className="text-xs font-bold text-slate-600 bg-white border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                            <FiRefreshCw size={11} /> Change GST
                          </button>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900 space-y-1">
                          <p className="leading-relaxed font-bold">
                            {gstResult.conflict_message || `An EPC company with GSTIN ${gstInput} is already registered under another Franchise Partner.`}
                          </p>
                          <p className="text-[11px] text-slate-500 font-normal">
                            As per platform policy, each EPC buyer sub-account is strictly exclusive to a single Franchise Partner.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Case 3: Success — GST Verified & Territory Matched */
                      <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiCheckCircle className="text-emerald-600 flex-shrink-0" size={22} />
                            <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                              GST Verified & Territory Matched ✓
                            </span>
                          </div>
                          <button type="button" onClick={handleResetGst} className="text-xs font-bold text-slate-600 bg-white border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                            <FiRefreshCw size={11} /> Change GST
                          </button>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs">
                          {gstResult.legal_name && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Legal Name:</span>
                              <span className="font-bold text-slate-900">{gstResult.legal_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">GST Registered State:</span>
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{gstResult.gst_state_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Territory Validation:</span>
                            <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                              Inside Authorized Scope ({gstResult.territory_level ? `${gstResult.territory_level.toUpperCase()} Plan` : "Assigned Scope"}) ✓
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => gstResult && gstResult.territory_matched !== false && gstResult.is_unique !== false && setStep(2)}
                  disabled={!gstResult || gstResult.territory_matched === false || gstResult.is_unique === false}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Proceed to EPC Details <FiArrowRight size={18} />
                </button>
              </div>
            )}

            {/* Step 2: EPC Buyer Details Form */}
            {step === 2 && (
              <form onSubmit={handleRegisterEpc} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-blue-600" size={16} />
                    <span className="font-extrabold text-blue-900">GST: {gstInput}</span>
                    {gstStateName && <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">{gstStateName}</span>}
                  </div>
                  <button type="button" onClick={handleResetGst} className="text-blue-600 font-bold hover:underline">Change</button>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-100 text-red-800 text-xs font-bold border border-red-300">{error}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company / Firm Name *</label>
                  <div className="relative">
                    <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="Mehta Solar Infra Pvt Ltd"
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Person Name *</label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="Sunil Mehta"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email *</label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="email"
                        required
                        placeholder="sunil@mehta.in"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp Number *</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="tel"
                        required
                        placeholder="9812345678"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const clusters = clusterInfo?.clusters || (clusterInfo?.cluster ? [clusterInfo.cluster] : []);
                  if (clusters.length === 0 && territories.length === 0) return null;

                  return (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Authorized Cluster Territory *
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const val = e.target.value;
                          const selectedT = territories.find((t) => String(t.id || t._id) === val);
                          if (selectedT) {
                            setForm({
                              ...form,
                              state_id: selectedT.state_id || selectedT.state?.id || "",
                              district_id: selectedT.district_id || selectedT.district?.id || "",
                            });
                            return;
                          }
                          for (const c of clusters) {
                            const dist = (c.districts || c.district_ids || []).find((d) => String(d._id || d.id) === val);
                            if (dist) {
                              setForm({
                                ...form,
                                state_id: c.state_id?._id || c.state_id || "",
                                district_id: dist._id || dist.id || "",
                              });
                              return;
                            }
                          }
                        }}
                      >
                        {clusters.length > 0 ? (
                          clusters.map((c) => (
                            <optgroup key={c._id || c.cluster_code} label={`${c.cluster_name} (${c.cluster_code}) — ${c.state?.name || c.state_name || 'State'}`}>
                              {(c.districts || c.district_ids || []).map((dist) => (
                                <option key={dist._id || dist.id || dist.name} value={dist._id || dist.id}>
                                  {dist.name || dist}
                                </option>
                              ))}
                            </optgroup>
                          ))
                        ) : (
                          territories.map((t) => {
                            const locName = t.location_name || (t.district?.name ? `${t.district.name}, ${t.state?.name || ''}` : t.state?.name || 'Authorized Territory');
                            return (
                              <option key={t.id || t._id} value={t.id || t._id}>
                                {locName} ({t.territory_level || 'district'})
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">EPC Classification / Type</label>
                  <select
                    value={form.epc_type}
                    onChange={(e) => setForm({ ...form, epc_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {epcTypes.map((t) => (
                      <option key={t._id || t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Create Password *</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                    {submitting ? <FiLoader className="animate-spin" size={16} /> : <><FiCheckCircle size={16} /> Submit EPC Buyer</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
