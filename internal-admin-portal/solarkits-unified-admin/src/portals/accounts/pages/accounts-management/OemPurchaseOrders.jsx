import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaHandshake,
  FaFileInvoice,
  FaPlus,
  FaEdit,
  FaCheck,
  FaTimes,
  FaSearch,
  FaPaperPlane,
  FaCheckCircle,
  FaBuilding,
  FaEye,
  FaFilter,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

// Initial Mock OEM Partners
const MOCK_OEM_PARTNERS = [
  {
    id: "oem-1",
    name: "Waaree Energies Ltd",
    contact_person: "Sunil Kothari",
    phone: "+91 98200 12345",
    email: "procurement@waaree.com",
    gst: "27AAACW1234F1Z8",
    products: ["540W Mono PERC", "550W Bifacial", "400W Residential Panels"],
    status: "Active",
  },
  {
    id: "oem-2",
    name: "Growatt New Energy India",
    contact_person: "Deepak Verma",
    phone: "+91 98111 56789",
    email: "india.sales@growatt.com",
    gst: "07AABCG5678P1ZQ",
    products: ["3kW On-Grid Inverter", "5kW Hybrid Inverter", "10kW Commercial"],
    status: "Active",
  },
  {
    id: "oem-3",
    name: "Polycab Wires & Cables",
    contact_person: "Ramesh Sharma",
    phone: "+91 97654 32100",
    email: "solar.oem@polycab.com",
    gst: "24AAACP4321K1ZM",
    products: ["4 sqmm DC Solar Cable", "6 sqmm DC Solar Cable", "Earthing Strips"],
    status: "Active",
  },
];

// Initial Mock OEM Purchase Orders
const MOCK_OEM_POS = [
  {
    id: "oem-po-1",
    po_number: "OEM-PO-2026-0042",
    oem_partner_id: "oem-1",
    oem_partner_name: "Waaree Energies Ltd",
    products: "540W Mono PERC Solar Panels",
    qty: 500,
    unit: "Nos",
    rate: 9800,
    subtotal: 4900000,
    gst_pct: 12,
    gst_amount: 588000,
    total_amount: 5488000,
    destination_warehouse: "Bhiwandi Central Hub (WH-01)",
    created_date: "2026-09-24",
    delivery_date: "2026-10-10",
    status: "Submitted",
    approval_status: "Pending Approval",
    notes: "Q3 Bulk direct factory procurement",
  },
  {
    id: "oem-po-2",
    po_number: "OEM-PO-2026-0043",
    oem_partner_id: "oem-2",
    oem_partner_name: "Growatt New Energy India",
    products: "5kW Hybrid Inverter with WiFi Module",
    qty: 50,
    unit: "Nos",
    rate: 42000,
    subtotal: 2100000,
    gst_pct: 18,
    gst_amount: 378000,
    total_amount: 2478000,
    destination_warehouse: "Gurgaon NCR Hub (WH-03)",
    created_date: "2026-09-20",
    delivery_date: "2026-10-02",
    status: "Approved",
    approval_status: "Approved",
    notes: "Residential combo kit stock replenish",
  },
  {
    id: "oem-po-3",
    po_number: "OEM-PO-2026-0044",
    oem_partner_id: "oem-3",
    oem_partner_name: "Polycab Wires & Cables",
    products: "4 sqmm Red & Black Solar Cables (500m Drums)",
    qty: 30,
    unit: "Drums",
    rate: 18500,
    subtotal: 555000,
    gst_pct: 18,
    gst_amount: 99900,
    total_amount: 654900,
    destination_warehouse: "Ahmedabad Sub-Depot (WH-02)",
    created_date: "2026-09-27",
    delivery_date: "2026-10-05",
    status: "Draft",
    approval_status: "Draft",
    notes: "BOS kit wiring balance",
  },
];

