import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaCoins, FaPercent, FaBullseye, FaChartBar, FaRupeeSign,
  FaArrowUp, FaArrowDown, FaCheckCircle, FaExclamationTriangle
} from "react-icons/fa";
import {
  FiSettings, FiTag, FiTarget, FiBarChart2, FiArrowRight, FiDollarSign
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

const quickCards = [
  {
    id: "warehouse-margin",
    icon: <FaPercent />,
    label: "Warehouse Margin Config",
    desc: "Set kit-wise display & standard sales margin per warehouse",
    color: "from-primary to-primary-end",
    iconBg: "bg-primary/10 text-primary",
    path: "company-margin",
    isRoot: true,
  },
  {
    id: "offers",
    icon: <FiTag />,
    label: "Offers & Discounts",
    desc: "Configure discount % per state/district/kit with margin impact preview",
    color: "from-warning to-warning-hover",
    iconBg: "bg-warning/10 text-warning",
    path: "offers",
    isRoot: false,
  },
  {
    id: "goals",
    icon: <FiTarget />,
    label: "Company Goals",
    desc: "Monthly kit sales targets and achievement history by geography",
    color: "from-success to-success-hover",
    iconBg: "bg-success/10 text-success",
    path: "goals",
    isRoot: false,
  },
  {
    id: "analytics",
    icon: <FiBarChart2 />,
    label: "Margin Analytics",
    desc: "Consolidated margin dashboard — Sales → Discount → Commission → Net",
    color: "from-info to-info-hover",
    iconBg: "bg-info/10 text-info",
    path: "analytics",
    isRoot: false,
  },
];

export default function MarginCommissionHome({ moduleUniqueId }) {
  const navigate = useNavigate();
  const { countryName } = useParams();
  const token = useSelector((s) => s.auth.token);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !moduleUniqueId) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Try to get basic goals list for the current month
        const now = new Date();
        const res = await axios.get(
          `${API_URL}/company/margin-goals/list?unique_id=${moduleUniqueId}&req_for=view&target_month=${now.getMonth() + 1}&target_year=${now.getFullYear()}`,
          { headers: authHeaderObj() }
        );
        const goals = res.data?.data || [];
        const totalTarget = goals.reduce((s, g) => s + (g.target_quantity || 0), 0);
        setStats({ totalGoals: goals.length, totalTarget });
      } catch {
        setStats({ totalGoals: 0, totalTarget: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, moduleUniqueId]);

  const handleNav = (card) => {
    if (card.isRoot) {
      navigate(`/admin-panel/solar-shop/${countryName}/company-margin`);
    } else {
      navigate(`/admin-panel/solar-shop/${countryName}/company-margin/${card.path}`);
    }
  };

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Hero Header */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/30"
              style={{
                width: `${80 + i * 60}px`,
                height: `${80 + i * 60}px`,
                top: "50%",
                left: "10%",
                transform: "translate(-50%,-50%)",
                opacity: 0.4 - i * 0.05,
              }}
            />
          ))}
        </div>
        <div className="relative px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <FaCoins className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Margin & Commission Settings
                </h1>
                <p className="text-white/80 mt-1 text-sm">
                  Company margin, offer discounts, sales goals & franchisee commission — centralized.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 flex items-center gap-2">
                <FaCheckCircle className="text-white/70 text-sm" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {monthName} {now.getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Goals",
            value: loading ? "—" : stats?.totalGoals ?? 0,
            icon: <FiTarget />,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Monthly Target Units",
            value: loading ? "—" : (stats?.totalTarget ?? 0).toLocaleString(),
            icon: <FaBullseye />,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Warehouse Margin",
            value: "Configured",
            icon: <FaPercent />,
            color: "text-info",
            bg: "bg-info/10",
          },
          {
            label: "Commission Ledger",
            value: "View →",
            icon: <FaRupeeSign />,
            color: "text-warning",
            bg: "bg-warning/10",
            clickable: true,
            onClick: () =>
              navigate("/admin-panel/solar-shop/reseller-management/commission-ledger"),
          },
        ].map((kpi, i) => (
          <div
            key={i}
            onClick={kpi.onClick}
            className={`card p-5 border-2 border-border shadow-sm flex items-center gap-4 ${kpi.clickable ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`}
          >
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} border border-current/10`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-text-primary mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">
          Module Sections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleNav(card)}
              className="group text-left card p-6 border-2 border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${card.iconBg} border border-current/10 text-lg shrink-0`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-text-primary text-sm">{card.label}</h3>
                    <FiArrowRight className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Franchisee Commission Quick Links */}
      <div className="card border-2 border-border p-6">
        <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <FaRupeeSign className="text-warning" />
          Franchisee Commission
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              label: "Commission Settings",
              desc: "State → District → Plan → Kit → ₹ per Kit configuration",
              path: "/admin-panel/solar-shop/reseller-management/commission-settings",
              icon: <FiSettings />,
            },
            {
              label: "Commission Ledger",
              desc: "Per-franchisee ledger: order-level commission, payment status",
              path: "/admin-panel/solar-shop/reseller-management/commission-ledger",
              icon: <FiDollarSign />,
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="group text-left flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 bg-surface-hover/30 hover:bg-surface-hover transition-all"
            >
              <div className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/10">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-text-primary text-xs">{item.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5 font-medium truncate">{item.desc}</p>
              </div>
              <FiArrowRight className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
