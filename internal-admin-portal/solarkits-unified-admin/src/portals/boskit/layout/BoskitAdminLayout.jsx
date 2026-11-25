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
  FiDollarSign,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiTruck,
  FiSettings,
  FiArrowUpRight,
  FiPieChart,
  FiActivity,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NAV_GROUPS = [
  {
    title: "Operations & Sales",
    items: [
      { name: "Overview Dashboard", icon: FiHome, path: "/boskit-admin/dashboard" },
      { name: "Orders & Fulfillment", icon: FiShoppingCart, path: "/boskit-admin/orders" },
      { name: "Payment Ledger", icon: FiDollarSign, path: "/boskit-admin/payments" },
    ],
  },
  {
    title: "Franchise & Dealer Network",
    items: [
      { name: "Distributor Onboarding", icon: FiFileText, path: "/boskit-admin/applications", badge: "Live" },
      { name: "Authorized Distributors", icon: FiShield, path: "/boskit-admin/distributors" },
      { name: "Distributor Plans", icon: FiLayers, path: "/boskit-admin/plans" },
      { name: "Dealer Management", icon: FiUsers, path: "/boskit-admin/dealers" },
      { name: "Territory Allocation", icon: FiMapPin, path: "/boskit-admin/territories" },
    ],
  },
  {
    title: "Commercial & Pricing Masters",
    items: [
      { name: "Channel Settings", icon: FiSliders, path: "/boskit-admin/channel-settings" },
      { name: "Equipment Products", icon: FiPackage, path: "/boskit-admin/products" },
      { name: "Product Categories", icon: FiLayers, path: "/boskit-admin/categories" },
      { name: "MRP Master", icon: FiDollarSign, path: "/boskit-admin/mrp-master" },
      { name: "Distributor Rates", icon: FiPercent, path: "/boskit-admin/distributor-rates" },
      { name: "Dealer Pricing", icon: FiUsers, path: "/boskit-admin/dealer-pricing" },
      { name: "MOQ Settings", icon: FiSliders, path: "/boskit-admin/moq-settings" },
      { name: "GST Tax Rules", icon: FiPercent, path: "/boskit-admin/gst-settings" },
    ],
  },
  {
    title: "Marketing & Intelligence",
    items: [
      { name: "Content & Banners", icon: FiSettings, path: "/boskit-admin/content" },
      { name: "Executive Reports", icon: FiPieChart, path: "/boskit-admin/reports" },
      { name: "Audit Trail", icon: FiActivity, path: "/boskit-admin/audit-logs" },
    ],
  },
];

export default function BoskitAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/boskit/v1/admin/stats`)
      .then((res) => {
        if (res.data?.success) setStats(res.data.data);
      })
      .catch((err) => console.warn("Admin stats fetch warning:", err.message));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-bg flex text-text-primary font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black shadow-md shadow-primary/20">
                <FiZap size={18} />
              </div>
              <div>
                <div className="font-heading font-black text-sm text-text-primary tracking-wider flex items-center gap-1.5">
                  BOSKIT <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">B2B</span>
                </div>
                <div className="text-[10px] text-text-muted">Distribution Control Center</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-thin">
            {NAV_GROUPS.map((grp, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {grp.title}
                </div>
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={15} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && !isActive && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                          {stats?.pending_reviews ? `${stats.pending_reviews} New` : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="pt-4 px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Unified Portals
            </div>
            <Link
              to="/admin-panel"
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              <span>SOLARKITS Admin</span>
              <FiArrowUpRight size={14} />
            </Link>
            <a
              href="http://localhost:5180"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-primary"
            >
              <span>BOSKIT Public Site</span>
              <FiArrowUpRight size={14} />
            </a>
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-border bg-surface-hover/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                AD
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-text-primary truncate">Administrator</div>
                <div className="text-[10px] text-emerald-600 font-medium">BOSKIT Super Admin</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
              BOSKIT Enterprise Platform
            </span>
            <span className="text-border">|</span>
            <span className="text-xs text-text-secondary font-medium hidden sm:inline">
              Regional Franchise & Distribution Governance
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gateway: Online</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