export default function OemPurchaseOrders() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [activeTab, setActiveTab] = useState("pos"); // "pos" | "partners"
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState(MOCK_OEM_PARTNERS);
  const [purchaseOrders, setPurchaseOrders] = useState(MOCK_OEM_POS);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerFormData, setPartnerFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    gst: "",
    products: "",
    status: "Active",
  });

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [poFormData, setPoFormData] = useState({
    po_number: "",
    oem_partner_id: "",
    products: "",
    qty: 1,
    unit: "Nos",
    rate: 0,
    gst_pct: 12,
    destination_warehouse: "Bhiwandi Central Hub (WH-01)",
    delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    notes: "",
  });

  // Selected PO view detail
  const [selectedPo, setSelectedPo] = useState(null);

  // Fetch from API with graceful mock fallback
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/account-panel/oem-purchase-orders`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data) {
        setPurchaseOrders(res.data.data);
      }
    } catch (err) {
      console.warn("OEM POs endpoint not ready, using mock data:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Partner Modal Handlers
  const handleOpenPartnerModal = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setPartnerFormData({
        ...partner,
        products: partner.products.join(", "),
      });
    } else {
      setEditingPartner(null);
      setPartnerFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        gst: "",
        products: "",
        status: "Active",
      });
    }
    setPartnerModalOpen(true);
  };

  const handleSavePartner = (e) => {
    e.preventDefault();
    if (!partnerFormData.name || !partnerFormData.gst) {
      dispatch(setAlert({ type: "warning", message: "Company Name and GST are required." }));
      return;
    }

    const payload = {
      ...partnerFormData,
      products: partnerFormData.products.split(",").map((p) => p.trim()).filter(Boolean),
    };

    if (editingPartner) {
      setPartners((prev) =>
        prev.map((p) => (p.id === editingPartner.id ? { ...payload, id: editingPartner.id } : p))
      );
      dispatch(setAlert({ type: "success", message: "OEM Partner updated!" }));
    } else {
      const newPartner = {
        ...payload,
        id: `oem-${Date.now()}`,
      };
      setPartners((prev) => [newPartner, ...prev]);
      dispatch(setAlert({ type: "success", message: "New OEM Partner registered!" }));
    }
    setPartnerModalOpen(false);
  };

  // PO Modal Handlers
  const handleOpenPoModal = (po = null) => {
    if (po) {
      setEditingPo(po);
      setPoFormData({ ...po });
    } else {
      setEditingPo(null);
      setPoFormData({
        po_number: `OEM-PO-2026-${Date.now().toString().slice(-4)}`,
        oem_partner_id: partners[0]?.id || "",
        products: "",
        qty: 100,
        unit: "Nos",
        rate: 5000,
        gst_pct: 12,
        destination_warehouse: "Bhiwandi Central Hub (WH-01)",
        delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        notes: "",
      });
    }
    setPoModalOpen(true);
  };

  const handleSavePo = (e) => {
    e.preventDefault();
    const qty = Number(poFormData.qty);
    const rate = Number(poFormData.rate);
    const gstPct = Number(poFormData.gst_pct);
    const subtotal = qty * rate;
    const gstAmount = (subtotal * gstPct) / 100;
    const totalAmount = subtotal + gstAmount;

    const partner = partners.find((p) => p.id === poFormData.oem_partner_id);

    const payload = {
      ...poFormData,
      qty,
      rate,
      subtotal,
      gst_pct: gstPct,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      oem_partner_name: partner?.name || "OEM Partner",
      created_date: new Date().toISOString().split("T")[0],
      status: "Draft",
      approval_status: "Draft",
    };

    if (editingPo) {
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === editingPo.id ? { ...payload, id: editingPo.id } : p))
      );
      dispatch(setAlert({ type: "success", message: "OEM PO updated!" }));
    } else {
      const newPo = {
        ...payload,
        id: `oem-po-${Date.now()}`,
      };
      setPurchaseOrders((prev) => [newPo, ...prev]);
      dispatch(setAlert({ type: "success", message: "OEM PO created as Draft!" }));
    }
    setPoModalOpen(false);
  };

  const handleSubmitForApproval = (poId) => {
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? { ...p, status: "Submitted", approval_status: "Pending Approval" }
          : p
      )
    );
    dispatch(setAlert({ type: "success", message: "PO submitted for Accounts Approval!" }));
  };

  const handleApprovePo = (poId) => {
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? { ...p, status: "Approved", approval_status: "Approved" }
          : p
      )
    );
    dispatch(setAlert({ type: "success", message: "OEM Purchase Order Approved!" }));
    if (selectedPo?.id === poId) {
      setSelectedPo((prev) => ({ ...prev, status: "Approved", approval_status: "Approved" }));
    }
  };

  const handleRejectPo = (poId) => {
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? { ...p, status: "Rejected", approval_status: "Rejected" }
          : p
      )
    );
    dispatch(setAlert({ type: "info", message: "OEM Purchase Order Rejected." }));
    if (selectedPo?.id === poId) {
      setSelectedPo((prev) => ({ ...prev, status: "Rejected", approval_status: "Rejected" }));
    }
  };

  // Filtered POs
  const filteredPos = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          po.po_number.toLowerCase().includes(q) ||
          po.oem_partner_name.toLowerCase().includes(q) ||
          po.products.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (partnerFilter && po.oem_partner_id !== partnerFilter) return false;
      if (statusFilter && po.approval_status !== statusFilter) return false;
      return true;
    });
  }, [purchaseOrders, searchQuery, partnerFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FaHandshake className="text-primary" /> OEM Partner Procurement & POs
          </h2>
          <p className="text-text-secondary text-sm">
            Manage Tier-1 OEM factory direct purchase contracts, approval gates, and inbound warehouse allocation.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-bg p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === "pos"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaFileInvoice /> OEM Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("partners")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === "partners"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FaBuilding /> OEM Partners ({partners.length})
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: OEM PURCHASE ORDERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "pos" && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
                <input
                  type="text"
                  placeholder="Search PO # or Product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">All OEM Partners</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">All Approval Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <Button onClick={() => handleOpenPoModal()} className="w-full md:w-auto flex items-center justify-center gap-2">
              <FaPlus /> Create OEM PO
            </Button>
          </div>

          {/* PO Table */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">PO Number & Date</th>
                    <th className="p-4">OEM Partner</th>
                    <th className="p-4">Products & Qty</th>
                    <th className="p-4">Total Value</th>
                    <th className="p-4">Destination Hub</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredPos.map((po) => {
                    const isDraft = po.approval_status === "Draft";
                    const isPending = po.approval_status === "Pending Approval";
                    const isApproved = po.approval_status === "Approved";
                    const isRejected = po.approval_status === "Rejected";

                    return (
                      <tr key={po.id} className="hover:bg-bg/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-text-primary">{po.po_number}</div>
                          <div className="text-xs text-text-secondary">Created: {po.created_date}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-text-primary">{po.oem_partner_name}</div>
                          <div className="text-xs text-text-secondary">Target Delivery: {po.delivery_date}</div>
                        </td>

                        <td className="p-4">
                          <div className="text-xs font-medium text-text-primary">{po.products}</div>
                          <div className="text-xs text-text-secondary">
                            {po.qty} {po.unit} @ ₹{po.rate.toLocaleString("en-IN")}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold font-mono text-text-primary">
                            ₹ {po.total_amount.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-text-secondary font-mono">
                            GST ({po.gst_pct}%): ₹{po.gst_amount.toLocaleString("en-IN")}
                          </div>
                        </td>

                        <td className="p-4 text-xs text-text-secondary">
                          {po.destination_warehouse}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : isRejected
                                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                : "bg-bg text-text-secondary border border-border"
                            }`}
                          >
                            {po.approval_status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPo(po)}
                              className="p-1.5 rounded hover:bg-bg text-primary transition-colors"
                              title="View PO Details"
                            >
                              <FaEye />
                            </button>

                            {isDraft && (
                              <button
                                onClick={() => handleSubmitForApproval(po.id)}
                                className="px-2.5 py-1 text-xs rounded bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
                              >
                                <FaPaperPlane /> Submit
                              </button>
                            )}

                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApprovePo(po.id)}
                                  className="px-2.5 py-1 text-xs rounded bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1"
                                >
                                  <FaCheck /> Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPo(po.id)}
                                  className="px-2.5 py-1 text-xs rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-1"
                                >
                                  <FaTimes />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: OEM PARTNERS REGISTRY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-secondary">
              Authorized original equipment manufacturers & direct factory contracts.
            </div>
            <Button onClick={() => handleOpenPartnerModal()} className="flex items-center gap-2">
              <FaPlus /> Register OEM Partner
            </Button>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                    <th className="p-4">Partner Name</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">GST Identification</th>
                    <th className="p-4">Product Lines</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-bg/50 transition-colors">
                      <td className="p-4 font-bold text-text-primary">{p.name}</td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-text-primary">{p.contact_person}</div>
                        <div className="text-xs text-text-secondary">{p.phone}</div>
                        <div className="text-[11px] text-text-secondary">{p.email}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-text-primary">{p.gst}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {p.products.map((prod) => (
                            <span
                              key={prod}
                              className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary border border-primary/20"
                            >
                              {prod}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenPartnerModal(p)}
                          className="p-1.5 rounded hover:bg-bg text-text-secondary hover:text-primary transition-colors"
                        >
                          <FaEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OEM Partner Modal */}
      {partnerModalOpen && (
        <Dialog
          isOpen={partnerModalOpen}
          onClose={() => setPartnerModalOpen(false)}
          title={editingPartner ? "Edit OEM Partner" : "Register OEM Partner"}
        >
          <form onSubmit={handleSavePartner} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Company / OEM Name *
              </label>
              <CustomInput
                placeholder="e.g. Waaree Energies Ltd"
                value={partnerFormData.name}
                onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Contact Person
                </label>
                <CustomInput
                  placeholder="e.g. Sunil Kothari"
                  value={partnerFormData.contact_person}
                  onChange={(e) =>
                    setPartnerFormData({ ...partnerFormData, contact_person: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  GST Identification *
                </label>
                <CustomInput
                  placeholder="e.g. 27AAACW1234F1Z8"
                  value={partnerFormData.gst}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, gst: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Phone</label>
                <CustomInput
                  placeholder="+91..."
                  value={partnerFormData.phone}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Email</label>
                <CustomInput
                  type="email"
                  placeholder="sales@..."
                  value={partnerFormData.email}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Products Supplied (comma separated)
              </label>
              <textarea
                placeholder="540W Mono PERC, 550W Bifacial, Inverters..."
                value={partnerFormData.products}
                onChange={(e) => setPartnerFormData({ ...partnerFormData, products: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setPartnerModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Partner</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* OEM PO Modal */}
      {poModalOpen && (
        <Dialog
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          title={editingPo ? "Edit OEM Purchase Order" : "Generate OEM Purchase Order"}
        >
          <form onSubmit={handleSavePo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Select OEM Partner *
              </label>
              <select
                value={poFormData.oem_partner_id}
                onChange={(e) => setPoFormData({ ...poFormData, oem_partner_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                required
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gst})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Product Description *
              </label>
              <CustomInput
                placeholder="e.g. 540W Mono PERC Solar Panels (Waaree Tier-1)"
                value={poFormData.products}
                onChange={(e) => setPoFormData({ ...poFormData, products: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Quantity</label>
                <CustomInput
                  type="number"
                  min="1"
                  value={poFormData.qty}
                  onChange={(e) => setPoFormData({ ...poFormData, qty: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Unit</label>
                <select
                  value={poFormData.unit}
                  onChange={(e) => setPoFormData({ ...poFormData, unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Nos">Nos</option>
                  <option value="Drums">Drums</option>
                  <option value="Sets">Sets</option>
                  <option value="Mtrs">Mtrs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Unit Rate (₹)</label>
                <CustomInput
                  type="number"
                  min="1"
                  value={poFormData.rate}
                  onChange={(e) => setPoFormData({ ...poFormData, rate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">GST Rate</label>
                <select
                  value={poFormData.gst_pct}
                  onChange={(e) => setPoFormData({ ...poFormData, gst_pct: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="5">5% (Solar Components)</option>
                  <option value="12">12% (Solar Panels & Cells)</option>
                  <option value="18">18% (Inverters / BOS Cables)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Expected Delivery Date
                </label>
                <CustomInput
                  type="date"
                  value={poFormData.delivery_date}
                  onChange={(e) => setPoFormData({ ...poFormData, delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Destination Warehouse
              </label>
              <select
                value={poFormData.destination_warehouse}
                onChange={(e) =>
                  setPoFormData({ ...poFormData, destination_warehouse: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Bhiwandi Central Hub (WH-01)">Bhiwandi Central Hub (WH-01)</option>
                <option value="Gurgaon NCR Hub (WH-03)">Gurgaon NCR Hub (WH-03)</option>
                <option value="Ahmedabad Sub-Depot (WH-02)">Ahmedabad Sub-Depot (WH-02)</option>
                <option value="Bengaluru Master Hub (WH-04)">Bengaluru Master Hub (WH-04)</option>
              </select>
            </div>

            <div className="bg-bg/60 p-3 rounded-lg border border-border text-xs flex justify-between font-mono">
              <span>Estimated Total:</span>
              <strong className="text-primary text-sm">
                ₹{" "}
                {(
                  Number(poFormData.qty) *
                  Number(poFormData.rate) *
                  (1 + Number(poFormData.gst_pct) / 100)
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setPoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Draft PO</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* PO View Drawer/Modal */}
      {selectedPo && (
        <Dialog
          isOpen={!!selectedPo}
          onClose={() => setSelectedPo(null)}
          title={`OEM Purchase Order: ${selectedPo.po_number}`}
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center bg-bg/50 p-3 rounded-lg border border-border text-xs">
              <div>
                <span className="text-text-secondary">Vendor:</span>
                <div className="font-bold text-text-primary">{selectedPo.oem_partner_name}</div>
              </div>
              <div className="text-right">
                <span className="text-text-secondary">Approval Status:</span>
                <div>
                  <span className="font-bold text-primary">{selectedPo.approval_status}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-secondary">Product:</span>
                <span className="font-bold text-text-primary">{selectedPo.products}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-secondary">Quantity:</span>
                <span className="font-bold text-text-primary">{selectedPo.qty} {selectedPo.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-secondary">Unit Rate:</span>
                <span className="font-mono text-text-primary">₹ {selectedPo.rate?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-secondary">Subtotal:</span>
                <span className="font-mono text-text-primary">₹ {selectedPo.subtotal?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-secondary">GST ({selectedPo.gst_pct}%):</span>
                <span className="font-mono text-text-primary">₹ {selectedPo.gst_amount?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-bold text-primary">
                <span>Grand Total:</span>
                <span className="font-mono">₹ {selectedPo.total_amount?.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              {selectedPo.approval_status === "Pending Approval" ? (
                <>
                  <Button variant="secondary" onClick={() => handleRejectPo(selectedPo.id)}>
                    Reject
                  </Button>
                  <Button onClick={() => handleApprovePo(selectedPo.id)}>
                    Authorize & Approve PO
                  </Button>
                </>
              ) : (
                <Button onClick={() => setSelectedPo(null)}>Close</Button>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
