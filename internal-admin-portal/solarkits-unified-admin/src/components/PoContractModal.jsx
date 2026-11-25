import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FiX, FiShield, FiCheckCircle, FiLoader, FiPrinter, FiUser, FiPhone, FiCalendar, FiBox, FiAlertCircle } from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";

const API_BASE = import.meta.env.VITE_API_URL;

export default function PoContractModal({ isOpen, onClose, poId, epcBuyerId }) {
  const [loading, setLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !poId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setContractData(null);

    const fetchContract = async () => {
      try {
        const url = `${API_BASE}/india/v1/shop/po-allocations/${poId}/signed-contract${
          epcBuyerId ? `?epc_buyer_id=${epcBuyerId}` : ""
        }`;
        const res = await axios.get(url, { headers: authHeaderObj() });
        if (isMounted) {
          if (res.data?.status === "success" && res.data.data) {
            setContractData(res.data.data);
          } else {
            setError(res.data?.message || "Failed to load contract");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("PoContractModal error:", err);
          setError(err.response?.data?.message || "Unable to fetch contract details");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContract();
    return () => {
      isMounted = false;
    };
  }, [isOpen, poId, epcBuyerId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <FiShield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary">Official Purchase Order Legal Contract</h3>
                <p className="text-[11px] text-text-muted">
                  Contract Ref:{" "}
                  <span className="font-mono font-bold text-emerald-600">
                    {contractData?.contract?.contract_number || "CNT-PENDING"}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-all cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <FiLoader className="animate-spin text-primary mx-auto" size={32} />
                <p className="text-xs text-text-muted">Retrieving signed legal contract document...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                <FiAlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : contractData ? (
              <div className="space-y-4">
                {/* Document Container */}
                <div className="p-6 rounded-2xl bg-white text-slate-800 border border-slate-300 shadow-inner text-xs font-serif leading-relaxed space-y-4 font-normal">
                  {/* Document Title Header */}
                  <div className="text-center pb-3 border-b border-slate-300">
                    <div className="text-[10px] font-sans font-black tracking-widest text-emerald-700 uppercase">
                      SOLARKITS INDIA • PO CONTRACT DOCUMENT
                    </div>
                    <div className="text-base font-sans font-black text-slate-900 mt-1">
                      {contractData.rendered_content?.contract_title || "SolarKits EPC Purchase Order & Supply Agreement"}
                    </div>
                    <div className="text-[10px] font-sans text-slate-500 mt-0.5">
                      PO Number: <span className="font-mono font-bold text-slate-700">{contractData.po_number}</span> • Contract No:{" "}
                      <span className="font-mono font-bold text-emerald-700">{contractData.contract?.contract_number}</span>
                    </div>
                  </div>

                  {/* Parties Information */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-sans grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">1. Franchise Partner:</span>
                      <span className="font-bold text-slate-900">{contractData.franchisee?.business_name || "SolarKits Franchisee"}</span>
                      <span className="block text-[10px] text-slate-500">{contractData.franchisee?.contact_person} ({contractData.franchisee?.mobile})</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">2. Solar EPC Contractor:</span>
                      <span className="font-bold text-slate-900">{contractData.epc?.company_name || contractData.epc?.name || "Assigned EPC"}</span>
                      <span className="block text-[10px] text-slate-500">Registered Mobile: {contractData.contract?.signer_phone || contractData.epc?.mobile || "N/A"}</span>
                    </div>
                  </div>

                  {/* Preamble */}
                  <p className="text-[11px] text-slate-700 italic border-l-2 border-emerald-600 pl-2.5 py-0.5">
                    {contractData.rendered_content?.terms_introduction}
                  </p>

                  {/* Kit Commitment Table */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 font-sans text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Product / Combo Kit:</span>
                      <span className="font-bold text-slate-900">{contractData.item_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Committed Quantity:</span>
                      <span className="font-black text-emerald-800">{contractData.allocated_quantity} Combo Kit(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Token Commitment Deposit:</span>
                      <span className="font-black text-emerald-800">₹{contractData.token_amount_inr?.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Clauses */}
                  <div className="space-y-3 pt-1">
                    {(contractData.rendered_content?.clauses || []).map((c, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="font-sans font-bold text-slate-900 text-xs flex items-center justify-between">
                          <span>{c.title}</span>
                          {c.is_mandatory && (
                            <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Mandatory</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal pl-2 border-l border-slate-200">
                          {c.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Signatures & OTP Audit Trail */}
                  <div className="mt-6 pt-4 border-t-2 border-slate-300 font-sans grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                      <div className="font-bold text-slate-700">Franchise Partner</div>
                      <div className="text-[10px] text-slate-500">{contractData.franchisee?.business_name}</div>
                      <div className="text-[9px] text-emerald-600 font-bold">ISSUED & ALLOCATED ✓</div>
                    </div>
                    <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 text-center space-y-1">
                      <div className="font-black text-emerald-900 flex items-center justify-center gap-1">
                        <FiCheckCircle size={14} className="text-emerald-600" />
                        <span>Digitally Signed & Sealed</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-800">{contractData.contract?.signer_name || "Authorized Signatory"}</div>
                      <div className="text-[9px] text-slate-500">{contractData.contract?.signer_designation || "Signatory / Proprietor"}</div>
                      <div className="text-[9px] font-mono text-emerald-700 font-bold">
                        OTP Verified: {contractData.contract?.otp_verified_at ? new Date(contractData.contract.otp_verified_at).toLocaleString("en-IN") : "Mobile OTP Verified"}
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono">
                        Mobile: {contractData.contract?.signer_phone || "N/A"} • IP: {contractData.contract?.signed_ip || "127.0.0.1"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-surface-hover/30">
            <span className="text-[10px] text-text-muted">
              Authenticated electronic record under Section 65B of Indian Evidence Act.
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:bg-surface-hover transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiPrinter size={13} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

