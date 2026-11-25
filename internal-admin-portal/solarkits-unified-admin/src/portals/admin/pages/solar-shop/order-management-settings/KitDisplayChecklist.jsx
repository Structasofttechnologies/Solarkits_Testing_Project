import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaCheckSquare,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBan,
  FaEye,
  FaSearch,
  FaBoxOpen,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import ToggleButton from "@/components/ToggleButton";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

// Default Master Checklist
const DEFAULT_CHECKLIST_RULES = [
  {
    id: "chk-1",
    name: "BOM Configuration Complete",
    description: "All sub-components (Panels, Inverter, Structure, Cables) defined with valid quantities.",
    type: "Mandatory",
    category: "BOM",
    status: "Active",
  },
  {
    id: "chk-2",
    name: "Pricing & GST Verified",
    description: "Base rate, markup margin, and applicable GST rate (5%/12%/18%) set and locked.",
    type: "Mandatory",
    category: "Price-GST",
    status: "Active",
  },
  {
    id: "chk-3",
    name: "High-Resolution Images Uploaded",
    description: "At least 3 clear product/system renders or photos uploaded.",
    type: "Optional",
    category: "Images",
    status: "Active",
  },
  {
    id: "chk-4",
    name: "State/Cluster Region Mapping",
    description: "At least one regional cluster or warehouse is assigned for fulfillment.",
    type: "Mandatory",
    category: "Region",
    status: "Active",
  },
  {
    id: "chk-5",
    name: "Physical or Reserved Stock Available",
    description: "BOM parts have available stock balance >= 1 full kit.",
    type: "Mandatory",
    category: "Stock",
    status: "Active",
  },
  {
    id: "chk-6",
    name: "Datasheet & Warranty Card Attached",
    description: "Manufacturer warranty documentation PDF linked.",
    type: "Optional",
    category: "Documentation",
    status: "Active",
  },
];

// Sample Kits for Audit Check
const SAMPLE_KITS = [
  {
    id: "KIT-ON-3KW-01",
    name: "3kW On-Grid Residential Solar Combo",
    kit_type: "Combo Kit",
    sku: "SK-ONGRID-3KW-DLR",
    checks: {
      "chk-1": true,
      "chk-2": true,
      "chk-3": true,
      "chk-4": true,
      "chk-5": true,
      "chk-6": true,
    },
  },
  {
    id: "KIT-HYB-5KW-02",
    name: "5kW Hybrid Commercial Kit (BOS Included)",
    kit_type: "Combo Kit",
    sku: "SK-HYB-5KW-IND",
    checks: {
      "chk-1": true,
      "chk-2": true,
      "chk-3": false,
      "chk-4": true,
      "chk-5": false, // Fails mandatory stock check!
      "chk-6": true,
    },
  },
  {
    id: "KIT-OFF-10KW-03",
    name: "10kW Off-Grid Farmhouse Power Solution",
    kit_type: "Customize Kit",
    sku: "SK-OFF-10KW-FARM",
    checks: {
      "chk-1": true,
      "chk-2": false, // Fails mandatory price check!
      "chk-3": true,
      "chk-4": false, // Fails mandatory region check!
      "chk-5": true,
      "chk-6": false,
    },
  },
];

