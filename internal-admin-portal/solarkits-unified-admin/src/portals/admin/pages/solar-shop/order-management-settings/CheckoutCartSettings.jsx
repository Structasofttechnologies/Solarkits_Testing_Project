import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaSlidersH, FaSave, FaHourglassHalf, FaPercent
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function CheckoutCartSettings() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    enable_checkout_timer: true,
    checkout_timer_duration: 20,
    gst_rate: 12,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/solarshop/checkout-cart-settings?req_for=view&unique_id=ADM_ORDER_SETTINGS`, { headers: authHeaderObj() });
      if (res.data?.status === "success" && res.data.data) {
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error("Error loading checkout settings:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load checkout settings." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();

    // Validations
    if (settings.checkout_timer_duration < 5 || settings.checkout_timer_duration > 60) {
      dispatch(setAlert({ type: "warning", message: "Checkout timer duration must be between 5 and 60 minutes." }));
      return;
    }
    if (settings.gst_rate !== undefined && (settings.gst_rate < 0 || settings.gst_rate > 28)) {
      dispatch(setAlert({ type: "warning", message: "Default GST rate must be between 0% and 28%." }));
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/solarshop/checkout-cart-settings?req_for=edit&unique_id=ADM_ORDER_SETTINGS`, settings, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Checkout settings saved successfully!" }));
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error("Error saving checkout settings:", error);
      dispatch(setAlert({ type: "error", message: "Failed to save checkout settings." }));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FaSlidersH className="text-primary" /> Checkout & Cart Settings
        </h2>
        <p className="text-text-secondary text-sm">
          Configure checkout reservation timers and duration.
        </p>
      </div>

      {loading ? (
        <Loader text="Loading settings..." />
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-xl">

          {/* Checkout Reservation Settings */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-text-primary text-lg flex items-center gap-2 border-b border-border pb-3">
              <FaHourglassHalf className="text-primary" /> Checkout Reservation Settings
            </h3>

            <CustomInput
              label="Reservation Duration (Minutes) *"
              type="number"
              value={settings.checkout_timer_duration}
              onChange={(e) => handleChange("checkout_timer_duration", Number(e.target.value))}
              min="5"
              max="60"
              required
              helperText="Minimum 5 minutes, Maximum 60 minutes."
            />

          </div>

          {/* Platform Default GST Tax Settings */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-text-primary text-lg flex items-center gap-2 border-b border-border pb-3">
              <FaPercent className="text-primary" /> Platform Default GST Tax Settings
            </h3>

            <CustomInput
              label="Default Platform GST Rate (%) *"
              type="number"
              step="0.1"
              value={settings.gst_rate !== undefined ? settings.gst_rate : 12}
              onChange={(e) => handleChange("gst_rate", Number(e.target.value))}
              min="0"
              max="28"
              required
              helperText="Fallback GST rate for equipment/kits when no specific warehouse margin GST rate is defined. Standard goods: 12% | Concessional: 5% | Composite Turnkey: 13.8% | Standard Service: 18%."
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<FaSave />}
              loading={saving}
              className="px-8 py-3 shadow-md"
            >
              Save Configurations
            </Button>
          </div>

        </form>
      )}
    </div>
  );
}
