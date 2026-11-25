import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FiUser, FiMail, FiPhone, FiLock, FiBriefcase, FiCheckCircle, FiLoader, FiZap } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ResellerRegister() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    business_name:    "",
    contact_person:   "",
    email:            "",
    mobile:           "",
    password:         "",
    gst_number:       "",
    reseller_type_id: "",
    commercial_mode:  "commission",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/india/v1/reseller/types`)
      .then((res) => {
        if (res.data?.status === "success") setTypes(res.data.data);
      })
      .catch(() => console.error("Could not fetch reseller types"));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/india/v1/reseller/auth/register`, {
        ...form,
        email: form.email.trim().toLowerCase(),
        gst_number: form.gst_number.trim().toUpperCase(),
      });

      if (res.data?.status === "success") {
        setSuccess(true);
        setTimeout(() => navigate("/reseller-portal/login"), 2500);
      } else {
        setError(res.data?.message || "Registration failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please verify information.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-surface border border-border rounded-3xl p-8 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <FiZap size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Become a Solar Reseller Partner</h1>
          <p className="text-sm text-text-muted">Register your business account for wholesale margins & commissions</p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-success-soft border border-success/20 text-center space-y-2">
            <FiCheckCircle className="text-success mx-auto" size={40} />
            <h3 className="text-base font-bold text-success">Application Submitted Successfully!</h3>
            <p className="text-xs text-text-secondary">Redirecting to login portal...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-danger-soft text-danger text-xs font-semibold border border-danger/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Company Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Solar Energy Pvt Ltd"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Rajesh Kumar"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Business Email *</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh@apexsolar.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Mobile / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">GSTIN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="27ABCDE1234F1Z5"
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Reseller Type *</label>
                <select
                  required
                  value={form.reseller_type_id}
                  onChange={(e) => setForm({ ...form, reseller_type_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select Reseller Type...</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Preferred Operating Mode *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, commercial_mode: "commission" })}
                  className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.commercial_mode === "commission" ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-border bg-bg text-text-muted"
                  }`}
                >
                  Commission Mode (Refer & Earn)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, commercial_mode: "dealer" })}
                  className={`p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.commercial_mode === "dealer" ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-border bg-bg text-text-muted"
                  }`}
                >
                  Dealer Mode (Wholesale Buy)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <FiLoader className="animate-spin" size={18} /> : "Submit Reseller Application"}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-text-muted">
          Already have a reseller account?{" "}
          <Link to="/reseller-portal/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
