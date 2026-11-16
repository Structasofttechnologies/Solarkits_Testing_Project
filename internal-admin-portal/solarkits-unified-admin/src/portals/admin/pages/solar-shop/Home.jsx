import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import { FaShoppingCart, FaStore, FaChartLine, FaBoxOpen, FaUsers, FaMapMarkerAlt, FaFileInvoiceDollar, FaRegHandshake, FaGlobe, FaHourglassHalf, FaTrophy, FaLayerGroup } from "react-icons/fa";
import PageHeader from "@/components/PageHeader";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const COUNTRY_CONFIGS = {
  india: {
    code: "IN",
    name: "India",
    currency: "₹",
    gradient: "from-orange-500 via-white to-green-600",
    textClass: "text-orange-600",
    themeBg: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    dailySales: "₹45K",
    stats: [
      { label: "Daily Sales", value: "₹45K", description: "Across 28 states" },
      { label: "Active Retailers", value: "480", description: "Verified GSTIN shops" },
      { label: "Online Orders", value: "38 Active", description: "Gateway paid & verified" },
      { label: "Shop Condition", value: "100% Operational", description: "Warehouses & Inward Sync" }
    ],
    infoMessage: "Monitor real-time e-commerce orders, shop working condition, warehouse inventory, and GST compliance."
  },
  australia: {
    code: "AU",
    name: "Australia",
    currency: "A$",
    gradient: "from-blue-700 via-white to-red-600",
    textClass: "text-blue-600",
    themeBg: "bg-blue-600/10",
    borderClass: "border-blue-600/20",
    dailySales: "A$14.2K",
    stats: [
      { label: "Daily Revenue", value: "A$14.2K", description: "VIC, NSW & QLD focus" },
      { label: "STC Claims", value: "85 Pending", description: "Clean Energy Regulator" },
      { label: "CEC Accredited", value: "245 Installers", description: "Active members" },
      { label: "Grid Approvals", value: "98.4%", description: "DNSP compliance" }
    ],
    infoMessage: "Track Clean Energy Council (CEC) approvals, STC certificate claims, and DNSP grid connections."
  },
  global: {
    code: "",
    name: "Global",
    currency: "$",
    gradient: "from-primary to-primary-end",
    textClass: "text-primary",
    themeBg: "bg-primary/10",
    borderClass: "border-primary/20",
    dailySales: "$32K",
    stats: [
      { label: "Global Sales", value: "$32K", description: "All active regions" },
      { label: "Total Orders", value: "124", description: "Pending processing" },
      { label: "Stock Level", value: "85%", description: "Availability score" },
      { label: "Active Shops", value: "250+", description: "Online right now" }
    ],
    infoMessage: "Manage global e-commerce listings, localized pricing matrices, and international shipping configurations."
  }
};

