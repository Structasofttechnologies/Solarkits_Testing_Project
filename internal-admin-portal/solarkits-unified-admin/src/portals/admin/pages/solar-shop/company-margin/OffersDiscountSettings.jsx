import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FiTag, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight,
  FiAlertTriangle, FiCheck, FiSearch, FiCalendar,
} from "react-icons/fi";
import { FaPercent } from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import CustomTable from "@/components/CustomTable";
import Dialog from "@/components/Dialog";
import Loader from "@/components/Loader";

const API_URL = import.meta.env.VITE_API_URL;
const EMPTY_FORM = {
  offer_name: "", offer_type: "discount", discount_type: "percent",
  discount_value: "", start_date: "", end_date: "",
  state_id: "", district_id: "", combo_kit_id: "",
  max_discount_pct: "", is_active: true,
};

const OFFER_TYPES = [
  { value: "discount", text: "Standard Discount" },
  { value: "sales_day", text: "Sales Day Offer" },
  { value: "bundle", text: "Bundle Offer" },
  { value: "coupon", text: "Coupon Code" },
];

export default function OffersDiscountSettings({ moduleUniqueId = "ADM_CO_MARGIN" }) {
  const dispatch = useDispatch();
  const { countryName } = useParams();
  const token = useSelector((s) => s.auth.token);

  const [offers, setOffers] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [marginImpact, setMarginImpact] = useState(null);
  const [marginWarn, setMarginWarn] = useState(false);
  const [filterState, setFilterState] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const fetchOffers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => ({ data: { countries: [] } }));

      const allCountries = countriesRes.data?.countries || [];
      const current = allCountries.find(
        (c) => c.name?.toLowerCase() === countryName?.toLowerCase()
      ) || allCountries[0] || null;

      const isIndia = current?.iso2?.toLowerCase() === "in" || current?.name?.toLowerCase() === "india";

      const [offersRes, statesRes, kitsRes] = await Promise.all([
        axios.get(`${API_URL}/solarshop/offers?unique_id=${moduleUniqueId}&req_for=view`, {
          headers: authHeaderObj(),
        }).catch((e) => {
          console.error("Failed to load offers:", e);
          return { data: { data: [] } };
        }),

        current ? axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: current.id || current._id },
          { headers: authHeaderObj() }
        ).catch((e) => {
          console.error("Failed to load states:", e);
          return { data: { states: [] } };
        }) : Promise.resolve({ data: { states: [] } }),

        current ? axios.get(
          `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${current.id || current._id}`,
          { headers: authHeaderObj() }
        ).catch((e) => {
          console.error("Failed to load kits:", e);
          return { data: { data: [] } };
        }) : Promise.resolve({ data: { data: [] } }),
      ]);

      const rawKits = kitsRes.data?.data || [];
      const seenKitNames = new Set();
      const cleanKits = rawKits.filter((k) => {
        const nameKey = (k.name || k.kit_name || "").trim().toLowerCase();
        if (!nameKey || seenKitNames.has(nameKey)) return false;
        seenKitNames.add(nameKey);
        return true;
      });

      setOffers(offersRes.data?.data || []);
      setStates(statesRes.data?.states || []);
      setKits(cleanKits);
    } catch (err) {
      console.error("Failed to load offers data:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load offers data" }));
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId, countryName, token, dispatch]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Fetch districts when state changes in form
  useEffect(() => {
    if (!form.state_id) {
      setDistricts([]);
      return;
    }
    axios
      .get(`${API_URL}/geolocation/clusters/${form.state_id}?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj(),
      })
      .then((r) => setDistricts(r.data?.clusters || []))
      .catch((e) => {
        console.error("Failed to load clusters:", e);
        setDistricts([]);
      });
  }, [form.state_id, moduleUniqueId]);

  // Compute margin impact whenever discount_value changes
  useEffect(() => {
    if (!form.combo_kit_id || !form.discount_value) {
      setMarginImpact(null);
      setMarginWarn(false);
      return;
    }
    const discountVal = parseFloat(form.discount_value) || 0;
    const maxDiscount = parseFloat(form.max_discount_pct) || 100;
    const standardMargin = 10; // Standard company margin benchmark
    const effectiveMargin = Math.max(0, standardMargin - discountVal);
    const minAcceptable = 5;

    setMarginImpact({
      standard: standardMargin,
      discount: discountVal,
      effective: effectiveMargin,
      belowMin: effectiveMargin < minAcceptable,
      maxAllowed: maxDiscount,
    });
    setMarginWarn(effectiveMargin < minAcceptable);
  }, [form.discount_value, form.max_discount_pct, form.combo_kit_id]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMarginImpact(null);
    setMarginWarn(false);
    setShowModal(true);
  };

  const openEdit = (offer) => {
    setEditingId(offer._id || offer.id);
    setForm({
      offer_name:       offer.offer_name || "",
      offer_type:       offer.offer_type || "discount",
      discount_type:    offer.discount_type || "percent",
      discount_value:   String(offer.discount_value || ""),
      start_date:       offer.start_date ? offer.start_date.split("T")[0] : "",
      end_date:         offer.end_date ? offer.end_date.split("T")[0] : "",
      state_id:         offer.state_id || "",
      district_id:      offer.district_id || offer.cluster_id || "",
      combo_kit_id:     offer.products_applicable?.[0] || "",
      max_discount_pct: String(offer.max_discount_pct || ""),
      is_active:        offer.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.offer_name.trim()) {
      dispatch(setAlert({ type: "warning", message: "Offer name is required" }));
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      dispatch(setAlert({ type: "warning", message: "Discount value must be > 0" }));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        offer_name:          form.offer_name.trim(),
        offer_type:          form.offer_type,
        discount_type:       form.discount_type,
        discount_value:      parseFloat(form.discount_value),
        start_date:          form.start_date || null,
        end_date:            form.end_date || null,
        cluster_id:          form.district_id || null,
        products_applicable: form.combo_kit_id ? [form.combo_kit_id] : [],
        priority:            4,
        is_active:           form.is_active,
      };
      if (editingId) {
        await axios.put(
          `${API_URL}/solarshop/offers/${editingId}?unique_id=${moduleUniqueId}&req_for=edit`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Offer updated successfully" }));
      } else {
        await axios.post(
          `${API_URL}/solarshop/offers?unique_id=${moduleUniqueId}&req_for=add`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Offer created successfully" }));
      }
      setShowModal(false);
      fetchOffers();
    } catch (err) {
      console.error("Save offer error:", err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to save offer" }));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (offer) => {
    try {
      await axios.put(
        `${API_URL}/solarshop/offers/${offer._id || offer.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        { is_active: !offer.is_active },
        { headers: authHeaderObj() }
      );
      dispatch(setAlert({ type: "success", message: `Offer ${offer.is_active ? "deactivated" : "activated"}` }));
      fetchOffers();
    } catch (e) {
      console.error("Toggle offer status error:", e);
      dispatch(setAlert({ type: "error", message: "Failed to toggle offer status" }));
    }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Delete offer "${offer.offer_name}"?`)) return;
    try {
      await axios.delete(
        `${API_URL}/solarshop/offers/${offer._id || offer.id}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );
      dispatch(setAlert({ type: "success", message: "Offer deleted" }));
      fetchOffers();
    } catch (e) {
      console.error("Delete offer error:", e);
      dispatch(setAlert({ type: "error", message: "Failed to delete offer" }));
    }
  };

  const filtered = offers.filter((o) => {
    if (filterState && o.state_id !== filterState) return false;
    if (filterActive === "active" && !o.is_active) return false;
    if (filterActive === "inactive" && o.is_active) return false;
    return true;
  });

  const tableHeaders = [
    { key: "offer_name", label: "Offer Name" },
    { key: "type_disc", label: "Type / Discount" },
    { key: "validity", label: "Validity" },
    { key: "scope", label: "Scope" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", align: "right" },
  ];

  const f = form;
  const setF = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative rounded-2xl bg-linear-120 from-warning to-warning-hover shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]" />
        <div className="relative px-6 py-7 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FiTag className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Offers & Discount Settings</h1>
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Manage discount offers with live margin impact preview before activation.
              </p>
            </div>
          </div>
          <Button
            onClick={openAdd}
            variant="secondary"
            leftIcon={<FiPlus />}
            className="bg-white text-warning border-white hover:bg-white/90 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
          >
            New Offer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-2 border-border p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex-1 w-full">
          <Dropdown
            label="Filter by State"
            value={filterState}
            onChange={setFilterState}
            placeholder="All States"
            options={[
              { value: "", text: "All States" },
              ...states.map((s) => ({ value: s.id || s._id, text: s.name }))
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <Dropdown
            label="Status"
            value={filterActive}
            onChange={setFilterActive}
            options={[
              { value: "all", text: "All Offers" },
              { value: "active", text: "Active Only" },
              { value: "inactive", text: "Inactive Only" },
            ]}
          />
        </div>
        {(filterState || filterActive !== "all") && (
          <Button
            variant="secondary"
            onClick={() => { setFilterState(""); setFilterActive("all"); }}
            className="mt-5 md:mt-0 rounded-xl text-xs cursor-pointer"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <FiTag className="text-warning" /> Configured Offers
          </h2>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
            {filtered.length} Offers
          </span>
        </div>
        <div className="p-4">
          {loading ? (
            <Loader text="Loading offers..." />
          ) : (
            <CustomTable
              headers={tableHeaders}
              data={filtered}
              emptyMessage="No offers configured yet. Click 'New Offer' to create one."
              containerClassName="border-none shadow-none rounded-none bg-transparent"
              renderRow={(offer) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-black text-text-primary text-sm">{offer.offer_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                        {offer.offer_type?.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-warning text-sm flex items-center gap-1">
                        <FaPercent size={10} />
                        {offer.discount_value}
                        {offer.discount_type === "percent" ? "%" : " ₹"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-text-secondary font-medium whitespace-nowrap">
                      <span>{offer.start_date ? new Date(offer.start_date).toLocaleDateString("en-IN") : "—"}</span>
                      <span className="text-text-muted">to {offer.end_date ? new Date(offer.end_date).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary font-medium">
                      {offer.cluster_id ? `Cluster ${offer.cluster_id}` : "All Regions"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        offer.is_active
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-danger/10 text-danger border-danger/20"
                      }`}
                    >
                      {offer.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(offer)}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10 cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggle(offer)}
                        className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                          offer.is_active
                            ? "bg-warning/10 text-warning hover:bg-warning/20 border-warning/10"
                            : "bg-success/10 text-success hover:bg-success/20 border-success/10"
                        }`}
                        title={offer.is_active ? "Deactivate" : "Activate"}
                      >
                        {offer.is_active ? <FiToggleRight size={13} /> : <FiToggleLeft size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(offer)}
                        className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/10 cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Offer" : "Create New Offer"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <CustomInput
                label="Offer Name *"
                value={f.offer_name}
                onChange={(e) => setF("offer_name", e.target.value)}
                placeholder="e.g. Summer Flash Sale 2026"
              />
            </div>
            <Dropdown
              label="Offer Type"
              value={f.offer_type}
              onChange={(v) => setF("offer_type", v)}
              options={OFFER_TYPES}
            />
            <CustomInput
              label="Discount Value (%) *"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={f.discount_value}
              onChange={(e) => setF("discount_value", e.target.value)}
              placeholder="e.g. 5"
              prefix={<FaPercent className="text-text-muted text-[10px]" />}
            />
            <CustomInput
              label="Start Date"
              type="date"
              value={f.start_date}
              onChange={(e) => setF("start_date", e.target.value)}
            />
            <CustomInput
              label="End Date"
              type="date"
              value={f.end_date}
              onChange={(e) => setF("end_date", e.target.value)}
            />
            <Dropdown
              label="State"
              value={f.state_id}
              onChange={(v) => {
                setF("state_id", v);
                setF("district_id", "");
              }}
              placeholder="All States"
              options={[
                { value: "", text: "All States" },
                ...states.map((s) => ({ value: s.id || s._id, text: s.name }))
              ]}
            />
            <Dropdown
              label="District / Cluster"
              value={f.district_id}
              onChange={(v) => setF("district_id", v)}
              placeholder={f.state_id ? "All Districts" : "Select state first"}
              disabled={!f.state_id}
              options={[
                { value: "", text: "All Districts" },
                ...districts.map((d) => ({ value: d.id || d._id, text: d.name }))
              ]}
            />
            <div className="md:col-span-2">
              <Dropdown
                label="Kit (leave blank for all kits)"
                value={f.combo_kit_id}
                onChange={(v) => setF("combo_kit_id", v)}
                placeholder="All Kits"
                options={[
                  { value: "", text: "All Kits" },
                  ...kits.map((k) => ({ value: k.id || k._id, text: k.name || k.kit_name || "Kit" }))
                ]}
              />
            </div>
            <CustomInput
              label="Max Discount Allowed (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={f.max_discount_pct}
              onChange={(e) => setF("max_discount_pct", e.target.value)}
              placeholder="Leave blank for no cap"
            />
          </div>

          {/* Margin Impact Preview */}
          {marginImpact && (
            <div className={`p-4 rounded-xl border ${marginWarn ? "border-danger/30 bg-danger/5" : "border-primary/20 bg-primary/5"}`}>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                {marginWarn ? <FiAlertTriangle className="text-danger" /> : <FiCheck className="text-success" />}
                Margin Impact Preview
              </p>
              <div className="font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Standard Company Margin</span>
                  <span className="font-bold text-text-primary">{marginImpact.standard}%</span>
                </div>
                <div className="flex justify-between text-warning">
                  <span>Offer Discount</span>
                  <span className="font-bold">− {marginImpact.discount}%</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className={`flex justify-between font-black ${marginWarn ? "text-danger" : "text-success"}`}>
                  <span>Effective Company Margin</span>
                  <span>{marginImpact.effective.toFixed(2)}%</span>
                </div>
              </div>
              {marginWarn && (
                <p className="text-danger text-[11px] font-bold mt-2 flex items-center gap-1.5">
                  <FiAlertTriangle />
                  Warning: Effective margin is below minimum acceptable threshold (5%).
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="flex-1 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg cursor-pointer"
            >
              {editingId ? "Update Offer" : "Create Offer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
