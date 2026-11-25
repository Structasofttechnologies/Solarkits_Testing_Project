import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaWarehouse, FaBoxes, FaClipboardList, FaExclamationTriangle, 
  FaHistory, FaSpinner, FaSearch, FaCheckCircle, FaInfoCircle, FaArrowDown, FaArrowUp, FaTimes
} from 'react-icons/fa';
import { getWarehouseStockReport } from "../../api/operations";
import PageHeader from "../../components/PageHeader";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import CustomTable from "../../components/CustomTable";
import Pagination from "../../components/Pagination";
import Dialog from "../../components/Dialog";
import Button from "../../components/Button";

export default function WarehouseStockReport() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [loading, setLoading] = useState(false);

  // Report details state
  const [currentStock, setCurrentStock] = useState([]);
  const [awaitingInwards, setAwaitingInwards] = useState([]);
  const [overdueInwards, setOverdueInwards] = useState([]);
  const [completedInwards, setCompletedInwards] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("stock"); // "stock", "awaiting", "overdue", "completed"

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog state for viewing full items in inward logs
  const [selectedInward, setSelectedInward] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load warehouse list on mount
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const res = await getWarehouseStockReport("");
        if (res && res.status === "success") {
          setWarehouses(res.warehouses || []);
          if (res.warehouses && res.warehouses.length > 0) {
            setSelectedWarehouseId(res.warehouses[0]._id || res.warehouses[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load initial warehouses:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Fetch report data when selected warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;

    const fetchReport = async () => {
      setLoading(true);
      setPage(1);
      try {
        const res = await getWarehouseStockReport(selectedWarehouseId);
        if (res && res.status === "success") {
          setCurrentStock(res.currentStock || []);
          setAwaitingInwards(res.awaitingInwards || []);
          setOverdueInwards(res.overdueInwards || []);
          setCompletedInwards(res.completedInwards || []);
        }
      } catch (err) {
        console.error("Failed to fetch stock report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedWarehouseId]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalUniqueSkus = currentStock.length;
    const totalQty = currentStock.reduce((acc, it) => acc + (it.qty || 0), 0);
    const totalKw = currentStock.reduce((acc, it) => acc + (it.total_kw || 0), 0);
    const totalAwaiting = awaitingInwards.reduce((acc, it) => acc + (it.qty || 0), 0);
    const totalOverdue = overdueInwards.reduce((acc, it) => acc + (it.qty || 0), 0);

    return {
      totalUniqueSkus,
      totalQty,
      totalKw,
      totalAwaiting,
      totalOverdue
    };
  }, [currentStock, awaitingInwards, overdueInwards]);

  // Handle Tab switches
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setSearchQuery("");
  };

  // Filtered lists based on active tab & search query
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (activeTab === "stock") {
      return currentStock.filter(it => 
        it.sku_code.toLowerCase().includes(query) ||
        it.product_name.toLowerCase().includes(query) ||
        it.brand_name.toLowerCase().includes(query) ||
        it.category.toLowerCase().includes(query)
      );
    } else if (activeTab === "awaiting") {
      return awaitingInwards.filter(it => 
        it.po_number.toLowerCase().includes(query) ||
        it.supplier_name.toLowerCase().includes(query) ||
        it.sku_code.toLowerCase().includes(query) ||
        it.product_name.toLowerCase().includes(query)
      );
    } else if (activeTab === "overdue") {
      return overdueInwards.filter(it => 
        it.po_number.toLowerCase().includes(query) ||
        it.supplier_name.toLowerCase().includes(query) ||
        it.sku_code.toLowerCase().includes(query) ||
        it.product_name.toLowerCase().includes(query)
      );
    } else if (activeTab === "completed") {
      return completedInwards.filter(it => 
        it.grn_no.toLowerCase().includes(query) ||
        it.invoice_no.toLowerCase().includes(query) ||
        it.supplier_name.toLowerCase().includes(query)
      );
    }
    return [];
  }, [activeTab, searchQuery, currentStock, awaitingInwards, overdueInwards, completedInwards]);

  // Paginated active list
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Warehouse Stock Operations Report" 
        subtitle="Analyze real-time inventory levels, price difference logs, and inbound timelines warehouse-wise." 
        icon={FaWarehouse}
      />

      {/* Warehouse Selector Card */}
      <div className="card p-5 bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FaWarehouse size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Selected Warehouse</span>
            <span className="text-sm font-bold text-text-primary">Monitor stock levels, costs, & differences</span>
          </div>
        </div>

        <div className="w-full md:w-80">
          <DropdownWithSearchInput
            value={selectedWarehouseId}
            onChange={setSelectedWarehouseId}
            options={warehouses.map(wh => ({ value: wh._id || wh.id, text: wh.warehouse_code }))}
            placeholder="Select Warehouse..."
            className="w-full"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unique SKUs */}
        <div className="p-5 border border-border rounded-2xl bg-surface hover:shadow-md transition-all duration-300">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Unique SKU Products</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-text-primary">{stats.totalUniqueSkus}</span>
            <span className="text-xs text-text-secondary font-bold">in catalog</span>
          </div>
        </div>

        {/* Card 2: Current Physical Stock */}
        <div className="p-5 border border-border rounded-2xl bg-surface hover:shadow-md transition-all duration-300">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Total Physical Stock</span>
          <div className="flex flex-col mt-1.5">
            <span className="text-3xl font-black text-primary">{stats.totalQty.toLocaleString()} Pcs</span>
            {stats.totalKw > 0 && (
              <span className="text-xs text-success font-black mt-0.5">({stats.totalKw.toFixed(2)} kW Solar Panels)</span>
            )}
          </div>
        </div>

        {/* Card 3: Awaiting Inwards */}
        <div className="p-5 border border-border rounded-2xl bg-surface hover:shadow-md transition-all duration-300">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Awaiting Inward (PO)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-info">{stats.totalAwaiting.toLocaleString()} Pcs</span>
            <span className="text-xs text-text-secondary font-bold">ordered</span>
          </div>
        </div>

        {/* Card 4: Overdue Inwards */}
        <div className="p-5 border border-border rounded-2xl bg-surface hover:shadow-md transition-all duration-300">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Overdue Inwards (⚠️)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-black ${stats.totalOverdue > 0 ? "text-danger animate-pulse" : "text-text-muted"}`}>
              {stats.totalOverdue.toLocaleString()} Pcs
            </span>
            <span className="text-xs text-text-secondary font-bold">delayed</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-surface border border-border p-1 rounded-2xl gap-1 max-w-2xl overflow-x-auto">
        <button
          onClick={() => handleTabChange("stock")}
          className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "stock" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <FaBoxes />
          Current Stock Levels
        </button>
        <button
          onClick={() => handleTabChange("awaiting")}
          className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "awaiting" ? "bg-info text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <FaClipboardList />
          Awaiting Inwards ({awaitingInwards.length})
        </button>
        <button
          onClick={() => handleTabChange("overdue")}
          className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "overdue" ? "bg-danger text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <FaExclamationTriangle />
          Overdue Inwards ({overdueInwards.length})
        </button>
        <button
          onClick={() => handleTabChange("completed")}
          className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "completed" ? "bg-success text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <FaHistory />
          Completed Inwards
        </button>
      </div>

      {/* Table Section */}
      <div className="card bg-surface border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search table logs..." 
              className="w-full h-10 bg-bg border border-border focus:border-primary rounded-xl pl-9 pr-4 text-xs font-semibold outline-none text-text-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <FaSpinner className="animate-spin text-primary text-3xl" />
              <span className="text-xs text-text-secondary font-black uppercase tracking-widest">Generating Live Report Data...</span>
            </div>
          ) : activeTab === "stock" ? (
            <CustomTable 
              containerClassName="shadow-none border-none bg-transparent"
              headers={[
                { key: "sku", label: "SKU Details" },
                { key: "category", label: "Category" },
                { key: "qty", label: "Stock Quantity" },
                { key: "avg_price", label: "Avg Purchase Price" },
                { key: "latest_price", label: "Latest Inward Price" },
                { key: "status", label: "Price Status" }
              ]}
              data={paginatedData}
              renderRow={(item) => {
                const isSolar = item.is_solar;
                const avgFmt = isSolar ? `₹${item.average_price.toFixed(2)}/W` : `₹${item.average_price.toLocaleString()}/pc`;
                const latestFmt = item.price_status === 'no_inward' ? '—' : (isSolar ? `₹${item.latest_price.toFixed(2)}/W` : `₹${item.latest_price.toLocaleString()}/pc`);

                return (
                  <>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-primary text-xs uppercase block tracking-wider">{item.sku_code}</span>
                      <span className="text-xs text-text-primary font-bold block mt-0.5">{item.product_name}</span>
                      <span className="text-[10px] text-text-secondary block">Brand: {item.brand_name}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-text-primary text-xs">{item.category}</td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">
                      <div>{item.qty.toLocaleString()} pcs</div>
                      {isSolar && item.total_kw > 0 && (
                        <div className="text-[10px] text-success font-black">({item.total_kw.toFixed(2)} kW)</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-black text-text-primary text-xs">
                      {avgFmt}
                    </td>
                    <td className="px-6 py-4 font-black text-text-primary text-xs">
                      {latestFmt}
                    </td>
                    <td className="px-6 py-4">
                      {item.price_status === 'updated' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-success/10 text-success border border-success/20">
                          <FaCheckCircle size={9} /> Updated
                        </span>
                      ) : item.price_status === 'different' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 animate-pulse">
                          <FaExclamationTriangle size={9} /> Awaiting Update
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-surface-hover text-text-muted border border-border">
                          No Inward PDF
                        </span>
                      )}
                    </td>
                  </>
                );
              }}
              emptyMessage="No inventory stock entries found in this warehouse."
            />
          ) : activeTab === "awaiting" ? (
            <CustomTable 
              containerClassName="shadow-none border-none bg-transparent"
              headers={[
                { key: "po_number", label: "PO Details" },
                { key: "supplier", label: "Supplier / Vendor" },
                { key: "sku", label: "Product & SKU" },
                { key: "qty", label: "Ordered Quantity" },
                { key: "price", label: "Unit Cost" },
                { key: "timeline", label: "Delivery Due Date" },
                { key: "status", label: "PO Status" }
              ]}
              data={paginatedData}
              renderRow={(item) => (
                <>
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-primary text-xs uppercase block">{item.po_number}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-text-primary text-xs">{item.supplier_name}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-text-primary text-xs block">{item.product_name}</span>
                    <span className="text-[10px] text-text-secondary font-mono tracking-wider block mt-0.5">{item.sku_code}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-text-primary text-xs">{item.qty.toLocaleString()} pcs</td>
                  <td className="px-6 py-4 font-black text-text-primary text-xs">₹{item.price.toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold text-text-primary text-xs">
                    {new Date(item.timeline).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-info/10 text-info border border-info/20">
                      {item.status}
                    </span>
                  </td>
                </>
              )}
              emptyMessage="No pending inbound orders awaiting delivery."
            />
          ) : activeTab === "overdue" ? (
            <CustomTable 
              containerClassName="shadow-none border-none bg-transparent"
              headers={[
                { key: "po_number", label: "PO Details" },
                { key: "supplier", label: "Supplier / Vendor" },
                { key: "sku", label: "Product & SKU" },
                { key: "qty", label: "Ordered Quantity" },
                { key: "price", label: "Unit Cost" },
                { key: "timeline", label: "Delivery Due Date" },
                { key: "status", label: "PO Status" }
              ]}
              data={paginatedData}
              renderRow={(item) => {
                const timelineDateObj = new Date(item.timeline);
                timelineDateObj.setHours(0, 0, 0, 0);
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);
                const diffTime = todayObj - timelineDateObj;
                const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

                return (
                  <>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-primary text-xs uppercase block">{item.po_number}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">{item.supplier_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-text-primary text-xs block">{item.product_name}</span>
                      <span className="text-[10px] text-text-secondary font-mono tracking-wider block mt-0.5">{item.sku_code}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">{item.qty.toLocaleString()} pcs</td>
                    <td className="px-6 py-4 font-black text-text-primary text-xs">₹{item.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-danger font-black text-xs">
                      {new Date(item.timeline).toLocaleDateString()}
                      <span className="block text-[8px] tracking-wider uppercase font-black animate-pulse mt-0.5">
                        ⚠️ Overdue ({overdueDays} {overdueDays === 1 ? 'day' : 'days'})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20">
                        {item.status}
                      </span>
                    </td>
                  </>
                );
              }}
              emptyMessage="Great! No overdue inward shipments."
            />
          ) : (
            <CustomTable 
              containerClassName="shadow-none border-none bg-transparent"
              headers={[
                { key: "grn", label: "GRN Details" },
                { key: "invoice_no", label: "Invoice / Ref" },
                { key: "supplier", label: "Supplier / Origin" },
                { key: "date", label: "Inward Date" },
                { key: "items", label: "Items Received" },
                { key: "qc", label: "QC Status" },
                { key: "action", label: "Details", align: "center" }
              ]}
              data={paginatedData}
              renderRow={(log) => {
                const totalItemsQty = (log.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
                return (
                  <>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-primary text-xs uppercase block tracking-wider">{log.grn_no}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">#{log.invoice_no}</td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">{log.supplier_name}</td>
                    <td className="px-6 py-4 font-semibold text-text-primary text-xs">
                      {new Date(log.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary text-xs">
                      {totalItemsQty.toLocaleString()} Pcs ({log.items?.length || 0} SKU)
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                        log.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
                        log.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                        'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedInward(log);
                          setIsDetailOpen(true);
                        }}
                        className="text-[10px] font-extrabold py-1 px-3 uppercase"
                      >
                        Open Inward Details
                      </Button>
                    </td>
                  </>
                );
              }}
              emptyMessage="No completed inward receipts recorded for this warehouse."
            />
          )}
        </div>

        <Pagination 
          currentPage={page}
          totalPages={Math.ceil(filteredData.length / pageSize)}
          onPageChange={setPage}
          totalItems={filteredData.length}
          pageSize={pageSize}
        />
      </div>

      {/* Completed Inward Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Inward Receipt Log - ${selectedInward?.grn_no}`}
        size="lg"
      >
        {selectedInward && (
          <div className="space-y-4 p-1">
            <div className="flex justify-between items-start bg-primary/5 border border-primary/20 rounded-2xl p-5">
              <div>
                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Goods Receipt Note (GRN)</div>
                <div className="text-xl font-black text-text-primary">{selectedInward.grn_no}</div>
                <div className="text-xs text-text-secondary mt-1">Inward Date: <span className="font-bold text-text-primary">{new Date(selectedInward.invoice_date).toLocaleDateString()}</span></div>
                <div className="text-xs text-text-secondary">Invoice / Ref No: <span className="font-bold text-text-primary">#{selectedInward.invoice_no}</span></div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">QC Match Status</div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                  selectedInward.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
                  selectedInward.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                  'bg-warning/10 text-warning border-warning/20'
                }`}>{selectedInward.status}</span>
              </div>
            </div>

            <div className="bg-surface-hover/50 rounded-xl border border-border p-4 space-y-1">
              <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Supplier / Vendor</div>
              <div className="font-black text-text-primary text-sm">{selectedInward.supplier_name}</div>
              <div className="text-xs text-text-secondary">Type: <span className="capitalize font-bold text-text-primary">{selectedInward.inward_type}</span></div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-surface-hover/50 px-4 py-2.5 border-b border-border">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Inwarded SKU Items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-text-secondary">
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px]">#</th>
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px]">SKU Code</th>
                      <th className="px-4 py-3 text-right font-black uppercase tracking-wider text-[10px]">Qty Received</th>
                      <th className="px-4 py-3 text-right font-black uppercase tracking-wider text-[10px]">Invoice Price</th>
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px]">Rack Allocation</th>
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px]">QC Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedInward.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="px-4 py-3 text-text-muted">{idx + 1}</td>
                        <td className="px-4 py-3 font-extrabold text-primary tracking-widest">{it.sku_code}</td>
                        <td className="px-4 py-3 text-right font-bold text-text-primary">{it.qty?.toLocaleString()} pcs</td>
                        <td className="px-4 py-3 text-right font-black text-text-primary">
                          {it.invoice_price_per_watt ? `₹${it.invoice_price_per_watt.toFixed(2)}/W` : `₹${it.invoice_price.toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">{it.allocation_rack || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                            (it.qc_status || "Passed").toLowerCase() === 'passed' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                          }`}>{it.qc_status || "Passed"}</span>
                          {it.damage_notes && <div className="text-[10px] text-danger font-medium mt-1">Notes: {it.damage_notes}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDetailOpen(false)}
              >
                Close View
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