export default function Home() {
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
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/solarshop/checkout-cart-settings/metrics?req_for=view&unique_id=ADM_ORDER_SETTINGS`, {
          headers: authHeaderObj()
        });
        if (res.data?.status === "success") {
          setMetrics(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching reservation metrics:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={`Solarshop Dashboard - ${config.name}`}
        subtitle={`Manage your solar equipment e-commerce and inventory operations in ${config.name}`}
        icon={FaShoppingCart}
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
        <div className={`card p-8 relative overflow-hidden flex flex-col justify-center border-l-4 ${config.textClass === 'text-orange-600' ? 'border-l-orange-500' : config.textClass === 'text-blue-600' ? 'border-l-blue-600' : 'border-l-primary'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <FaStore size={150} />
          </div>

          <h2 className="text-3xl font-black text-text-primary mb-3 relative z-10">
            Welcome to {config.name} Solarshop
          </h2>
          <p className="text-text-secondary text-base mb-6 max-w-md relative z-10 leading-relaxed">
            {config.infoMessage}
          </p>

          <div className="flex flex-wrap gap-3 relative z-10">
            <button
              onClick={() => navigate(`/admin-panel/solar-shop/${activeKey}/combokit-configurations/bos-kits`)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-end hover:from-primary-hover hover:to-primary rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <FaLayerGroup /> Add & Manage BOS Kits & Custom Components &rarr;
            </button>
            <button 
              onClick={() => navigate(`/admin-panel/solar-shop/${activeKey}/combokit-configurations`)}
              className="px-5 py-2.5 text-sm font-bold bg-surface-hover hover:bg-surface-hover/80 text-text-primary rounded-xl border border-border transition-all cursor-pointer flex items-center gap-2"
            >
              <FaBoxOpen /> View Inventory
            </button>
          </div>
        </div>

        {/* Localized Features and Quick Analytics */}
        <div className="grid grid-cols-2 gap-4">
          {activeKey === 'india' ? (
            <>
              <div 
                onClick={() => navigate('/admin-panel/solar-shop/accounting-overview')}
                className="card p-5 border border-orange-500/10 bg-gradient-to-br from-orange-500/[0.02] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-3.5">
                  <FaFileInvoiceDollar size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">GST Returns & Compliance</h4>
                <p className="text-text-muted text-xs mt-1">E-invoicing & GSTR-1/3B Reconciliation</p>
                <div className="mt-4 text-xs font-bold text-orange-600">Open Accounting & GST Module &rarr;</div>
              </div>
              <div 
                onClick={() => navigate('/admin-panel/solar-shop/order-management-settings/journey-dashboard')}
                className="card p-5 border border-green-500/10 bg-gradient-to-br from-green-500/[0.02] to-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center mb-3.5">
                  <FaShoppingCart size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">Online & Offline Orders</h4>
                <p className="text-text-muted text-xs mt-1">38 Online • 14 Offline PO Orders</p>
                <div className="mt-4 text-xs font-bold text-green-600">Track Order Pipeline &rarr;</div>
              </div>
            </>
          ) : activeKey === 'australia' ? (
            <>
              <div className="card p-5 border border-blue-500/10 bg-gradient-to-br from-blue-500/[0.02] to-transparent hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3.5">
                  <FaFileInvoiceDollar size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">STC Registry</h4>
                <p className="text-text-muted text-xs mt-1">REC Registry API sync</p>
                <div className="mt-4 text-xs font-bold text-blue-600">Reconcile STCs &rarr;</div>
              </div>
              <div className="card p-5 border border-red-500/10 bg-gradient-to-br from-red-500/[0.02] to-transparent hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center mb-3.5">
                  <FaMapMarkerAlt size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">CEC Directory</h4>
                <p className="text-text-muted text-xs mt-1">Installer credentials status</p>
                <div className="mt-4 text-xs font-bold text-red-600">Verify CEC Card &rarr;</div>
              </div>
            </>
          ) : (
            <>
              <div className="card p-5 hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5">
                  <FaChartLine size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">Market Growth</h4>
                <p className="text-text-muted text-xs mt-1">Global sales trend</p>
                <div className="mt-4 text-xs font-bold text-primary">View Trends &rarr;</div>
              </div>
              <div className="card p-5 hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3.5">
                  <FaBoxOpen size={18} />
                </div>
                <h4 className="font-bold text-sm text-text-primary">Low Stocks</h4>
                <p className="text-text-muted text-xs mt-1">Reorder suggestions</p>
                <div className="mt-4 text-xs font-bold text-purple-600">Restock Items &rarr;</div>
              </div>
            </>
          )}

          <div className="card p-5 hover:scale-105 transition-transform duration-300 col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm text-text-primary">Shop Working Condition & Real-Time Sync</h4>
                <p className="text-text-muted text-xs mt-0.5">Central Inventory, Payment Gateways & Offline POs Operating Normally</p>
              </div>
              <span className="px-3 py-1 text-xs font-bold text-success bg-success-soft rounded-full uppercase border border-success/20">
                ● 100% Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Metrics Widget */}
      {metrics && (
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaHourglassHalf className="text-primary" /> Active Inventory Reservations vs Available Stock
              </h3>
              <p className="text-xs text-text-secondary">
                Real-time inventory and direct factory production kits tracking in checkout pipelines vs available warehouse stock.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary-soft text-primary border border-primary/20 rounded-full shrink-0">
              {metrics.activeTimersCount} Checkout Session(s) Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Total Reserved (Checkout Lock)</div>
              <div className="text-2xl font-black text-primary">{metrics.activeReservedQty} Kit(s)</div>
            </div>
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Total Booked (Confirmed Purchases)</div>
              <div className="text-2xl font-black text-success">{metrics.bookedQty} Kit(s)</div>
            </div>
            <div className="bg-surface-hover p-4 rounded-xl border border-border">
              <div className="text-xs text-text-muted mb-1">Active Kit Catalog Configurations</div>
              <div className="text-2xl font-black text-text-primary">{metrics.totalActiveKitsCount} Configs</div>
            </div>
          </div>

          {metrics.productMetrics.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-text-primary text-sm">Detailed Reservation Metrics by Kit</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.productMetrics.map((prod) => (
                  <div key={prod.id} className="bg-surface-hover p-4 rounded-xl border border-border/60">
                    <div className="font-bold text-text-primary text-sm mb-2">{prod.name}</div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Currently Reserved:</span>
                      <span className="font-semibold text-primary">{prod.reservedQty} kit(s)</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (prod.reservedQty / 20) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-text-muted">Booked (Ordered):</span>
                      <span className="font-semibold text-success">{prod.bookedQty} kit(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-text-muted">
              No active reservations or bookings recorded at the moment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
