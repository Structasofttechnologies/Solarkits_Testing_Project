import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { FaWarehouse, FaMapMarkerAlt, FaFileInvoice, FaFilePdf, FaArrowLeft, FaCalendarAlt, FaBoxes, FaEye, FaSpinner, FaSearch, FaCheckCircle, FaShippingFast, FaHandshake } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { getWarehouses, getWarehouseInwards, getCompletedDeliveries } from "../../api/accounts";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import CustomTable from "../../components/CustomTable";
import Pagination from "../../components/Pagination";

export default function InventoryInwardInvoices() {
  const { selectedScope } = useSelector((state) => state.user_slice);
  const activeClusterId = selectedScope?.cluster;
  const activeStateId = selectedScope?.state;
  const activeCountryId = selectedScope?.country;
  const activeClusterName = selectedScope?.clusterName || selectedScope?.stateName || selectedScope?.countryName || "Selected Scope";

  const [warehouses, setWarehouses] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [loadingWhs, setLoadingWhs] = useState(false);
  const [loadingInwards, setLoadingInwards] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal for Invoice Detail View
  const [viewInvoice, setViewInvoice] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Stats Derived useMemos
  const totalValue = useMemo(
    () => deliveries.reduce((acc, po) => acc + (po.items || []).reduce((s, it) => s + (it.qty || 0) * (it.order_price || 0), 0), 0),
    [deliveries]
  );

  const totalItems = useMemo(
    () => deliveries.reduce((acc, po) => acc + (po.items || []).reduce((s, it) => s + (it.qty || 0), 0), 0),
    [deliveries]
  );

  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    deliveries.forEach(po => { if (po.supplier_id) map.set(po.supplier_id._id || po.supplier_id.id, po.supplier_id); });
    return Array.from(map.values());
  }, [deliveries]);

  const fetchDeliveriesStats = async () => {
    setLoadingDeliveries(true);
    try {
      const res = await getCompletedDeliveries(
        activeClusterId || "",
        activeStateId || "",
        activeCountryId || ""
      );
      if (res && res.status === "success") {
        setDeliveries(res.data || []);
      } else {
        setDeliveries([]);
      }
    } catch (err) {
      console.error("fetchDeliveriesStats error:", err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  // Load warehouses when cluster/state/country changes
  useEffect(() => {
    fetchWarehouses();
    fetchDeliveriesStats();
    setSelectedWh(null);
    setInwards([]);
    setSearchQuery("");
  }, [activeClusterId, activeStateId, activeCountryId]);

  // Filter warehouses based on code and address
  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const query = searchQuery.toLowerCase();
    return warehouses.filter(
      (wh) =>
        (wh.warehouse_code && wh.warehouse_code.toLowerCase().includes(query)) ||
        (wh.address && wh.address.toLowerCase().includes(query))
    );
  }, [warehouses, searchQuery]);

  // Load inwards when warehouse is selected
  useEffect(() => {
    if (selectedWh) {
      fetchInwards(selectedWh._id);
    }
  }, [selectedWh]);

  const fetchWarehouses = async () => {
    if (!activeClusterId && !activeStateId && !activeCountryId) {
      setWarehouses([]);
      return;
    }
    setLoadingWhs(true);
    setError(null);
    try {
      const res = await getWarehouses(activeClusterId || "", activeStateId || "", activeCountryId || "");
      if (res && res.status === "success") {
        setWarehouses(res.data || []);
      } else {
        setWarehouses([]);
      }
    } catch (err) {
      console.error("fetchWarehouses error:", err);
      setError("Failed to fetch warehouses.");
    } finally {
      setLoadingWhs(false);
    }
  };

  const fetchInwards = async (whId) => {
    setLoadingInwards(true);
    try {
      const res = await getWarehouseInwards(whId);
      if (res && res.status === "success") {
        setInwards(res.data || []);
      } else {
        setInwards([]);
      }
    } catch (err) {
      console.error("fetchInwards error:", err);
      setError("Failed to fetch inventory inwards history.");
    } finally {
      setLoadingInwards(false);
    }
  };

  // Pagination helper
  const paginatedInwards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return inwards.slice(start, start + pageSize);
  }, [inwards, page]);

  // Total Inward Value Calculation
  const getInwardValue = (log) => {
    return log.items?.reduce((acc, it) => acc + (it.invoice_price * it.qty), 0) || 0;
  };

  const getInwardQty = (log) => {
    return log.items?.reduce((acc, it) => acc + it.qty, 0) || 0;
  };

  if (selectedWh) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader
          title={selectedWh.warehouse_code}
          subtitle={`Inventory Stock Inward logs and uploaded invoices for ${selectedWh.warehouse_code}.`}
          icon={FaWarehouse}
          actions={
            <Button
              variant="secondary"
              leftIcon={<FaArrowLeft />}
              onClick={() => setSelectedWh(null)}
            >
              Back to Warehouses
            </Button>
          }
        />

        {error && (
          <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="card p-6 space-y-4">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <FaFileInvoice className="text-primary" />
              Inward Invoices History
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold border border-primary/20 uppercase">
              {selectedWh.warehouse_type} Warehouse
            </span>
          </div>

          <div className="overflow-x-auto px-6 pb-6 pt-2">
            <CustomTable
              headers={[
                { key: "grn_no", label: "Inward ID" },
                { key: "invoice_no", label: "Invoice No" },
                { key: "invoice_date", label: "Invoice Date" },
                { key: "supplier_name", label: "Supplier" },
                { key: "total_value", label: "Total Value" },
                { key: "pdf", label: "Invoice PDF", align: "center" },
                { key: "actions", label: "Details", align: "center" }
              ]}
              data={paginatedInwards}
              loading={loadingInwards}
              renderRow={(log) => (
                <>
                  <td className="px-6 py-4 text-sm font-bold text-primary">
                    {log.grn_no}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-text-primary">
                    {log.invoice_no}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-text-muted text-xs" />
                      {log.invoice_date ? new Date(log.invoice_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-text-secondary">
                    {log.supplier_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    <div className="font-bold">₹{getInwardValue(log).toLocaleString()}</div>
                    <div className="text-[10px] text-text-muted">{getInwardQty(log)} items total</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {log.invoice_pdf ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-3 py-1 font-bold text-[10px] flex items-center gap-1.5 inline-flex border-danger/30 text-danger hover:bg-danger/5"
                        onClick={() => window.open(log.invoice_pdf, '_blank')}
                        leftIcon={<FaFilePdf className="text-xs" />}
                      >
                        View PDF
                      </Button>
                    ) : (
                      <span className="text-[10px] text-text-muted bg-surface-hover px-2.5 py-1 rounded-xl border border-border">
                        No PDF
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-xl px-3 py-1 font-bold text-[10px]"
                      onClick={() => setViewInvoice(log)}
                      leftIcon={<FaEye />}
                    >
                      View Details
                    </Button>
                  </td>
                </>
              )}
              emptyMessage="No inventory inward records found for this warehouse."
            />
          </div>

          {inwards.length > pageSize && (
            <div className="p-6 border-t border-border">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(inwards.length / pageSize)}
                onPageChange={setPage}
                totalItems={inwards.length}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>

        {/* Invoice Detail Modal */}
        <AnimatePresence>
          {viewInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewInvoice(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-3xl p-6 shadow-2xl z-10 space-y-5"
              >
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">
                      Invoice Details: {viewInvoice.grn_no}
                    </h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
                      Supplier: {viewInvoice.supplier_name} | Invoice: {viewInvoice.invoice_no}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewInvoice(null)}
                    className="p-1.5 rounded-xl hover:bg-surface-hover transition-colors text-text-muted font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Items detail list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FaBoxes className="text-primary" /> Products list ({viewInvoice.items?.length || 0})
                  </h4>

                  <div className="border border-border rounded-2xl overflow-hidden bg-black/5">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-bg text-[10px] font-black text-text-muted uppercase border-b border-border">
                          <th className="p-3">Product / SKU</th>
                          <th className="p-3 text-right">Price</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-center">QC Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {viewInvoice.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-black/10 transition-colors">
                            <td className="p-3 font-semibold text-text-primary">
                              {item.sku_code}
                              {item.damage_notes && (
                                <p className="text-[10px] text-danger font-medium mt-0.5">QC Notes: {item.damage_notes}</p>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium text-text-primary">₹{item.invoice_price.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-text-primary">{item.qty} pcs</td>
                            <td className="p-3 text-right font-black text-text-primary">₹{(item.invoice_price * item.qty).toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                item.qc_status === 'Passed' ? 'bg-success/10 text-success border-success/20' :
                                item.qc_status === 'Failed' ? 'bg-danger/10 text-danger border-danger/20' :
                                                              'bg-warning/10 text-warning border-warning/20'
                              }`}>
                                {item.qc_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <span className="text-xs font-bold text-text-secondary uppercase">Grand Total Value</span>
                    <span className="text-lg font-black text-primary">₹{getInwardValue(viewInvoice).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-3 border-t border-border justify-end">
                  {viewInvoice.invoice_pdf && (
                    <Button
                      variant="outline-primary"
                      onClick={() => window.open(viewInvoice.invoice_pdf, '_blank')}
                      leftIcon={<FaFilePdf className="text-danger" />}
                    >
                      View Invoice PDF
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setViewInvoice(null)}>
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Inventory Inward Invoices"
        subtitle={`Fulfillment warehouses mapped to the ${activeClusterName} where you work.`}
        icon={FaFileInvoice}
      />

      {error && (
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Delivered */}
        <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
          <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center text-lg flex-shrink-0">
            <FaCheckCircle />
          </div>
          <div>
            <h4 className="text-2xl font-black text-text-primary">{deliveries.length}</h4>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Delivered POs</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0">
            <FaShippingFast />
          </div>
          <div>
            <h4 className="text-xl font-black text-text-primary">₹{totalValue.toLocaleString()}</h4>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Delivery Value</p>
          </div>
        </div>

        {/* Total Items */}
        <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
          <div className="w-11 h-11 rounded-xl bg-info/10 text-info flex items-center justify-center text-lg flex-shrink-0">
            <FaBoxes />
          </div>
          <div>
            <h4 className="text-2xl font-black text-text-primary">{totalItems.toLocaleString()}</h4>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Items Delivered</p>
          </div>
        </div>

        {/* Unique Suppliers */}
        <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
          <div className="w-11 h-11 rounded-xl bg-warning/10 text-warning flex items-center justify-center text-lg flex-shrink-0">
            <FaHandshake />
          </div>
          <div>
            <h4 className="text-2xl font-black text-text-primary">{uniqueSuppliers.length}</h4>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Suppliers Involved</p>
          </div>
        </div>
      </div>

      {loadingWhs ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <span className="text-xs font-semibold">Loading warehouses in {activeClusterName}...</span>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="card p-12 bg-surface border-border flex flex-col items-center text-center space-y-4">
          <FaWarehouse className="text-4xl text-text-muted/30 animate-bounce" />
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">No Warehouses Found</h3>
          <p className="text-sm font-semibold text-text-secondary">
            There are no active fulfillment warehouses registered in {activeClusterName}. Please switch geography in the header to view other locations.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="card p-5 bg-surface border-border flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
            <div className="space-y-1 w-full md:w-auto">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <FaSearch className="text-primary text-xs" />
                Search Warehouses
              </h4>
              <p className="text-[11px] text-text-secondary">
                Filter warehouses by their code or address.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search by code or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary/50 transition-colors"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
            </div>
          </div>

          {filteredWarehouses.length === 0 ? (
            <div className="card p-12 bg-surface border-border border-dashed flex flex-col items-center text-center space-y-3">
              <FaSearch className="text-3xl text-text-muted/40 animate-pulse" />
              <h4 className="text-sm font-bold text-text-primary uppercase">No Matching Warehouses</h4>
              <p className="text-xs text-text-secondary max-w-sm">
                We couldn't find any warehouses matching "{searchQuery}". Try searching with a different code or address.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWarehouses.map((wh) => (
                <div
                  key={wh._id}
                  onClick={() => setSelectedWh(wh)}
                  className="card p-6 bg-surface border-border hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform" />
                  
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                        <FaWarehouse />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-text-primary uppercase tracking-tight truncate max-w-[180px]" title={wh.warehouse_code}>
                          {wh.warehouse_code}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-wider mt-0.5">
                          <FaMapMarkerAlt className="text-primary text-[10px]" />
                          {activeClusterName}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-xs font-semibold text-text-secondary">
                      <span>Warehouse Code</span>
                      <span className="font-bold text-text-primary font-mono">{wh.warehouse_code}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs font-semibold text-text-secondary">
                      <span>Warehouse Type</span>
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {wh.warehouse_type}
                      </span>
                    </div>

                    {/* Address Block */}
                    <div className="mt-3 pt-3 border-t border-border/40 text-[11px] text-text-secondary leading-relaxed flex items-start gap-1.5">
                      <FaMapMarkerAlt className="text-primary/70 mt-0.5 shrink-0" />
                      <span className="line-clamp-2" title={wh.address || "No address provided"}>
                        {wh.address || "No address registered for this warehouse."}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/50 flex justify-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary group-hover:translate-x-1.5 transition-transform flex items-center gap-1.5">
                      View Inward Invoices ➔
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
