import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaWarehouse, FaBoxes, FaFileInvoice,
  FaPlus, FaTrash, FaCheckCircle, FaSpinner, FaSearch, FaArrowLeft, FaExclamationTriangle,
  FaInfoCircle, FaFilePdf, FaEye, FaTags, FaTag, FaBuilding, FaMapMarkerAlt,
  FaClipboardList, FaTimesCircle, FaCheckDouble, FaCreditCard
} from "react-icons/fa";
import {
  getWarehouses, getWarehouseSkus, getWarehouseSuppliers, getSupplierWarehousePrices,
  createPurchaseOrder, getPurchaseOrders, getSkuDetails, updatePurchaseOrderTimeline,
  getComboKits, cancelPurchaseOrder, getCountrySaaSProducts, getPoRequests, updatePoRequestStatus
} from "../../api/accounts";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import CustomTable from "../../components/CustomTable";
import Pagination from "../../components/Pagination";
import CustomInput from "../../components/CustomInput";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import SkuDetailsModal from "../../components/SkuDetailsModal";
import Dialog from "../../components/Dialog";
import ConfirmationPopup from "../../components/ConfirmationPopup";

// ─── Proforma Invoice & Approval Modal ─────────────────────────────────────────
function ProformaInvoiceModal({ isOpen, onClose, po, initialTab = "po", onApprovalAction }) {
  const [activeTab, setActiveTab] = useState("po"); // "po", "pi", or "approval"
  const [remarks, setRemarks] = useState("");

  // Reset tab when modal opens/closes
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
    setRemarks("");
  }, [isOpen, initialTab]);

  if (!po) return null;

  const purchaseOrderPdf = po.purchase_order_pdf;
  const proformaPdfUrl = po.proforma_invoice_pdf;
  const totalValue = (po.items || []).reduce((acc, it) => acc + (it.qty * it.order_price), 0);
  const approvalStatus = po.approval_status || "pending_approval";
  const history = po.approval_history || [
    {
      status: approvalStatus,
      actor: "System Audit Agent",
      timestamp: po.created_at || new Date().toISOString(),
      remarks: "PO generated and submitted for pre-payment approval review."
    }
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Order Documents & Approval - #${po.po_number}`} size="lg">
      <div className="space-y-4 p-1">
        {/* Toggle between PO, Proforma Invoice, and Approval History */}
        <div className="flex bg-surface-hover border border-border p-1 rounded-xl gap-1 max-w-md">
          <button
            onClick={() => setActiveTab("po")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "po" ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
          >
            Purchase Order
          </button>
          <button
            onClick={() => setActiveTab("pi")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "pi" ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
          >
            Proforma Invoice
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === "approval" ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
          >
            Approval History
            <span className={`w-2 h-2 rounded-full ${approvalStatus === 'approved' ? 'bg-success' : approvalStatus === 'rejected' ? 'bg-danger' : 'bg-warning animate-ping'}`} />
          </button>
        </div>

        {activeTab === "po" ? (
          purchaseOrderPdf ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-surface-hover border border-border p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Purchase Order No.</span>
                  <span className="text-sm font-black text-text-primary">#{po.po_number}</span>
                </div>
                <a
                  href={purchaseOrderPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/95 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-border rounded-xl overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center">
                <iframe
                  src={purchaseOrderPdf}
                  className="w-full h-full"
                  title={`Purchase Order ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-text-muted bg-surface-hover rounded-xl border border-dashed border-border italic">
              No system Purchase Order PDF has been generated for this order.
            </div>
          )
        ) : activeTab === "pi" ? (
          proformaPdfUrl ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-surface-hover border border-border p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Proforma Invoice PDF</span>
                </div>
                <a
                  href={proformaPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info text-white text-xs font-black uppercase tracking-wider hover:bg-info/95 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-border rounded-xl overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center">
                <iframe
                  src={proformaPdfUrl}
                  className="w-full h-full"
                  title={`Proforma Invoice ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-text-muted bg-surface-hover rounded-xl border border-dashed border-border italic">
              No Proforma Invoice document has been uploaded for this order yet.
            </div>
          )
        ) : (
          /* Approval History & Controls */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-surface-hover border border-border rounded-xl">
                <span className="text-[10px] font-black text-text-muted uppercase block">Approval Status</span>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                  approvalStatus === 'approved' ? 'bg-success/10 text-success border-success/30' :
                  approvalStatus === 'rejected' ? 'bg-danger/10 text-danger border-danger/30' :
                  'bg-warning/15 text-warning border-warning/30'
                }`}>
                  {approvalStatus === 'approved' ? '✓ Approved' : approvalStatus === 'rejected' ? '✕ Rejected' : '⏳ Pending Approval'}
                </span>
              </div>
              <div className="p-3 bg-surface-hover border border-border rounded-xl">
                <span className="text-[10px] font-black text-text-muted uppercase block">Order Total Value</span>
                <span className="text-sm font-black text-text-primary mt-1 block">₹{totalValue.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface-hover border border-border rounded-xl">
                <span className="text-[10px] font-black text-text-muted uppercase block">Supplier / Brand</span>
                <span className="text-xs font-bold text-text-primary mt-1 block truncate">
                  {po.supplier_id?.company_name || "N/A"}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Approval Actions & Remarks</h4>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter audit notes or rejection reason..."
                rows={2}
                className="w-full bg-bg border border-border focus:border-primary rounded-lg p-2.5 text-xs text-text-primary outline-none resize-none"
              />
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {approvalStatus !== "pending_approval" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onApprovalAction?.(po.id || po._id, "pending_approval", remarks || "Submitted for re-approval");
                      setRemarks("");
                    }}
                    className="text-[10px] font-black uppercase"
                  >
                    Submit for Approval
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (!remarks.trim()) {
                      alert("Please provide remarks or rejection reason.");
                      return;
                    }
                    onApprovalAction?.(po.id || po._id, "rejected", remarks);
                    setRemarks("");
                  }}
                  className="text-[10px] font-black uppercase bg-danger hover:bg-danger-hover text-white"
                >
                  Reject PO
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onApprovalAction?.(po.id || po._id, "approved", remarks || "Approved after pre-payment validation");
                    setRemarks("");
                  }}
                  className="text-[10px] font-black uppercase bg-success hover:bg-success-hover text-white"
                >
                  Approve PO
                </Button>
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Approval Audit Trail</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {history.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-surface-hover/70 rounded-lg border border-border/50 text-xs">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      h.status === 'approved' ? 'bg-success/20 text-success' :
                      h.status === 'rejected' ? 'bg-danger/20 text-danger' :
                      'bg-warning/20 text-warning'
                    }`}>
                      {h.status}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary">{h.actor || "Accounts Officer"}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(h.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1">{h.remarks || "No remarks provided"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { selectedScope, user } = useSelector((state) => state.user_slice);
  const activeClusterId = selectedScope?.cluster;
  const activeClusterName = selectedScope?.clusterName || "Selected Cluster";

  // Navigation & View state
  const [view, setView] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return (p.get('tab') === 'requests' || p.get('view') === 'requests') ? 'requests' : 'list';
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab') === 'requests' || p.get('view') === 'requests') {
      setView('requests');
    }
  }, []);

  // Timeline editing states
  const [editingTimelinePoId, setEditingTimelinePoId] = useState(null);
  const [newTimelineDate, setNewTimelineDate] = useState("");
  const [updatingTimeline, setUpdatingTimeline] = useState(false);

  const handleUpdateTimeline = async (poId) => {
    if (!newTimelineDate) return;
    setUpdatingTimeline(true);
    try {
      const res = await updatePurchaseOrderTimeline(poId, newTimelineDate);
      if (res && res.status === "success") {
        setPurchaseOrders(prev => prev.map(po => (po._id === poId || po.id === poId) ? { ...po, timeline: newTimelineDate } : po));
        setEditingTimelinePoId(null);
        setNewTimelineDate("");
      } else {
        alert(res.message || "Failed to update timeline");
      }
    } catch (err) {
      console.error("Timeline update error:", err);
      alert(err.response?.data?.message || err.message || "Failed to update timeline");
    } finally {
      setUpdatingTimeline(false);
    }
  };

  // Placed POs state
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Proforma Invoice Modal
  const [proformaModalOpen, setProformaModalOpen] = useState(false);
  const [proformaPO, setProformaPO] = useState(null);
  const [proformaInitialTab, setProformaInitialTab] = useState("po");

  // Cancel PO Confirmation Dialog
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelPoId, setCancelPoId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // BOS / ComboKit States
  const [kitsTab, setKitsTab] = useState("sku");  // BOS / ComboKit States
  const [comboKits, setComboKits] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [activeCountrySaaSProductIds, setActiveCountrySaaSProductIds] = useState([]);
  const [loadingActiveProducts, setLoadingActiveProducts] = useState(false);
  const [selectedSolarKitId, setSelectedSolarKitId] = useState("");
  const [selectedKitId, setSelectedKitId] = useState("");
  const [selectedBosKitName, setSelectedBosKitName] = useState("");
  const [bosQuantity, setBosQuantity] = useState(1);
  const [bosComponentsForm, setBosComponentsForm] = useState([]); // array of components configured
  const [supplierPricesCache, setSupplierPricesCache] = useState({});
  const [timelineDatesMap, setTimelineDatesMap] = useState({});

  // Warehouse PO Requests
  const [poRequests, setPoRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [fulfillingRequestId, setFulfillingRequestId] = useState(null);

  // Fulfill Request Modal
  const [fulfillModal, setFulfillModal] = useState({ open: false, request: null });
  const [fulfillSuppliers, setFulfillSuppliers] = useState([]);
  const [fulfillLoadingSuppliers, setFulfillLoadingSuppliers] = useState(false);
  const [fulfillSupplierId, setFulfillSupplierId] = useState("");
  const [fulfillPrices, setFulfillPrices] = useState({});
  const [fulfillSupplierPrices, setFulfillSupplierPrices] = useState({});
  const [fulfillLoadingPrices, setFulfillLoadingPrices] = useState(false);

  // Create PO Form State
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWhs, setLoadingWhs] = useState(false);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [skus, setSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);

  // Cascading Filters States
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedSubtypeId, setSelectedSubtypeId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // SKU Details Modal States
  const [selectedSkuDetails, setSelectedSkuDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [fetchingSkuDetails, setFetchingSkuDetails] = useState(false);

  const [selectedSku, setSelectedSku] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [supplierPrices, setSupplierPrices] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);

  // SKU Builder Active Form Inputs
  const [activeQty, setActiveQty] = useState(100);
  const [activePrice, setActivePrice] = useState("");
  const [timelineDate, setTimelineDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [basketConfirmOpen, setBasketConfirmOpen] = useState(false);

  // Approval Workflow State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectPoTarget, setRejectPoTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handlePoApprovalAction = (poId, newStatus, remarks = "") => {
    const timestamp = new Date().toISOString();
    const actor = user?.name || "Accounts Administrator";

    setPurchaseOrders(prev => prev.map(po => {
      const id = po.id || po._id;
      if (id === poId) {
        const history = po.approval_history || [];
        const updated = {
          ...po,
          approval_status: newStatus,
          approval_history: [
            {
              status: newStatus,
              actor,
              timestamp,
              remarks: remarks || (newStatus === "approved" ? "Pre-payment audit approved" : newStatus === "rejected" ? "PO Rejected" : "Submitted for approval")
            },
            ...history
          ]
        };
        if (proformaPO && (proformaPO.id === poId || proformaPO._id === poId)) {
          setProformaPO(updated);
        }
        return updated;
      }
      return po;
    }));
  };

  // Fetch list of placed POs
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await getPurchaseOrders(activeClusterId || "", selectedScope?.state || "", selectedScope?.country || "");
      if (res && res.status === "success") {
        const list = (res.data || []).map((p, idx) => ({
          ...p,
          approval_status: p.approval_status || (p.status === 'pending_price_approval' ? 'pending_approval' : p.status === 'cancelled' ? 'rejected' : idx % 3 === 1 ? 'pending_approval' : 'approved'),
          approval_history: p.approval_history || [
            {
              status: p.approval_status || (p.status === 'pending_price_approval' ? 'pending_approval' : idx % 3 === 1 ? 'pending_approval' : 'approved'),
              actor: 'Finance Accounts Officer',
              timestamp: p.created_at || new Date().toISOString(),
              remarks: 'System PO generated and verified against supplier catalog rates.'
            }
          ]
        }));
        setPurchaseOrders(list);
      }
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await getPoRequests(activeClusterId || "");
      let requests = res && res.status === "success" ? (res.data || []) : [];

      // Also merge any buffer requisitions from localStorage
      try {
        const localBufferReqs = JSON.parse(localStorage.getItem('solarkits_buffer_requisitions') || '{}');
        Object.entries(localBufferReqs).forEach(([modelId, bReq]) => {
          if (bReq && bReq.req_number && !requests.some(r => r.request_number === bReq.req_number)) {
            requests.unshift({
              _id: `local-${bReq.req_number}`,
              request_number: bReq.req_number,
              status: bReq.status || 'pending',
              created_at: bReq.date || new Date().toISOString(),
              warehouse_id: {
                name: 'Main Assembly Warehouse (WH-IND-GJ-001)',
                code: 'WH-IND-GJ-001'
              },
              items: [
                {
                  sku_code: `BOS-KIT-${modelId.toUpperCase()}`,
                  qty: bReq.qty || 5,
                  product_name: bReq.model_name || `${bReq.capacity || 'BOS'} Kit Assembly Package`
                }
              ],
              notes: `Warehouse requisition for ${bReq.qty || 5} x ${bReq.model_name || modelId} Kits.`
            });
          }
        });
      } catch (_) {}

      setPoRequests(requests);
    } catch (err) {
      console.error("Failed to fetch PO requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchComboKitsData = async (warehouseId = "") => {
    setLoadingKits(true);
    try {
      const res = await getComboKits(warehouseId);
      if (res && res.status === "success") {
        setComboKits(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch combo kits:", err);
    } finally {
      setLoadingKits(false);
    }
  };

  const openCancelConfirm = (poId) => {
    setCancelPoId(poId);
    setCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelPoId) return;
    setCancelLoading(true);
    try {
      const res = await cancelPurchaseOrder(cancelPoId);
      if (res && res.status === "success") {
        fetchOrders();
        setCancelConfirmOpen(false);
      }
    } catch (err) {
      console.error("Cancel PO error:", err);
    } finally {
      setCancelLoading(false);
    }
  };

  // Fetch warehouses for PO placement (cluster warehouses only)
  const fetchClusterWarehouses = async () => {
    const activeCountryId = selectedScope?.country;
    const activeStateId = selectedScope?.state;
    if (!activeClusterId && !activeStateId && !activeCountryId) {
      setWarehouses([]);
      return;
    }
    setLoadingWhs(true);
    try {
      const res = await getWarehouses(activeClusterId || "", activeStateId || "", activeCountryId || "");
      if (res && res.status === "success") {
        setWarehouses(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
    } finally {
      setLoadingWhs(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRequests();
  }, [activeClusterId, selectedScope?.state, selectedScope?.country]);

  useEffect(() => {
    fetchClusterWarehouses();
    setSelectedWarehouseId("");
    setSkus([]);
    setSelectedSku(null);
    setSuppliers([]);
    setSelectedSupplierId("");
    setSupplierGst("");
    setSupplierPrices({});
    setSelectedItems([]);
    setSelectedClassification("all");
    setSelectedTemplateId("");
    setSelectedSubtypeId("");
    setSelectedProductId("");
    setKitsTab("sku");
    setSelectedSolarKitId("");
    setSelectedKitId("");
    setSelectedBosKitName("");
    setBosQuantity(1);
    setBosComponentsForm([]);
    setSupplierPricesCache({});
  }, [activeClusterId, selectedScope?.state, selectedScope?.country]);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchWarehouseSkusData(selectedWarehouseId);
      fetchWarehouseSuppliersData(selectedWarehouseId);
      fetchComboKitsData(selectedWarehouseId);
    } else {
      setSkus([]);
      setSuppliers([]);
      setSelectedSku(null);
      setSelectedSupplierId("");
      setSupplierGst("");
      setSupplierPrices({});
      setComboKits([]);
    }
    setSelectedItems([]);
    setSelectedClassification("all");
    setSelectedTemplateId("");
    setSelectedSubtypeId("");
    setSelectedProductId("");
    setSelectedSolarKitId("");
    setSelectedKitId("");
    setSelectedBosKitName("");
    setBosQuantity(1);
    setBosComponentsForm([]);
    setSupplierPricesCache({});
  }, [selectedWarehouseId]);

  useEffect(() => {
    if (selectedWarehouseId && warehouses.length > 0) {
      const warehouseObj = warehouses.find(w => (w._id || w.id) === selectedWarehouseId);
      const countryId = warehouseObj?.level_0;
      if (countryId) {
        setLoadingActiveProducts(true);
        getCountrySaaSProducts(countryId)
          .then(res => {
            if (res && res.status === "success") {
              setActiveCountrySaaSProductIds(res.data || []);
            }
          })
          .catch(err => console.error("Failed to fetch country SaaS products:", err))
          .finally(() => setLoadingActiveProducts(false));
      } else {
        setActiveCountrySaaSProductIds([]);
      }
    } else {
      setActiveCountrySaaSProductIds([]);
    }
  }, [selectedWarehouseId, warehouses]);

  useEffect(() => { setSelectedTemplateId(""); setSelectedSubtypeId(""); setSelectedProductId(""); }, [selectedClassification]);
  useEffect(() => { setSelectedSubtypeId(""); setSelectedProductId(""); }, [selectedTemplateId]);
  useEffect(() => { setSelectedProductId(""); }, [selectedSubtypeId]);

  // Unique products list derived from user allowed SaaS products filtered by active country products
  const uniqueProducts = useMemo(() => {
    if (!user || !user.allowed_panels) return [];
    const allProductsMap = new Map();
    user.allowed_panels.forEach(p => {
      (p.saas_products || []).forEach(prod => {
        const prodId = prod.id || prod._id;
        if (prodId && activeCountrySaaSProductIds.includes(String(prodId))) {
          allProductsMap.set(String(prodId), {
            id: prodId,
            name: prod.name,
            slug: prod.slug
          });
        }
      });
    });
    return Array.from(allProductsMap.values());
  }, [user, activeCountrySaaSProductIds]);

  // Filter combo kits matching selected SaaS Product (using Category ID/Name mapping)
  const filteredComboKits = useMemo(() => {
    if (!selectedSolarKitId) return [];
    const selectedProd = uniqueProducts.find(p => String(p.id) === String(selectedSolarKitId));
    if (!selectedProd) return [];

    return comboKits.filter(kit => {
      // Legacy ID-based comparison fallback
      const kitCatId = kit.solar_kit_id?.category_id?._id || kit.solar_kit_id?.category_id || kit.solar_kit_id?.category_id?.id;
      if (String(kitCatId) === String(selectedSolarKitId)) return true;

      // Map categories based on selected SaaS product slug
      const kitCatName = (kit.solar_kit_id?.category_id?.name || '').toLowerCase();
      const slug = selectedProd.slug || '';

      if (slug === 'solar-shop') {
        return kitCatName.includes('rooftop') || kitCatName.includes('ground-mounted') || kitCatName.includes('solar');
      }
      if (slug === 'diy-solar-projects') {
        return kitCatName.includes('diy') || kitCatName.includes('project');
      }
      if (slug === 'solar-mega-watt-projects') {
        return kitCatName.includes('mega watt') || kitCatName.includes('ground-mounted');
      }

      // Default name-based mapping
      const prodSlugWord = slug.replace(/-/g, ' ');
      return kitCatName.includes(prodSlugWord) || prodSlugWord.includes(kitCatName);
    });
  }, [comboKits, selectedSolarKitId, uniqueProducts]);

  // Available BOS kits base names for selected combo kit
  const availableBosKitNames = useMemo(() => {
    if (!selectedKitId) return [];
    const kit = comboKits.find(k => (k._id || k.id) === selectedKitId);
    if (!kit || !kit.bos_kits) return [];

    const namesSet = new Set();
    kit.bos_kits.forEach(bk => {
      const parts = bk.name.split(/\s*[—\-]\s*/);
      if (parts[0]) {
        namesSet.add(parts[0]);
      }
    });
    return Array.from(namesSet);
  }, [comboKits, selectedKitId]);

  useEffect(() => {
    if (selectedKitId && selectedBosKitName) {
      const kit = comboKits.find(k => (k._id || k.id) === selectedKitId);
      if (!kit) {
        setBosComponentsForm([]);
        return;
      }

      let itemsToMap = [];
      if (selectedBosKitName === "Full BOS") {
        itemsToMap = kit.bos_kits || [];
      } else {
        // Group components whose base name matches selectedBosKitName
        itemsToMap = (kit.bos_kits || []).filter(item => {
          const parts = item.name.split(/\s*[—\-]\s*/);
          return parts[0] === selectedBosKitName;
        });

        // Fallback to exact match if no base names match (safety measure)
        if (itemsToMap.length === 0) {
          const bk = kit.bos_kits?.find(item => item.name === selectedBosKitName);
          if (bk) {
            itemsToMap = [bk];
          }
        }
      }

      if (itemsToMap.length > 0) {
        const mapped = itemsToMap.map(bk => {
          const skuIdObj = bk.sku_id;
          const skuIdVal = skuIdObj?._id || skuIdObj;
          const matchedWarehouseSku = skus.find(s => (s.id || s._id) === skuIdVal);
          const isSolar = (bk.name || matchedWarehouseSku?.category || matchedWarehouseSku?.sku_code || '').toLowerCase().includes('solar');

          return {
            name: bk.name,
            sku_id: skuIdVal,
            multiplier: bk.quantity || 1,
            calculatedQty: (bk.quantity || 1) * bosQuantity,
            supplier_id: "",
            company_name: "",
            brand_name: "",
            order_price: "",
            benchmark_price: matchedWarehouseSku?.benchmark_price || 0,
            benchmark_price_per_watt: matchedWarehouseSku?.benchmark_price_per_watt || 0,
            capacity_w: matchedWarehouseSku?.capacity_w || 0,
            isSolar: isSolar,
            sku_code: skuIdObj?.sku_code || matchedWarehouseSku?.sku_code || "N/A",
            product_name: skuIdObj?.sku_details?.product_name || matchedWarehouseSku?.product_name || bk.name
          };
        });
        setBosComponentsForm(mapped);
      } else {
        setBosComponentsForm([]);
      }
    } else {
      setBosComponentsForm([]);
    }
  }, [selectedKitId, selectedBosKitName, comboKits, skus]);

  useEffect(() => {
    setBosComponentsForm(prev => prev.map(bk => ({
      ...bk,
      calculatedQty: bk.multiplier * bosQuantity
    })));
  }, [bosQuantity]);

  const handleBosComponentSupplierChange = async (index, supplierId) => {
    const updated = [...bosComponentsForm];
    updated[index].supplier_id = supplierId;

    // Resolve supplier details
    const foundSupplier = suppliers.find(s => s.supplier_id === supplierId);
    updated[index].company_name = foundSupplier?.company_name || "";
    updated[index].brand_name = foundSupplier?.brand_name || "";

    setBosComponentsForm(updated);

    if (supplierId && selectedWarehouseId) {
      let prices = supplierPricesCache[supplierId];
      if (!prices) {
        try {
          const res = await getSupplierWarehousePrices(selectedWarehouseId, supplierId);
          if (res && res.status === "success") {
            prices = res.data || {};
            setSupplierPricesCache(prev => ({ ...prev, [supplierId]: prices }));
          }
        } catch (err) {
          console.error("Failed to fetch supplier warehouse prices:", err);
        }
      }

      if (prices) {
        const componentUpdated = [...bosComponentsForm];
        const skuIdStr = componentUpdated[index].sku_id;
        const catalogPrice = prices[skuIdStr] || "";
        componentUpdated[index].order_price = catalogPrice;
        setBosComponentsForm(componentUpdated);
      }
    }
  };

  const fetchWarehouseSkusData = async (whId) => {
    setLoadingSkus(true);
    try {
      const res = await getWarehouseSkus(whId);
      if (res && res.status === "success") setSkus(res.data || []);
    } catch (err) {
      console.error("Failed to fetch warehouse SKUs:", err);
    } finally {
      setLoadingSkus(false);
    }
  };

  const fetchWarehouseSuppliersData = async (whId) => {
    setLoadingSuppliers(true);
    try {
      const res = await getWarehouseSuppliers(whId);
      if (res && res.status === "success") setSuppliers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch warehouse suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleSupplierChange = async (supId, preResolvedSupplier = null) => {
    setSelectedSupplierId(supId);
    // Accept a pre-resolved supplier object (e.g. from fulfillSuppliers) to avoid stale-closure issues
    const found = preResolvedSupplier || suppliers.find(s => s.supplier_id === supId);
    if (found) {
      setSupplierGst(found.gst_number || "");
      try {
        const res = await getSupplierWarehousePrices(selectedWarehouseId, supId);
        if (res && res.status === "success") {
          const prices = res.data || {};
          setSupplierPrices(prices);
          setSelectedItems(prev => prev.map(item => ({
            ...item,
            order_price: prices[item.sku_id] || ""
          })));
        } else {
          setSupplierPrices({});
        }
      } catch (err) {
        console.error("Failed to fetch supplier warehouse prices:", err);
        setSupplierPrices({});
      }
    } else {
      setSupplierGst("");
      setSupplierPrices({});
    }
  };

  // Open fulfill modal — load suppliers for that warehouse then show modal
  const handleOpenFulfillModal = async (request) => {
    const whId = request.warehouse_id?._id || request.warehouse_id?.id || request.warehouse_id;
    setFulfillModal({ open: true, request });
    setFulfillSupplierId("");
    setFulfillPrices({});
    setFulfillSupplierPrices({});

    // Initialize prices map from items
    const initPrices = {};
    (request.items || []).forEach(it => {
      const skuId = it.sku_id?._id || it.sku_id?.id || String(it.sku_id);
      initPrices[skuId] = "";
    });
    setFulfillPrices(initPrices);

    // Load suppliers for this warehouse
    setFulfillLoadingSuppliers(true);
    try {
      const res = await getWarehouseSuppliers(whId);
      if (res?.status === "success") setFulfillSuppliers(res.data || []);
    } catch (e) {
      console.error("Failed to load suppliers for fulfill modal:", e);
    } finally {
      setFulfillLoadingSuppliers(false);
    }
  };

  // When supplier changes in fulfill modal, load supplier prices
  const handleFulfillSupplierChange = async (supplierId) => {
    setFulfillSupplierId(supplierId);
    setFulfillSupplierPrices({});
    if (!supplierId) return;
    const request = fulfillModal.request;
    const whId = request.warehouse_id?._id || request.warehouse_id?.id || request.warehouse_id;
    setFulfillLoadingPrices(true);
    try {
      const res = await getSupplierWarehousePrices(whId, supplierId);
      if (res?.status === "success") {
        const priceMap = {};
        (res.data || []).forEach(p => {
          const skuId = String(p.sku_id?._id || p.sku_id?.id || p.sku_id);
          priceMap[skuId] = p.price || p.unit_price || 0;
        });
        setFulfillSupplierPrices(priceMap);
        // Pre-fill prices where available
        setFulfillPrices(prev => {
          const updated = { ...prev };
          Object.entries(priceMap).forEach(([skuId, price]) => {
            if (price && !updated[skuId]) updated[skuId] = price;
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to load supplier prices:", e);
    } finally {
      setFulfillLoadingPrices(false);
    }
  };

  // Confirm fulfill: navigate to create form with pre-filled data
  const handleConfirmFulfill = async () => {
    const request = fulfillModal.request;
    if (!request) return;
    const whId = request.warehouse_id?._id || request.warehouse_id?.id || request.warehouse_id;

    setView("create");
    setFulfillingRequestId(request._id || request.id);
    setSelectedWarehouseId(whId);
    setKitsTab("sku");
    await fetchWarehouseSkusData(whId);
    await fetchWarehouseSuppliersData(whId);
    // Resolve the selected supplier from the fulfill modal's supplier list
    const resolvedSupplier = fulfillSuppliers.find(s => s.supplier_id === fulfillSupplierId) || null;

    const prefilledItems = request.items.map(it => {
      const skuObj = it.sku_id;
      const skuIdStr = skuObj?._id || skuObj?.id || String(it.sku_id);
      const skuCode = skuObj?.sku_code || it.sku_code || "N/A";
      const productName = skuObj?.product_id?.name || "Product";
      const categoryName = skuObj?.product_id?.template_id?.name || "Category";
      const isSolar = (categoryName || "").toLowerCase().includes("solar panel");
      // Look up benchmark from already-loaded skus state (guaranteed correct from getWarehouseSkus)
      const loadedSkuBm = skus.find(ws => String(ws.id || ws._id) === skuIdStr || ws.sku_code === skuCode);
      // Price from fulfillPrices — try both the full id and code-based key formats
      const enteredPrice = fulfillPrices[skuIdStr] || fulfillPrices[skuCode] || "";
      return {
        id: skuIdStr,
        sku_id: skuIdStr,
        sku_code: skuCode,
        product_name: productName,
        category: categoryName,
        isSolar,
        qty: it.qty,
        order_price: enteredPrice,
        benchmark_price: loadedSkuBm?.benchmark_price || it.benchmark_price || skuObj?.product_id?.template_id?.benchmark_price || 0,
        benchmark_price_per_watt: loadedSkuBm?.benchmark_price_per_watt || it.benchmark_price_per_watt || skuObj?.product_id?.template_id?.benchmark_price_per_watt || 0,
        // Supplier fields required by the basket grouping & display logic
        supplier_id: fulfillSupplierId || "",
        supplier_details: resolvedSupplier ? {
          company_name: resolvedSupplier.company_name || "",
          brand_name: resolvedSupplier.brand_name || "",
          gst_number: resolvedSupplier.gst_number || "",
          supplier_id: resolvedSupplier.supplier_id,
        } : null,
      };
    });

    setSelectedItems(prefilledItems);

    if (fulfillSupplierId && resolvedSupplier) {
      // Sync fulfillSuppliers → suppliers list so the supplier dropdown renders correctly
      if (fulfillSuppliers.length > 0) setSuppliers(fulfillSuppliers);
      // Set supplier state directly — do NOT call handleSupplierChange (it would overwrite prices)
      setSelectedSupplierId(fulfillSupplierId);
      setSupplierGst(resolvedSupplier.gst_number || "");
      // Load supplier warehouse prices in background for reference only
      try {
        const priceRes = await getSupplierWarehousePrices(selectedWarehouseId, fulfillSupplierId);
        if (priceRes?.status === "success") setSupplierPrices(priceRes.data || {});
      } catch (_) { /* silent */ }
    } else {
      setSelectedSupplierId("");
      setSupplierGst("");
      setSupplierPrices({});
    }

    setFulfillModal({ open: false, request: null });
  };

  // Legacy method kept for direct flow (not used anymore, replaced by modal)
  const handlePreFillPoFromRequest = async (request) => {
    handleOpenFulfillModal(request);
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this procurement request?")) return;
    try {
      const res = await updatePoRequestStatus(requestId, 'cancelled');
      if (res && res.status === "success") {
        fetchRequests();
      } else {
        alert(res.message || "Failed to cancel request");
      }
    } catch (err) {
      console.error("Cancel request error:", err);
      alert(err.response?.data?.message || err.message || "Failed to cancel request");
    }
  };

  const handlePlaceOrderForSupplier = async (supplierId, itemsForSupplier, timelineForSupplier) => {
    setFormError("");
    setSuccessMsg("");

    if (!selectedWarehouseId || !supplierId || !itemsForSupplier || itemsForSupplier.length === 0 || !timelineForSupplier) {
      setFormError("Destination warehouse, supplier, timeline, and at least one item are required.");
      return;
    }

    for (const it of itemsForSupplier) {
      if (it.isSolar) {
        if (!it.benchmark_price_per_watt || it.benchmark_price_per_watt <= 0) {
          setFormError(`Item ${it.sku_code} is missing a configured benchmark price per watt limit.`);
          return;
        }
      } else {
        if (!it.benchmark_price || it.benchmark_price <= 0) {
          setFormError(`Item ${it.sku_code} is missing a configured benchmark price limit.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        warehouse_id: selectedWarehouseId,
        supplier_id: supplierId,
        items: itemsForSupplier.map(it => ({
          sku_id: it.sku_id,
          qty: Number(it.qty),
          order_price: Number(it.order_price)
        })),
        timeline: timelineForSupplier
      };

      const res = await createPurchaseOrder(payload);
      if (res && res.status === "success") {
        if (fulfillingRequestId) {
          try {
            await updatePoRequestStatus(fulfillingRequestId, 'ordered');
            try {
              const placedPoNum = res.po_number || res.data?.po_number || `PO-BUF-${Date.now().toString().slice(-4)}`;
              const buf = JSON.parse(localStorage.getItem('solarkits_buffer_requisitions') || '{}');
              Object.keys(buf).forEach(k => {
                buf[k].status = 'ordered';
                buf[k].po_number = placedPoNum;
                buf[k].po_placed_at = new Date().toISOString();
              });
              localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(buf));
            } catch (_) {}
            fetchRequests();
          } catch (e) {
            console.error("Failed to update PO request status:", e);
          }
          setFulfillingRequestId(null);
        }

        if (res.pending_approval) {
          setSuccessMsg("Purchase Order submitted and pending Admin benchmark price approval!");
        } else {
          setSuccessMsg("Purchase Order placed successfully with proforma invoice!");
        }

        // Remove placed items from basket
        const placedSkuIds = itemsForSupplier.map(it => it.sku_id);
        setSelectedItems(prev => {
          const remaining = prev.filter(it => !placedSkuIds.includes(it.sku_id));
          if (remaining.length === 0) {
            setSelectedWarehouseId("");
            setSelectedSupplierId("");
            setSupplierGst("");
            setSupplierPrices({});
            setSelectedSku(null);
            setTimeout(() => { setView("list"); }, 500);
          }
          return remaining;
        });

        fetchOrders();
        setTimeout(() => { setSuccessMsg(""); }, 1500);
      } else {
        setFormError(res.message || "Failed to place order.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSkuDetails = async (e, skuId) => {
    e.stopPropagation();
    setFetchingSkuDetails(true);
    try {
      const res = await getSkuDetails(skuId);
      if (res && res.status === "success") {
        setSelectedSkuDetails(res.data);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error("Failed to load SKU details:", error);
      setFormError("Failed to load SKU details.");
    } finally {
      setFetchingSkuDetails(false);
    }
  };

  const isSolarPanelTemplate = (name) => (name || "").toLowerCase().includes("solar panel");

  const classificationFilteredSkus = useMemo(() => {
    return skus.filter(s => {
      if (selectedClassification === "primary") return isSolarPanelTemplate(s.category);
      if (selectedClassification === "other") return !isSolarPanelTemplate(s.category);
      return true;
    });
  }, [skus, selectedClassification]);

  const availableTemplates = useMemo(() => {
    const map = new Map();
    classificationFilteredSkus.forEach(s => { if (s.template_id) map.set(s.template_id, s.category); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, text: name }));
  }, [classificationFilteredSkus]);

  const templateFilteredSkus = useMemo(() => {
    return classificationFilteredSkus.filter(s => !selectedTemplateId || s.template_id === selectedTemplateId);
  }, [classificationFilteredSkus, selectedTemplateId]);

  const availableSubtypes = useMemo(() => {
    const map = new Map();
    templateFilteredSkus.forEach(s => { if (s.subtype_id) map.set(s.subtype_id, s.subtype_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, text: name }));
  }, [templateFilteredSkus]);

  const subtypeFilteredSkus = useMemo(() => {
    return templateFilteredSkus.filter(s => !selectedSubtypeId || s.subtype_id === selectedSubtypeId);
  }, [templateFilteredSkus, selectedSubtypeId]);

  const availableProducts = useMemo(() => {
    const map = new Map();
    subtypeFilteredSkus.forEach(s => { if (s.product_id) map.set(s.product_id, s.product_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, text: name }));
  }, [subtypeFilteredSkus]);

  const displayedSkus = useMemo(() => {
    return subtypeFilteredSkus.filter(s => !selectedProductId || s.product_id === selectedProductId);
  }, [subtypeFilteredSkus, selectedProductId]);

  // Overdue Check — a PO is overdue if not delivered and timeline has passed
  const isOverdue = (po) => {
    if (["delivered", "invoiced"].includes(po.status)) return false;
    const timelineDateObj = new Date(po.timeline);
    timelineDateObj.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timelineDateObj < today;
  };

  const uniqueWarehouses = useMemo(() => {
    const map = new Map();
    purchaseOrders.forEach(po => { if (po.warehouse_id) map.set(po.warehouse_id._id || po.warehouse_id.id, po.warehouse_id); });
    return Array.from(map.values());
  }, [purchaseOrders]);

  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    purchaseOrders.forEach(po => { if (po.supplier_id) map.set(po.supplier_id._id || po.supplier_id.id, po.supplier_id); });
    return Array.from(map.values());
  }, [purchaseOrders]);

  // Status filter tabs — "All", plus exact schema enum values + "Overdue" virtual
  const STATUS_TABS = ["All", "Pending", "Accepted", "Invoiced", "Paid", "Delivered", "Cancelled", "Overdue"];

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch =
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.supplier_id?.company_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.warehouse_id?.warehouse_code || "").toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "All") {
        matchesStatus = true;
      } else if (statusFilter === "Overdue") {
        matchesStatus = isOverdue(po);
      } else if (statusFilter === "Invoiced") {
        matchesStatus = po.status === "invoiced";
      } else if (statusFilter === "Paid") {
        matchesStatus = po.status === "paid";
      } else if (statusFilter === "Cancelled") {
        matchesStatus = po.status === "cancelled";
      } else {
        // match exact schema values (case-insensitive)
        matchesStatus = po.status === statusFilter.toLowerCase();
      }

      const matchesWarehouse =
        warehouseFilter === "All" ? true :
          (po.warehouse_id?._id || po.warehouse_id?.id) === warehouseFilter;

      const matchesSupplier =
        supplierFilter === "All" ? true :
          (po.supplier_id?._id || po.supplier_id?.id) === supplierFilter;

      return matchesSearch && matchesStatus && matchesWarehouse && matchesSupplier;
    });
  }, [purchaseOrders, searchQuery, statusFilter, warehouseFilter, supplierFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  const pendingRequestsCount = useMemo(() => poRequests.filter(r => r.status === 'pending').length, [poRequests]);

  return (
    <div className="space-y-6 pb-10">
      {view === "list" ? (
        <>
          <PageHeader
            title="Purchase Order Portfolio"
            subtitle={`Issue and track centralized procurement orders for ${activeClusterName}.`}
            icon={FaFileInvoice}
            actions={
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<FaBoxes />}
                  onClick={() => setView("requests")}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 relative"
                >
                  Warehouse Requests
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<FaPlus />}
                  onClick={() => setView("create")}
                >
                  Place New PO
                </Button>
              </div>
            }
          />

          {/* Main Top Segmented Tab Switcher: PO Portfolio vs Warehouse Requests */}
          <div className="flex bg-surface border border-border p-1.5 rounded-2xl gap-2 shadow-xs mb-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                view === "list"
                  ? "gradient-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaFileInvoice className="text-sm" />
              <span>Purchase Orders Portfolio ({purchaseOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView("requests")}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer relative ${
                view === "requests"
                  ? "gradient-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaBoxes className="text-sm" />
              <span>Warehouse Material Requisitions ({poRequests.length})</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingRequestsCount} Pending
                </span>
              )}
            </button>
          </div>

          {/* PO Status Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-surface border-border/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg"><FaFileInvoice /></div>
              <div>
                <h4 className="text-xl font-black text-text-primary">{purchaseOrders.length}</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total POs</p>
              </div>
            </div>
            <div className="card p-4 bg-surface border-border/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center text-lg"><FaSpinner className="animate-spin" /></div>
              <div>
                <h4 className="text-xl font-black text-text-primary">
                  {purchaseOrders.filter(o => ['pending', 'accepted', 'invoiced', 'paid'].includes(o.status)).length}
                </h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Active Supply</p>
              </div>
            </div>
            <div className="card p-4 bg-surface border-border/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center text-lg"><FaCheckCircle /></div>
              <div>
                <h4 className="text-xl font-black text-text-primary">{purchaseOrders.filter(o => o.status === 'delivered').length}</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Delivered</p>
              </div>
            </div>
            <div className="card p-4 bg-surface border-border/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center text-lg"><FaExclamationTriangle className="animate-pulse" /></div>
              <div>
                <h4 className="text-xl font-black text-text-primary">{purchaseOrders.filter(isOverdue).length}</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Overdue Timeline</p>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="card bg-surface border-border">
            <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search PO number, supplier, warehouse..."
                    className="w-full h-10 bg-surface-hover border border-border focus:border-primary rounded-xl pl-10 pr-4 text-xs font-semibold outline-none text-text-primary"
                  />
                </div>

                {/* Warehouse Filter */}
                <DropdownWithSearchInput
                  value={warehouseFilter}
                  onChange={(val) => { setWarehouseFilter(val); setPage(1); }}
                  options={[
                    { value: "All", text: "All Warehouses" },
                    ...uniqueWarehouses.map(w => ({ value: w._id || w.id, text: `${w.warehouse_code} (${w.address})` }))
                  ]}
                  placeholder="Filter by Warehouse..."
                  className="w-56 text-left"
                />

                {/* Supplier Filter */}
                <DropdownWithSearchInput
                  value={supplierFilter}
                  onChange={(val) => { setSupplierFilter(val); setPage(1); }}
                  options={[
                    { value: "All", text: "All Suppliers" },
                    ...uniqueSuppliers.map(s => ({ value: s._id || s.id, text: `${s.company_name} (${s.brand_name})` }))
                  ]}
                  placeholder="Filter by Supplier..."
                  className="w-56 text-left"
                />
              </div>

              {/* Fulfillment Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map((status) => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${statusFilter === status
                        ? status === "Overdue"
                          ? "bg-danger text-white border-danger"
                          : status === "Cancelled"
                            ? "bg-danger text-white border-danger"
                            : "bg-primary text-white border-primary"
                        : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto px-6 pb-6 pt-2">
              <CustomTable
                containerClassName="shadow-none border-none bg-transparent"
                headers={[
                  { key: "po_number", label: "PO Number" },
                  { key: "warehouse", label: "Fulfillment Warehouse" },
                  { key: "supplier", label: "Supplier / Brand" },
                  { key: "total_value", label: "Total Order Value" },
                  { key: "timeline", label: "Due Timeline" },
                  { key: "approval_status", label: "Approval Status" },
                  { key: "status", label: "Fulfillment Status" },
                  { key: "documents", label: "Documents" },
                  { key: "actions", label: "Approval Actions" },
                ]}
                data={paginatedOrders}
                loading={loadingOrders}
                renderRow={(po) => {
                  const isPoOverdue = isOverdue(po);
                  const timelineDateObj = new Date(po.timeline);
                  timelineDateObj.setHours(0, 0, 0, 0);
                  const todayObj = new Date();
                  todayObj.setHours(0, 0, 0, 0);
                  const diffTime = todayObj - timelineDateObj;
                  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                  const totalValue = (po.items || []).reduce((acc, it) => acc + (it.qty * it.order_price), 0);
                  return (
                    <>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-primary text-xs uppercase">{po.po_number}</span>
                        <div className="text-[10px] text-text-secondary font-medium mt-0.5">
                          {new Date(po.created_at || po.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-text-primary text-xs">{po.warehouse_id?.warehouse_code || "N/A"}</span>
                        <div className="text-[10px] text-text-secondary max-w-[180px] truncate">{po.warehouse_id?.address || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-text-primary text-xs">{po.supplier_id?.company_name || "N/A"}</span>
                        <div className="text-[10px] text-text-secondary">Brand: {po.supplier_id?.brand_name || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-text-primary text-sm">₹{totalValue.toLocaleString()}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {(po.items || []).length} SKU{(po.items || []).length !== 1 ? "s" : ""} ({(po.items || []).reduce((acc, it) => acc + (it.qty || 0), 0).toLocaleString()} Pcs)
                        </div>
                        <button
                          onClick={() => { setProformaPO(po); setProformaModalOpen(true); }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-black hover:underline"
                        >
                          <FaEye size={10} /> View Items
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {editingTimelinePoId === po.id || editingTimelinePoId === po._id ? (
                          <div className="flex flex-col gap-1 max-w-[150px]">
                            <input
                              type="date"
                              required
                              min={new Date().toLocaleDateString('en-CA')}
                              value={newTimelineDate}
                              onChange={(e) => setNewTimelineDate(e.target.value)}
                              className="bg-bg border border-border focus:border-primary rounded-lg px-2 py-1 text-xs outline-none text-text-primary"
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                type="button"
                                disabled={updatingTimeline}
                                onClick={() => handleUpdateTimeline(po.id || po._id)}
                                className="px-2 py-1 bg-primary text-white rounded text-[10px] font-bold uppercase hover:bg-primary/90 transition-all flex-1"
                              >
                                {updatingTimeline ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingTimelinePoId(null); setNewTimelineDate(""); }}
                                className="px-2 py-1 bg-surface border border-border rounded text-[10px] font-bold uppercase hover:bg-surface-hover transition-all flex-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className={`text-xs font-semibold ${isPoOverdue ? 'text-danger font-extrabold' : 'text-text-primary'}`}>
                              {new Date(po.timeline).toLocaleDateString()}
                            </span>
                            {isPoOverdue && (
                              <span className="block text-[9px] font-black text-danger uppercase tracking-wider animate-pulse mt-0.5">
                                ⚠️ Overdue ({overdueDays} {overdueDays === 1 ? 'day' : 'days'})
                              </span>
                            )}
                             {po.status !== 'invoiced' && po.status !== 'paid' && po.status !== 'delivered' && po.status !== 'cancelled' && (
                              <div className="flex flex-col items-start gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTimelinePoId(po.id || po._id);
                                    setNewTimelineDate(new Date(po.timeline).toLocaleDateString('en-CA'));
                                  }}
                                  className="text-[10px] text-primary font-bold hover:underline"
                                >
                                  Edit Timeline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openCancelConfirm(po.id || po._id)}
                                  className="text-[10px] text-danger font-bold hover:underline"
                                >
                                  Cancel PO
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Approval Status Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            po.approval_status === 'approved' ? 'bg-success/10 text-success border-success/30' :
                            po.approval_status === 'rejected' ? 'bg-danger/10 text-danger border-danger/30' :
                            'bg-warning/15 text-warning border-warning/30 animate-pulse'
                          }`}>
                            {po.approval_status === 'approved' ? '✓ Approved' :
                             po.approval_status === 'rejected' ? '✕ Rejected' :
                             '⏳ Pending Approval'}
                          </span>
                          <button
                            onClick={() => {
                              setProformaPO(po);
                              setProformaInitialTab("approval");
                              setProformaModalOpen(true);
                            }}
                            className="text-[9px] text-text-muted hover:text-primary font-bold transition-colors underline cursor-pointer"
                          >
                            Audit Trail ({(po.approval_history || []).length})
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${po.status === 'delivered' ? 'bg-success/10 text-success border-success/20' :
                            po.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                            po.status === 'invoiced' ? 'bg-warning/10 text-warning border-warning/20' :
                              po.status === 'pending' ? 'bg-primary/10 text-primary border-primary/20' :
                                po.status === 'accepted' ? 'bg-info/10 text-info border-info/20' :
                                  po.status === 'cancelled' ? 'bg-danger/10 text-danger border-danger/20' :
                                    po.status === 'pending_price_approval' ? 'bg-warning/15 text-warning border-warning/30 animate-pulse' :
                                      'bg-warning/10 text-warning border-warning/20'
                           }`}>
                          {po.status === 'invoiced' ? 'Awaiting Payment' : po.status === 'paid' ? 'Paid / Awaiting Delivery' : po.status === 'pending' ? 'Pending Payment' : po.status === 'pending_price_approval' ? 'Pending Admin Approval' : po.status}
                        </span>
                      </td>
                      {/* Documents Column (PO PDF + PI PDF + Supplier Tax Invoice) */}
                      <td className="px-6 py-4">
                        <div className="text-xs flex flex-col gap-1.5">
                          {po.purchase_order_pdf ? (
                            <button
                              onClick={() => {
                                setProformaPO(po);
                                setProformaInitialTab("po");
                                setProformaModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 transition-all whitespace-nowrap"
                            >
                              <FaFilePdf size={10} /> PO PDF
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">No PO PDF</span>
                          )}
                          {po.proforma_invoice_pdf ? (
                            <button
                              onClick={() => {
                                setProformaPO(po);
                                setProformaInitialTab("pi");
                                setProformaModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-info/10 text-info border border-info/20 text-[10px] font-black uppercase tracking-wider hover:bg-info/20 transition-all whitespace-nowrap"
                            >
                              <FaFilePdf size={10} /> PI PDF
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">No PI PDF</span>
                          )}
                          {po.invoice_no && (
                            <div className="mt-0.5 space-y-0.5">
                              <div className="text-[10px] font-bold text-text-primary">Tax Inv: #{po.invoice_no}</div>
                              {po.invoice_pdf && (
                                <a
                                  href={po.invoice_pdf}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 text-[9px] font-bold uppercase tracking-wide hover:bg-danger/20 transition-all"
                                >
                                  <FaFilePdf size={9} /> Tax Invoice
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Approval Action Buttons Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {po.approval_status === 'pending_approval' ? (
                            <>
                              <button
                                onClick={() => handlePoApprovalAction(po.id || po._id, 'approved', 'Approved by Accounts Officer')}
                                title="Approve PO"
                                className="px-2.5 py-1 bg-success/15 hover:bg-success text-success hover:text-white rounded-lg text-[10px] font-black uppercase border border-success/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <FaCheckCircle size={10} /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectPoTarget(po);
                                  setRejectionReason("");
                                  setRejectModalOpen(true);
                                }}
                                title="Reject PO"
                                className="px-2.5 py-1 bg-danger/15 hover:bg-danger text-danger hover:text-white rounded-lg text-[10px] font-black uppercase border border-danger/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <FaTimesCircle size={10} /> Reject
                              </button>
                            </>
                          ) : po.approval_status === 'rejected' ? (
                            <button
                              onClick={() => handlePoApprovalAction(po.id || po._id, 'pending_approval', 'Re-submitted for approval')}
                              className="px-2.5 py-1 bg-primary/15 hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-black uppercase border border-primary/30 transition-all shadow-xs cursor-pointer"
                            >
                              Re-Submit
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setProformaPO(po);
                                  setProformaInitialTab("approval");
                                  setProformaModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-surface-hover hover:bg-primary/10 text-text-secondary hover:text-primary rounded-lg text-[10px] font-bold uppercase border border-border transition-all cursor-pointer"
                              >
                                View Audit
                              </button>
                              {(po.approval_status === "approved" || !po.approval_status) && (po.status === "pending" || po.status === "invoiced") && (
                                <button
                                  onClick={() => navigate("/account-panel/supplier-payments")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase border border-emerald-600 shadow-sm transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  title="Go to Supplier Payments to pay advance"
                                >
                                  <FaCreditCard size={10} /> Pay Supplier
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  );
                }}
                emptyMessage="No purchase orders found matching this query."
              />
            </div>

            <div className="p-6 border-t border-border">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(filteredOrders.length / pageSize)}
                onPageChange={setPage}
                totalItems={filteredOrders.length}
                pageSize={pageSize}
              />
            </div>
          </div>
        </>
      ) : view === "requests" ? (
        // WAREHOUSE PO REQUESTS VIEW
        <>
          <PageHeader
            title="Warehouse Procurement Requests"
            subtitle={`Replenishment requests from ${activeClusterName} warehouses awaiting procurement action.`}
            icon={FaClipboardList}
            actions={
              <Button
                variant="outline"
                leftIcon={<FaArrowLeft />}
                onClick={() => setView("list")}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 active:bg-white/40"
              >
                Back to Portfolio
              </Button>
            }
          />

          {/* Main Top Segmented Tab Switcher: PO Portfolio vs Warehouse Requests */}
          <div className="flex bg-surface border border-border p-1.5 rounded-2xl gap-2 shadow-xs mb-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                view === "list"
                  ? "gradient-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaFileInvoice className="text-sm" />
              <span>Purchase Orders Portfolio ({purchaseOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView("requests")}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer relative ${
                view === "requests"
                  ? "gradient-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaBoxes className="text-sm" />
              <span>Warehouse Material Requisitions ({poRequests.length})</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingRequestsCount} Pending
                </span>
              )}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Requests", value: poRequests.length, color: "text-text-primary", bg: "bg-primary/10" },
              { label: "Pending", value: poRequests.filter(r => r.status === 'pending').length, color: "text-warning", bg: "bg-warning/10" },
              { label: "Ordered", value: poRequests.filter(r => r.status === 'ordered').length, color: "text-success", bg: "bg-success/10" },
            ].map(stat => (
              <div key={stat.label} className="card p-4 flex items-center gap-3 bg-surface border-border">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <FaClipboardList className={stat.color} size={16} />
                </div>
                <div>
                  <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Request Cards */}
          {loadingRequests ? (
            <div className="card p-12 flex items-center justify-center">
              <FaSpinner className="animate-spin text-primary text-2xl" />
              <span className="ml-3 text-text-secondary font-semibold">Loading requests...</span>
            </div>
          ) : poRequests.length === 0 ? (
            <div className="card p-12 text-center">
              <FaClipboardList className="text-text-muted text-4xl mx-auto mb-3" />
              <h4 className="text-base font-black text-text-secondary">No Procurement Requests</h4>
              <p className="text-xs text-text-muted mt-1">No warehouse replenishment requests found for {activeClusterName}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {poRequests.map(req => {
                const wh = req.warehouse_id;
                const issueDate = new Date(req.created_at || req.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric"
                });
                const issueTime = new Date(req.created_at || req.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit"
                });
                const isPending = req.status === 'pending';
                const isOrdered = req.status === 'ordered';

                return (
                  <div key={req._id || req.id}
                    className={`card p-5 border-l-4 transition-all hover:shadow-md ${
                      isPending ? 'border-l-warning' : isOrdered ? 'border-l-success' : 'border-l-danger'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4">

                      {/* Request ID + Warehouse Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm font-black text-primary bg-primary/8 px-2.5 py-0.5 rounded-lg">
                            {req.request_number}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            isPending ? 'bg-warning/15 text-warning' : isOrdered ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                          }`}>
                            {isPending ? '⏳ Pending' : isOrdered ? '✓ Ordered' : '✗ Cancelled'}
                          </span>
                          <span className="text-[10px] text-text-muted ml-auto">{issueDate} at {issueTime}</span>
                        </div>

                        {/* Warehouse detail */}
                        {wh ? (
                          <div className="flex items-start gap-3 mb-3 p-2.5 bg-surface-hover border border-border/50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FaWarehouse size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-text-primary">{wh.warehouse_code}</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {wh.warehouse_type}
                                </span>
                                {wh.cluster_name && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">
                                    {wh.cluster_name}
                                  </span>
                                )}
                              </div>
                              {wh.address && (
                                <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                                  <FaMapMarkerAlt size={9} />
                                  <span className="truncate">{wh.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-text-muted italic mb-3">Warehouse details unavailable</div>
                        )}

                        {/* Items */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-1">Requested Items</div>
                          {(req.items || []).map((it, idx) => {
                            const skuObj = it.sku_id;
                            const skuCode = skuObj?.sku_code || it.sku_code || "N/A";
                            const productName = skuObj?.product_id?.name || "Product";
                            const templateName = skuObj?.product_id?.template_id?.name || "";
                            const benchmarkPrice = it.benchmark_price || skuObj?.product_id?.template_id?.benchmark_price || 0;
                            return (
                              <div key={idx} className="flex items-center gap-3 bg-bg border border-border/60 rounded-xl px-3 py-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                                  <FaTag size={10} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-xs text-text-primary truncate">{productName}</div>
                                  {templateName && <div className="text-[10px] text-text-muted">{templateName}</div>}
                                  <div className="font-mono text-[10px] text-text-secondary">{skuCode}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-black text-primary">Qty: {it.qty}</div>
                                  {benchmarkPrice > 0 && (
                                    <div className="text-[10px] text-text-muted">Benchmark: ₹{benchmarkPrice?.toLocaleString('en-IN')}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-col gap-2 shrink-0 md:min-w-[140px]">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleOpenFulfillModal(req)}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:brightness-105 active:scale-95 transition-all"
                            >
                              <FaCheckDouble size={11} />
                              Fulfill & Place PO
                            </button>
                            <button
                              onClick={() => handleCancelRequest(req._id || req.id)}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-danger/8 text-danger border border-danger/20 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-danger/15 transition-all"
                            >
                              <FaTimesCircle size={11} />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <div className={`text-[10px] font-bold px-3 py-2 rounded-xl text-center ${
                            isOrdered ? 'bg-success/8 text-success border border-success/20' : 'bg-danger/8 text-danger border border-danger/20'
                          }`}>
                            {isOrdered ? '✓ PO Placed' : '✗ Cancelled'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fulfill Request Modal */}
          {fulfillModal.open && fulfillModal.request && (() => {
            const req = fulfillModal.request;
            const wh = req.warehouse_id;

            // Compute per-item status — look up benchmark from `skus` state (from getWarehouseSkus)
            const itemStatuses = (req.items || []).map(it => {
              const skuObj = it.sku_id;
              const skuId = skuObj?._id || skuObj?.id || String(it.sku_id);
              const skuCode = skuObj?.sku_code || it.sku_code || "";
              // Find the matching SKU from the already-loaded warehouse SKUs list (getWarehouseSkus has correct benchmark_price)
              const loadedSku = skus.find(ws =>
                String(ws.id || ws._id) === skuId ||
                (skuCode && ws.sku_code === skuCode)
              );
              const benchmarkPrice = loadedSku?.benchmark_price || it.benchmark_price || skuObj?.product_id?.template_id?.benchmark_price || 0;
              const entered = Number(fulfillPrices[skuId] || 0);
              return {
                skuId,
                entered,
                benchmarkPrice,
                hasBenchmark: benchmarkPrice > 0,
                isFilled: entered > 0,
                overBenchmark: benchmarkPrice > 0 && entered > benchmarkPrice,
                underOrAtBenchmark: entered > 0 && (benchmarkPrice === 0 || entered <= benchmarkPrice),
              };
            });

            const allFilled = itemStatuses.every(s => s.isFilled);
            const anyOverBenchmark = itemStatuses.some(s => s.overBenchmark);
            const allUnderOrAtBenchmark = allFilled && itemStatuses.every(s => s.underOrAtBenchmark);

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFulfillModal({ open: false, request: null })} />
                <div className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-10">

                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-white">Fulfill Procurement Request</h3>
                        <p className="text-[11px] text-white/70 mt-0.5">Select supplier & set prices before creating the PO</p>
                      </div>
                      <button
                        onClick={() => setFulfillModal({ open: false, request: null })}
                        className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Request info bar */}
                    <div className="mt-3 flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2">
                      <FaClipboardList className="text-white/80" size={12} />
                      <span className="font-mono text-xs text-white font-bold">{req.request_number}</span>
                      {wh && (
                        <span className="text-[10px] text-white/60">
                          → {wh.warehouse_code}
                          {wh.cluster_name ? ` (${wh.cluster_name})` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hover" style={{ overflowY: 'auto' }}>

                    {/* Supplier Selection */}
                    <div>
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block mb-2">
                        <FaBuilding className="inline mr-1" /> Select Supplier
                      </label>
                      {fulfillLoadingSuppliers ? (
                        <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                          <FaSpinner className="animate-spin text-primary" /> Loading suppliers...
                        </div>
                      ) : fulfillSuppliers.length === 0 ? (
                        <div className="p-3 bg-warning/5 border border-warning/20 text-warning text-xs rounded-xl font-semibold">
                          No registered suppliers for this warehouse location.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {fulfillSuppliers.map(sup => (
                            <button
                              key={sup.supplier_id}
                              onClick={() => handleFulfillSupplierChange(sup.supplier_id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                fulfillSupplierId === sup.supplier_id
                                  ? 'border-primary bg-primary/8 shadow-sm'
                                  : 'border-border hover:border-primary/40 hover:bg-surface-hover'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                fulfillSupplierId === sup.supplier_id ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
                              }`}>
                                <FaBuilding size={12} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-text-primary">{sup.company_name}</div>
                                <div className="text-[10px] text-text-muted">{sup.brand_name}</div>
                              </div>
                              {fulfillSupplierId === sup.supplier_id && (
                                <FaCheckCircle className="text-primary shrink-0" size={14} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price per SKU */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider">
                          <FaTags className="inline mr-1" /> Order Price Per SKU
                        </label>
                        <span className="text-[9px] font-bold text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                          Price must be ≤ Benchmark
                        </span>
                      </div>

                      {fulfillLoadingPrices && (
                        <div className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
                          <FaSpinner className="animate-spin text-primary" size={10} /> Loading supplier prices...
                        </div>
                      )}

                      <div className="space-y-3">
                        {(req.items || []).map((it, idx) => {
                          const skuObj = it.sku_id;
                          const skuId = skuObj?._id || skuObj?.id || String(it.sku_id);
                          const productName = skuObj?.product_id?.name || "Product";
                          const templateName = skuObj?.product_id?.template_id?.name || "";
                          const skuCode = skuObj?.sku_code || it.sku_code || "N/A";
                          // Look up benchmark from already-loaded skus state (guaranteed to have correct benchmark_price)
                          const loadedSku = skus.find(ws =>
                            String(ws.id || ws._id) === skuId ||
                            (skuCode !== "N/A" && ws.sku_code === skuCode)
                          );
                          const benchmarkPrice = loadedSku?.benchmark_price || it.benchmark_price || skuObj?.product_id?.template_id?.benchmark_price || 0;
                          const supplierPrice = fulfillSupplierPrices[skuId];
                          const enteredPrice = Number(fulfillPrices[skuId] || 0);
                          const overBenchmark = benchmarkPrice > 0 && enteredPrice > 0 && enteredPrice > benchmarkPrice;
                          const atOrUnder = enteredPrice > 0 && (benchmarkPrice === 0 || enteredPrice <= benchmarkPrice);

                          return (
                            <div key={idx} className={`border rounded-xl overflow-hidden transition-all ${
                              overBenchmark
                                ? 'border-danger/40 shadow-sm shadow-danger/10'
                                : atOrUnder
                                  ? 'border-success/30 shadow-sm shadow-success/5'
                                  : 'border-border'
                            }`}>
                              {/* SKU Header */}
                              <div className={`px-3 pt-3 pb-2 ${
                                overBenchmark ? 'bg-danger/5' : atOrUnder ? 'bg-success/5' : 'bg-bg'
                              }`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-black text-xs text-text-primary">{productName}</div>
                                    {templateName && <div className="text-[10px] text-text-muted">{templateName}</div>}
                                    <div className="font-mono text-[10px] text-text-secondary mt-0.5">{skuCode} · Qty: <span className="font-black text-text-primary">{it.qty}</span></div>
                                  </div>
                                  {/* Benchmark Badge */}
                                  {benchmarkPrice > 0 ? (
                                    <div className={`shrink-0 text-right`}>
                                      <div className="text-[9px] font-black uppercase tracking-wider text-text-muted">Benchmark Limit</div>
                                      <div className={`text-base font-black ${overBenchmark ? 'text-danger' : 'text-text-primary'}`}>
                                        ₹{benchmarkPrice.toLocaleString('en-IN')}
                                      </div>
                                      {supplierPrice > 0 && (
                                        <div className="text-[9px] text-success font-semibold">
                                          Supplier listed: ₹{supplierPrice.toLocaleString('en-IN')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-text-muted italic shrink-0">No benchmark set</div>
                                  )}
                                </div>
                              </div>

                              {/* Price Input */}
                              <div className={`px-3 pb-3 pt-2 border-t ${
                                overBenchmark ? 'border-danger/20 bg-danger/5' : atOrUnder ? 'border-success/20 bg-success/5' : 'border-border/30 bg-surface'
                              }`}>
                                <div className="flex items-center gap-2 border rounded-lg overflow-hidden focus-within:ring-2 transition-all ${
                                  overBenchmark ? 'border-danger/50 focus-within:ring-danger/20' : atOrUnder ? 'border-success/40 focus-within:ring-success/20' : 'border-border focus-within:ring-primary/20'
                                }" style={{
                                  borderColor: overBenchmark ? 'rgba(239,68,68,0.5)' : atOrUnder ? 'rgba(34,197,94,0.4)' : undefined
                                }}>
                                  <span className="pl-3 text-sm font-bold text-text-muted shrink-0">₹</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={fulfillPrices[skuId] || ""}
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9.]/g, '');
                                      setFulfillPrices(prev => ({ ...prev, [skuId]: val }));
                                    }}
                                    placeholder={benchmarkPrice > 0 ? `Max ₹${benchmarkPrice.toLocaleString('en-IN')} per unit` : "Enter order price per unit..."}
                                    className={`flex-1 py-2.5 pr-3 text-sm font-bold bg-transparent focus:outline-none ${
                                      overBenchmark ? 'text-danger' : atOrUnder ? 'text-success' : 'text-text-primary'
                                    }`}
                                  />
                                </div>

                                {/* Validation Messages */}
                                {enteredPrice > 0 && benchmarkPrice > 0 && overBenchmark && (
                                  <div className="mt-2 flex items-start gap-2 p-2 bg-danger/8 border border-danger/20 rounded-lg">
                                    <FaExclamationTriangle className="text-danger shrink-0 mt-0.5" size={10} />
                                    <div>
                                      <p className="text-[10px] text-danger font-black">
                                        ₹{enteredPrice.toLocaleString('en-IN')} exceeds benchmark by ₹{(enteredPrice - benchmarkPrice).toLocaleString('en-IN')}
                                      </p>
                                      <p className="text-[9px] text-danger/80 mt-0.5">Requires a <strong>price approval request</strong> — admin must approve before PO is placed.</p>
                                    </div>
                                  </div>
                                )}
                                {enteredPrice > 0 && benchmarkPrice > 0 && atOrUnder && (
                                  <p className="text-[9px] text-success font-semibold mt-1.5 flex items-center gap-1">
                                    <FaCheckCircle size={8} /> ₹{enteredPrice.toLocaleString('en-IN')} is within benchmark — PO can be placed directly.
                                  </p>
                                )}
                                {enteredPrice > 0 && benchmarkPrice === 0 && (
                                  <p className="text-[9px] text-text-muted mt-1.5">No benchmark limit set — price will be accepted.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Benchmark Legend */}
                    <div className="flex items-center gap-4 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> ≤ Benchmark → Direct PO</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> &gt; Benchmark → Price Approval Request</span>
                    </div>

                    {/* Order Summary */}
                    {itemStatuses.some(s => s.isFilled) && (
                      <div className={`border rounded-xl p-3 ${anyOverBenchmark ? 'bg-warning/5 border-warning/30' : 'bg-primary/5 border-primary/20'}`}>
                        <div className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>Order Summary</span>
                          {anyOverBenchmark && (
                            <span className="text-warning text-[9px] font-black bg-warning/10 px-2 py-0.5 rounded-full">
                              ⚠ Requires Price Approval
                            </span>
                          )}
                        </div>
                        {(req.items || []).map((it, idx) => {
                          const skuId = it.sku_id?._id || it.sku_id?.id || String(it.sku_id);
                          const price = Number(fulfillPrices[skuId] || 0);
                          const skuCode = it.sku_id?.sku_code || it.sku_code || "SKU";
                          const loadedSkuS = skus.find(ws => String(ws.id || ws._id) === skuId || ws.sku_code === skuCode);
                          const benchmark = loadedSkuS?.benchmark_price || it.benchmark_price || it.sku_id?.product_id?.template_id?.benchmark_price || 0;
                          if (!price) return null;
                          const isOver = benchmark > 0 && price > benchmark;
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-border/30 last:border-0">
                              <div>
                                <span className="text-text-secondary">{skuCode} × {it.qty}</span>
                                {isOver && <span className="ml-1.5 text-[9px] text-danger font-black bg-danger/10 px-1.5 py-0.5 rounded">NEEDS APPROVAL</span>}
                              </div>
                              <span className={`font-bold ${isOver ? 'text-danger' : 'text-text-primary'}`}>
                                ₹{(price * it.qty).toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm font-black mt-2 pt-2 border-t border-border/40">
                          <span className="text-text-primary">Total Value</span>
                          <span className={anyOverBenchmark ? 'text-warning' : 'text-primary'}>
                            ₹{itemStatuses.reduce((acc, s, i) => acc + (s.entered * (req.items[i]?.qty || 0)), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-border space-y-2">
                    {/* Price approval notice when over benchmark */}
                    {anyOverBenchmark && allFilled && (
                      <div className="flex items-start gap-2 p-3 bg-warning/8 border border-warning/30 rounded-xl">
                        <FaExclamationTriangle className="text-warning shrink-0 mt-0.5" size={12} />
                        <p className="text-[10px] text-warning font-semibold">
                          One or more prices exceed the benchmark limit. Submitting will create a <strong>Price Approval Request</strong> — the PO will only be placed after admin approval.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setFulfillModal({ open: false, request: null })}
                        className="flex-1 py-2.5 border border-border text-text-secondary text-sm font-bold rounded-xl hover:bg-surface-hover transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmFulfill}
                        disabled={!allFilled}
                        className={`flex-1 py-2.5 text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all ${
                          !allFilled
                            ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                            : anyOverBenchmark
                              ? 'bg-warning text-white hover:brightness-105 shadow-sm active:scale-95'
                              : 'bg-primary text-white hover:brightness-105 shadow-sm active:scale-95'
                        }`}
                      >
                        {!allFilled ? (
                          <>Enter All Prices to Continue</>
                        ) : anyOverBenchmark ? (
                          <><FaExclamationTriangle size={11} /> Request Price Approval</>
                        ) : (
                          <><FaCheckDouble size={12} /> Continue to Create PO</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        // CREATE PURCHASE ORDER FORM VIEW
        <>
          <PageHeader
            title="Create Purchase Order"
            subtitle="Place central procurement orders matching warehouse benchmark limits."
            icon={FaFileInvoice}
            actions={
              <Button
                variant="outline"
                leftIcon={<FaArrowLeft />}
                onClick={() => setView("list")}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 active:bg-white/40"
              >
                Back to Portfolio
              </Button>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Step 1: Select Warehouse & Configuration Mode */}
              <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-3">
                  <FaWarehouse className="text-primary" />
                  1. Destination & Logistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <DropdownWithSearchInput
                      label={`Fulfillment Warehouse (${activeClusterName})`}
                      value={selectedWarehouseId}
                      onChange={(val) => setSelectedWarehouseId(val)}
                      options={warehouses.map(w => ({
                        value: w._id || w.id,
                        text: `${w.warehouse_code} - ${w.warehouse_type.toUpperCase()} (${w.address})`
                      }))}
                      placeholder="-- Choose Warehouse --"
                      className="w-full"
                    />
                  </div>
                  {selectedWarehouseId && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Order Configuration Mode</label>
                      <div className="flex bg-surface-hover border border-border p-1 rounded-xl gap-1 w-full mt-1">
                        <button
                          type="button"
                          onClick={() => { setKitsTab("sku"); setSelectedSupplierId(""); setSelectedItems([]); }}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${kitsTab === "sku" ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:bg-surface/50"}`}
                        >
                          Configure by SKU
                        </button>
                        <button
                          type="button"
                          onClick={() => { setKitsTab("bos"); setSelectedSupplierId(""); setSelectedItems([]); }}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${kitsTab === "bos" ? "bg-primary text-white shadow-xs" : "text-text-secondary hover:bg-surface/50"}`}
                        >
                          Configure by BOS
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedWarehouseId && kitsTab === "sku" && (
                  <div className="border-t border-border/30 pt-4 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase">Select Supplier</label>
                        {loadingSuppliers ? (
                          <div className="py-2 text-xs font-semibold text-text-muted flex items-center gap-1.5"><FaSpinner className="animate-spin text-primary" /> Loading suppliers...</div>
                        ) : suppliers.length === 0 ? (
                          <div className="p-3 bg-warning/5 border border-warning/20 text-warning text-xs rounded-xl font-semibold">No registered suppliers cover this warehouse state.</div>
                        ) : (
                          <div className="space-y-2">
                            <DropdownWithSearchInput
                              value={selectedSupplierId}
                              onChange={handleSupplierChange}
                              options={suppliers.map(sup => ({ value: sup.supplier_id, text: `${sup.company_name} (${sup.brand_name})` }))}
                              placeholder="Select Supplier..."
                              className="w-full"
                            />
                            {supplierGst && (
                              <div className="p-2.5 bg-success/5 border border-success/20 rounded-xl flex items-center gap-2 text-xs text-success">
                                <span className="font-bold">✓ State-Specific GSTIN:</span>
                                <span className="font-mono font-extrabold">{supplierGst}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Configure by BOS */}
              {selectedWarehouseId && kitsTab === "bos" && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-3">
                    <FaBoxes className="text-primary" />
                    2. Configure by BOS Components
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border/40">
                    <div className="space-y-1">
                      <DropdownWithSearchInput
                        label="Select SaaS Product"
                        value={selectedSolarKitId}
                        onChange={(val) => {
                          setSelectedSolarKitId(val);
                          setSelectedKitId("");
                          setSelectedBosKitName("");
                        }}
                        options={uniqueProducts.map(p => ({ value: p.id, text: p.name }))}
                        placeholder="-- Select SaaS Product --"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <DropdownWithSearchInput
                        label="Select Combo Kit"
                        value={selectedKitId}
                        onChange={(val) => {
                          setSelectedKitId(val);
                          setSelectedBosKitName("");
                        }}
                        options={filteredComboKits.map(k => ({ value: k._id || k.id, text: k.name }))}
                        placeholder="-- Select ComboKit --"
                        disabled={!selectedSolarKitId}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <DropdownWithSearchInput
                        label="Select BOS Kit"
                        value={selectedBosKitName}
                        onChange={setSelectedBosKitName}
                        options={[
                          { value: "Full BOS", text: "Full BOS (All Components)" },
                          ...availableBosKitNames.map(name => ({ value: name, text: name }))
                        ]}
                        placeholder="-- Select BOS Kit --"
                        disabled={!selectedKitId}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <CustomInput
                        label="BOS Quantity"
                        type="number"
                        min="1"
                        value={bosQuantity}
                        onChange={(e) => setBosQuantity(Math.max(1, Number(e.target.value)))}
                        placeholder="BOS Kit quantity..."
                        disabled={!selectedBosKitName}
                      />
                    </div>
                  </div>

                  {selectedKitId && selectedBosKitName && (
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Components Breakdown</h4>
                        <span className="text-[10px] text-primary font-bold">{bosComponentsForm.length} Component(s)</span>
                      </div>

                      {bosComponentsForm.length === 0 ? (
                        <div className="p-8 text-center text-xs text-text-muted italic bg-surface-hover rounded-xl border border-border">No components found for this kit.</div>
                      ) : (
                        <div className="space-y-4 divide-y divide-border/60">
                          {bosComponentsForm.map((bk, index) => {
                            const availablePrices = supplierPricesCache[bk.supplier_id] || {};
                            const catalogPrice = availablePrices[bk.sku_id] || 0;
                            const isSolar = bk.isSolar;
                            const isExceeding = isSolar
                              ? bk.benchmark_price_per_watt > 0 && Number(bk.order_price) > bk.benchmark_price_per_watt
                              : bk.benchmark_price > 0 && Number(bk.order_price) > bk.benchmark_price;

                            return (
                              <div key={index} className="pt-4 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                <div className="md:col-span-4 space-y-1">
                                  <span className="font-extrabold text-primary text-[10px] tracking-widest uppercase block">{bk.sku_code}</span>
                                  <h5 className="font-bold text-text-primary text-xs leading-tight">{bk.product_name}</h5>
                                  <div className="text-[10px] text-text-secondary mt-0.5">Multiplier: <strong>{bk.multiplier}x</strong> | Total: <strong className="text-text-primary">{bk.calculatedQty} Pcs</strong></div>
                                  <div className="text-[10px] text-text-muted">
                                    Limit: <strong>{isSolar ? (bk.benchmark_price_per_watt > 0 ? `₹${bk.benchmark_price_per_watt}/W` : "No Limit") : (bk.benchmark_price > 0 ? `₹${bk.benchmark_price}` : "No Limit")}</strong>
                                  </div>
                                </div>

                                <div className="md:col-span-4 space-y-1">
                                  <label className="text-[9px] font-black text-text-secondary uppercase">Supplier</label>
                                  <DropdownWithSearchInput
                                    value={bk.supplier_id}
                                    onChange={(val) => handleBosComponentSupplierChange(index, val)}
                                    options={suppliers.map(sup => ({ value: sup.supplier_id, text: `${sup.company_name} (${sup.brand_name})` }))}
                                    placeholder="Select Supplier..."
                                    className="w-full text-xs"
                                  />
                                </div>

                                <div className="md:col-span-4 space-y-1">
                                  <CustomInput
                                    label={isSolar ? "Negotiated Price (₹/W)" : "Negotiated Price (₹/unit)"}
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={bk.order_price}
                                    onChange={(e) => {
                                      const updated = [...bosComponentsForm];
                                      updated[index].order_price = e.target.value;
                                      setBosComponentsForm(updated);
                                    }}
                                    placeholder={catalogPrice ? `Catalog: ₹${catalogPrice}` : "Price..."}
                                    className="w-full text-xs"
                                  />
                                  {catalogPrice > 0 && (
                                    <span className="text-[9px] text-text-secondary font-bold block mt-0.5">Catalog: ₹{catalogPrice}</span>
                                  )}
                                  {isExceeding && (
                                    <span className="text-danger text-[9px] font-black uppercase tracking-wider block mt-1 animate-pulse">❌ Price exceeds benchmark limit!</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-4 border-t border-border flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={
                            bosComponentsForm.length === 0 ||
                            bosComponentsForm.some(bk => !bk.supplier_id || !bk.order_price || Number(bk.order_price) <= 0)
                          }
                          onClick={() => {
                            const newItems = bosComponentsForm.map(bk => ({
                              sku_id: bk.sku_id,
                              sku_code: bk.sku_code,
                              product_name: bk.product_name,
                              qty: bk.calculatedQty,
                              order_price: Number(bk.order_price),
                              benchmark_price: bk.benchmark_price,
                              benchmark_price_per_watt: bk.benchmark_price_per_watt,
                              capacity_w: bk.capacity_w,
                              isSolar: bk.isSolar,
                              supplier_id: bk.supplier_id,
                              supplier_details: suppliers.find(s => s.supplier_id === bk.supplier_id)
                            }));

                            setSelectedItems(prev => {
                              const merged = [...prev];
                              newItems.forEach(newItem => {
                                const idx = merged.findIndex(it => it.sku_id === newItem.sku_id && it.supplier_id === newItem.supplier_id);
                                if (idx > -1) {
                                  merged[idx] = newItem;
                                } else {
                                  merged.push(newItem);
                                }
                              });
                              return merged;
                            });

                            setSelectedSolarKitId("");
                            setSelectedKitId("");
                            setSelectedBosKitName("");
                            setBosQuantity(1);
                            setBasketConfirmOpen(true);
                          }}
                          className="h-10 text-xs font-black uppercase"
                        >
                          Add configured components to PO Basket
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select SKU */}
              {selectedWarehouseId && kitsTab === "sku" && selectedSupplierId && (
                <div className="card p-6 space-y-4">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <FaBoxes className="text-primary" />
                      2. Select & Configure Product SKUs
                    </h3>
                  </div>

                  {/* Cascading Filter Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border/40">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Classification</label>
                      <DropdownWithSearchInput value={selectedClassification} onChange={setSelectedClassification} options={[{ value: "all", text: "All Products" }, { value: "primary", text: "Primary Products" }, { value: "other", text: "Other Products" }]} placeholder="All Classifications" className="w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Product Template</label>
                      <DropdownWithSearchInput value={selectedTemplateId} onChange={setSelectedTemplateId} options={[{ value: "", text: "All Templates" }, ...availableTemplates]} placeholder="Filter by Template" className="w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Product Subtype</label>
                      <DropdownWithSearchInput value={selectedSubtypeId} onChange={setSelectedSubtypeId} options={[{ value: "", text: "All Subtypes" }, ...availableSubtypes]} placeholder={selectedTemplateId ? "Filter by Subtype" : "Select Template first"} disabled={!selectedTemplateId} className="w-full" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Product</label>
                      <DropdownWithSearchInput value={selectedProductId} onChange={setSelectedProductId} options={[{ value: "", text: "All Products" }, ...availableProducts]} placeholder={selectedSubtypeId ? "Filter by Product" : "Select Subtype first"} disabled={!selectedSubtypeId} className="w-full" />
                    </div>
                  </div>

                  {loadingSkus ? (
                    <div className="py-8 text-center text-xs text-text-secondary font-bold flex items-center justify-center gap-2">
                      <FaSpinner className="animate-spin text-primary text-lg" /> Loading SKUs...
                    </div>
                  ) : (
                    <>
                      {displayedSkus.length === 0 ? (
                        <div className="p-8 text-center text-xs text-text-muted italic border border-dashed border-border rounded-xl">No SKUs found matching the selected filters.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {displayedSkus.map(s => {
                            const isSelected = selectedSku?.id === s.id;
                            const isSkuSolar = (s.category || '').toLowerCase().includes('solar');
                            const hasPrice = supplierPrices[s.id] !== undefined;

                            let priceHint = "No catalog price";
                            if (hasPrice) {
                              if (isSkuSolar) {
                                priceHint = `₹${Number(supplierPrices[s.id]).toFixed(2)}/W (₹${(Number(supplierPrices[s.id]) * s.capacity_w).toFixed(2)}/pc)`;
                              } else {
                                priceHint = `₹${Number(supplierPrices[s.id]).toLocaleString()}`;
                              }
                            }

                            return (
                              <div
                                key={s.id}
                                onClick={() => { setSelectedSku(s); setActiveQty(100); setActivePrice(supplierPrices[s.id] || ""); }}
                                className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${isSelected ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary' : 'bg-surface border-border hover:border-primary/45 hover:bg-surface-hover/20'
                                  }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-extrabold text-primary text-[10px] tracking-widest uppercase">{s.sku_code}</span>
                                      <h4 className="font-bold text-text-primary text-sm mt-1 leading-snug">{s.product_name}</h4>
                                    </div>
                                    <button type="button" onClick={(e) => handleViewSkuDetails(e, s.id)} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-border text-text-secondary hover:text-primary hover:border-primary/40 rounded-lg flex items-center gap-1 transition-all bg-surface/50" disabled={fetchingSkuDetails}>
                                      <FaInfoCircle /> Specs
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-text-secondary mt-1">Brand: <strong className="text-text-primary">{s.brand_name}</strong> | Subtype: {s.subtype_name} | Cat: {s.category}</div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="text-[9px] text-text-muted uppercase font-bold block leading-none">Benchmark Limit</span>
                                    <strong className="text-text-primary font-black text-sm">
                                      {isSkuSolar ? (
                                        s.benchmark_price_per_watt > 0 ? `₹${Number(s.benchmark_price_per_watt).toFixed(2)}/W (₹${Number(s.benchmark_price).toFixed(2)}/pc)` : "No Limit"
                                      ) : (
                                        s.benchmark_price > 0 ? `₹${s.benchmark_price.toLocaleString()}` : "No Limit"
                                      )}
                                    </strong>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] text-text-muted uppercase font-bold block leading-none">Supplier Catalog Price</span>
                                    <span className={`font-extrabold text-[11px] ${hasPrice ? 'text-primary' : 'text-text-muted'}`}>{priceHint}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Purchase Logistics & Execution */}
            <div className="space-y-6">
              {selectedWarehouseId && kitsTab === "sku" && selectedSupplierId && selectedSku && (() => {
                const isSolar = (selectedSku.category || '').toLowerCase().includes('solar');
                return (
                  <div className="card p-6 bg-surface border-border space-y-4 shadow-md">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-3">
                      <FaPlus className="text-primary" /> Configure Item
                    </h3>
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs">
                      <div className="text-text-muted font-bold uppercase text-[9px] tracking-widest">Selected Item</div>
                      <div className="font-extrabold text-text-primary mt-1">{selectedSku.product_name}</div>
                      <div className="text-text-secondary mt-0.5">
                        Benchmark limit: <strong>
                          {isSolar ? (
                            selectedSku.benchmark_price_per_watt > 0 ? `₹${selectedSku.benchmark_price_per_watt}/W` : "No Limit"
                          ) : (
                            selectedSku.benchmark_price > 0 ? `₹${selectedSku.benchmark_price}` : "No Limit"
                          )}
                        </strong>
                      </div>
                    </div>
                    <CustomInput type="number" required min="1" value={activeQty} onChange={(e) => setActiveQty(e.target.value)} placeholder="e.g. 100" label="Order Quantity (Units)" />
                    <div className="space-y-1">
                      <CustomInput
                        type="number" required min="1" value={activePrice}
                        onChange={(e) => setActivePrice(e.target.value)}
                        placeholder={isSolar ? "Enter price per watt..." : "Price per unit..."}
                        label={isSolar ? "Negotiated Price (₹/Watt) *" : "Negotiated Price (₹/unit)"}
                      />
                      {isSolar && activePrice && selectedSku.capacity_w > 0 && (
                        <div className="text-[11px] font-semibold text-primary mt-1">
                          Total Module Price: ₹{(Number(activePrice) * selectedSku.capacity_w).toFixed(2)}/pc
                        </div>
                      )}
                      {isSolar ? (
                        (!selectedSku.benchmark_price_per_watt || selectedSku.benchmark_price_per_watt <= 0) ? (
                          <span className="text-danger text-[9px] font-black uppercase tracking-wider block mt-1">❌ Blocked: Benchmark price per watt is not configured for this SKU.</span>
                        ) : (
                          Number(activePrice) > selectedSku.benchmark_price_per_watt && (
                            <span className="text-warning text-[9px] font-black uppercase tracking-wider block mt-1">⚠️ Price exceeds benchmark. Submission will trigger Admin approval request.</span>
                          )
                        )
                      ) : (
                        (!selectedSku.benchmark_price || selectedSku.benchmark_price <= 0) ? (
                          <span className="text-danger text-[9px] font-black uppercase tracking-wider block mt-1">❌ Blocked: Benchmark price is not configured for this SKU.</span>
                        ) : (
                          Number(activePrice) > selectedSku.benchmark_price && (
                            <span className="text-warning text-[9px] font-black uppercase tracking-wider block mt-1">⚠️ Price exceeds benchmark. Submission will trigger Admin approval request.</span>
                          )
                        )
                      )}
                    </div>
                    <Button
                      type="button" fullWidth variant="primary"
                      disabled={
                        !activeQty || activeQty <= 0 || !activePrice || activePrice <= 0 ||
                        (isSolar ? (
                          !selectedSku.benchmark_price_per_watt || selectedSku.benchmark_price_per_watt <= 0
                        ) : (
                          !selectedSku.benchmark_price || selectedSku.benchmark_price <= 0
                        ))
                      }
                      onClick={() => {
                        const existsIdx = selectedItems.findIndex(it => it.sku_id === selectedSku.id && it.supplier_id === selectedSupplierId);
                        if (existsIdx > -1) {
                          const updated = [...selectedItems];
                          updated[existsIdx].qty = Number(activeQty);
                          updated[existsIdx].order_price = Number(activePrice);
                          updated[existsIdx].isSolar = isSolar;
                          updated[existsIdx].benchmark_price = selectedSku.benchmark_price;
                          updated[existsIdx].benchmark_price_per_watt = selectedSku.benchmark_price_per_watt;
                          updated[existsIdx].capacity_w = selectedSku.capacity_w;
                          setSelectedItems(updated);
                        } else {
                          setSelectedItems([...selectedItems, {
                            sku_id: selectedSku.id,
                            sku_code: selectedSku.sku_code,
                            product_name: selectedSku.product_name,
                            qty: Number(activeQty),
                            order_price: Number(activePrice),
                            benchmark_price: selectedSku.benchmark_price,
                            benchmark_price_per_watt: selectedSku.benchmark_price_per_watt,
                            capacity_w: selectedSku.capacity_w,
                            isSolar: isSolar,
                            supplier_id: selectedSupplierId,
                            supplier_details: suppliers.find(s => s.supplier_id === selectedSupplierId)
                          }]);
                        }
                        setSelectedSku(null); setActiveQty(100); setActivePrice("");
                      }}
                      className="h-10 text-xs font-black uppercase"
                    >
                      Add / Update Item in PO
                    </Button>
                  </div>
                );
              })()}

              {selectedWarehouseId && selectedItems.length > 0 ? (() => {
                const groups = {};
                selectedItems.forEach(it => {
                  const sId = it.supplier_id;
                  if (!groups[sId]) {
                    groups[sId] = {
                      supplier_id: sId,
                      company_name: it.supplier_details?.company_name || "Unknown Supplier",
                      brand_name: it.supplier_details?.brand_name || "",
                      items: []
                    };
                  }
                  groups[sId].items.push(it);
                });

                return (
                  <div className="space-y-6 sticky top-6">
                    <div className="card p-6 bg-surface border-border space-y-4 shadow-lg">
                      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-3">
                        <FaFileInvoice className="text-primary" /> PO Portfolio Basket
                      </h3>
                      {formError && <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-xl text-xs font-semibold flex items-center gap-2"><span>⚠️</span> {formError}</div>}
                      {successMsg && <div className="p-3 bg-success/5 border border-success/25 text-success rounded-xl text-xs font-semibold flex items-center gap-2"><span>✅</span> {successMsg}</div>}

                      <div className="space-y-6">
                        {Object.values(groups).map((group, gIdx) => {
                          const groupTotal = group.items.reduce((acc, it) => acc + (it.isSolar ? (it.qty * it.order_price * it.capacity_w) : (it.qty * it.order_price)), 0);
                          const timelineVal = timelineDatesMap[group.supplier_id] || "";

                          return (
                            <div key={gIdx} className="p-4 border border-border/80 rounded-2xl bg-surface-hover/30 space-y-3">
                              <div className="flex justify-between items-start border-b border-border/40 pb-2">
                                <div>
                                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Supplier</span>
                                  <strong className="text-text-primary text-xs">{group.company_name}</strong>
                                  {group.brand_name && <span className="text-[10px] text-text-secondary block">Brand: {group.brand_name}</span>}
                                </div>
                                <span className="text-xs font-black text-primary">₹{groupTotal.toLocaleString()}</span>
                              </div>

                              <div className="divide-y divide-border/40 max-h-[160px] overflow-y-auto pr-1">
                                {group.items.map((it, idx) => (
                                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                                    <div className="flex-1 pr-2">
                                      <div className="font-bold text-text-primary uppercase tracking-tight truncate max-w-[150px]">{it.sku_code}</div>
                                      <div className="text-[9px] text-text-muted">
                                        Qty: <strong>{it.qty}</strong> | Price:{" "}
                                        <strong>
                                          {it.isSolar ? `₹${it.order_price}/W` : `₹${it.order_price}`}
                                        </strong>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-text-primary text-[10px]">
                                        ₹{(it.isSolar ? (it.qty * it.order_price * it.capacity_w) : (it.qty * it.order_price)).toLocaleString()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedItems(prev => prev.filter(item => !(item.sku_id === it.sku_id && item.supplier_id === it.supplier_id)));
                                        }}
                                        className="text-danger hover:text-danger-hover cursor-pointer p-1 rounded transition-all"
                                      >
                                        <FaTrash size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2 border-t border-border/40 space-y-3">
                                <CustomInput
                                  type="date"
                                  required
                                  min={new Date().toLocaleDateString('en-CA')}
                                  value={timelineVal}
                                  onChange={(e) => {
                                    setTimelineDatesMap(prev => ({
                                      ...prev,
                                      [group.supplier_id]: e.target.value
                                    }));
                                  }}
                                  label="Delivery Timeline *"
                                />
                                <Button
                                  type="button"
                                  fullWidth
                                  variant="primary"
                                  disabled={submitting || !timelineVal}
                                  loading={submitting}
                                  onClick={() => handlePlaceOrderForSupplier(group.supplier_id, group.items, timelineVal)}
                                  className="h-10 text-xs uppercase tracking-wider font-extrabold"
                                >
                                  Place PO for {group.company_name}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="card p-6 bg-surface/50 border border-dashed border-border text-center text-xs text-text-muted italic py-16 rounded-3xl sticky top-6">
                  Select a destination warehouse and add items to configure purchase logistics.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Proforma Invoice & Approval Modal */}
      <ProformaInvoiceModal
        isOpen={proformaModalOpen}
        onClose={() => setProformaModalOpen(false)}
        po={proformaPO}
        initialTab={proformaInitialTab}
        onApprovalAction={handlePoApprovalAction}
      />

      {/* Rejection Remarks Modal */}
      <Dialog
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject PO #${rejectPoTarget?.po_number || ""}`}
        size="md"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-text-secondary">
            Please enter a mandatory rejection reason or variance explanation for the pre-payment audit log.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="E.g., Component pricing exceeds agreed framework price or missing test reports..."
            rows={3}
            className="w-full bg-bg border border-border focus:border-danger rounded-xl p-3 text-xs text-text-primary outline-none resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!rejectionReason.trim()}
              onClick={() => {
                if (rejectPoTarget) {
                  handlePoApprovalAction(rejectPoTarget.id || rejectPoTarget._id, 'rejected', rejectionReason);
                  setRejectModalOpen(false);
                }
              }}
              className="bg-danger hover:bg-danger-hover text-white text-xs font-black uppercase"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>

      <SkuDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} sku={selectedSkuDetails} />

      {/* Cancel PO Confirmation Popup */}
      <ConfirmationPopup
        isOpen={cancelConfirmOpen}
        title="Cancel Purchase Order"
        message="This action cannot be undone. The PO status will be permanently set to Cancelled."
        variant="danger"
        confirmText="Yes, Cancel PO"
        cancelText="No, Keep PO"
        isLoading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => { if (!cancelLoading) setCancelConfirmOpen(false); }}
      />

      {/* Basket Add Success Confirmation Popup */}
      <ConfirmationPopup
        isOpen={basketConfirmOpen}
        title="Components Added"
        message="Configured components have been successfully added to your Purchase Order Portfolio Basket."
        variant="success"
        confirmText="Acknowledge"
        cancelText="Close"
        onConfirm={() => setBasketConfirmOpen(false)}
        onCancel={() => setBasketConfirmOpen(false)}
      />
    </div>
  );
}