export default function KitDisplayChecklist() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(false);
  const [checklistRules, setChecklistRules] = useState(DEFAULT_CHECKLIST_RULES);
  const [kits, setKits] = useState(SAMPLE_KITS);
  const [selectedKitId, setSelectedKitId] = useState(SAMPLE_KITS[0].id);

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    name: "",
    description: "",
    type: "Mandatory",
    category: "BOM",
    status: "Active",
  });

  const selectedKit = kits.find((k) => k.id === selectedKitId) || kits[0];

  // Evaluate if kit is blocked for display
  const mandatoryRules = checklistRules.filter(
    (r) => r.type === "Mandatory" && r.status === "Active"
  );
  const failedMandatory = mandatoryRules.filter(
    (rule) => selectedKit.checks[rule.id] !== true
  );
  const isKitBlocked = failedMandatory.length > 0;

  const handleOpenRuleModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({ ...rule });
    } else {
      setEditingRule(null);
      setRuleFormData({
        name: "",
        description: "",
        type: "Mandatory",
        category: "BOM",
        status: "Active",
      });
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    if (!ruleFormData.name) {
      dispatch(setAlert({ type: "warning", message: "Rule name is required" }));
      return;
    }

    if (editingRule) {
      setChecklistRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? { ...r, ...ruleFormData } : r))
      );
      dispatch(setAlert({ type: "success", message: "Rule updated successfully!" }));
    } else {
      const newRule = {
        ...ruleFormData,
        id: `chk-${Date.now()}`,
      };
      setChecklistRules((prev) => [...prev, newRule]);
      dispatch(setAlert({ type: "success", message: "New rule added!" }));
    }
    setIsRuleModalOpen(false);
  };

  const handleDeleteRule = (id) => {
    setChecklistRules((prev) => prev.filter((r) => r.id !== id));
    dispatch(setAlert({ type: "info", message: "Checklist rule removed" }));
  };

  const handleToggleKitCheck = (ruleId) => {
    setKits((prev) =>
      prev.map((k) => {
        if (k.id === selectedKit.id) {
          return {
            ...k,
            checks: {
              ...k.checks,
              [ruleId]: !k.checks[ruleId],
            },
          };
        }
        return k;
      })
    );
    dispatch(setAlert({ type: "info", message: "Kit check status toggled" }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaCheckSquare className="text-primary" /> Kit Ready-to-Display Checklist
          </h2>
          <p className="text-text-secondary text-sm">
            Control automated verification gates ensuring kits have complete BOM, approved rates, images, and stock before going live.
          </p>
        </div>

        <Button onClick={() => handleOpenRuleModal()} className="flex items-center gap-2">
          <FaPlus /> Add Checklist Item
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Checklist Master Rules (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text-primary text-base">Checklist Master Criteria</h3>
                <p className="text-xs text-text-secondary">
                  Mandatory items will automatically block kit display if missing.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-bg text-text-secondary border border-border">
                {checklistRules.length} Criteria Defined
              </span>
            </div>

            <div className="space-y-3">
              {checklistRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-lg bg-bg/60 border border-border/80 flex items-start justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary text-sm">{rule.name}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          rule.type === "Mandatory"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}
                      >
                        {rule.type}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-text-secondary font-mono">
                        {rule.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{rule.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenRuleModal(rule)}
                      className="p-1.5 hover:bg-surface rounded text-text-secondary hover:text-primary transition-colors"
                      title="Edit Criterion"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-surface rounded text-text-secondary hover:text-red-500 transition-colors"
                      title="Delete Criterion"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Per-Kit Verification Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                <FaBoxOpen className="text-primary" /> Live Kit Audit Status
              </h3>
              <p className="text-xs text-text-secondary">
                Select a kit to inspect its display eligibility and readiness.
              </p>
            </div>

            {/* Kit Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Select Kit to Audit:
              </label>
              <select
                value={selectedKitId}
                onChange={(e) => setSelectedKitId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
              >
                {kits.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Display Blocked Warning or Success Banner */}
            {isKitBlocked ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <FaBan className="text-red-500 text-lg shrink-0" />
                  <span>KIT BLOCKED FOR STORE DISPLAY</span>
                </div>
                <p className="text-xs text-red-600/90">
                  This kit fails {failedMandatory.length} mandatory requirement(s). It cannot be made visible on the customer portal until resolved:
                </p>
                <ul className="text-xs list-disc list-inside space-y-0.5 font-medium">
                  {failedMandatory.map((f) => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center gap-3">
                <FaCheckCircle className="text-emerald-500 text-2xl shrink-0" />
                <div>
                  <div className="font-bold text-sm">READY FOR STORE DISPLAY</div>
                  <div className="text-xs opacity-90">All mandatory checklist items are validated and passed.</div>
                </div>
              </div>
            )}

            {/* Per-Rule Check Item Breakdown for this Kit */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold uppercase text-text-secondary tracking-wider">
                Readiness Breakdown ({selectedKit.name})
              </div>

              {checklistRules.map((rule) => {
                const isPassed = selectedKit.checks[rule.id] === true;
                return (
                  <div
                    key={rule.id}
                    onClick={() => handleToggleKitCheck(rule.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-bg/50 border border-border hover:bg-bg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isPassed ? (
                        <FaCheckCircle className="text-emerald-500 shrink-0" />
                      ) : rule.type === "Mandatory" ? (
                        <FaTimesCircle className="text-red-500 shrink-0" />
                      ) : (
                        <FaExclamationTriangle className="text-amber-500 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-medium text-text-primary">{rule.name}</div>
                        <div className="text-[10px] text-text-secondary">{rule.category}</div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isPassed
                          ? "text-emerald-600 bg-emerald-500/10"
                          : rule.type === "Mandatory"
                          ? "text-red-600 bg-red-500/10"
                          : "text-amber-600 bg-amber-500/10"
                      }`}
                    >
                      {isPassed ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Rule Add/Edit */}
      {isRuleModalOpen && (
        <Dialog
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          title={editingRule ? "Edit Checklist Criterion" : "Add Checklist Criterion"}
        >
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Criterion Name *
              </label>
              <CustomInput
                placeholder="e.g. BOM Configuration Complete"
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Description & Instructions
              </label>
              <textarea
                placeholder="What must be present or verified..."
                value={ruleFormData.description}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Enforcement Type
                </label>
                <select
                  value={ruleFormData.type}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Mandatory">Mandatory (Blocks Display)</option>
                  <option value="Optional">Optional (Recommendation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={ruleFormData.category}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="BOM">BOM</option>
                  <option value="Price-GST">Price & GST</option>
                  <option value="Images">Images</option>
                  <option value="Region">Region / Cluster</option>
                  <option value="Stock">Stock Balance</option>
                  <option value="Documentation">Documentation</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setIsRuleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Criterion</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
