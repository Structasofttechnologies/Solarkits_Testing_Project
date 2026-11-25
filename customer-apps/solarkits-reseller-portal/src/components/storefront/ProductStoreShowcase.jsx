import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiShoppingBag,
  FiSearch,
  FiCheckCircle,
  FiEye,
  FiArrowRight,
  FiPackage,
  FiShield,
  FiTruck,
  FiX,
  FiTrendingUp,
} from "react-icons/fi";

const FALLBACK_PRODUCTS = [
  {
    id: "SK-KIT-001",
    name: "SolarKits 5kW Residential On-Grid Turnkey Combo Kit",
    category: "Complete Solar Kits",
    sku: "SK-OG-5KW-PREM",
    image_url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    mrp: 235000,
    our_price: 188000,
    in_stock: true,
    available_stock: 45,
    rating: 4.9,
    reviews_count: 58,
    warranty: "5 Years Replacement + 25 Yrs Performance",
    badge: "Best Seller Kit",
    specifications: {
      "System Capacity": "5 kW AC / 5.5 kW DC",
      "Inverter": "5kW Dual-MPPT High Efficiency Inverter",
      "Panels Included": "10x 550W Mono PERC Half-Cut Tier-1 Panels",
      "BOS Kit": "Pre-wired ACDB/DCDB, 4sqmm DC Cables, Earthing Kit",
      "Structure": "Elevated Aluminium HDGI Mounting Structure",
    },
    components: [
      "10x 550W Tier-1 Mono PERC Bifacial Solar Panels",
      "1x 5kW 3-Phase Smart Cloud-Connected Inverter",
      "1x IP65 Weatherproof ACDB & DCDB with SPD Protection",
      "100m UV-Resistant 4sqmm Solar DC Cable",
      "Lightning Arrester & Copper Bonded Earth Electrodes",
    ],
  },
  {
    id: "SK-KIT-002",
    name: "SolarKits 10kW Commercial 3-Phase Grid-Tie Power Kit",
    category: "Complete Solar Kits",
    sku: "SK-OG-10KW-COMM",
    image_url: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80",
    mrp: 460000,
    our_price: 368000,
    in_stock: true,
    available_stock: 30,
    rating: 5.0,
    reviews_count: 42,
    warranty: "7 Years Replacement Warranty",
    badge: "High Margin Commercial",
    specifications: {
      "System Capacity": "10 kW AC / 11 kW DC",
      "Inverter": "10kW 3-Phase IP66 Smart Grid-Tie Inverter",
      "Panels Included": "19x 575W N-Type TOPCon Panels",
      "BOS Kit": "Complete Industrial Grade ACDB/DCDB & Array Combiner",
      "Protection": "Type II Surge Protection & AFCI Protection",
    },
    components: [
      "19x 575W TOPCon Ultra-High Efficiency Solar Panels",
      "1x 10kW Industrial 3-Phase Smart Grid Inverter",
      "Heavy-duty HDGI Rooftop Structure Hardware",
      "Industrial Combiner Box & DC Isolators",
      "Dual Earthing Pits with Chemical Compound",
    ],
  },
  {
    id: "SK-INV-001",
    name: "SolarKits Pro-Series 6kW Hybrid Smart Inverter (Lithium Ready)",
    category: "Solar Inverters",
    sku: "SK-INV-HYB-6K",
    image_url: "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80",
    mrp: 145000,
    our_price: 112000,
    in_stock: true,
    available_stock: 28,
    rating: 4.8,
    reviews_count: 29,
    warranty: "5 Years Standard + 5 Years Extended Option",
    badge: "Hybrid Powerhouse",
    specifications: {
      "Rated Power": "6,000 Watts Pure Sine Wave",
      "Battery Type": "48V LiFePO4 / Lead Acid Compatible",
      "Efficiency": "98.2% Peak Inverter Efficiency",
      "Connectivity": "Built-in Wi-Fi & 4G Remote Telemetry",
      "Switchover Time": "< 10ms Uninterrupted Power Supply (UPS Mode)",
    },
    components: [
      "6kW Hybrid Inverter Main Unit",
      "Wi-Fi Datalogger Antenna",
      "Current Transformer (CT) Sensor for Zero Export",
      "Wall Mounting Bracket & Hardware Kit",
    ],
  },
  {
    id: "SK-BOS-001",
    name: "SolarKits Universal 3kW-10kW Turnkey BOS Package",
    category: "BOS Packages",
    sku: "SK-BOS-UNIV-10K",
    image_url: "https://images.unsplash.com/photo-1558441719-8b389c600f56?w=800&auto=format&fit=crop&q=80",
    mrp: 48000,
    our_price: 36000,
    in_stock: true,
    available_stock: 60,
    rating: 4.9,
    reviews_count: 94,
    warranty: "3 Years Comprehensive Warranty",
    badge: "Contractor Favorite",
    specifications: {
      "Protection Standard": "IP65 Weatherproof Enclosures",
      "DC Switchgear": "1000V DC Isolator + Class II SPD",
      "AC Switchgear": "4-Pole MCB + 300mA RCD + AC SPD",
      "Cables": "Certified EN50618 Tinned Copper Solar Cable",
    },
    components: [
      "1x 10kW ACDB Box with Energy Meter Socket",
      "1x 2-in-2-out 1000V DCDB Box with SPDs",
      "50m Red & 50m Black 4sqmm Solar DC Cable",
      "10x MC4 Connector Pairs (IP68)",
      "2x Chemical Earthing Electrodes (2m) & Bag",
    ],
  },
  {
    id: "SK-PAN-001",
    name: "SolarKits Tier-1 575W N-Type TOPCon Bifacial Solar Module",
    category: "Solar Panels",
    sku: "SK-MOD-TOPCON-575",
    image_url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    mrp: 14500,
    our_price: 11600,
    in_stock: true,
    available_stock: 180,
    rating: 5.0,
    reviews_count: 73,
    warranty: "12 Yrs Product + 30 Yrs Linear Power Warranty",
    badge: "30-Year Performance",
    specifications: {
      "Nominal Output": "575 Watts Peak (Bifacial up to 690W)",
      "Module Efficiency": "22.6%",
      "Cell Type": "N-Type TOPCon 144 Half-Cells",
      "Glass": "2.0mm Dual High-Transmission Anti-Reflective Glass",
      "Frame": "Anodized Silver Aluminium Alloy (5400Pa Load)",
    },
    components: [
      "575W Bifacial TOPCon Solar Module",
      "Pre-crimped 1.2m Output Cables with Stäubli MC4",
      "Factory QC & Flash Test Report Certificate",
    ],
  },
  {
    id: "SK-BAT-001",
    name: "SolarKits PowerVault 5.12kWh LiFePO4 Wall-Mounted Energy Storage",
    category: "Energy Storage",
    sku: "SK-BAT-PV-5120",
    image_url: "https://images.unsplash.com/photo-1558441719-8b389c600f56?w=800&auto=format&fit=crop&q=80",
    mrp: 165000,
    our_price: 128000,
    in_stock: true,
    available_stock: 22,
    rating: 4.9,
    reviews_count: 36,
    warranty: "10 Years / 6000 Cycles Warranty",
    badge: "High Density Lithium",
    specifications: {
      "Total Energy": "5.12 kWh (51.2V 100Ah)",
      "Usable Capacity": "4.8 kWh (95% DoD)",
      "Cycle Life": "> 6,000 Cycles @ 80% DoD",
      "BMS Protocol": "CAN / RS485 Multi-Inverter Communication",
      "Safety": "Built-in Aerosol Fire Suppression & Cell Balancing",
    },
    components: [
      "5.12kWh LiFePO4 Lithium Battery Module",
      "Smart BMS with LCD Status Display",
      "High-Current DC Battery Cables & Communication Cable",
      "Heavy-Duty Wall Mounting Bracket & Hardware",
    ],
  },
];

