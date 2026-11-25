import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import * as skuMasterApi from "@/api/skuMaster";
import * as productTemplateApi from "@/api/productTemplates";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import { 
  FaPlus, FaSearch, 
  FaBoxOpen, FaLayerGroup, FaTags,
  FaFilter,
} from "react-icons/fa";
import PageHeader from "@/components/PageHeader";
import ProductsTable from "./components/sku-master/ProductsTable";
import SkusTable from "./components/sku-master/SkusTable";
import ProductModal from "./components/sku-master/ProductModal";
import SkuModal from "./components/sku-master/SkuModal";
import ViewProductModal from "./components/sku-master/ViewProductModal";
import ViewSkuModal from "./components/sku-master/ViewSkuModal";

const API_URL = import.meta.env.VITE_API_URL;

export default function SKUMaster({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // Shared State
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [skuSearchTerm, setSkuSearchTerm] = useState("");

  // Data State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subtypes, setSubtypes] = useState([]);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSkus, setProductSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [showProductViewModal, setShowProductViewModal] = useState(false);
  const [showSkuViewModal, setShowSkuViewModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [viewingSku, setViewingSku] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingSku, setEditingSku] = useState(null);

  // Stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalSkus = products.reduce((acc, p) => acc + (p.sku_count || 0), 0);
    return { totalProducts, totalSkus };
  }, [products]);

  // ==================== FETCH FUNCTIONS ====================
  const fetchProducts = useCallback(async (templateId = null, subtypeId = null) => {
    setLoading(true);
    try {
      const res = await skuMasterApi.getProducts(templateId || undefined, subtypeId || undefined, moduleUniqueId);
      if (res.status === "success") {
        setProducts(res.data || []);
        setSelectedProduct(null);
        setProductSkus([]);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [moduleUniqueId]);

  const fetchBrands = useCallback(async (subtypeId) => {
    try {
      const res = await productTemplateApi.getBrandsBySubtype(subtypeId || undefined, moduleUniqueId);
      if (res.status === "success") setBrands(res.data || []);
    } catch (error) { console.error(error); }
  }, [moduleUniqueId]);

  const fetchSubtypes = useCallback(async (templateId) => {
    if (!templateId) {
      setSubtypes([]);
      return;
    }
    try {
      const res = await productTemplateApi.getSubtypes(templateId, moduleUniqueId);
      if (res.status === "success") {
        setSubtypes(res.data || []);
      }
    } catch (error) { console.error(error); }
  }, [moduleUniqueId]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes, brandRes] = await Promise.all([
        productTemplateApi.getTemplates(moduleUniqueId),
        productTemplateApi.getBrandsBySubtype(undefined, moduleUniqueId)
      ]);
      if (tmplRes.status === "success") {
        setTemplates(tmplRes.data || []);
      }
      if (brandRes?.status === "success") {
        setBrands(brandRes.data || []);
      }
      // Fetch all products initially so the page is never blank
      fetchProducts(null, null);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [moduleUniqueId, fetchProducts]);

  const fetchSkusForProduct = useCallback(async (productId) => {
    const cleanId = productId?._id || productId?.id || productId;
    if (!cleanId) return;
    setLoadingSkus(true);
    try {
      const res = await skuMasterApi.getSkusByProduct(cleanId, moduleUniqueId);
      if (res.status === "success") setProductSkus(res.data || []);
    } catch (error) { console.error(error); }
    finally { setLoadingSkus(false); }
  }, [moduleUniqueId]);

  // ==================== HANDLERS ====================
  const handleTemplateChange = (id) => {
    setSelectedTemplate(id);
    setSelectedSubtype(null);
    setSelectedBrand(null);
    fetchBrands(null);
    if (id) {
      fetchSubtypes(id);
      fetchProducts(id, null);
    } else {
      setSubtypes([]);
      fetchProducts(null, null);
    }
  };

  const handleSubtypeChange = (id) => {
    setSelectedSubtype(id);
    setSelectedBrand(null);
    if (id) {
      fetchBrands(id);
      fetchProducts(selectedTemplate, id);
    } else {
      fetchProducts(selectedTemplate, null);
    }
  };

  const handleProductSelect = (product) => {
    const currentId = selectedProduct?.id || selectedProduct?._id;
    const targetId = product?.id || product?._id;
    if (currentId === targetId) {
      setSelectedProduct(null);
      setProductSkus([]);
    } else {
      setSelectedProduct(product);
      fetchSkusForProduct(targetId);
    }
  };

  const wrapAction = (actionFn, successMsg = "Operation successful") => async (...args) => {
    setLoading(true);
    try {
      const res = await actionFn(...args);
      if (res.status === "success") {
        dispatch(setAlert({ type: "success", message: successMsg }));
        fetchProducts(selectedTemplate, selectedSubtype);
        if (selectedProduct) fetchSkusForProduct(selectedProduct.id || selectedProduct._id);
        return true;
      } else {
        dispatch(setAlert({ type: "error", message: res.message || "Operation failed" }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    return false;
  };

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Filtered Data
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedBrand) filtered = filtered.filter(p => String(p.brand_id) === String(selectedBrand));
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(term) || p.brand_name?.toLowerCase().includes(term));
    }
    return filtered;
  }, [products, selectedBrand, searchTerm]);

  return (
    <div className="min-h-screen space-y-6 pb-24 text-sm lg:text-base">
      <PageHeader
        title="SKU Master Catalog"
        subtitle="Manage product models, variants, and baseline technical specifications."
        icon={FaLayerGroup}
        stats={[
          { label: "Models", value: stats.totalProducts, description: "Total products" },
          { label: "Live SKUs", value: stats.totalSkus, description: "Total variants" }
        ]}
        actions={
          <Button 
            variant="primary" 
            size="md"
            onClick={async () => { 
              setEditingProduct(null); 
              if (!selectedTemplate && templates.length > 0) {
                const firstTmpl = templates[0].id;
                setSelectedTemplate(firstTmpl);
                try {
                  const res = await productTemplateApi.getSubtypes(firstTmpl, moduleUniqueId);
                  if (res.status === "success" && res.data?.length > 0) {
                    setSubtypes(res.data);
                    setSelectedSubtype(res.data[0].id);
                  }
                } catch (e) {}
              }
              setShowProductModal(true); 
            }} 
            leftIcon={<FaPlus />} 
          >
            Register Product
          </Button>
        }
      />

      {/* COMPACT TOOLBAR & FILTERS */}
      <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary flex items-center justify-center border border-primary/10 shadow-inner">
                <FaFilter size={18} />
            </div>
            <div>
                <h3 className="font-black text-text-primary uppercase tracking-[0.2em] text-xs">Catalog Controls</h3>
                <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-tighter opacity-60">Refine view by template, subtype, or brand</p>
            </div>
        </div>

        {/* COMPACT TOOLBAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Template</label>
            <DropdownWithSearchInput 
              options={[{ value: "", text: "All Templates View" }, ...templates.map(t => ({ value: t.id, text: t.name }))]} 
              value={selectedTemplate || ""} 
              onChange={handleTemplateChange} 
              placeholder="Select Template" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Subtype</label>
            <DropdownWithSearchInput 
              options={[{ value: "", text: "All Subtypes View" }, ...subtypes.map(s => ({ value: s.id, text: s.name }))]} 
              value={selectedSubtype || ""} 
              onChange={handleSubtypeChange} 
              placeholder="Select Subtype" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Brand Filter</label>
            <DropdownWithSearchInput 
              options={[
                { value: "", text: "All Brands View" }, 
                ...brands.map(b => ({ 
                  value: b.id || b._id, 
                  text: (
                    <div className="flex items-center gap-3">
                      {b.logo && (
                        <img 
                          src={b.logo} 
                          alt="" 
                          className="w-4 h-4 rounded object-contain bg-surface border border-border shrink-0" 
                        />
                      )}
                      <span className="font-bold">{b.name || b.brand_name}</span>
                    </div>
                  )
                }))
              ]} 
              value={selectedBrand || ""} 
              onChange={setSelectedBrand} 
              placeholder="Filter Brand" 
            />
          </div>
          <div className="relative group">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">Search Models</label>
             <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                <input 
                   type="text" 
                   placeholder="Search models..." 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   className="w-full h-11 pl-11 pr-4 bg-surface border-2 border-border rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-text-muted/40 placeholder:font-medium shadow-sm" 
                />
             </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Models Table Section */}
        <div className="lg:col-span-7">
          <div className="bg-surface rounded-2xl border-2 border-border h-full overflow-hidden flex flex-col shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
              <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-widest">
                <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/10 shadow-inner">
                  <FaBoxOpen size={14} />
                </div>
                Product Catalog ({filteredProducts.length} Models)
              </h2>
            </div>
            <div className="flex-1 max-h-[600px] overflow-y-auto">
              <ProductsTable
                products={filteredProducts}
                loading={loading}
                selectedProduct={selectedProduct}
                onProductSelect={handleProductSelect}
                onEditProduct={(p) => { setEditingProduct(p); setShowProductModal(true); }}
                onViewProduct={(p) => { setViewingProduct(p); setShowProductViewModal(true); }}
                onDeleteProduct={wrapAction((p) => skuMasterApi.deleteProduct({ product_id: p.id }, moduleUniqueId), "Product purged from master.")}
              />
            </div>
          </div>
        </div>

        {/* SKU Variants Section */}
        <div className="lg:col-span-5">
          <div className="bg-surface rounded-2xl border-2 border-border h-full overflow-hidden flex flex-col shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
              <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
                  <FaTags size={14} />
                </div>
                SKU Variants
              </h2>
            </div>
            <div className="flex-1 max-h-[600px] overflow-y-auto">
              <SkusTable
                skus={productSkus.filter(s => s.sku_code?.toLowerCase().includes(skuSearchTerm.toLowerCase()))}
                loading={loadingSkus}
                selectedProduct={selectedProduct}
                searchTerm={skuSearchTerm}
                onSearchChange={setSkuSearchTerm}
                onAddSku={() => { setEditingSku(null); setShowSkuModal(true); }}
                onEditSku={(s) => { setEditingSku(s); setShowSkuModal(true); }}
                onViewSku={(s) => { setViewingSku(s); setShowSkuViewModal(true); }}
                onDeleteSku={wrapAction((s) => skuMasterApi.deleteSku({ sku_id: s.id }, moduleUniqueId), "SKU variant deleted.")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ProductModal moduleUniqueId={moduleUniqueId} isOpen={showProductModal} onClose={() => setShowProductModal(false)} editingProduct={editingProduct} selectedTemplate={selectedTemplate} selectedSubtype={selectedSubtype} onSuccess={() => fetchProducts(selectedTemplate, selectedSubtype)} />
      <SkuModal moduleUniqueId={moduleUniqueId} isOpen={showSkuModal} onClose={() => setShowSkuModal(false)} editingSku={editingSku} selectedProduct={selectedProduct} selectedTemplate={selectedTemplate} selectedSubtype={selectedSubtype} onSuccess={() => { fetchSkusForProduct(selectedProduct?.id || selectedProduct?._id); fetchProducts(selectedTemplate, selectedSubtype); }} />
      <ViewProductModal isOpen={showProductViewModal} onClose={() => setShowProductViewModal(false)} product={viewingProduct} />
      <ViewSkuModal isOpen={showSkuViewModal} onClose={() => setShowSkuViewModal(false)} sku={viewingSku} />
    </div>
  );
}