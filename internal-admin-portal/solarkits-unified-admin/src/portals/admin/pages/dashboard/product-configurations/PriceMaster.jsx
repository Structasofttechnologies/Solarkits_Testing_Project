import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import {
  FaCoins,
  FaGlobeAmericas,
  FaMapMarkerAlt,
  FaBuilding,
  FaWarehouse,
  FaSave,
  FaUndo,
  FaSearch,
  FaExclamationCircle,
  FaCheckCircle,
  FaListUl,
  FaBoxOpen,
  FaInfoCircle,
  FaEdit
} from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "@/features/alert.slice";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import IconButton from "@/components/IconButton";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import Pagination from "@/components/Pagination";
import SkuDetailsModal from "@/pages/solar-shop/combokit-configurations/components/SkuDetailsModal";

const API_URL = import.meta.env.VITE_API_URL;

const isSolarPanelTemplate = (t) => (t?.name || "").toLowerCase().includes("solar panel");

export default function PriceMaster({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // URL search params for deep-linking from combo kits and warehouses
  const [searchParams] = useSearchParams();
  const urlSkuId = searchParams.get("sku_id");
  const urlClusterId = searchParams.get("cluster_id");
  const urlStateId = searchParams.get("state_id");
  const urlCountryId = searchParams.get("country_id");

  const urlSkuIdRef = useRef(urlSkuId);
  const priceModalOpenedRef = useRef(false);
  const isDeepLinkingRef = useRef(!!(urlCountryId && urlStateId && urlClusterId));

  // Location Hierarchy States
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);

  // Selected Locations
  const [selectedCountry, setSelectedCountry] = useState(urlCountryId || "");
  const [selectedState, setSelectedState] = useState(urlStateId || "");
  const [selectedCluster, setSelectedCluster] = useState(urlClusterId || "");

  // Product Classification State
  const [selectedClassification, setSelectedClassification] = useState("all");

  // Product Hierarchy States
  const [templates, setTemplates] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [products, setProducts] = useState([]);

  // Selected Products
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  // Loading States
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingSubtypes, setLoadingSubtypes] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [loadingPrices, setLoadingPrices] = useState(false);

  // Price & SKU States
  const [skuPrices, setSkuPrices] = useState([]);
  const [_originalPrices, setOriginalPrices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering SKUs based on product selection and search query
  const filteredSkus = skuPrices.filter(item => {
    // Exact product match
    if (selectedProduct && item.product_id !== selectedProduct) return false;
    // Template match
    if (selectedTemplate && item.template_id !== selectedTemplate) return false;
    // Subtype match
    if (selectedSubtype && item.subtype_id !== selectedSubtype) return false;

    // Free text match
    if (searchQuery) {
      const matchSearch =
        (item.sku_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.product_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
    }

    return true;
  });

  // Single Price Setting Modal States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceModalSku, setPriceModalSku] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [savingSinglePrice, setSavingSinglePrice] = useState(false);

  // SKU Specification Details Modal States
  const [selectedSkuDetails, setSelectedSkuDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [fetchingSkuDetails, setFetchingSkuDetails] = useState(false);



  useEffect(() => {
    if (!urlSkuIdRef.current) return;
    if (priceModalOpenedRef.current) return;
    if (skuPrices.length === 0) return;

    // Find the SKU in loaded prices by sku_id or sku_code
    const match = skuPrices.find(
      (item) => item.id === urlSkuIdRef.current || item.sku_id === urlSkuIdRef.current
    );
    if (match) {
      // Only open if the SKU is visible in current filters
      const isInVisibleList = filteredSkus.some((s) => s.id === match.id);
      if (isInVisibleList) {
        handleOpenPriceModal(match);
        priceModalOpenedRef.current = true;
        // Set search query to SKU code to filter down to that SKU
        if (match.sku_code) {
          setSearchQuery(match.sku_code);
        }
      } else {
        // Set search query to find it once filters are applied
        if (match.sku_code) {
          setSearchQuery(match.sku_code);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuPrices.length, filteredSkus.length]);

// Load Active Countries on Mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (response.data?.status === "success") {
          setCountries(response.data.countries || []);
        }
      } catch (error) {
        console.error("Failed to load active countries:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load countries." }));
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, [moduleUniqueId, dispatch]);

  // Load Product Templates on Mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await axios.get(
          `${API_URL}/product-templates/get-templates?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          setTemplates(res.data.data || []);
        }
      } catch (error) {
        console.error("Failed to load product templates:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load product templates." }));
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [moduleUniqueId, dispatch]);

  // Load Product Subtypes when Template changes
  useEffect(() => {
    if (isDeepLinkingRef.current) return;

    setSelectedSubtype("");
    setSubtypes([]);
    setSelectedProduct("");
    setProducts([]);

    const fetchSubtypes = async () => {
      setLoadingSubtypes(true);
      try {
        let url = `${API_URL}/product-templates/get-subtypes?unique_id=${moduleUniqueId}&req_for=view`;
        if (selectedTemplate) {
          url += `&template_id=${selectedTemplate}`;
        }
        const res = await axios.get(url, { headers: authHeaderObj() });
        if (res.data?.status === "success") {
          const loadedSubtypes = res.data.data || [];
          setSubtypes(loadedSubtypes);
          if (loadedSubtypes.length === 1) {
            setSelectedSubtype(loadedSubtypes[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load subtypes:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load product subtypes." }));
      } finally {
        setLoadingSubtypes(false);
      }
    };
    fetchSubtypes();
  }, [selectedTemplate, moduleUniqueId, dispatch]);

  // Load Products when Template or Subtype changes
  useEffect(() => {
    if (isDeepLinkingRef.current) return;

    setSelectedProduct("");
    setProducts([]);

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        let url = `${API_URL}/products/get-products?unique_id=${moduleUniqueId}&req_for=view`;
        if (selectedTemplate) url += `&template_id=${selectedTemplate}`;
        if (selectedSubtype) url += `&subtype_id=${selectedSubtype}`;

        const res = await axios.get(url, { headers: authHeaderObj() });
        if (res.data?.status === "success") {
          const loadedProducts = res.data.data || [];
          setProducts(loadedProducts);
          if (loadedProducts.length === 1) {
            setSelectedProduct(loadedProducts[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load products." }));
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [selectedTemplate, selectedSubtype, moduleUniqueId, dispatch]);

  // Reset downstream selections when Product Classification changes,
  // and auto-select template if there is exactly 1 option available.
  useEffect(() => {
    if (isDeepLinkingRef.current) return;

    const ft = templates.filter(t => {
      if (selectedClassification === "primary") return isSolarPanelTemplate(t);
      if (selectedClassification === "other") return !isSolarPanelTemplate(t);
      return true;
    });

    if (ft.length === 1) {
      setSelectedTemplate(ft[0].id);
    } else {
      setSelectedTemplate("");
    }
    
    setSelectedSubtype("");
    setSelectedProduct("");
    setSubtypes([]);
    setProducts([]);
  }, [selectedClassification, templates]);

  // Load Active States when Country changes
  useEffect(() => {
    if (!isDeepLinkingRef.current) {
      setSelectedState("");
      setStates([]);
      setSelectedCluster("");
      setClusters([]);
      setSkuPrices([]);
      setOriginalPrices([]);
      setCurrencyCode("");
      setCurrencyName("");
      // Reset product hierarchy so the user starts a fresh cascade
      setSelectedTemplate("");
      setSubtypes([]);
      setSelectedSubtype("");
      setProducts([]);
      setSelectedProduct("");
    }

    if (!selectedCountry) return;

    // Set local currency from selected country info
    const countryObj = countries.find(c => c.id === selectedCountry);
    if (countryObj) {
      setCurrencyCode(countryObj.currency_code || "USD");
      setCurrencyName(countryObj.currency_name || "US Dollar");
    }

    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: selectedCountry },
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          setStates(res.data.states || []);
        }
      } catch (error) {
        console.error("Failed to load states:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load states." }));
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [selectedCountry, countries, moduleUniqueId, dispatch]);

  // Load Clusters when State changes
  useEffect(() => {
    if (!isDeepLinkingRef.current) {
      setSelectedCluster("");
      setClusters([]);
      setSkuPrices([]);
      setOriginalPrices([]);
      // Reset product hierarchy so the user starts a fresh cascade
      setSelectedTemplate("");
      setSubtypes([]);
      setSelectedSubtype("");
      setProducts([]);
      setSelectedProduct("");
    }

    if (!selectedState) return;

    const fetchClusters = async () => {
      setLoadingClusters(true);
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/clusters/${selectedState}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          const loadedClusters = res.data.clusters || [];
          setClusters(loadedClusters);
          // If selectedCluster is set (e.g. from deep-link or name), resolve it to matching cluster's id
          if (selectedCluster) {
            const matched = loadedClusters.find(
              c => (c.id && c.id === selectedCluster) ||
                   (c._id && c._id === selectedCluster) ||
                   (c.name && c.name.toLowerCase() === selectedCluster.toLowerCase())
            );
            if (matched && selectedCluster !== (matched.id || matched._id)) {
              setSelectedCluster(matched.id || matched._id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load clusters:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load clusters." }));
      } finally {
        setLoadingClusters(false);
      }
    };
    fetchClusters();
  }, [selectedState, moduleUniqueId, dispatch]);

  // Fetch SKU Prices when Cluster changes
  useEffect(() => {
    if (!isDeepLinkingRef.current) {
      setSkuPrices([]);
      setOriginalPrices([]);
      // Reset product hierarchy so the user starts a fresh cascade
      setSelectedTemplate("");
      setSubtypes([]);
      setSelectedSubtype("");
      setProducts([]);
      setSelectedProduct("");
      setSelectedClassification("all");
    }

    if (!selectedCluster) return;

    const fetchPrices = async () => {
      setLoadingPrices(true);
      try {
        const res = await axios.get(
          `${API_URL}/product-sku-prices?cluster_id=${selectedCluster}&unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          setSkuPrices(res.data.data || []);
          setOriginalPrices(JSON.parse(JSON.stringify(res.data.data || [])));
          if (res.data.cluster_id && selectedCluster !== res.data.cluster_id.toString()) {
            setSelectedCluster(res.data.cluster_id.toString());
          }
          if (res.data.currency_code) {
            setCurrencyCode(res.data.currency_code);
          }
          if (res.data.currency_name) {
            setCurrencyName(res.data.currency_name);
          }
          if (res.data.country_id && !selectedCountry) {
            setSelectedCountry(res.data.country_id.toString());
          }
          if (res.data.state_id && !selectedState) {
            setSelectedState(res.data.state_id.toString());
          }
          isDeepLinkingRef.current = false;
        }
      } catch (error) {
        console.error("Failed to fetch SKU prices:", error);
        dispatch(setAlert({ type: "error", message: "Failed to load product prices." }));
        isDeepLinkingRef.current = false;
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
  }, [selectedCluster, moduleUniqueId, dispatch]);

  // Reset pagination to first page when any filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCountry,
    selectedState,
    selectedCluster,
    selectedTemplate,
    selectedSubtype,
    selectedProduct,
    searchQuery
  ]);

  // Handle opening and closing the single price setting modal
  const handleOpenPriceModal = (skuItem) => {
    setPriceModalSku(skuItem);
    const isSolar = (skuItem.template_name || "").toLowerCase().includes("solar panel");
    const initialPrice = isSolar
      ? (skuItem.price_per_watt || (skuItem.capacity_w ? skuItem.price / skuItem.capacity_w : 0))
      : skuItem.price;
    setNewPrice(initialPrice !== undefined && initialPrice !== null && Number(initialPrice) !== 0 ? String(initialPrice) : "");
    setIsPriceModalOpen(true);
  };

  const handleClosePriceModal = () => {
    setIsPriceModalOpen(false);
    setPriceModalSku(null);
    setNewPrice("");
  };

  const handleModalPriceChange = (val) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setNewPrice(val);
    }
  };

  const handleSaveSinglePrice = async () => {
    if (!priceModalSku) return;

    if (!selectedCluster) {
      dispatch(setAlert({ type: "error", message: "Please select a cluster before saving price." }));
      return;
    }

    setSavingSinglePrice(true);
    try {
      const payload = {
        country_id: selectedCountry,
        state_id: selectedState,
        cluster_id: selectedCluster,
        prices: [
          {
            sku_id: priceModalSku.id,
            price: newPrice === "" ? 0 : Number(newPrice)
          }
        ]
      };

      const res = await axios.post(
        `${API_URL}/product-sku-prices?unique_id=${moduleUniqueId}&req_for=edit`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        const isSolar = (priceModalSku.template_name || "").toLowerCase().includes("solar panel");
        const enteredVal = newPrice === "" ? 0 : Number(newPrice);
        const computedPrice = isSolar ? (enteredVal * (priceModalSku.capacity_w || 0)) : enteredVal;
        const computedPricePerWatt = isSolar ? enteredVal : 0;

        // Update local state in-memory
        setSkuPrices(prev =>
          prev.map(item =>
            item.id === priceModalSku.id ? { ...item, price: computedPrice, price_per_watt: computedPricePerWatt } : item
          )
        );
        // Also update originalPrices to match
        setOriginalPrices(prev =>
          prev.map(item =>
            item.id === priceModalSku.id ? { ...item, price: computedPrice, price_per_watt: computedPricePerWatt } : item
          )
        );

        dispatch(setAlert({ type: "success", message: `Price updated successfully for SKU ${priceModalSku.sku_code}` }));
        handleClosePriceModal();
      }
    } catch (error) {
      console.error("Failed to save SKU price:", error);
      dispatch(
        setAlert({
          type: "error",
          message: error.response?.data?.message || error.response?.data?.error || "Failed to save price."
        })
      );
    } finally {
      setSavingSinglePrice(false);
    }
  };

  // Fetch SKU specifications and open details modal
  const handleViewSkuDetails = async (skuId) => {
    setFetchingSkuDetails(true);
    try {
      const res = await axios.get(
        `${API_URL}/products/get-sku-details?sku_id=${skuId}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSelectedSkuDetails(res.data.data);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error("Failed to load SKU details:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load SKU details." }));
    } finally {
      setFetchingSkuDetails(false);
    }
  };

  // Helper: check if a SKU has a price set
  // Treat 0, null, undefined, and empty string as "price not set" since
  // a legitimate configured price is expected to be > 0.
  const isPriceUnset = (item) => {
    const p = item?.price;
    return p === undefined || p === null || p === "" || Number(p) === 0;
  };

  // Build a map of unpriced SKU counts per template, subtype and product so we
  // can decorate the dropdown options with a notification-style count.
  const unpricedByTemplateMap = skuPrices.reduce((acc, item) => {
    if (isPriceUnset(item) && item.template_id != null) {
      acc[item.template_id] = (acc[item.template_id] || 0) + 1;
    }
    return acc;
  }, {});
  const unpricedBySubtypeMap = skuPrices.reduce((acc, item) => {
    if (isPriceUnset(item) && item.subtype_id != null) {
      acc[item.subtype_id] = (acc[item.subtype_id] || 0) + 1;
    }
    return acc;
  }, {});
  const unpricedByProductMap = skuPrices.reduce((acc, item) => {
    if (isPriceUnset(item) && item.product_id != null) {
      acc[item.product_id] = (acc[item.product_id] || 0) + 1;
    }
    return acc;
  }, {});

  // Build a count-badge element used inside dropdown options
  const renderUnpricedBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <span
        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/20"
        title={`${count} SKU(s) price not set`}
      >
        <FaExclamationCircle className="shrink-0" style={{ fontSize: "9px" }} />
        {count}
      </span>
    );
  };

  // Notification counts for filter selection panels (must be declared before
  // the dropdown options because warehouseOptions reads unpricedSkuCount).
  // Warehouse-level: count of all SKUs whose price is not set
  const unpricedSkuCount = skuPrices.filter(isPriceUnset).length;
  // Product Template-level: count of unpriced SKUs within the selected template
  const unpricedByTemplate = selectedTemplate
    ? skuPrices.filter(item => item.template_id === selectedTemplate && isPriceUnset(item)).length
    : null;
  // Product Subtype-level: count of unpriced SKUs within the selected subtype
  const unpricedBySubtype = selectedSubtype
    ? skuPrices.filter(item => item.subtype_id === selectedSubtype && isPriceUnset(item)).length
    : null;
  // Product-level: count of unpriced SKUs within the selected product
  const unpricedByProduct = selectedProduct
    ? skuPrices.filter(item => item.product_id === selectedProduct && isPriceUnset(item)).length
    : null;

  // Formatted dropdown lists
  const countryOptions = countries.map(c => ({
    text: (
      <span className="flex items-center gap-2">
        <ReactCountryFlag
          countryCode={c.iso2}
          svg
          className="text-lg rounded-sm shadow-sm"
        />
        {c.name}
      </span>
    ),
    value: c.id
  }));

  const stateOptions = states.map(s => ({
    text: s.name,
    value: s.id
  }));

  const clusterOptions = clusters.map(c => ({
    text: c.name,
    value: c.id || c._id
  }));

  const classificationOptions = [
    { text: "All Products", value: "all" },
    { text: "Primary Product", value: "primary" },
    { text: "Other Products", value: "other" }
  ];

  const filteredTemplates = templates.filter(t => {
    if (selectedClassification === "primary") return isSolarPanelTemplate(t);
    if (selectedClassification === "other") return !isSolarPanelTemplate(t);
    return true;
  });

  const templateOptions = filteredTemplates.map(t => {
    const count = unpricedByTemplateMap[t.id] || 0;
    return {
      text: (
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{t.name}</span>
          {count > 0 && renderUnpricedBadge(count)}
        </span>
      ),
      value: t.id
    };
  });

  const subtypeOptions = subtypes.map(s => {
    const count = unpricedBySubtypeMap[s.id] || 0;
    return {
      text: (
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{s.name}</span>
          {count > 0 && renderUnpricedBadge(count)}
        </span>
      ),
      value: s.id
    };
  });

  const productOptions = products.map(p => {
    const count = unpricedByProductMap[p.id] || 0;
    return {
      text: (
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{p.name}</span>
          {count > 0 && renderUnpricedBadge(count)}
        </span>
      ),
      value: p.id
    };
  });


  // Pagination Calculations
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredSkus.length / PAGE_SIZE);
  const activePage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const startIndex = (activePage - 1) * PAGE_SIZE;
  const paginatedSkus = filteredSkus.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-screen space-y-6 pb-24 animate-in fade-in duration-500">
      <style>{`
        .price-input-wrapper > div {
          min-width: 160px !important;
          width: 100% !important;
        }
      `}</style>
      <PageHeader
        title="Benchmark Price Master"
        subtitle="Manage cluster-specific SKU benchmark pricing mapped to country, state, and clusters in local currency."
        icon={FaCoins}
        stats={[
          {
            label: "Cluster SKUs",
            value: selectedCluster ? skuPrices.length : 0,
            description: selectedCluster
              ? clusters.find(c => (c.id || c._id) === selectedCluster || c.name?.toLowerCase() === selectedCluster?.toLowerCase())?.name || "Cluster"
              : "Select cluster"
          },
          {
            label: "Not Set SKUs",
            value: selectedCluster ? unpricedSkuCount : 0,
            description: "SKUs with no price set"
          },
          {
            label: "Classification",
            value: selectedClassification === "all" ? "All" : selectedClassification === "primary" ? "Primary" : "Other",
            description: "Product classification"
          },
          {
            label: "Local Currency",
            value: currencyCode || "—",
            description: currencyName || "Select country"
          }
        ]}
      />

      {/* Cascading Filter Panel */}
      <div className="card shadow-sm border border-border bg-surface p-6 space-y-6">
        {/* Location Selection Block */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <FaGlobeAmericas className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Location Hierarchy Settings</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Country Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Country
              </label>
              <DropdownWithSearchInput
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={countryOptions}
                placeholder="Search country..."
                disabled={loadingCountries}
              />
            </div>

            {/* State Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                State / Region
              </label>
              <DropdownWithSearchInput
                value={selectedState}
                onChange={setSelectedState}
                options={stateOptions}
                placeholder={selectedCountry ? "Search state..." : "Select country first"}
                disabled={!selectedCountry || loadingStates}
              />
            </div>

            {/* Cluster Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Cluster
              </label>
              <DropdownWithSearchInput
                value={selectedCluster}
                onChange={setSelectedCluster}
                options={clusterOptions}
                placeholder={selectedState ? "Search cluster..." : "Select state first"}
                disabled={!selectedState || loadingClusters}
              />
            </div>
          </div>
        </div>

        {/* Product Selection Block — cascaded after Location Hierarchy.
            All four location filters must be selected before the product
            dropdowns become enabled. Changing any location filter resets the
            product hierarchy selection so the cascade starts fresh. */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <FaBoxOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Product Hierarchy Settings</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Product Classification Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Product Classification
              </label>
              <DropdownWithSearchInput
                value={selectedClassification}
                onChange={setSelectedClassification}
                options={classificationOptions}
                placeholder="Select classification..."
                disabled={!selectedCluster || loadingTemplates}
              />
            </div>

            {/* Product Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Product Template
              </label>
              <DropdownWithSearchInput
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                options={templateOptions}
                placeholder={
                  !selectedCluster
                    ? "Select cluster first"
                    : !selectedCountry || !selectedState
                      ? "Select full location hierarchy first"
                      : "Search template..."
                }
                disabled={!selectedCountry || !selectedState || !selectedCluster || loadingTemplates}
              />
              {/* Notification: unpriced SKUs within selected template */}
              {selectedCluster && skuPrices.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${selectedTemplate
                      ? unpricedByTemplate > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                      : unpricedSkuCount > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                    }`}
                  title={
                    selectedTemplate
                      ? `${unpricedByTemplate} unpriced SKU(s) within this template`
                      : `${unpricedSkuCount} unpriced SKU(s) across all templates in this cluster`
                  }
                >
                  {(() => {
                    const value = selectedTemplate ? unpricedByTemplate : unpricedSkuCount;
                    return value > 0 ? (
                      <FaExclamationCircle className="shrink-0" />
                    ) : (
                      <FaCheckCircle className="shrink-0" />
                    );
                  })()}
                  <span>
                    {(() => {
                      const value = selectedTemplate ? unpricedByTemplate : unpricedSkuCount;
                      return value > 0
                        ? `${value} SKU${value === 1 ? "" : "s"} Price Not Set`
                        : "All Prices Configured";
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Product Subtype Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Product Subtype
              </label>
              <DropdownWithSearchInput
                value={selectedSubtype}
                onChange={setSelectedSubtype}
                options={subtypeOptions}
                placeholder={!selectedTemplate ? "Select template first" : "Search subtype..."}
                disabled={!selectedTemplate || loadingSubtypes}
              />
              {/* Notification: unpriced SKUs within selected subtype */}
              {selectedTemplate && skuPrices.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${selectedSubtype
                      ? unpricedBySubtype > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                      : unpricedByTemplate > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                    }`}
                  title={
                    selectedSubtype
                      ? `${unpricedBySubtype} unpriced SKU(s) within this subtype`
                      : `${unpricedByTemplate} unpriced SKU(s) across all subtypes in this template`
                  }
                >
                  {(() => {
                    const value = selectedSubtype ? unpricedBySubtype : unpricedByTemplate;
                    return value > 0 ? (
                      <FaExclamationCircle className="shrink-0" />
                    ) : (
                      <FaCheckCircle className="shrink-0" />
                    );
                  })()}
                  <span>
                    {(() => {
                      const value = selectedSubtype ? unpricedBySubtype : unpricedByTemplate;
                      return value > 0
                        ? `${value} SKU${value === 1 ? "" : "s"} Price Not Set`
                        : "All Prices Configured";
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                Product
              </label>
              <DropdownWithSearchInput
                value={selectedProduct}
                onChange={setSelectedProduct}
                options={productOptions}
                placeholder={!selectedSubtype ? "Select subtype first" : "Search product..."}
                disabled={!selectedSubtype || loadingProducts}
              />
              {/* Notification: unpriced SKUs within selected product */}
              {selectedSubtype && skuPrices.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${selectedProduct
                      ? unpricedByProduct > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                      : unpricedBySubtype > 0
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20"
                    }`}
                  title={
                    selectedProduct
                      ? `${unpricedByProduct} unpriced SKU(s) for this product`
                      : `${unpricedBySubtype} unpriced SKU(s) across all products in this subtype`
                  }
                >
                  {(() => {
                    const value = selectedProduct ? unpricedByProduct : unpricedBySubtype;
                    return value > 0 ? (
                      <FaExclamationCircle className="shrink-0" />
                    ) : (
                      <FaCheckCircle className="shrink-0" />
                    );
                  })()}
                  <span>
                    {(() => {
                      const value = selectedProduct ? unpricedByProduct : unpricedBySubtype;
                      return value > 0
                        ? `${value} SKU${value === 1 ? "" : "s"} Price Not Set`
                        : "All Prices Configured";
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {!selectedCluster ? (
        <div className="card border-2 border-dashed border-border/80 p-20 flex flex-col items-center justify-center text-center bg-surface-hover/20 rounded-2xl shadow-sm transition-all duration-300">
          <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner mb-6">
            <FaCoins size={36} className="text-primary/70 animate-bounce" />
          </div>
          <h3 className="text-lg font-black text-text-primary tracking-wide mb-2 uppercase">Pricing Configuration Lock</h3>
          <p className="text-text-secondary font-medium max-w-md text-sm leading-relaxed">
            Please select the Location Hierarchy (Country ➔ State ➔ Cluster) to fetch and configure SKU prices.
          </p>
        </div>
      ) : loadingPrices ? (
        <div className="card p-24 flex flex-col items-center justify-center bg-surface">
          <Loader text="Loading location pricing..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Block - Info & Summary Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card border border-border bg-linear-to-b from-surface to-surface-hover/30 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <FaListUl className="text-primary" /> Active Details
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Currency Code:</span>
                  <span className="font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded border border-primary/10">
                    {currencyCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Currency Name:</span>
                  <span className="font-bold text-text-primary truncate max-w-[120px]" title={currencyName}>
                    {currencyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Visible SKUs:</span>
                  <span className="font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full border bg-success-soft text-success border-success/20">
                    {paginatedSkus.length} / {filteredSkus.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block - SKU Price Grid */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">
            <div className="card border border-border bg-surface rounded-2xl shadow-sm flex flex-col h-full">
              {/* Grid Header & Search */}
              <div className="p-5 border-b border-border bg-surface-hover/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <FaCoins className="text-primary" /> Product SKU Pricing Grid
                </h4>

                <CustomInput
                  placeholder="Search SKU code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  icon={<FaSearch size={14} />}
                  className="w-full md:max-w-xs price-input-wrapper"
                  inputClassName="py-2! text-xs font-semibold"
                />
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-x-auto custom-scrollbar">
                {filteredSkus.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted">
                      <FaExclamationCircle size={28} />
                    </div>
                    <p className="text-text-secondary font-bold mb-1">No SKUs Matched</p>
                    <p className="text-text-muted text-xs">
                      {searchQuery ? "Try altering your search keywords." : "No product SKUs found matching filters."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-surface-hover/30 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                        <th className="px-6 py-4">Product Info</th>
                        <th className="px-6 py-4">SKU Code</th>
                        <th className="px-6 py-4">Specifications</th>
                        <th className="px-6 py-4 w-48 text-right">Price ({currencyCode})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginatedSkus.map((item) => {
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-surface-hover/20 transition-colors duration-200 group/row"
                          >
                            {/* Product Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {item.product_image ? (
                                  <img
                                    src={`${API_URL.replace(/\/$/, "")}/${item.product_image.replace(/^\//, "")}`}
                                    alt={item.product_name}
                                    className="w-10 h-10 rounded-lg object-cover border border-border shadow-xs shrink-0 bg-surface-hover"
                                    onError={e => {
                                      // Fall back to placeholder when the image fails to load
                                      e.target.style.display = 'none';
                                      const fallback = e.target.nextElementSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-10 h-10 rounded-lg bg-gradient-to-br from-surface-hover to-surface-hover/50 border border-dashed border-border flex flex-col items-center justify-center text-text-muted shrink-0"
                                  style={{ display: item.product_image ? 'none' : 'flex' }}
                                  title="No image available"
                                >
                                  <FaBoxOpen size={14} className="opacity-50" />
                                  <span className="text-[7px] font-black uppercase tracking-wider mt-0.5 opacity-60">No Image</span>
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-text-primary text-sm truncate max-w-sm">
                                    {item.product_name}
                                  </h5>
                                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5 font-mono">
                                    ID: {item.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* SKU Code */}
                            <td className="px-6 py-4 font-mono">
                              <code className="px-2.5 py-1 bg-surface-hover rounded-lg text-xs font-black text-primary border border-border/40">
                                {item.sku_code}
                              </code>
                            </td>

                            {/* Specifications Action */}
                            <td className="px-6 py-4">
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<FaInfoCircle />}
                                onClick={() => handleViewSkuDetails(item.id)}
                                className="text-[10px] font-black uppercase tracking-wider py-1! px-2.5! border border-border text-text-secondary hover:text-primary hover:border-primary/40 rounded-lg shrink-0"
                                disabled={fetchingSkuDetails}
                              >
                                View Specs
                              </Button>
                            </td>

                            {/* Price Display and Edit */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-3">
                                <span className="font-mono text-xs font-black text-text-primary bg-surface-hover px-2.5 py-1 rounded-lg border border-border/40">
                                  {!isPriceUnset(item) ? (
                                    (item.template_name || "").toLowerCase().includes("solar panel") ? (
                                      <span>
                                        {currencyCode} {Number(item.price_per_watt || (item.capacity_w ? item.price / item.capacity_w : 0)).toFixed(2)}/W
                                        <span className="text-[10px] text-text-secondary block font-bold mt-0.5">
                                          ({currencyCode} {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/pc)
                                        </span>
                                      </span>
                                    ) : (
                                      `${currencyCode} ${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    )
                                  ) : (
                                    "Not Set"
                                  )}
                                </span>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPriceModal(item)}
                                  className="text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg border border-border/40 hover:border-primary/20"
                                  title="Edit Price"
                                >
                                  <FaEdit size={12} />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Footer Pagination */}
              {totalPages > 1 && (
                <div className="px-5 border-t border-border bg-surface-hover/10 rounded-b-2xl">
                  <Pagination
                    currentPage={activePage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredSkus.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sku Details specification Modal popup */}
      <SkuDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        sku={selectedSkuDetails}
      />

      {/* Edit Price Modal popup */}
      <Dialog
        isOpen={isPriceModalOpen}
        onClose={handleClosePriceModal}
        title="Set SKU Price"
        size="sm"
      >
        {priceModalSku && (
          <div className="space-y-6 p-2">
            <div className="rounded-2xl border border-border bg-surface-hover/20 p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-text-secondary uppercase">SKU Code</span>
                <span className="font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  {priceModalSku.sku_code}
                </span>
              </div>
              <div className="flex justify-between items-start text-xs gap-4">
                <span className="font-bold text-text-secondary uppercase shrink-0">Product Name</span>
                <span className="font-black text-text-primary text-right truncate max-w-[200px]" title={priceModalSku.product_name}>
                  {priceModalSku.product_name}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2 mt-2">
                <span className="font-bold text-text-secondary uppercase">Cluster</span>
                <span className="font-black text-text-primary">
                  {clusters.find(c => c._id === selectedCluster)?.name || "Active Cluster"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {priceModalSku && (priceModalSku.template_name || "").toLowerCase().includes("solar panel") ? "Price Per Watt" : "Price"} ({currencyCode})
              </label>
              <CustomInput
                type="text"
                value={newPrice}
                onChange={e => handleModalPriceChange(e.target.value)}
                prefix={currencyCode}
                placeholder={priceModalSku && (priceModalSku.template_name || "").toLowerCase().includes("solar panel") ? "Enter price per watt (e.g. 0.35)..." : "Enter price..."}
                className="price-input-wrapper w-full"
                inputClassName="text-right text-sm font-black py-3 pr-4 border border-border text-text-primary focus:border-primary!"
              />
              {priceModalSku && (priceModalSku.template_name || "").toLowerCase().includes("solar panel") && (
                <div className="mt-2 flex justify-between text-xs text-text-secondary bg-surface-hover/20 p-3 rounded-xl border border-border/40 font-mono">
                  <span>Capacity:</span>
                  <span className="font-bold text-text-primary">{priceModalSku.capacity_w || 0} {priceModalSku.capacity_unit || 'W'}</span>
                  <span className="ml-2 border-l border-border/40 pl-2">Total Module Price:</span>
                  <span className="font-black text-primary">
                    {currencyCode} {Number((Number(newPrice) || 0) * (priceModalSku.capacity_w || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClosePriceModal}
                disabled={savingSinglePrice}
                className="text-xs uppercase font-black tracking-widest border border-border"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSinglePrice}
                loading={savingSinglePrice}
                className="text-xs uppercase font-black tracking-widest shadow-lg shadow-primary/20"
              >
                Save Price
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