const CATEGORIES = [
  "All Products",
  "Complete Solar Kits",
  "Solar Inverters",
  "BOS Packages",
  "Solar Panels",
  "Energy Storage",
];

export default function ProductStoreShowcase() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [procurePromptProduct, setProcurePromptProduct] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/boskit/v1/public/products")
      .then((res) => {
        if (res.data?.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
          const liveList = res.data.products.map((p, idx) => ({
            id: p._id || p.id || `live_${idx}`,
            name: p.name,
            category: p.category || (p.name.includes("Inverter") ? "Solar Inverters" : p.name.includes("BOS") ? "BOS Packages" : "Complete Solar Kits"),
            sku: p.sku || `SK-${idx + 100}`,
            image_url: p.image_url || FALLBACK_PRODUCTS[idx % FALLBACK_PRODUCTS.length].image_url,
            mrp: p.mrp || Math.round((p.our_price || 100000) * 1.25),
            our_price: p.our_price || p.price || 85000,
            in_stock: p.in_stock !== false,
            available_stock: p.available_stock || 25,
            rating: p.rating || 4.9,
            reviews_count: p.reviews_count || 34,
            warranty: p.warranty || "5 Years Replacement Warranty",
            badge: p.badge || "Verified Equipment",
            specifications: p.specifications || {
              "System Grade": "Tier-1 Commercial Grade",
              "Compliance": "MNRE / BIS Certified",
              "Warranty": "Direct Manufacturer Backed",
            },
            components: p.components || [
              "Complete Turnkey Solar Equipment Package",
              "Quality Assurance & Warranty Certificate",
            ],
          }));

          const merged = [...liveList, ...FALLBACK_PRODUCTS.slice(liveList.length)];
          setProducts(merged);
        }
      })
      .catch((err) => {
        console.warn("Using baseline products catalog:", err);
      });
  }, []);

  const filteredProducts = products.filter((item) => {
    const matchesCategory =
      selectedCategory === "All Products" ||
      item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (selectedCategory === "Solar Panels" && item.name.toLowerCase().includes("panel")) ||
      (selectedCategory === "Solar Inverters" && item.name.toLowerCase().includes("inverter")) ||
      (selectedCategory === "BOS Packages" && item.name.toLowerCase().includes("bos")) ||
      (selectedCategory === "Complete Solar Kits" && (item.name.toLowerCase().includes("kit") || item.name.toLowerCase().includes("combo"))) ||
      (selectedCategory === "Energy Storage" && (item.name.toLowerCase().includes("battery") || item.name.toLowerCase().includes("storage") || item.name.toLowerCase().includes("lifepo4")));

    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleOpenSpecs = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleProcureClick = (product) => {
    const token = localStorage.getItem("reseller_token");
    if (token) {
      navigate("/procurement-inventory");
    } else {
      setProcurePromptProduct(product);
    }
  };

  return (
    <section id="products" className="py-14 sm:py-24 bg-slate-50 text-slate-900 relative overflow-hidden border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-slate-200 pb-6 sm:pb-8">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <FiShoppingBag className="text-[#253880]" size={14} />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#253880]">
                Franchisee Wholesale Store
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Tier-1 Solar Equipment at{" "}
              <span className="text-[#F49222]">
                Franchisee Factory-Gate Pricing
              </span>
            </h2>

            <p className="text-slate-600 text-xs sm:text-base font-normal">
              Procure complete turn-key rooftop solar kits, hybrid inverters, BOS packages, and battery storage with maximum dealer profit margins.
            </p>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-80">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search kits, inverters, SKUs..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#253880] shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation Filter Pills with Touch-friendly Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 sm:py-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#253880] text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-700 hover:text-[#253880] hover:bg-sky-50 border border-slate-200 shadow-xs"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
          {filteredProducts.map((p, idx) => {
            const marginAmount = Math.max(0, p.mrp - p.our_price);
            const marginPercent = Math.round((marginAmount / p.mrp) * 100);

            return (
              <motion.div
                key={p.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (idx % 3) * 0.1 }}
                className="group rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="relative h-48 sm:h-56 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Category Tag */}
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                      {p.category}
                    </div>

                    {/* Promo/Feature Badge */}
                    {p.badge && (
                      <div className="absolute top-3 right-3 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#F49222] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md">
                        {p.badge}
                      </div>
                    )}

                    {/* Fast Stock Tag */}
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-emerald-700 text-[9px] sm:text-[10px] font-bold shadow-xs">
                      <FiTruck size={11} />
                      <span>{p.available_stock || 25} Units in Regional Hub</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {/* SKU & Title */}
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        SKU: {p.sku}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#253880] transition-colors line-clamp-2 mt-0.5">
                        {p.name}
                      </h3>
                    </div>

                    {/* Pricing Block with Margin Calculation */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 sm:space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block uppercase">
                            Franchisee Wholesale
                          </span>
                          <span className="text-lg sm:text-2xl font-black text-[#253880]">
                            ₹{(p.our_price || 0).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block uppercase">
                            Customer MRP
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                            ₹{(p.mrp || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Profit Margin Pill */}
                      <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-200 text-[11px] sm:text-xs font-black">
                        <span className="text-slate-600 flex items-center gap-1">
                          <FiTrendingUp className="text-emerald-600" />
                          Est. Partner Margin:
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          +₹{marginAmount.toLocaleString("en-IN")} ({marginPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Warranty line */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-600 font-medium">
                      <FiShield className="text-[#253880] shrink-0" size={13} />
                      <span className="truncate">{p.warranty}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 sm:p-6 pt-0 grid grid-cols-2 gap-2 sm:gap-2.5">
                  <button
                    onClick={() => handleOpenSpecs(p)}
                    className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-all border border-slate-200 shadow-xs cursor-pointer"
                  >
                    <FiEye size={13} />
                    <span>Quick Specs</span>
                  </button>

                  <button
                    onClick={() => handleProcureClick(p)}
                    className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white text-xs font-black flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <FiShoppingBag size={13} />
                    <span>Order / Buy</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty Search State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 sm:py-16 space-y-3">
            <FiPackage className="mx-auto text-slate-400" size={40} />
            <h4 className="text-base sm:text-lg font-bold text-slate-800">No solar products found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search keywords or resetting your category filter.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All Products");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-[#253880] text-white rounded-xl text-xs font-bold mt-2"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bulk Wholesale Procurement Banner */}
        <div className="mt-10 sm:mt-14 p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-50 via-white to-amber-50 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <h3 className="text-lg sm:text-2xl font-black text-slate-900">
              Need MW-Scale Project Procurement or Container Quotes?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Authorized Franchisees receive prioritized container dispatch, GST credit invoices, and dedicated manufacturer warranty certificates.
            </p>
          </div>

          <Link
            to="/register"
            className="w-full md:w-auto shrink-0 px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#F49222] to-[#D97E15] hover:from-[#D97E15] hover:to-[#F49222] shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Register for Wholesale Access</span>
            <FiArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Technical Specifications Modal */}
      <AnimatePresence>
        {modalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-8 space-y-4 sm:space-y-6 text-slate-900"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 sm:pb-4">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-[#253880] font-bold uppercase">
                    {selectedProduct.sku} • {selectedProduct.category}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{selectedProduct.name}</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Pricing & Margin Summary */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Franchisee Wholesale</span>
                  <p className="text-xl sm:text-2xl font-black text-[#253880]">
                    ₹{selectedProduct.our_price.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Customer Retail MRP</span>
                  <p className="text-sm sm:text-lg font-bold text-slate-500 line-through">
                    ₹{selectedProduct.mrp.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Specifications Table */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">
                  Technical Specifications
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(selectedProduct.specifications || {}).map(([key, val]) => (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-600 w-1/3 bg-slate-50">{key}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill of Materials (BOM) */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">
                  Included Bill of Materials (BOM)
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(selectedProduct.components || []).map((comp, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <FiCheckCircle className="text-emerald-600 shrink-0" size={13} />
                      <span>{comp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons in Modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    handleProcureClick(selectedProduct);
                  }}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                  <FiShoppingBag size={13} />
                  <span>Procure / Order</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Procurement Prompt Modal */}
      <AnimatePresence>
        {procurePromptProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#F49222] rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-7 space-y-4 sm:space-y-5 text-center text-slate-900"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-amber-50 border border-amber-200 text-[#F49222] flex items-center justify-center mx-auto shadow-xs">
                <FiShoppingBag size={24} />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">Franchisee Procurement</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To procure <strong className="text-[#253880]">{procurePromptProduct.name}</strong> at the wholesale rate of{" "}
                  <strong className="text-emerald-600">₹{procurePromptProduct.our_price.toLocaleString("en-IN")}</strong>, please sign in or register.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  to="/login"
                  className="block w-full py-2.5 sm:py-3 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white text-xs font-black shadow-md shadow-blue-600/20 transition-all"
                >
                  Sign In to Partner Portal
                </Link>

                <Link
                  to="/register"
                  className="block w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#F49222] to-[#D97E15] hover:from-[#D97E15] hover:to-[#F49222] text-white text-xs font-black shadow-md shadow-amber-500/20 transition-all"
                >
                  Register as New Franchisee
                </Link>

                <button
                  onClick={() => setProcurePromptProduct(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium pt-1"
                >
                  Cancel & Browse Store
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
