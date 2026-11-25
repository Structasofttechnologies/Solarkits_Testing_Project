import { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaSearch,
  FaTimes,
  FaCheck,
  FaSave,
  FaBoxOpen,
  FaFilter,
  FaLayerGroup,
  FaCheckSquare,
  FaSquare,
  FaBuilding,
  FaCube,
  FaRupeeSign,
  FaInfoCircle
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;
const CATALOG_API = `${API_URL}/solarshop/oem-partner-products/catalog-products`;
const ASSIGN_API = `${API_URL}/solarshop/oem-partner-products`;

export default function OemProductAssignModal({
  isOpen,
  onClose,
  partner,
  onSaveSuccess
}) {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("all");

  // Load products when modal opens
  useEffect(() => {
    if (!isOpen || !partner) return;

    // Initialize selected IDs from partner
    const initialSet = new Set(
      (partner.assigned_product_ids || []).map((id) => id.toString())
    );
    setSelectedIds(initialSet);
    setSearchQuery("");
    setSelectedTemplate("all");

    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const headers = authHeaderObj();
        const res = await axios.get(CATALOG_API, { headers });
        if (res.data?.status === "success") {
          setProducts(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load catalog products:", err);
        dispatch(
          setAlert({
            type: "error",
            message: "Failed to load product catalog for assignment",
            duration: 4000
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [isOpen, partner, dispatch]);

  // Extract unique template names for filter tabs
  const templateOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.template_name) set.add(p.template_name);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products by search and template
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesTemplate =
        selectedTemplate === "all" || p.template_name === selectedTemplate;
      if (!matchesTemplate) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku_code?.toLowerCase().includes(q);
      const matchSubtype = p.subtype_name?.toLowerCase().includes(q);
      const matchBrand = p.brand_name?.toLowerCase().includes(q);
      return matchName || matchSku || matchSubtype || matchBrand;
    });
  }, [products, searchQuery, selectedTemplate]);

  // Toggle selection for a product
  const toggleProduct = (productId) => {
    const strId = productId.toString();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((p) => next.add(p.id.toString()));
      return next;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  // Save product assignments
  const handleSave = async () => {
    if (!partner) return;
    const partnerId = partner.id || partner._id;

    setSaving(true);
    try {
      const headers = authHeaderObj();
      const payload = {
        product_ids: Array.from(selectedIds)
      };

      const res = await axios.put(
        `${ASSIGN_API}/${partnerId}/assign`,
        payload,
        { headers }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `Products successfully assigned to "${partner.brand_name}"`,
            duration: 3500
          })
        );
        if (onSaveSuccess) {
          onSaveSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      console.error("Error saving OEM product assignments:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message ||
            "Failed to save OEM product assignments",
          duration: 4000
        })
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-linear-to-r from-primary/10 via-surface to-surface flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {partner.logo ? (
              <img
                src={partner.logo}
                alt={partner.brand_name}
                className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 border border-border shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0">
                {partner.brand_name?.[0]?.toUpperCase() || "O"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                  Assign Products to {partner.brand_name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  OEM Partner
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {partner.company_name ? `${partner.company_name} • ` : ""}
                Select system catalog products to assign to this OEM Partner.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg transition-colors"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-bg/50 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary/60 transition-colors"
              />
            </div>

            {/* Selection stats & quick actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <span className="text-xs font-semibold text-text-primary px-3 py-1.5 rounded-lg bg-surface border border-border shadow-2xs">
                Selected: <span className="text-primary font-bold">{selectedIds.size}</span> Products
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                title="Select all visible products"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-text-secondary hover:text-danger hover:border-danger/40 transition-colors"
                title="Clear all selections"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Template filter pills */}
          {templateOptions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedTemplate("all")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedTemplate === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface border border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                All Categories ({products.length})
              </button>
              {templateOptions.map((tName) => {
                const count = products.filter((p) => p.template_name === tName).length;
                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => setSelectedTemplate(tName)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedTemplate === tName
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface border border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tName} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Body / Products List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="py-16">
              <Loader text="Loading System Products Catalog..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <FaBoxOpen className="mx-auto text-4xl text-text-secondary/40" />
              <p className="text-sm font-semibold text-text-primary">
                No matching system products found
              </p>
              <p className="text-xs text-text-secondary">
                {searchQuery
                  ? "Try adjusting your search query or category filter."
                  : "No products available in the system catalog."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.has(p.id.toString());
                const priceFormatted = (p.base_price_paise / 100).toLocaleString(
                  "en-IN"
                );

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-surface border-border hover:border-primary/40 hover:bg-bg/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Product Thumbnail */}
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-bg border border-border text-text-secondary flex items-center justify-center shrink-0">
                          <FaCube size={18} />
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-text-primary truncate">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg text-text-secondary border border-border">
                            {p.sku_code}
                          </span>
                          <span className="text-[10px] text-primary font-medium">
                            {p.template_name}
                          </span>
                          {p.subtype_name && (
                            <span className="text-[10px] text-text-secondary">
                              • {p.subtype_name}
                            </span>
                          )}
                        </div>
                        {p.base_price_paise > 0 && (
                          <div className="text-[11px] font-semibold text-text-primary pt-0.5 flex items-center gap-0.5">
                            <FaRupeeSign size={9} />
                            {priceFormatted}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "border border-border text-transparent"
                      }`}
                    >
                      <FaCheck size={11} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-border bg-bg/50 flex items-center justify-between gap-4">
          <div className="text-xs text-text-secondary">
            Total Selected:{" "}
            <span className="font-bold text-text-primary">{selectedIds.size}</span>{" "}
            Products
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving || loading}
              className="px-6 text-xs shadow-sm"
              leftIcon={<FaSave />}
            >
              {saving ? "Saving..." : "Save Product Assignments"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
