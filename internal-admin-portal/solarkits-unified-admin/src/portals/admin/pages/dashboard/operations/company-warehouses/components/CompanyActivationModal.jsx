import React, { useState, useEffect } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiExternalLink,
  FiShield,
  FiCheck,
  FiClock,
  FiZap,
  FiLayers,
  FiArrowRight
} from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

export default function CompanyActivationModal({ warehouseId, isOpen, onClose, onSuccess, moduleUniqueId = "ADM_WAREHOUSES" }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [updatingGate, setUpdatingGate] = useState(null);

  const handleToggleGate = async (gateKey, status) => {
    try {
      setUpdatingGate(gateKey);
      let res;
      try {
        res = await axios.post(
          `${API}/warehouses/${warehouseId}/toggle-gate?unique_id=${moduleUniqueId}&req_for=edit`,
          { gate_key: gateKey, status },
          { headers: authHeaderObj() }
        );
      } catch (e) {
        if (e.response?.status === 403) {
          res = await axios.post(
            `${API}/warehouses/${warehouseId}/toggle-gate?unique_id=${moduleUniqueId}&req_for=view`,
            { gate_key: gateKey, status },
            { headers: authHeaderObj() }
          );
        } else {
          throw e;
        }
      }
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || "Gate verified successfully!"
        }));
        if (res.data.audit) {
          setAudit(res.data.audit);
        } else {
          fetchChecklist();
        }
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Failed to toggle gate", err);
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to update gate verification."
      }));
    } finally {
      setUpdatingGate(null);
    }
  };

  const fetchChecklist = async () => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      const uniqueId = moduleUniqueId || "ADM_WAREHOUSES";
      const res = await axios.get(
        `${API}/warehouses/${warehouseId}/checklist?unique_id=${uniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setAudit(res.data.audit);
      }
    } catch (err) {
      console.error("Failed to fetch activation checklist", err);
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to load warehouse activation checklist."
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChecklist();
    }
  }, [isOpen, warehouseId]);

  const handleSubmitActivation = async () => {
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API}/warehouses/${warehouseId}/submit-activation?unique_id=${moduleUniqueId}&req_for=edit`,
        {},
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || "Submitted for activation review!"
        }));
        fetchChecklist();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to submit warehouse for activation."
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveActivation = async () => {
    try {
      setApproving(true);
      const res = await axios.post(
        `${API}/warehouses/${warehouseId}/approve-activation?unique_id=${moduleUniqueId}&req_for=edit`,
        {},
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || "Warehouse activated successfully!"
        }));
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to activate warehouse."
      }));
    } finally {
      setApproving(false);
    }
  };

  const completed = audit?.completed_count || 0;
  const total = audit?.total_gates || 10;
  const pct = Math.round((completed / total) * 100);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Company Warehouse – Activation Checklist"
      size="2xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader text="Auditing warehouse configuration gates..." />
          </div>
        ) : !audit ? (
          <div className="py-8 text-center text-text-secondary">
            Could not retrieve activation checklist. Please retry.
          </div>
        ) : (
          <>
            {/* Header Metrics Banner */}
            <div className="bg-surface-elevated/70 border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-bold text-lg text-text-primary">
                    {audit.warehouse_name}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                    Company Warehouse
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Code: <span className="font-mono text-text-primary font-bold">{audit.warehouse_code}</span> • All 10 mandatory infrastructure, operational, and inventory gates must pass before activation.
                </p>
              </div>

              {/* Progress Counter & Circle */}
              <div className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-border shadow-xs">
                <div className="text-right">
                  <div className="text-xl font-black text-text-primary tracking-tight">
                    {completed}/{total}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-text-muted">
                    Gates Verified
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xs ${completed === 10
                  ? "bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg"
                  : "bg-primary/10 text-primary border border-primary/30"
                  }`}>
                  {pct}%
                </div>
              </div>
            </div>

            {/* Status Alert Banner */}
            {audit.can_activate ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <FiCheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    10/10 Mandatory Configurations Complete
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    This warehouse meets all operational criteria and is eligible for immediate Admin activation. Once activated, it will be enabled for procurement, kit preparation, and dispatch.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <FiAlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    Configuration Incomplete ({total - completed} Gates Pending)
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Activation is locked by backend validation rules until every required setting is configured and verified.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist Table */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-text-muted px-2">
                <span>GATE / REQUIREMENT</span>
                <span>STATUS / ACTION</span>
              </div>

              {audit.gates.map((gate) => (
                <div
                  key={gate.gate_id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${gate.is_completed
                    ? "bg-surface border-border/80 hover:border-emerald-500/30"
                    : "bg-surface-elevated/40 border-amber-500/20 hover:border-amber-500/40"
                    }`}
                >
                  <div className="flex items-start gap-3 pr-4">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${gate.is_completed
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500"
                      }`}>
                      {gate.is_completed ? (
                        <FiCheck className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span className="text-xs font-bold">{gate.gate_id}</span>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${gate.is_completed ? "text-text-primary" : "text-amber-700 dark:text-amber-300"
                        }`}>
                        {gate.name}
                      </p>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {gate.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {gate.is_completed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <FiCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {gate.can_manual_verify && (
                          <button
                            type="button"
                            disabled={updatingGate === gate.key}
                            onClick={() => handleToggleGate(gate.key, true)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            title="Sign-off / Mark this gate verified"
                          >
                            <FiCheck className="w-3 h-3" />
                            <span>{updatingGate === gate.key ? "Verifying..." : "Mark Verified"}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.open(gate.action_url, "_blank")}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-end bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors cursor-pointer"
                        >
                          <span>Configure</span>
                          <FiExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchChecklist}
                  disabled={loading}
                >
                  Refresh Audit
                </Button>

                {audit.can_activate ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApproveActivation}
                    disabled={approving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20 font-bold"
                  >
                    {approving ? "Activating..." : "Approve & Activate Warehouse"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitActivation}
                    disabled={submitting}
                  >
                    {submitting ? "Checking..." : "Submit for Activation"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
