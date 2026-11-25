import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import { 
  FaCogs, 
  FaStore, 
  FaChartLine, 
  FaBoxOpen, 
  FaUsers, 
  FaFileInvoiceDollar, 
  FaGlobe, 
  FaHourglassHalf, 
  FaLayerGroup, 
  FaShieldAlt, 
  FaTools,
  FaTruckLoading,
  FaHandshake
} from "react-icons/fa";
import { HiCube, HiSparkles } from "react-icons/hi";
import PageHeader from "@/components/PageHeader";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const COUNTRY_CONFIGS = {
  india: {
    code: "IN",
    name: "India",
    currency: "₹",
    gradient: "from-amber-500 via-white to-emerald-600",
    textClass: "text-amber-600",
    dailySales: "₹62K",
    stats: [
      { label: "Active BOS Kits", value: "340+", description: "ACDB, DCDB, Combos" },
      { label: "Authorized Distributors", value: "48", description: "Across 22 states" },
      { label: "Dealer Network", value: "1,250", description: "Tier 1 & Tier 2" },
      { label: "Pending Approvals", value: "12 Applications", description: "B2B Distribution" }
    ],
    infoMessage: "Manage electrical Balance of System kits, inverters, cables, earthing components, and regional distributor pipelines."
  },
  australia: {
    code: "AU",
    name: "Australia",
    currency: "A$",
    gradient: "from-blue-700 via-white to-red-600",
    textClass: "text-blue-600",
    dailySales: "A$24.5K",
    stats: [
      { label: "Active BOS Kits", value: "185+", description: "CEC Approved Combos" },
      { label: "Distributors", value: "18", description: "VIC, NSW & QLD" },
      { label: "Certified Dealers", value: "320", description: "Accredited Partners" },
      { label: "Pending Claims", value: "6 Approvals", description: "Regulatory review" }
    ],
    infoMessage: "Track Clean Energy Council (CEC) approved BOS equipment, inverter distributions, and accredited franchise networks."
  },
  global: {
    code: "",
    name: "Global",
    currency: "$",
    gradient: "from-primary to-primary-end",
    textClass: "text-primary",
    dailySales: "$45K",
    stats: [
      { label: "Total BOS Kits", value: "500+", description: "All regions" },
      { label: "Distributor Partners", value: "85", description: "Global network" },
      { label: "Stock Availability", value: "92%", description: "Warehouse health" },
      { label: "B2B Orders", value: "210", description: "Active fulfillment" }
    ],
    infoMessage: "Global distribution control center for Balance of System electrical hardware, component pricing, and distributor network governance."
  }
};

