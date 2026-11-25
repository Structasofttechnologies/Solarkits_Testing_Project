import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import api from "../services/api";
import {
  FiShield,
  FiCheckCircle,
  FiClock,
  FiUpload,
  FiLoader,
  FiAlertCircle,
  FiArrowRight,
  FiArrowLeft,
  FiFileText,
  FiCheck,
  FiLock,
} from "react-icons/fi";

const STEP_DOCS = {
  1: [
    { key: "pan_card", label: "Company / Firm PAN Card", mandatory: true, desc: "Upload clear photo or PDF of business PAN card" },
    { key: "shop_photo", label: "Shop / Office Premises Photo", mandatory: true, desc: "Photo showing business storefront / sign board" },
  ],
  2: [
    { key: "gst_certificate", label: "GST Registration Certificate", mandatory: false, desc: "GSTIN Certificate (Form GST REG-06)" },
    { key: "aadhaar_front", label: "Aadhaar Card (Front)", mandatory: false, desc: "Front side of director/owner Aadhaar" },
    { key: "aadhaar_back", label: "Aadhaar Card (Back)", mandatory: false, desc: "Back side showing address" },
  ],
  3: [
    { key: "cancelled_cheque", label: "Cancelled Bank Cheque", mandatory: false, desc: "Cheque copy with account number & IFSC" },
    { key: "address_proof", label: "Business Address Proof", mandatory: false, desc: "Electricity bill, lease agreement, or property tax receipt" },
  ],
};

