import { useState, useEffect } from "react";
import {
  FiBox,
  FiPlusCircle,
  FiShoppingBag,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
} from "react-icons/fi";
import api from "../services/api";

export default function ProcurementInventory() {
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "orders" | "new_order"
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // New Order Form State
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, ordRes, catRes] = await Promise.all([
        api.get("/india/v1/reseller/inventory"),
        api.get("/india/v1/reseller/procurement/list"),
        api.get("/india/v1/reseller/authorized-products").catch(() => ({ data: { data: [] } })),
      ]);

      if (invRes.data?.status === "success") {
        setInventory(invRes.data.data || []);
      }
      if (ordRes.data?.status === "success") {
        setOrders(ordRes.data.data || []);
      }
      if (catRes.data?.status === "success") {
        setCatalogItems(catRes.data.data?.products || catRes.data.data || []);
      }
    } catch (err) {
      console.error("Procurement fetch error:", err);
      setError("Failed to load inventory & procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreateProcurementOrder = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (!selectedItem) throw new Error("Please select a product or kit");
      const qty = parseInt(quantity, 10);
      const priceInr = parseFloat(unitPrice);

      if (isNaN(qty) || qty <= 0) throw new Error("Quantity must be a positive number");
      if (isNaN(priceInr) || priceInr <= 0) throw new Error("Unit price must be a valid amount");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load Razorpay SDK. Please check your network.");

      const itemObj = catalogItems.find(c => c._id === selectedItem || c.id === selectedItem);

      // 1. Create B2B Procurement Order on Backend
      const res = await api.post("/india/v1/reseller/procurement/create", {
        items: [
          {
            scope_type: itemObj?.scope_type || (itemObj?.is_kit ? "kit" : "product"),
            product_id: !itemObj?.is_kit ? (itemObj?._id || selectedItem) : null,
            kit_id: itemObj?.is_kit ? (itemObj?._id || selectedItem) : null,
            item_name: itemObj?.name || itemObj?.kit_name || "Procurement Item",
            quantity: qty,
            unit_price_paise: Math.round(priceInr * 100),
          },
        ],
        payment_reference: paymentRef.trim() || null,
      });

      if (res.data?.status === "success") {
        const orderData = res.data.data.order;
        const rzpData = res.data.data.razorpay_order;

        // 2. Open Razorpay Checkout modal
        const options = {
          key: rzpData.key_id || "rzp_test_T8B85UkbvoXBOQ",
          amount: rzpData.amount_paise,
          currency: rzpData.currency || "INR",
          name: "SolarKits Procurement",
          description: `Procurement #${orderData.procurement_order_number}`,
          order_id: rzpData.order_id,
          handler: async function (response) {
            try {
              setActionLoading(true);
              const confirmRes = await api.post("/india/v1/reseller/procurement/confirm-payment", {
                order_id: orderData._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (confirmRes.data?.status === "success") {
                setMessage(`Payment confirmed for Order ${orderData.procurement_order_number}! Resale rights & inventory activated.`);
                setSelectedItem("");
                setQuantity(1);
                setUnitPrice("");
                setPaymentRef("");
                fetchData();
                setActiveTab("orders");
              }
            } catch (err) {
              console.error("Procurement payment confirmation failed:", err);
              setError("Payment verification failed. Please contact support.");
            } finally {
              setActionLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setActionLoading(false);
              setMessage(`Order ${orderData.procurement_order_number} created in pending payment status.`);
              fetchData();
              setActiveTab("orders");
            }
          },
          theme: { color: "#2563EB" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("Procurement order error:", err);
      setError(err.response?.data?.message || err.message || "Failed to submit procurement order.");
      setActionLoading(false);
    }
  };

  const totalStockValuationInr = inventory.reduce(
    (acc, cur) => acc + (cur.total_valuation_paise || 0) / 100,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <FiBox className="text-blue-600" /> Order Stock
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Order wholesale inventory from SolarKits warehouses and track your stock balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </button>
          <button
            onClick={() => setActiveTab("new_order")}
            className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlusCircle size={16} /> Place New Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Stock Valuation</div>
          <div className="text-3xl font-extrabold text-slate-900">₹{totalStockValuationInr.toLocaleString('en-IN')}</div>
          <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <FiTrendingUp size={12} /> Double-Entry Ledger Valuation
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Inventory SKUs Listed</div>
          <div className="text-3xl font-extrabold text-slate-900">{inventory.length} SKUs</div>
          <div className="text-xs font-semibold text-slate-500">Live Double-Entry Stock Balances</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">B2B Purchase Orders</div>
          <div className="text-3xl font-extrabold text-slate-900">{orders.length} Orders</div>
          <div className="text-xs font-semibold text-blue-600">Company Warehouse Allocation</div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-semibold flex items-center gap-2">
          <FiCheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-100 text-red-800 border border-red-300 text-sm font-semibold flex items-center gap-2">
          <FiAlertCircle size={18} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "inventory"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📦 Current Inventory Stock ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "orders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📑 Procurement Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("new_order")}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "new_order"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ➕ New B2B Purchase Order
        </button>
      </div>

      {/* Tab 1: Current Stock Inventory Table */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold">Loading stock inventory balances...</div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FiBox size={40} className="mx-auto text-slate-300" />
              <div className="text-slate-700 font-extrabold">No Stock Inventory Available</div>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Place a procurement purchase order from company warehouse to credit your inventory ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Item Scope</th>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Available Stock Balance</th>
                    <th className="p-4">Unit Cost (Paise/INR)</th>
                    <th className="p-4">Total Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-4 uppercase text-xs font-bold text-blue-600">
                        {item.item_type}
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">
                          {item.item_details?.name || item.item_details?.kit_name || "Catalog Component"}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          {item.item_details?.sku_code || item.item_details?.kit_code || item.product_id || item.kit_id}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-emerald-600 text-base">
                        {item.current_stock_balance} Units
                      </td>
                      <td className="p-4 font-mono">
                        ₹{(item.last_unit_cost_paise / 100).toFixed(2)}
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">
                        ₹{((item.total_valuation_paise || 0) / 100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Procurement Orders List */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold">Loading procurement orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-bold">No procurement purchase orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Order Number</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Grand Total</th>
                    <th className="p-4">Order Status</th>
                    <th className="p-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {orders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold text-blue-600">{ord.procurement_order_number}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">{ord.items?.length || 0} Line Items</td>
                      <td className="p-4 font-extrabold text-slate-900">
                        ₹{(ord.grand_total_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          ord.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.order_status === 'dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.order_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          ord.payment_status === 'captured' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: New Procurement Order Form */}
      {activeTab === "new_order" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FiShoppingBag className="text-blue-600" /> B2B Stock Procurement Order Form
            </h2>
            <p className="text-xs text-slate-500">
              Submit a stock purchase request directly to company warehouses. Financial calculations enforced in integer Paise.
            </p>
          </div>

          <form onSubmit={handleCreateProcurementOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Catalog Product / Combo Kit
              </label>
              <select
                required
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  const selected = catalogItems.find(c => (c._id || c.id) === e.target.value);
                  if (selected) setUnitPrice(selected.base_price || selected.price || "");
                }}
                className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Item from Authorized Catalog --</option>
                {catalogItems.map((cat) => (
                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                    {cat.name || cat.kit_name} ({cat.sku_code || cat.kit_code || "Component"}) — ₹{cat.base_price || cat.price || 0}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Unit Price (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Reference / Transaction ID (Optional)
              </label>
              <input
                type="text"
                placeholder="TXN-RPAY-998877"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? "Submitting Procurement Order..." : "Confirm & Submit Procurement Order"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
