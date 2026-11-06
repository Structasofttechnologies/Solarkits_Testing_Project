import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosInstance from "../../utils/axiosInstance";
import {
  FiArrowRight,
  FiMail,
  FiMapPin,
  FiPhone,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiSend,
} from "react-icons/fi";
import logo from "../../assets/images/logo.png";

const SHOP_LINKS = [
  "On-Grid Solar Kits",
  "Off-Grid Solar Kits",
  "Hybrid Solar Kits",
  "Commercial Solar Kits",
];

export default function Footer({ footerConfig }) {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const boxBadge = footerConfig?.consultation_box?.badge || "BULK ORDER & EPC INQUIRY";
  const boxHeading = footerConfig?.consultation_box?.heading || "Want to Order Bulk Solar Kits? Send Query to Us";
  const boxSubtitle = footerConfig?.consultation_box?.subtitle || "Direct B2B wholesale pricing, pan-India fast dispatch & dedicated BDE engineer assigned to your account.";
  const boxBtn = footerConfig?.consultation_box?.button_text || "Send Bulk Query";

  const description = footerConfig?.description || "Quality solar kits, honest guidance and reliable support for homes, farms and businesses across India.";
  const phone = footerConfig?.phone || "+91 77779 39842";
  const email = footerConfig?.email || "ravi.s@sunnovative.com";
  const address = footerConfig?.address || "1 Tirupati Ind area, 150 Feet Ring Rd, behind patidar auto consultant, near Umiya chowk, Rajkot, Gujarat 360004";

  const shopLinks = footerConfig?.shop_links && footerConfig.shop_links.length > 0 ? footerConfig.shop_links : SHOP_LINKS;
  const copyright = footerConfig?.copyright_text || `© ${new Date().getFullYear()} SolarKits™ Pvt. Ltd. All Rights Reserved.`;

  // Bulk Lead Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    state_name: "",
    pincode: "",
  });
  const [statesList, setStatesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch states live from Setup Location API
  useEffect(() => {
    let isMounted = true;
    const fetchStates = async () => {
      try {
        // Try active-states endpoint first, fallback to geo/states
        const res = await axios.get(`${apiBase}/india/v1/website-leads/active-states`).catch(() => {
          return axios.get(`${apiBase}/india/v1/geo/states`);
        });
        if (isMounted && res.data) {
          const list = res.data.states || [];
          setStatesList(list);
        }
      } catch (err) {
        console.warn("Could not load states for bulk form:", err.message);
      }
    };
    fetchStates();
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Please enter your name or company name.");
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!formData.state_name) {
      setErrorMsg("Please select your state from the dropdown.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: cleanPhone.slice(-10),
        state_name: formData.state_name,
        pincode: formData.pincode.trim() || undefined,
        estimated_quantity: formData.pincode.trim() || "Bulk Order (5+ Kits)",
        project_type: "Bulk Solar Combo Kits",
      };

      let res;
      try {
        res = await axiosInstance.post("/india/v1/website-leads/submit", payload);
      } catch (axErr) {
        // Fallback to direct absolute URL if axiosInstance fails
        res = await axios.post(`${apiBase}/india/v1/website-leads/submit`, payload);
      }

      if (res.data?.success) {
        setSuccessData(res.data.data);
        setFormData({ name: "", phone: "", state_name: "", pincode: "" });
      } else {
        setErrorMsg(res.data?.message || "Failed to submit inquiry.");
      }
    } catch (err) {
      console.error("Lead submission error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to submit inquiry. Please ensure server is running.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -right-28 top-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Bulk Solar Kits EPC Inquiry Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-navy-800 px-6 py-8 shadow-2xl shadow-black/20 md:px-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/10 pointer-events-none" />
          <div className="absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-accent/15 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Content Header */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 mb-2.5 backdrop-blur-sm">
                <FiLayers className="text-accent text-xs" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white">
                  {boxBadge}
                </span>
              </div>
              <h3 className="font-heading text-2xl font-bold md:text-3xl tracking-tight text-white">
                {boxHeading}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                {boxSubtitle}
              </p>
            </div>

            {/* Right: Dynamic Bulk Lead Form */}
            <div className="w-full lg:max-w-xl">
              <AnimatePresence mode="wait">
                {successData ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md text-white shadow-lg"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
                        <FiCheckCircle className="text-2xl" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-emerald-300">
                          Bulk Inquiry Received!
                        </h4>
                        <p className="mt-1 text-xs text-white/85 leading-relaxed">
                          Thank you, <span className="font-semibold text-white">{successData.name}</span>! Your bulk request for <span className="font-semibold text-white">{successData.state_name}</span> has been logged under ID <span className="font-mono font-bold text-accent">{successData.lead_id}</span>.
                        </p>
                        <p className="mt-2 text-[11px] text-white/70">
                          Our Regional Business Development Executive (BDE) will contact you shortly on <span className="font-mono text-white font-medium">+91 {successData.phone}</span> with wholesale pricing & kit availability.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSuccessData(null)}
                          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
                        >
                          Submit another query <FiArrowRight />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={handleSubmitLead}
                    className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5 backdrop-blur-md shadow-lg"
                  >
                    {errorMsg && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-500/20 px-3.5 py-2 text-xs text-rose-200 border border-rose-500/30">
                        <FiAlertCircle className="shrink-0 text-sm" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Name */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                          Contractor / EPC Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g. Ramesh Patel / Solar Solutions"
                          className="w-full rounded-xl border border-white/25 bg-white px-3.5 py-2.5 text-xs text-navy outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      {/* Mobile */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                          Mobile Number *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                            +91
                          </span>
                          <input
                            type="tel"
                            name="phone"
                            maxLength={10}
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="10-digit number"
                            className="w-full rounded-xl border border-white/25 bg-white pl-11 pr-3 py-2.5 text-xs text-navy outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>

                      {/* State Dropdown (Live from Setup Location) */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                          Delivery State *
                        </label>
                        <select
                          name="state_name"
                          value={formData.state_name}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-white/25 bg-white px-3 py-2.5 text-xs text-navy outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                        >
                          <option value="">-- Choose State --</option>
                          {statesList.map((st) => {
                            const name = typeof st === "string" ? st : st.name;
                            return (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Pincode or Quantity */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                          Pincode / Bulk Quantity
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          placeholder="e.g. 360001 or 5x 3kW Kits"
                          className="w-full rounded-xl border border-white/25 bg-white px-3.5 py-2.5 text-xs text-navy outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                      <span className="text-[11px] text-white/60 hidden sm:inline">
                        ⚡ Pan-India B2B Dispatch & MNRE Empanelled Kits
                      </span>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-colors hover:bg-accent-500 cursor-pointer disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            {boxBtn} <FiSend className="text-xs" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Main footer: essential sections only */}
        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="lg:col-span-5">
            <div className="mb-5 inline-flex rounded-xl bg-white px-3 py-2">
              <img src={logo} alt="SolarKits" className="h-8 w-auto" />
            </div>
            <p className="max-w-md text-sm leading-7 text-white/60">
              {description}
            </p>

            <div className="mt-6 grid gap-3 text-sm text-white/65 sm:grid-cols-2 lg:grid-cols-1">
              <a href={`tel:${phone}`} className="flex items-center gap-3 hover:text-white transition-colors">
                <FiPhone className="text-accent" /> {phone}
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-white transition-colors">
                <FiMail className="text-accent" /> {email}
              </a>
              <p className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                <FiMapPin className="mt-1 shrink-0 text-accent" /> {address}
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-white">Solar kits</h4>
            <nav className="flex flex-col items-start gap-3.5">
              {shopLinks.map((link, idx) => {
                const label = typeof link === "string" ? link : link.label;
                return (
                  <button
                    key={label || idx}
                    type="button"
                    onClick={() => navigate("/shop")}
                    className="group inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white cursor-pointer"
                  >
                    <span className="h-px w-0 bg-accent transition-all duration-300 group-hover:w-3" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-white">Solar tips, once a week</h4>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Useful tips, subsidy updates and offers. No spam.
            </p>
            <form className="mt-5 flex overflow-hidden rounded-xl border border-white/15 bg-white/5 focus-within:border-accent/70">
              <input
                type="email"
                aria-label="Email address"
                placeholder="Email address"
                className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button aria-label="Subscribe" className="m-1 grid w-11 place-items-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-500 cursor-pointer">
                <FiArrowRight />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Slim copyright & payment bar */}
      <div className="border-t border-white/10 bg-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs text-white/45 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span>{copyright}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Payment methods">
            {['UPI', 'Visa', 'Mastercard', 'Net Banking', 'EMI'].map((method) => (
              <span key={method} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-white/55">{method}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