export default function BosKitHome() {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const activeKey = countryName?.toLowerCase() || "india";
  const config = COUNTRY_CONFIGS[activeKey] || COUNTRY_CONFIGS.global;

  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/solarshop/checkout-cart-settings/metrics?req_for=view&unique_id=ADM_ORDER_SETTINGS`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          setMetrics(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching BOS kit reservation metrics:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={`Solar Shop - BOS Kits (${config.name})`}
        subtitle={`Balance of System hardware, electrical components, distributor pipelines & dealer networks in ${config.name}`}
        icon={FaCogs}
        stats={config.stats}
        actions={
          config.code ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-2xl shadow-sm">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-surface-hover border border-border shadow-inner shrink-0">
                <ReactCountryFlag
                  countryCode={config.code}
                  svg
                  style={{ width: "1.2em", height: "1.2em" }}
                  title={config.name}
                />
              </div>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{config.name} Market</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-2xl shadow-sm">
              <FaGlobe className="text-primary w-4 h-4" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">All Markets</span>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Welcome Section */}
        <div className={`card p-8 relative overflow-hidden flex flex-col justify-center border-l-4 border-l-amber-500 bg-linear-to-br from-amber-500/[0.03] to-transparent`}>
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <FaTools size={150} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-600 mb-3 w-fit">
            <HiSparkles /> BOS Hardware & Distribution Hub
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-3 relative z-10">
            Welcome to {config.name} BOS Kits
          </h2>
          <p className="text-text-secondary text-sm sm:text-base mb-6 max-w-md relative z-10 leading-relaxed">
            {config.infoMessage}
          </p>

          <div className="flex flex-wrap gap-3 relative z-10">
            <button
              onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/boskit-configurations/bos-kits`)}
              className="px-5 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <FaLayerGroup /> Open BOS Kits Manager &rarr;
            </button>
            <button 
              onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/distribution/applications`)}
              className="px-5 py-2.5 text-sm font-bold bg-surface-hover hover:bg-surface-hover/80 text-text-primary rounded-xl border border-border transition-all flex items-center gap-2 cursor-pointer"
            >
              <FaHandshake /> Distributor Pipeline
            </button>
          </div>
        </div>

        {/* Quick BOS Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/boskit-configurations/bos-kits`)}
            className="card p-5 border border-amber-500/20 bg-linear-to-br from-amber-500/[0.04] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3.5">
              <HiCube size={20} />
            </div>
            <h4 className="font-bold text-sm text-text-primary">BOS Kits Master</h4>
            <p className="text-text-muted text-xs mt-1">ACDB, DCDB & Inverters</p>
            <div className="mt-4 text-xs font-bold text-amber-600">Manage Kits &rarr;</div>
          </div>

          <div 
            onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/distribution/distributors`)}
            className="card p-5 border border-emerald-500/20 bg-linear-to-br from-emerald-500/[0.04] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3.5">
              <FaShieldAlt size={18} />
            </div>
            <h4 className="font-bold text-sm text-text-primary">Authorized Distributors</h4>
            <p className="text-text-muted text-xs mt-1">Distributor tiers & territories</p>
            <div className="mt-4 text-xs font-bold text-emerald-600">View Network &rarr;</div>
          </div>

          <div 
            onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/warehouse-kit-activations`)}
            className="card p-5 border border-blue-500/20 bg-linear-to-br from-blue-500/[0.04] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3.5">
              <FaTruckLoading size={18} />
            </div>
            <h4 className="font-bold text-sm text-text-primary">Warehouse Activations</h4>
            <p className="text-text-muted text-xs mt-1">Regional stock activation</p>
            <div className="mt-4 text-xs font-bold text-blue-600">Activate Stock &rarr;</div>
          </div>

          <div 
            onClick={() => navigate(`/admin-panel/solar-shop-bos-kits/${activeKey}/po-orders`)}
            className="card p-5 border border-purple-500/20 bg-linear-to-br from-purple-500/[0.04] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3.5">
              <FaFileInvoiceDollar size={18} />
            </div>
            <h4 className="font-bold text-sm text-text-primary">BOS PO Orders</h4>
            <p className="text-text-muted text-xs mt-1">Procurement & fulfillment</p>
            <div className="mt-4 text-xs font-bold text-purple-600">Track Orders &rarr;</div>
          </div>
        </div>
      </div>

      {/* Reservation Metrics Widget */}
      {metrics && (
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaHourglassHalf className="text-amber-500" /> Real-time BOS Kit Availability & Reservations
              </h3>
              <p className="text-xs text-text-secondary">
                Snapshot of reserved quantities across distributor checkout channels vs available warehouse stock.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full shrink-0">
              {metrics.activeTimersCount} Checkout Session(s) Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Total Reserved (Checkout Lock)</div>
              <div className="text-2xl font-black text-amber-500">{metrics.activeReservedQty} Kit(s)</div>
            </div>
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Total Booked (Confirmed Purchases)</div>
              <div className="text-2xl font-black text-success">{metrics.bookedQty} Kit(s)</div>
            </div>
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Active BOS Kit Configurations</div>
              <div className="text-2xl font-black text-text-primary">{metrics.totalActiveKitsCount} Configs</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
