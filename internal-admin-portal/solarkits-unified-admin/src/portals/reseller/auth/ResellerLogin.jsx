import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FiMail, FiLock, FiLoader, FiZap, FiCheckCircle } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ResellerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/india/v1/reseller/auth/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      if (res.data?.status === "success") {
        const token = res.data.data.token;
        const reseller = res.data.data.reseller;
        localStorage.setItem("reseller_token", token);
        localStorage.setItem("reseller_user", JSON.stringify(reseller));
        navigate("/reseller-portal/dashboard");
      } else {
        setError(res.data?.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials or account inactive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <FiZap size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Reseller Business Portal</h1>
          <p className="text-sm text-text-muted">Log in to manage your solar business, sub-accounts, and wallet</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-danger-soft text-danger text-xs font-semibold border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Business Email</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="email"
                required
                placeholder="reseller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <FiLoader className="animate-spin" size={18} /> : "Sign In to Portal"}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-text-muted">
          Don't have a Reseller Business Account?{" "}
          <Link to="/reseller-portal/register" className="text-primary font-semibold hover:underline">
            Apply Now
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
