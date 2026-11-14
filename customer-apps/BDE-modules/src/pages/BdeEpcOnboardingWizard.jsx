import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  Store,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Sparkles,
  Link2,
  Lock,
  FileCheck,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useBdeAuth } from '../context/BdeAuthContext';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function BdeEpcOnboardingWizard() {
  const { canOnboardEpc } = useBdeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialLead = location.state?.lead || null;

  const [step, setStep] = useState(1); // 1 = GST Verify, 2 = EPC Details, 3 = Store Access Confirmation, 4 = Success

  // Step 1: GST Verification State
  const [gstInput, setGstInput] = useState(initialLead?.gst_number || '');
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstError, setGstError] = useState('');
  const [gstResult, setGstResult] = useState(null);

  // Step 2: EPC Account Details
  const [formData, setFormData] = useState({
    lead_id: initialLead?._id || '',
    company_name: initialLead?.company_name || '',
    contact_person: initialLead?.contact_person || '',
    mobile: initialLead?.mobile_number || '',
    email: initialLead?.email || '',
    password: '',
    address: initialLead?.address_line || '',
    state_name: initialLead?.state_name || 'Maharashtra',
    district_name: initialLead?.district_name || 'Pune',
    pincode: initialLead?.pincode || '',
    epc_type: initialLead?.epc_type || '',
  });
  const [epcTypes, setEpcTypes] = useState([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [createdEpcAccount, setCreatedEpcAccount] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Fetch Dynamic Active EPC Classification Types from Admin Master
  useEffect(() => {
    api.get('/epc-types/active')
      .then((res) => {
        if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
          setEpcTypes(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => (!prev.epc_type ? { ...prev, epc_type: res.data.data[0].name } : prev));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load active EPC types:', err);
      });
  }, []);

  // ── Step 1: Verify GSTIN ──
  const handleVerifyGst = async (e) => {
    if (e) e.preventDefault();
    const cleanGst = gstInput.trim().toUpperCase();
    setGstError('');

    if (!cleanGst) {
      setGstError('Please enter a valid GST number');
      return;
    }

    if (!GSTIN_REGEX.test(cleanGst)) {
      setGstError('Invalid GSTIN format. Example: 27ABCDE1234F1Z5');
      return;
    }

    setVerifyingGst(true);
    try {
      const res = await api.post('/epc/verify-gst', {
        gstin: cleanGst,
        lead_id: initialLead?._id || undefined,
      });

      if (res.data?.status === 'success') {
        const d = res.data.data;
        setGstResult(d);
        setFormData((prev) => ({
          ...prev,
          company_name: d.legal_name || d.trade_name || prev.company_name,
          state_name: d.state_name || prev.state_name,
          district_name: d.district_name || prev.district_name,
          address: d.address || prev.address,
          pincode: d.pincode || prev.pincode,
        }));
        setStep(2);
      } else {
        setGstError(res.data?.message || 'GST verification failed');
      }
    } catch (err) {
      setGstError(err.response?.data?.message || 'Could not verify GSTIN. Duplicate registration or invalid credentials.');
    } finally {
      setVerifyingGst(false);
    }
  };

  // ── Step 2: Proceed to Store Access Setup ──
  const handleProceedToStoreAccess = (e) => {
    e.preventDefault();
    setStep(3);
  };

  // ── Step 3: Complete EPC Onboarding & Grant Store Access ──
  const handleCompleteOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const res = await api.post('/epc/onboard-with-gst', {
        ...formData,
        gstin: gstResult?.gstin || gstInput.trim().toUpperCase(),
      });

      if (res.data?.status === 'success') {
        setCreatedEpcAccount(res.data.data);
        setStep(4);

        // Notify Admin Panel & other listening tabs
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('epc_registration_channel');
            channel.postMessage({ type: 'NEW_REGISTRATION', request: res.data.data });
            channel.close();
          }
        } catch (bcErr) { }
      } else {
        alert(res.data?.message || 'Failed to complete EPC onboarding');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete EPC onboarding');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    const defaultPass = formData.password || 'SolarEPC@2026';
    const text = `SolarKits Store Access Credentials:\nURL: https://solarkits.in\nEmail: ${formData.email}\nPassword: ${defaultPass}\nCompany: ${formData.company_name}\nGSTIN: ${gstResult?.gstin || gstInput}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleResetWizard = () => {
    setStep(1);
    setGstInput('');
    setGstResult(null);
    setCreatedEpcAccount(null);
    setFormData({
      lead_id: '',
      company_name: '',
      contact_person: '',
      mobile: '',
      email: '',
      password: '',
      address: '',
      state_name: 'Gujarat',
      district_name: 'Ahmedabad',
      pincode: '',
      epc_type: 'New EPC',
    });
  };

  const defaultPassword = formData.password?.trim() || 'SolarEPC@2026';

  if (canOnboardEpc === false) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">EPC Onboarding Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          EPC contractor onboarding has been turned <strong className="text-slate-800">OFF</strong> for your BDE account by the Administrator. You are not authorized to register new EPC accounts.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> GST Verified Onboarding
            </span>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full uppercase flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> Direct Store Access
            </span>
            {initialLead && (
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Lead: {initialLead.lead_id}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            EPC Contractor Onboarding
          </h1>
          <p className="text-xs text-slate-500">
            Verify contractor GSTIN, set up account credentials, and grant Direct Solar Store procurement access.
          </p>
        </div>

        <button
          onClick={() => navigate('/epc-leads')}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition self-start sm:self-auto flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs transition ${step >= 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-400'
                }`}
            >
              1
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block">GST Verification</span>
              <span className="text-[10px] text-slate-400">Validate & Duplicate check</span>
            </div>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs transition ${step >= 2 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-400'
                }`}
            >
              2
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block">Company Confirmation</span>
              <span className="text-[10px] text-slate-400">Contact & account setup</span>
            </div>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs transition ${step >= 3 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-400'
                }`}
            >
              3
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block">Solar Store Access</span>
              <span className="text-[10px] text-slate-400">Setup & permissions</span>
            </div>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${step >= 4 ? 'bg-emerald-600' : 'bg-slate-200'}`} />

          {/* Step 4 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs transition ${step >= 4 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 text-slate-400'
                }`}
            >
              <Check className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block">Onboarded</span>
              <span className="text-[10px] text-slate-400">Store Access Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: GST NUMBER ENTRY & VERIFICATION */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> Enter EPC Contractor GST Number
              </h2>
              <p className="text-xs text-slate-500">
                The system will perform live Quick eKYC GST validation, fetch verified company trade name and registered address, and ensure duplicate prevention.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick eKYC Engine
            </span>
          </div>

          <form onSubmit={handleVerifyGst} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                15-Character GSTIN Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={15}
                  value={gstInput}
                  onChange={(e) => setGstInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 24ABDCS5798J1ZR"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3.5 text-sm font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white uppercase"
                />
                <button
                  type="submit"
                  disabled={verifyingGst || !gstInput.trim()}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  {verifyingGst ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Verifying via Quick eKYC...
                    </>
                  ) : (
                    <>
                      Verify GST <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {gstError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <strong className="block font-bold">Verification Notice:</strong>
                  <span>{gstError}</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
              <strong className="block font-bold text-slate-800">Quick eKYC Validation Rules:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>Live verification directly with Government Taxpayer Registry via Quick eKYC API.</li>
                <li>Extracts state code, registered territory, and official legal name.</li>
                <li>Guarantees strict single EPC registration — prevents duplicate accounts.</li>
              </ul>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: CONFIRM FETCHED DETAILS & ACCOUNT SETUP */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified with Quick eKYC: {gstResult?.gstin}
              </span>
              <h2 className="text-lg font-black text-slate-900">Confirm Company & Contact Details</h2>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Re-enter GST
            </button>
          </div>

          {/* Quick eKYC Verified Details Snapshot Pill Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Verified Trade Name</span>
              <span className="font-bold text-slate-900">{gstResult?.trade_name || gstResult?.company_name || formData.company_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Legal Entity Name</span>
              <span className="font-bold text-slate-900">{gstResult?.legal_name || 'Registered Taxpayer'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">State & District Jurisdiction</span>
              <span className="font-bold text-slate-900">{formData.state_name} ({formData.district_name})</span>
            </div>
          </div>

          <form onSubmit={handleProceedToStoreAccess} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Trade / Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered State *</label>
                <input
                  type="text"
                  required
                  value={formData.state_name}
                  onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered District *</label>
                <input
                  type="text"
                  required
                  value={formData.district_name}
                  onChange={(e) => setFormData({ ...formData, district_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Registered Office Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Set Store Password (Optional)</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Defaults to: SolarEPC@2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Contractor uses this password to log in to the Solar Store.</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* EPC Classification Tier */}
              <div className="sm:col-span-2 p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
                <label className="block font-black text-slate-800 mb-1 text-xs">
                  EPC Classification Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.epc_type}
                  onChange={(e) => setFormData({ ...formData, epc_type: e.target.value })}
                  className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs shadow-xs"
                >
                  {!formData.epc_type && <option value="">Select EPC Classification Type</option>}
                  {formData.epc_type && !epcTypes.some(t => t.name === formData.epc_type) && (
                    <option value={formData.epc_type}>{formData.epc_type}</option>
                  )}
                  {epcTypes.map((t) => (
                    <option key={t.id || t._id || t.code || t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Select contractor classification configured in Admin Master Settings.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                Configure Solar Store Access <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: DIRECT SOLAR STORE ACCESS PROVISIONING */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-blue-600" /> Direct Store Provisioning
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Direct Solar Store Access & Onboarding Confirmation
              </h2>
              <p className="text-xs text-slate-500">
                This EPC will be granted immediate access to browse and purchase solar kits and equipment directly from the SolarKits Store.
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
            </button>
          </div>

          {/* Store Access Configuration Pill */}
          <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-slate-50 rounded-2xl border border-blue-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    Direct Solar Store Contractor
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-600" /> Active Store Access
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {formData.company_name}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upon completing this onboarding step, the EPC contractor account will be immediately activated with full procurement rights. They can log in to the SolarKits Store to view live contractor pricing, configure combo kits, and place procurement orders.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-blue-200/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Territory Jurisdiction</span>
                <span className="font-semibold text-slate-800">{formData.district_name}, {formData.state_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">EPC Tier</span>
                <span className="font-semibold text-slate-800">{formData.epc_type}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Procurement Channel</span>
                <span className="font-semibold text-blue-700">SolarKits Direct Store</span>
              </div>
            </div>
          </div>

          {/* Store Credentials Preview Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <strong className="text-slate-800 font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-600" /> Store Login Credentials Preview
              </strong>
              <span className="text-[10px] text-slate-500 font-mono">Role: EPC Contractor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Login Email / Mobile</span>
                <span className="font-mono font-bold text-slate-800">{formData.email}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">or {formData.mobile}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Initial Password</span>
                <span className="font-mono font-bold text-blue-700">{defaultPassword}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Can be changed after login</span>
              </div>
            </div>
          </div>

          {/* Informational Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
            <Store className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Franchisee Assignment from BDE Leads</p>
              <p className="text-[11px] text-amber-700">
                This onboarding only creates the EPC account and activates their Solar Store access. Once onboarded, this contractor will appear in your <strong>BDE Leads</strong> list, where you can assign them to any local Franchisee Partner whenever you choose.
              </p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Contractor Trade Name:</span>
              <span className="font-bold text-slate-900">{formData.company_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">GSTIN:</span>
              <span className="font-mono font-bold text-slate-900">{gstResult?.gstin || gstInput}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Contact Person:</span>
              <span className="font-semibold text-slate-800">{formData.contact_person} ({formData.mobile})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Store Access Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active Store Access Provisioned
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 text-xs"
            >
              Back
            </button>
            <button
              onClick={handleCompleteOnboarding}
              disabled={onboardingLoading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              {onboardingLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" /> Onboarding & Activating Store...
                </>
              ) : (
                <>
                  Complete Onboarding & Grant Store Access <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ONBOARDING SUCCESS WITH STORE ACCESS */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-600/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-600" /> Solar Store Access Active
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              EPC Contractor Onboarded Successfully!
            </h2>
            <p className="text-xs text-slate-500">
              Contractor <strong className="text-slate-800">{formData.company_name}</strong> (GST:{' '}
              <strong className="font-mono text-slate-800">{gstResult?.gstin || gstInput}</strong>) is now registered and equipped with full Solar Store procurement access.
            </p>
          </div>

          {/* Credentials Card with 1-Click Copy */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 max-w-lg mx-auto text-xs text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" /> Store Access Credentials
              </span>
              <button
                onClick={handleCopyCredentials}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition"
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" /> Copy Credentials
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Contractor:</span>
              <span className="font-bold text-slate-900">{formData.company_name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Login Email:</span>
              <span className="font-mono font-bold text-slate-900">{formData.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Store Password:</span>
              <span className="font-mono font-bold text-blue-600">{defaultPassword}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Territory:</span>
              <span className="font-semibold text-slate-900">{formData.district_name}, {formData.state_name}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Store Access Status:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active (Direct Store Access)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/epc-leads')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Store className="w-4 h-4" /> View in BDE Leads & Assign Franchisee
            </button>
            <button
              onClick={handleResetWizard}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
            >
              Onboard Another EPC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