export default function KycWorkspace() {
  const { reseller } = useOutletContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch current uploaded docs status
  const fetchKycStatus = () => {
    api.get('/india/v1/reseller/auth/me')
      .then((res) => {
        if (res.data?.status === "success") {
          const docs = res.data.kyc?.docs || res.data.data?.kyc_docs;
          if (docs) {
            setUploadedDocs(docs);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    setUploadingDoc(docType);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("doc_type", docType);
    formData.append("file", file);

    try {
      const res = await api.post('/india/v1/reseller/kyc/upload', formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.status === "success") {
        setMessage(`Document uploaded successfully!`);
        setUploadedDocs((prev) => ({
          ...prev,
          [docType]: { original_name: file.name, uploaded_at: new Date() },
        }));
      } else {
        setError(res.data?.message || "Upload failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Document upload failed");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmitKyc = async () => {
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post('/india/v1/reseller/kyc/submit');
      if (res.data?.status === "success") {
        setMessage("KYC application submitted for admin review!");
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Complete = Boolean(uploadedDocs.pan_card && uploadedDocs.shop_photo);

  // Industry Standard Guard: If KYC is verified & completed, lock document modification and hide wizard
  if (reseller?.kyc_status === 'verified') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <FiCheckCircle size={44} />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-300">
            <FiLock size={12} /> KYC Completed & Locked
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-3">
            Account Identity Verification Approved
          </h2>
          <p className="text-sm font-medium text-slate-600 mt-2 max-w-md mx-auto">
            Your business KYC documents have been verified and approved by Admin. In accordance with regulatory standards, verified accounts are locked against modification.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
          <div className="flex justify-between border-b border-slate-200 pb-2 font-semibold text-slate-700">
            <span>Verified Business:</span>
            <span className="font-extrabold text-slate-900">{reseller.business_name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 font-semibold text-slate-700">
            <span>GSTIN Number:</span>
            <span className="font-extrabold text-slate-900">{reseller.gst_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Compliance Status:</span>
            <span className="font-black text-emerald-600 uppercase tracking-wider">100% Verified & Active</span>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25"
        >
          Return to Overview Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <FiShield className="text-blue-600" size={28} />
          Step-by-Step Partner KYC Verification
        </h1>
        <p className="text-sm font-medium text-slate-600 mt-1">
          Complete the 4-step onboarding wizard to get your business account verified by Admin
        </p>
      </div>

      {/* KYC Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Current Account KYC Status</div>
          <div className="text-xl font-black text-slate-900 capitalize mt-1 flex items-center gap-2">
            {reseller?.kyc_status === 'verified' ? (
              <span className="text-emerald-600 flex items-center gap-2"><FiCheckCircle size={22} /> Verified Franchisee Partner</span>
            ) : reseller?.kyc_status === 'submitted' || reseller?.kyc_status === 'pending' ? (
              <span className="text-amber-600 flex items-center gap-2"><FiClock size={22} /> Submitted — Pending Admin Review</span>
            ) : (
              <span className="text-red-600 flex items-center gap-2"><FiAlertCircle size={22} /> Draft / Unverified (Action Needed)</span>
            )}
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Stepper Bar */}
      <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {[
          { step: 1, title: "1. Business Identity", mandatory: true },
          { step: 2, title: "2. GST & Aadhaar", mandatory: false },
          { step: 3, title: "3. Financial Proof", mandatory: false },
          { step: 4, title: "4. Review & Submit", mandatory: true },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step || (s.step === 1 && isStep1Complete);
          return (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`py-3 px-3 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : isDone
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{s.title}</span>
              {s.mandatory && <span className="text-[10px] opacity-80">(Mandatory)</span>}
            </button>
          );
        })}
      </div>

      {message && <div className="p-4 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-bold border border-emerald-300">{message}</div>}
      {error && <div className="p-4 rounded-xl bg-red-100 text-red-800 text-sm font-bold border border-red-300">{error}</div>}

      {/* STEP 1, 2, 3 DOCUMENT UPLOAD CARDS */}
      {currentStep <= 3 && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg text-slate-900">
                Step {currentStep}: Upload Required Verification Documents
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Select and upload each file. Images (PNG, JPG) or PDFs up to 10MB are supported.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {STEP_DOCS[currentStep].map((doc) => {
              const isUploaded = Boolean(uploadedDocs[doc.key]);
              const isUploading = uploadingDoc === doc.key;

              return (
                <div
                  key={doc.key}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isUploaded
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{doc.label}</span>
                      {doc.mandatory && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase">
                          Required
                        </span>
                      )}
                      {isUploaded && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center gap-1">
                          <FiCheck size={12} /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{doc.desc}</p>
                    {isUploaded && (
                      <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 pt-1">
                        <FiFileText size={14} /> File: {uploadedDocs[doc.key].original_name || "Document Uploaded"}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    <label
                      style={{ backgroundColor: isUploaded ? '#059669' : '#2563eb', color: '#ffffff' }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:opacity-90"
                    >
                      {isUploading ? (
                        <FiLoader className="animate-spin" size={16} />
                      ) : (
                        <FiUpload size={16} />
                      )}
                      <span>{isUploaded ? "Replace Document" : "Choose File"}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <FiArrowLeft size={16} /> Previous Step
            </button>

            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Next Step <FiArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL SUMMARY & SUBMISSION */}
      {currentStep === 4 && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="font-black text-lg text-slate-900">Step 4: Final Review & Verification Submission</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Review your uploaded verification documents before submitting for Admin approval.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { key: "pan_card", name: "Company / Firm PAN Card", mandatory: true },
              { key: "shop_photo", name: "Shop / Office Premises Photo", mandatory: true },
              { key: "gst_certificate", name: "GST Registration Certificate", mandatory: false },
              { key: "aadhaar_front", name: "Aadhaar Card (Front)", mandatory: false },
              { key: "aadhaar_back", name: "Aadhaar Card (Back)", mandatory: false },
              { key: "cancelled_cheque", name: "Cancelled Bank Cheque", mandatory: false },
              { key: "address_proof", name: "Business Address Proof", mandatory: false },
            ].map((d) => {
              const uploaded = Boolean(uploadedDocs[d.key]);
              return (
                <div key={d.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {uploaded ? <FiCheckCircle className="text-emerald-600" size={16} /> : <FiClock className="text-amber-500" size={16} />}
                    {d.name} {d.mandatory && <span className="text-[10px] text-red-600 font-extrabold">(Mandatory)</span>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold uppercase text-[10px] ${
                    uploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {uploaded ? "Uploaded" : "Not Uploaded"}
                  </span>
                </div>
              );
            })}
          </div>

          {!isStep1Complete && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2">
              <FiAlertCircle size={18} />
              PAN Card and Shop Photo are mandatory before submitting for Admin verification.
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              <FiArrowLeft size={16} /> Back to Step 3
            </button>

            <button
              onClick={handleSubmitKyc}
              disabled={submitting || !isStep1Complete}
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/40 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <FiLoader className="animate-spin" size={18} /> : <FiShield size={18} />}
              Submit KYC Application For Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
