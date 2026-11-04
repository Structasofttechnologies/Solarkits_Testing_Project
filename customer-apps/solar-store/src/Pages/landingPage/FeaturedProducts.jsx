import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import { setSelectedLocation } from "../../features/slice";
import axiosInstance from "../../utils/axiosInstance";

import "swiper/css";

import {
  FiShoppingCart,
  FiHeart,
  FiStar,
  FiEye,
  FiTag,
  FiMapPin,
  FiSearch,
  FiCheckCircle,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";

import imgKit from "../../assets/images/product_solar_kit.jpg";

const PRODUCTS = [
  {
    id: 1,
    name: "SolarKits 1kW Smart On-Grid Home Kit",
    category: "On-Grid Solar Kit",
    badge: "Subsidy Eligible",
    badgeColor: "bg-green-500 text-white",
    rating: 4.8,
    reviews: 234,
    price: 48000,
    mrp: 65000,
    discount: 26,
    watt: "1kW Kit",
    brand: "SolarKits Prime",
    img: imgKit,
  },
  {
    id: 2,
    name: "SolarKits 2kW Rooftop Solar Combo Kit",
    category: "On-Grid Solar Kit",
    badge: "PM Surya Ghar Ready",
    badgeColor: "bg-sky-500 text-white",
    rating: 4.9,
    reviews: 189,
    price: 95000,
    mrp: 125000,
    discount: 24,
    watt: "2kW Kit",
    brand: "SolarKits Prime",
    img: imgKit,
  },
  {
    id: 3,
    name: "SolarKits 3kW Complete Home Combo Kit",
    category: "On-Grid Solar Kit",
    badge: "🔥 Bestseller",
    badgeColor: "bg-red-500 text-white",
    rating: 4.9,
    reviews: 312,
    price: 145000,
    mrp: 195000,
    discount: 26,
    watt: "3kW Kit",
    brand: "SolarKits Prime",
    img: imgKit,
  },
  {
    id: 4,
    name: "SolarKits 5kW Heavy Duty Hybrid Solar Kit",
    category: "Hybrid Solar Kit",
    badge: "Battery Backup",
    badgeColor: "bg-orange-500 text-white",
    rating: 4.8,
    reviews: 156,
    price: 265000,
    mrp: 340000,
    discount: 22,
    watt: "5kW Kit",
    brand: "SolarKits Ultra",
    img: imgKit,
  },
  {
    id: 5,
    name: "SolarKits 10kW Commercial 3-Phase Kit",
    category: "Commercial Solar Kit",
    badge: "High ROI",
    badgeColor: "bg-blue-600 text-white",
    rating: 4.8,
    reviews: 98,
    price: 490000,
    mrp: 620000,
    discount: 21,
    watt: "10kW Kit",
    brand: "SolarKits Pro",
    img: imgKit,
  },

];

function ProductCard({ product, fieldVisibility = {} }) {
  const [wished, setWished] = useState(false);
  const price = Number(product.price) || 0;
  const mrp = Number(product.mrp) || price;
  const discount = product.discount || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const savings = mrp > price ? mrp - price : 0;

  // Field visibility checks (per-product setting takes priority over global settings, fallback to true)
  const showBadge = product.show_badge ?? fieldVisibility.show_badge ?? true;
  const showWatt = product.show_watt ?? fieldVisibility.show_watt ?? true;
  const showBrandCategory = product.show_brand_category ?? fieldVisibility.show_brand_category ?? true;
  const showPrice = product.show_price ?? fieldVisibility.show_price ?? true;
  const showMrp = product.show_mrp ?? fieldVisibility.show_mrp ?? true;
  const showDiscount = product.show_discount ?? fieldVisibility.show_discount ?? true;
  const showRating = product.show_rating ?? fieldVisibility.show_rating ?? true;
  const showReviews = product.show_reviews ?? fieldVisibility.show_reviews ?? true;
  const showStock = product.show_stock_status ?? fieldVisibility.show_stock_status ?? true;
  const showCta = product.show_cta ?? fieldVisibility.show_cta ?? true;
  const showQuickView = product.show_quick_view ?? fieldVisibility.show_quick_view ?? true;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      {/* Product image */}
      <div className="relative h-[300px] overflow-hidden bg-gradient-to-b from-gray-50 to-white sm:h-[330px]">
        {showBadge && product.badge && (
          <span
            className={`absolute left-4 top-4 z-20 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${product.badgeColor || "bg-orange-500 text-white"}`}
          >
            {product.badge}
          </span>
        )}

        {showDiscount && discount > 0 && (
          <span className="absolute right-16 top-4 z-20 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500">
            {discount}% OFF
          </span>
        )}

        <button
          type="button"
          onClick={() => setWished((current) => !current)}
          aria-label={
            wished ? "Remove from wishlist" : "Add product to wishlist"
          }
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white shadow-md transition-transform hover:scale-110"
        >
          <FiHeart
            className={`text-lg ${wished
              ? "fill-red-500 text-red-500"
              : "text-gray-500"
              }`}
          />
        </button>

        <img
          src={product.img || imgKit}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-7 transition-transform duration-500 group-hover:scale-110"
        />

        {showQuickView && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/0 pb-5 opacity-0 transition-all duration-300 group-hover:bg-black/5 group-hover:opacity-100">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary-600 shadow-lg transition hover:bg-primary-50"
            >
              <FiEye />
              Quick View
            </button>
          </div>
        )}
      </div>

      {/* Product information */}
      <div className="flex flex-1 flex-col p-6">
        {showBrandCategory && (
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary-500">
            {product.brand ? `${product.brand} • ` : ""}{product.category || "Solar Kit"}
          </p>
        )}

        <h3 className="mb-3 min-h-[56px] text-lg font-bold leading-snug text-gray-900">
          {product.name}
        </h3>

        {(showWatt || showRating) && (
          <div className="mb-4 flex items-center justify-between">
            {showWatt ? (
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600">
                {product.watt || "Complete Kit"}
              </span>
            ) : <span />}

            {showRating && (
              <div className="flex items-center gap-1.5">
                <FiStar className="fill-orange-400 text-orange-400" />
                <span className="text-sm font-bold text-gray-700">
                  {product.rating || 4.8}
                </span>
                {showReviews && (
                  <span className="text-xs text-gray-400">
                    ({product.reviews || 120})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {showStock && product.stock_status && (
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{product.stock_status}</span>
          </div>
        )}

        {(showPrice || showMrp) && (
          <div className="mb-5 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap items-baseline gap-2">
              {showPrice && (
                <span className="text-2xl font-extrabold text-navy">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              )}

              {showMrp && mrp > price && (
                <span className="text-sm text-gray-400 line-through">
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {showMrp && savings > 0 && (
              <p className="mt-1 text-xs font-medium text-green-600">
                You save ₹{savings.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}

        {showCta && (
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <FiShoppingCart className="text-lg" />
            {product.cta_label || "View & Add to Cart"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function FeaturedProducts({ productsConfig }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const selectedState = useSelector((state) => state.slice?.selectedState);
  const selectedDistrict = useSelector((state) => state.slice?.selectedDistrict);
  const selectedPincode = useSelector((state) => state.slice?.selectedPincode);

  const [pincodeInput, setPincodeInput] = useState(selectedPincode || "");
  const [isResolving, setIsResolving] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [resolvedLoc, setResolvedLoc] = useState(null);
  const [areaKits, setAreaKits] = useState([]);

  // Regional Dropdown Selector States
  const [filterMode, setFilterMode] = useState("pincode"); // "pincode" | "dropdown"
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [pincodesList, setPincodesList] = useState([]);
  const [selectedDropdownState, setSelectedDropdownState] = useState("");
  const [selectedDropdownDistrict, setSelectedDropdownDistrict] = useState("");
  const [selectedDropdownPincode, setSelectedDropdownPincode] = useState("");
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingPincodes, setIsLoadingPincodes] = useState(false);

  // Fetch Active States on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await axiosInstance.get("/india/v1/geo/states");
        const list = res.data?.states || res.data?.data || [];
        setStatesList(list);
      } catch (err) {
        console.warn("Failed to load states for store dropdown:", err);
      }
    };
    fetchStates();
  }, []);

  // When selectedDropdownState changes, load districts
  useEffect(() => {
    if (!selectedDropdownState) {
      setDistrictsList([]);
      setSelectedDropdownDistrict("");
      setPincodesList([]);
      setSelectedDropdownPincode("");
      return;
    }
    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const matchedState = statesList.find(s => s.name === selectedDropdownState || s.id === selectedDropdownState);
        const stId = matchedState?.id || matchedState?._id || selectedDropdownState;
        const res = await axiosInstance.get("/india/v1/geo/districts", { params: { state_id: stId } });
        const list = res.data?.districts || res.data?.data || [];
        setDistrictsList(list);
      } catch (err) {
        console.warn("Failed to load districts:", err);
      } finally {
        setIsLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, [selectedDropdownState, statesList]);

  // When selectedDropdownDistrict changes, load pincodes
  useEffect(() => {
    if (!selectedDropdownDistrict) {
      setPincodesList([]);
      setSelectedDropdownPincode("");
      return;
    }
    const fetchPincodes = async () => {
      setIsLoadingPincodes(true);
      try {
        const matchedDist = districtsList.find(d => d.name === selectedDropdownDistrict || d.id === selectedDropdownDistrict);
        const distId = matchedDist?.id || matchedDist?._id;
        if (distId) {
          const res = await axiosInstance.get(`/india/v1/geo/district-pincodes/${distId}`);
          const list = res.data?.district?.pincodes || res.data?.pincodes || [];
          setPincodesList(list);
        }
      } catch (err) {
        console.warn("Failed to load district pincodes:", err);
      } finally {
        setIsLoadingPincodes(false);
      }
    };
    fetchPincodes();
  }, [selectedDropdownDistrict, districtsList]);

  // Sync input if redux changes out of band
  useEffect(() => {
    if (selectedPincode && selectedPincode !== pincodeInput) {
      setPincodeInput(selectedPincode);
    }
  }, [selectedPincode]);

  // Load area kits whenever selectedPincode or selectedDistrict changes
  useEffect(() => {
    let isMounted = true;
    const fetchAreaBestSellers = async () => {
      const pin = selectedPincode;
      const distId = selectedDistrict?.id || selectedDistrict?._id;
      if (!pin && !distId) {
        setAreaKits([]);
        setResolvedLoc(null);
        return;
      }
      try {
        const params = {};
        if (pin) params.pincode = pin;
        if (distId) params.district_id = distId;

        const res = await axiosInstance.get("/india/v1/shop/best-sellers", { params });
        if (isMounted && res.data?.success) {
          setAreaKits(res.data.data || []);
          if (res.data.location) {
            setResolvedLoc(res.data.location);
          }
        }
      } catch (err) {
        console.warn("Could not load area best sellers:", err.message);
      }
    };

    fetchAreaBestSellers();
    return () => { isMounted = false; };
  }, [selectedPincode, selectedDistrict?.id, selectedDistrict?._id]);

  // Handle direct pincode submit
  const handlePincodeSubmit = async (e, directPin) => {
    if (e) e.preventDefault();
    const pin = (directPin || pincodeInput || "").trim();
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPincodeError("Please enter a valid 6-digit Pincode");
      return;
    }

    setPincodeError("");
    setIsResolving(true);
    try {
      const res = await axiosInstance.get("/india/v1/geo/pincode-lookup", {
        params: { pincode: pin }
      });
      const loc = res.data?.data || res.data;
      if (res.data?.success && loc && (loc.district_name || loc.district?.name)) {
        const distName = loc.district_name || loc.district?.name || "";
        const stName = loc.state_name || loc.state?.name || "";
        const distId = loc.district_id || loc.district?.id || loc.district?._id || "";
        const stId = loc.state_id || loc.state?.id || loc.state?._id || "";

        const newLoc = {
          selectedState: { id: stId, name: stName },
          selectedDistrict: { id: distId, name: distName },
          selectedPincode: pin
        };
        dispatch(setSelectedLocation(newLoc));
        setResolvedLoc({
          ...loc,
          pincode: pin,
          district_name: distName,
          state_name: stName
        });
        setPincodeInput(pin);
        setSelectedDropdownState(stName);
        setSelectedDropdownDistrict(distName);
        setSelectedDropdownPincode(pin);
      } else {
        setPincodeError(`No active district found for PIN ${pin}. Please verify.`);
      }
    } catch (err) {
      console.error("Pincode lookup error:", err);
      setPincodeError("Failed to lookup pincode. Please try again.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleResetToAllIndia = () => {
    dispatch(setSelectedLocation({
      selectedState: null,
      selectedDistrict: null,
      selectedPincode: null
    }));
    setPincodeInput("");
    setSelectedDropdownState("");
    setSelectedDropdownDistrict("");
    setSelectedDropdownPincode("");
    setResolvedLoc(null);
    setAreaKits([]);
    setPincodeError("");
  };

  const handleDropdownSelectDistrict = (distName) => {
    setSelectedDropdownDistrict(distName);
    setSelectedDropdownPincode("");
    if (!distName) return;

    const matchedDist = districtsList.find(d => d.name === distName || d.id === distName);
    const matchedState = statesList.find(s => s.name === selectedDropdownState);
    if (matchedDist) {
      const newLoc = {
        selectedState: { id: matchedState?.id || "", name: selectedDropdownState },
        selectedDistrict: { id: matchedDist.id || matchedDist._id, name: distName },
        selectedPincode: null
      };
      dispatch(setSelectedLocation(newLoc));
      setResolvedLoc({
        district_name: distName,
        state_name: selectedDropdownState,
        locality: ""
      });
    }
  };

  const handleDropdownSelectPincode = (pinVal) => {
    setSelectedDropdownPincode(pinVal);
    if (!pinVal) return;
    setPincodeInput(pinVal);
    handlePincodeSubmit(null, pinVal);
  };

  if (productsConfig && productsConfig.enabled === false) return null;

  const badgeText = productsConfig?.badge_text || "Most Popular";
  const heading = productsConfig?.heading || "Bestselling Solar Kits";
  const subtitle = productsConfig?.subtitle || "Explore our most trusted pre-configured solar combo kits selected for high performance, durability and maximum subsidy benefits.";
  const viewAllText = productsConfig?.view_all_text || "View All Solar Kits";
  const viewAllHref = productsConfig?.view_all_href || "/shop";
  const configuredItems = productsConfig?.items && productsConfig.items.length > 0 ? productsConfig.items : PRODUCTS;
  const fieldVisibility = productsConfig?.field_visibility || {};

  // Compute final items to show in Swiper
  const displayItems = useMemo(() => {
    // If area best sellers were fetched for this pincode / district
    if ((selectedPincode || selectedDistrict) && areaKits.length > 0) {
      const locLabel = resolvedLoc?.district_name || selectedDistrict?.name || "your area";
      return areaKits.map((k, idx) => {
        const v = k.variants?.[0] || {};
        const price = Number(v.ourPrice || k.base_price_cached || k.price || 48000);
        const mrp = Number(v.marketPrice || k.marketPrice || Math.round(price * 1.25));
        const discount = v.discountPercent || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

        return {
          id: k.id || k._id,
          name: k.kitName || k.name || `SolarKits ${k.capacityKW || 3}kW Combo Kit`,
          category: k.category || k.category_name || "On-Grid Solar Kit",
          badge: k.best_seller_badge || (idx === 0 ? `🔥 #1 Best Seller in ${locLabel}` : idx === 1 ? `⚡ High Demand in ${locLabel}` : '⭐ Top Rated'),
          badgeColor: idx === 0 ? "bg-red-500 text-white" : "bg-amber-500 text-white",
          rating: 4.9,
          reviews: 180 + (idx * 24),
          price,
          mrp,
          discount,
          watt: k.capacityKW ? `${k.capacityKW}kW Kit` : (k.capacity ? `${k.capacity}kW Kit` : "Complete Kit"),
          brand: k.brand || "SolarKits Prime",
          img: k.kitImage || imgKit,
          stock_status: "In Stock • Fast Delivery",
          cta_label: "View & Add to Cart"
        };
      });
    }

    // Default National scope: use configured products
    return configuredItems;
  }, [selectedPincode, selectedDistrict, areaKits, resolvedLoc, configuredItems]);

  return (
    <section
      id="products"
      className="overflow-hidden bg-solarbg py-14 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div>
            <span className="mb-3 inline-block rounded-full bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-600">
              {badgeText}
            </span>

            <h2 className="font-heading text-3xl font-bold text-navy md:text-4xl">
              {heading}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500 md:text-base">
              {subtitle}
            </p>
          </div>

          <a
            href={viewAllHref}
            onClick={(e) => {
              if (viewAllHref.startsWith("/")) {
                e.preventDefault();
                navigate(viewAllHref);
              }
            }}
            className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-primary-500 transition-colors hover:text-primary-700 cursor-pointer"
          >
            {viewAllText}
            <FiTag className="text-base" />
          </a>
        </motion.div>

        {/* FIND BEST SELLING KITS IN YOUR AREA (PINCODE BOX) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-blue-800/60"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/30">
                <FiMapPin className="text-amber-400 animate-pulse text-sm" />
                <span>Regional Best Seller Finder</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Find best selling kits in your area
              </h3>
              <p className="text-xs md:text-sm text-blue-200/80 leading-relaxed">
                Enter your 6-digit delivery pincode to discover pre-configured solar combo kits actively ordered and highest-rated by EPC contractors in your district.
              </p>
            </div>

            {/* Form / Resolved Location Pill */}
            <div className="shrink-0 w-full lg:w-auto">
              {selectedPincode ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
                      <FiCheckCircle size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                        Area Active
                      </span>
                      <p className="text-sm font-extrabold text-white">
                        {resolvedLoc?.locality ? `${resolvedLoc.locality}, ` : ''}
                        {resolvedLoc?.district_name || selectedDistrict?.name || 'Area'},{" "}
                        <span className="text-amber-400">{resolvedLoc?.state_name || selectedState?.name || 'India'}</span>
                      </p>
                      <span className="text-[11px] font-bold text-blue-200">
                        PIN: {selectedPincode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPincodeInput("");
                        handleResetToAllIndia();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToAllIndia}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
                    >
                      All India
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mode Selector Tabs: By Pincode vs By State & District */}
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setFilterMode("pincode")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filterMode === "pincode" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-blue-200 hover:text-white"
                      }`}
                    >
                      📍 By Pincode
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode("dropdown")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filterMode === "dropdown" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-blue-200 hover:text-white"
                      }`}
                    >
                      🏛️ Select State & District
                    </button>
                  </div>

                  {filterMode === "pincode" ? (
                    /* DIRECT PINCODE ENTRY */
                    <form onSubmit={handlePincodeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1 sm:w-64">
                        <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit Pincode (e.g. 302001)"
                          value={pincodeInput}
                          onChange={(e) => {
                            setPincodeInput(e.target.value.replace(/\D/g, ""));
                            if (pincodeError) setPincodeError("");
                          }}
                          className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-xs font-bold tracking-wider outline-none focus:border-amber-400 focus:bg-white/15 transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResolving || pincodeInput.length !== 6}
                        className="h-11 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isResolving ? (
                          <>
                            <FiRefreshCw className="animate-spin text-sm" />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <>
                            <span>Find Kits</span>
                            <FiArrowRight className="text-sm" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* DROPDOWN SELECTORS FOR STATE, DISTRICT & PINCODE */
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* State Dropdown */}
                      <select
                        value={selectedDropdownState}
                        onChange={(e) => setSelectedDropdownState(e.target.value)}
                        className="h-11 px-3 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-bold outline-none focus:border-amber-400 shadow-xs"
                      >
                        <option value="">-- Select State --</option>
                        {statesList.map(s => (
                          <option key={s.id || s._id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      {/* District Dropdown */}
                      <select
                        value={selectedDropdownDistrict}
                        onChange={(e) => handleDropdownSelectDistrict(e.target.value)}
                        disabled={!selectedDropdownState}
                        className="h-11 px-3 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-bold outline-none focus:border-amber-400 disabled:opacity-50 shadow-xs"
                      >
                        <option value="">
                          {selectedDropdownState ? (isLoadingDistricts ? "Loading Districts..." : "-- Select District --") : "Select State First"}
                        </option>
                        {districtsList.map(d => (
                          <option key={d.id || d._id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>

                      {/* Pincode Dropdown */}
                      <select
                        value={selectedDropdownPincode}
                        onChange={(e) => handleDropdownSelectPincode(e.target.value)}
                        disabled={!selectedDropdownDistrict}
                        className="h-11 px-3 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-bold outline-none focus:border-amber-400 disabled:opacity-50 shadow-xs"
                      >
                        <option value="">
                          {selectedDropdownDistrict ? (isLoadingPincodes ? "Loading PINs..." : `-- Select PIN (${pincodesList.length}) --`) : "Select District First"}
                        </option>
                        {pincodesList.map(p => (
                          <option key={p.pincode} value={p.pincode}>
                            {p.pincode} {p.locality ? `- ${p.locality}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {pincodeError && (
                    <p className="text-[11px] text-red-400 font-bold ml-1 animate-pulse">
                      {pincodeError}
                    </p>
                  )}

                  {/* Popular hub quick suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-blue-200/80">
                    <span className="text-[10px] uppercase font-bold text-white/50 mr-1">Popular Hubs:</span>
                    {[
                      { city: "Jaipur", pin: "302001" },
                      { city: "Rajkot", pin: "360001" },
                      { city: "Ahmedabad", pin: "380001" },
                      { city: "Surat", pin: "395001" },
                      { city: "Pune", pin: "411001" },
                    ].map((hub) => (
                      <button
                        key={hub.pin}
                        type="button"
                        onClick={() => {
                          setPincodeInput(hub.pin);
                          handlePincodeSubmit(null, hub.pin);
                        }}
                        className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-amber-300 font-semibold cursor-pointer text-[10px] transition-colors"
                      >
                        {hub.city} ({hub.pin})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <Swiper
            key={displayItems.map((p, i) => `${p.id || i}-${p.name}-${p.price}`).join('_')}
            modules={[Autoplay]}
            autoplay={{
              delay: 3500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={false}
            loop={displayItems.length > 2}
            grabCursor
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 22,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 28,
              },
            }}
            className="!overflow-visible pb-8"
          >
            {displayItems.map((product, idx) => (
              <SwiperSlide key={product.id || idx} className="h-auto">
                <ProductCard product={product} fieldVisibility={fieldVisibility} />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </div>
    </section>
  );
}