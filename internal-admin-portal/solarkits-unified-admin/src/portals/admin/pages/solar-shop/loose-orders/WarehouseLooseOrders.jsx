import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaBoxes,
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
  FaToggleOn,
  FaToggleOff,
  FaInfoCircle
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehouseLooseOrders({ moduleUniqueId = "ADM_LOOSE_ORDERS" }) {
  const { countryName, warehouseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isWarehousePanel = location.pathname.startsWith("/warehouse-management-panel");
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [warehouse, setWarehouse] = useState(null);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [formData, setFormData] = useState({
    is_loose_order_enabled: true,
    min_order_quantity: 1,
    max_order_quantity: 100,
    allow_loose_panels: true,
    allow_loose_inverters: true,
    allow_loose_batteries: true,
    allow_loose_bos: true,
    loose_markup_percentage: 5,
    custom_notes: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const isIndia = isWarehousePanel || (countryName || "india").toLowerCase() === "india" || (countryName || "").toLowerCase() === "in";
      const endpoint = isIndia ? "india/loose-order-settings" : "loose-order-settings";

      const [countriesRes, warehousesRes, settingsRes] = await Promise.all([
        axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=ADM_CO_MARGIN&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/warehouses?unique_id=ADM_CO_MARGIN&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(`${API_URL}/solarshop/${endpoint}/warehouse/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }).catch(() => ({ data: { data: null } }))
      ]);

      const activeCountries = countriesRes.data?.countries || [];
      const foundCountry = activeCountries.find(
        (c) => c.name.toLowerCase() === (countryName || "india")?.toLowerCase()
      ) || activeCountries[0];
      setCountryObj(foundCountry);

      const allWarehouses = warehousesRes.data?.warehouses || [];
      const wh = allWarehouses.find((w) => (w.id || w._id)?.toString() === warehouseId?.toString());
      setWarehouse(wh);

      if (settingsRes.data?.data) {
        setFormData({
          is_loose_order_enabled: settingsRes.data.data.is_loose_order_enabled ?? true,
          min_order_quantity: settingsRes.data.data.min_order_quantity ?? 1,
          max_order_quantity: settingsRes.data.data.max_order_quantity ?? 100,
          allow_loose_panels: settingsRes.data.data.allow_loose_panels ?? true,
          allow_loose_inverters: settingsRes.data.data.allow_loose_inverters ?? true,
          allow_loose_batteries: settingsRes.data.data.allow_loose_batteries ?? true,
          allow_loose_bos: settingsRes.data.data.allow_loose_bos ?? true,
          loose_markup_percentage: settingsRes.data.data.loose_markup_percentage ?? 5,
          custom_notes: settingsRes.data.data.custom_notes || ""
        });
      }
    } catch (error) {
      console.error("Error loading warehouse loose order config:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load loose order configuration" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, warehouseId, countryName]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isIndia = (countryName || "india").toLowerCase() === "india" || (countryName || "").toLowerCase() === "in";
      const endpoint = isIndia ? "india/loose-order-settings" : "loose-order-settings";

      await axios.post(
        `${API_URL}/solarshop/${endpoint}/save`,
        {
          warehouse_id: warehouseId,
          country_id: countryObj?.id,
          ...formData
        },
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({ type: "success", message: "Loose Order settings saved successfully!" }));
    } catch (error) {
      console.error("Error saving loose order settings:", error);
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to save settings" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="card p-6 bg-surface border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isWarehousePanel) {
                navigate('/warehouse-management-panel/loose-orders');
              } else {
                navigate(`/admin-panel/solar-shop/${countryName?.toLowerCase()}/loose-orders`);
              }
            }}
            className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-muted hover:text-primary transition-colors"
          >
            <FaArrowLeft />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
              <FaBoxes /> Loose Order Configuration
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {warehouse ? warehouse.warehouse_code || warehouse.name : "Warehouse Setup"}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {warehouse?.address} • {warehouse?.state_name || warehouse?.state || "N/A"} ({warehouse?.cluster_name || warehouse?.cluster || "General Cluster"})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {countryObj && (
            <div className="bg-surface-hover px-3.5 py-1.5 rounded-full border border-border flex items-center gap-2 text-xs font-bold text-text-primary">
              <ReactCountryFlag countryCode={countryObj.iso2} svg className="w-4 h-4 rounded-xs" />
              {countryObj.name}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Loader text="Loading loose orders configuration..." />
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 border border-border space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-text-primary">Loose Orders Status</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Enable or disable standalone component loose purchases for this warehouse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_loose_order_enabled: !formData.is_loose_order_enabled })}
                  className={`text-3xl transition-colors ${formData.is_loose_order_enabled ? "text-primary" : "text-text-muted"}`}
                >
                  {formData.is_loose_order_enabled ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>

              {/* Order Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">
                    Minimum Order Quantity (MOQ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.min_order_quantity}
                    onChange={(e) => setFormData({ ...formData, min_order_quantity: Number(e.target.value) })}
                    className="w-full bg-surface-hover/50 border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">
                    Maximum Order Quantity (Per Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.max_order_quantity}
                    onChange={(e) => setFormData({ ...formData, max_order_quantity: Number(e.target.value) })}
                    className="w-full bg-surface-hover/50 border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Component Categories Allowed */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  Allowed Component Types for Loose Orders
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "allow_loose_panels", label: "Solar Panels" },
                    { key: "allow_loose_inverters", label: "Inverters" },
                    { key: "allow_loose_batteries", label: "Batteries" },
                    { key: "allow_loose_bos", label: "BOS Components" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, [item.key]: !formData[item.key] })}
                      className={`p-3.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        formData[item.key]
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-surface-hover/40 border-border text-text-muted"
                      }`}
                    >
                      <span>{item.label}</span>
                      {formData[item.key] ? <FaCheckCircle className="text-primary" /> : <FaTimesCircle />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Markup Percentage */}
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Loose Order Markup Margin (%)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={formData.loose_markup_percentage}
                    onChange={(e) => setFormData({ ...formData, loose_markup_percentage: Number(e.target.value) })}
                    className="w-full bg-surface-hover/50 border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-primary pr-8 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted font-bold">%</span>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Additional percentage applied to baseline SKU prices for loose item handling.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Warehouse Policy Remarks
                </label>
                <textarea
                  rows={3}
                  value={formData.custom_notes}
                  onChange={(e) => setFormData({ ...formData, custom_notes: e.target.value })}
                  placeholder="Special instructions, handling notes, or warehouse restrictions..."
                  className="w-full bg-surface-hover/50 border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="gap-2 px-6"
                >
                  <FaSave />
                  {saving ? "Saving Changes..." : "Save Loose Order Settings"}
                </Button>
              </div>
            </div>
          </div>

          {/* Side Info */}
          <div className="space-y-4">
            <div className="card p-5 border border-border bg-surface-hover/30 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-primary text-sm">
                <FaInfoCircle /> Loose Orders Policy
              </div>
              <p className="text-text-secondary leading-relaxed">
                Loose orders allow EPC contractors and registered clients to order single units or small lots of individual components without needing full pre-configured combo kit bundles.
              </p>
              <div className="p-3 bg-surface rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-text-muted">Status:</span>
                  <span className={formData.is_loose_order_enabled ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                    {formData.is_loose_order_enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-text-muted">MOQ:</span>
                  <span className="font-bold text-text-primary">{formData.min_order_quantity} Units</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-text-muted">Applied Markup:</span>
                  <span className="font-bold text-primary font-mono">{formData.loose_markup_percentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
