import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  FiZap,
  FiHome,
  FiFileText,
  FiShield,
  FiMapPin,
  FiPackage,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiUserCheck,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const NAV_ITEMS = [
  { name: "Overview", icon: FiHome, path: "/reseller-portal/dashboard" },
  { name: "KYC & Compliance", icon: FiShield, path: "/reseller-portal/kyc" },
  { name: "Subscription Plans", icon: FiZap, path: "/reseller-portal/plans" },
  { name: "My Territories", icon: FiMapPin, path: "/reseller-portal/territories" },
  { name: "Authorized Catalog", icon: FiPackage, path: "/reseller-portal/catalog" },
  { name: "My EPC Buyers", icon: FiUsers, path: "/reseller-portal/epc-buyers" },
  { name: "My Orders", icon: FiShoppingCart, path: "/reseller-portal/orders" },
  { name: "Wallet & Ledgers", icon: FiCreditCard, path: "/reseller-portal/wallet" },
];

export default function ResellerDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reseller, setReseller] = useState(null);

  const token = localStorage.getItem("reseller_token");

  useEffect(() => {
    if (!token) {
      navigate("/reseller-portal/login");
      return;
    }

    axios.get(`${API_BASE}/india/v1/reseller/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.data?.status === "success") {
          const userData = res.data.data || res.data.user;
          if (userData) setReseller(userData);
        }
      })
      .catch(() => {
        localStorage.removeItem("reseller_token");
        navigate("/reseller-portal/login");
      });
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("reseller_token");
    localStorage.removeItem("reseller_user");
    navigate("/reseller-portal/login");
  };

  return (
    <div className="min-h-screen bg-bg flex text-text-primary">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between hidden md:flex">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
              <FiZap size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-text-primary leading-none">Reseller Business</div>
              <div className="text-[10px] text-text-muted mt-1">SolarKits India Partner</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Profile Card */}
        <div className="p-4 border-t border-border space-y-3">
          {reseller && (
            <div className="p-3 rounded-xl bg-bg border border-border">
              <div className="font-semibold text-xs text-text-primary truncate">{reseller.business_name}</div>
              <div className="text-[10px] text-text-muted truncate mt-0.5">{reseller.email}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  reseller.kyc_status === 'verified' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                }`}>
                  {reseller.kyc_status === 'verified' ? <FiCheckCircle size={9} /> : <FiAlertCircle size={9} />}
                  KYC {reseller.kyc_status}
                </span>
                <span className="text-[10px] font-semibold text-text-muted capitalize">
                  {reseller.commercial_mode} Mode
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-soft transition-colors"
          >
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between">
          <div className="font-semibold text-sm text-text-muted">
            Solarkits Reseller Partner Portal
          </div>
          {reseller && (
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                reseller.activation_status === 'active' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
              }`}>
                Account: {reseller.activation_status}
              </span>
            </div>
          )}
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet context={{ reseller }} />
        </main>
      </div>
    </div>
  );
}
