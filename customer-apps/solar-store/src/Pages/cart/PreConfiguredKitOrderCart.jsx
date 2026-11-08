import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    FiGrid, FiList, FiSearch, FiX, FiShoppingCart,
    FiDollarSign, FiTag, FiPackage, FiPercent, FiTruck,
    FiShield, FiAward, FiStar, FiHome, FiZap,
    FiTrendingUp, FiPieChart, FiLock, FiLayers, FiChevronRight
} from 'react-icons/fi';
import { FaGem, FaSolarPanel } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { selectCartGroupedByMilestones } from "@/features/slice";
import { hasPermission } from "@/utils/permissions";
import SelectedKitCard from "@/Pages/dashboard/components/SelectedKitCard";
import KitCard from "@/Pages/dashboard/components/KitCard";
import Dialog from "@/Components/Dialog";
import GstVerificationDialog from "@/Components/GstVerificationDialog";
import Button from "@/Components/Button";
import IconButton from "@/Components/IconButton";
import Dropdown from "@/Components/Dropdown";
import CustomInput from "@/Components/CustomInput";
import { useNavigate } from "react-router-dom";

const resolveImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
    if (url.includes("localhost:3001")) {
        return url.replace("localhost:3001", "localhost:5000");
    }
    if (url.startsWith("/")) {
        return `http://localhost:5000${url}`;
    }
    return url;
};

export default function PreConfiguredKitOrderCart() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.slice.cart);
    const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);
    const selectedState = useSelector((state) => state.slice.selectedState);
    const { user } = useSelector((state) => state.auth_slice);
    const [selected, setSelected] = useState(null);
    const [activeOffers, setActiveOffers] = useState([]);

    // Sub-account permissions check
    const canCheckout = hasPermission(user, 'can_checkout');

    // Grouped milestone policies
    const milestoneGroups = useSelector(selectCartGroupedByMilestones);
    const hasMultipleMilestones = milestoneGroups.length > 1;
    const [pendingTargetGroupKey, setPendingTargetGroupKey] = useState(null);

    // GST State Verification
    const [showGstDialog, setShowGstDialog] = useState(false);
    const [gstStateId, setGstStateId] = useState("");

    const handleProceedToCheckout = async (targetGroupKey = null) => {
        if (!canCheckout) {
            dispatch(setAlert({
                type: 'error',
                message: 'Your account does not have permission to checkout orders. Please contact your primary EPC administrator.'
            }));
            return;
        }

        const stateId = selectedState?.id || selectedState?._id;
        if (stateId) {
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const res = await axios.get(`${apiBase}/india/v1/shop/gst/status?state_id=${stateId}`, { withCredentials: true });
                if (res.data?.success && !res.data.verified) {
                    setGstStateId(stateId);
                    setPendingTargetGroupKey(targetGroupKey);
                    setShowGstDialog(true);
                    return;
                }
            } catch (err) {
                console.error("GST checkout check failed:", err);
            }
        }
        if (targetGroupKey) {
            navigate(`/checkout?milestone_group=${encodeURIComponent(targetGroupKey)}`);
        } else {
            navigate('/checkout');
        }
    };

    const handleGstVerified = () => {
        setShowGstDialog(false);
        if (pendingTargetGroupKey) {
            navigate(`/checkout?milestone_group=${encodeURIComponent(pendingTargetGroupKey)}`);
        } else {
            navigate('/checkout');
        }
    };

    const [checkoutSettings, setCheckoutSettings] = useState({
        enable_checkout_timer: true,
        checkout_timer_duration: 20,
        gst_rate: 13.8
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const res = await axios.get(`${apiBase}/india/v1/shop/checkout-settings`);
                if (res.data?.success && res.data.data) {
                    setCheckoutSettings(res.data.data);
                }
            } catch (err) {
                console.error("Failed to load checkout settings", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchActiveOffers = async () => {
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const distId = selectedDistrict?._id || selectedDistrict?.id || "";
                const res = await axios.get(`${apiBase}/india/v1/shop/active-offers?district_id=${distId}`);
                if (res.data?.success) {
                    setActiveOffers(res.data.data || []);
                }
            } catch (error) {
                console.error("Error loading offers in cart:", error);
            }
        };
        fetchActiveOffers();
    }, [selectedDistrict]);

    const bundleOffer = useMemo(() => {
        return activeOffers.find(o => o.offer_type === 'bundle');
    }, [activeOffers]);
    const [selectedKit, setSelectedKit] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [sortBy, setSortBy] = useState("default");
    const [showSummary, setShowSummary] = useState(true);

    // Sort options for dropdown
    const sortOptions = [
        { value: "default", text: "Default Sorting" },
        { value: "price-low", text: "Price: Low to High" },
        { value: "price-high", text: "Price: High to Low" },
        { value: "capacity", text: "Capacity: High to Low" },
        { value: "discount", text: "Discount: High to Low" },
        { value: "savings", text: "Savings: High to Low" },
        { value: "name-asc", text: "Name: A to Z" },
        { value: "name-desc", text: "Name: Z to A" },
    ];

    const finalKits = useMemo(() => {
        let result = [...cart];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (k) =>
                    k.kitName?.toLowerCase().includes(term) ||
                    k.usageType?.toLowerCase().includes(term) ||
                    k.productTier?.toLowerCase().includes(term) ||
                    k.description?.toLowerCase().includes(term) ||
                    k.capacityKW?.toString().includes(term)
            );
        }

        // Apply sorting
        if (sortBy === "price-low") {
            result.sort((a, b) => a.ourPrice - b.ourPrice);
        } else if (sortBy === "price-high") {
            result.sort((a, b) => b.ourPrice - a.ourPrice);
        } else if (sortBy === "capacity") {
            result.sort((a, b) => b.capacityKW - a.capacityKW);
        } else if (sortBy === "discount") {
            result.sort((a, b) => {
                const discountA = ((a.marketPrice - a.ourPrice) / a.marketPrice) * 100;
                const discountB = ((b.marketPrice - b.ourPrice) / b.marketPrice) * 100;
                return discountB - discountA;
            });
        } else if (sortBy === "savings") {
            result.sort((a, b) => {
                const savingsA = (a.marketPrice - a.ourPrice) * a.qty;
                const savingsB = (b.marketPrice - b.ourPrice) * b.qty;
                return savingsB - savingsA;
            });
        } else if (sortBy === "name-asc") {
            result.sort((a, b) => a.kitName.localeCompare(b.kitName));
        } else if (sortBy === "name-desc") {
            result.sort((a, b) => b.kitName.localeCompare(a.kitName));
        }

        return result;
    }, [cart, searchTerm, sortBy]);

    const getTaxBreakdown = (amount) => {
        const fallbackRate = Number(checkoutSettings.gst_rate ?? 13.8);
        let taxable = 0;
        let gstAmount = 0;

        cart.forEach((kit) => {
            const itemValue = (kit.qty * kit.ourPrice);
            const itemGstRate = Number(kit.gstRate ?? kit.gst_rate ?? kit.pricing?.gstRate ?? kit.pricing?.gst_rate ?? kit.tax_pct ?? fallbackRate);
            const itemTaxable = Math.round(itemValue / (1 + (itemGstRate / 100)));
            const itemGst = Math.max(0, itemValue - itemTaxable);
            taxable += itemTaxable;
            gstAmount += itemGst;
        });

        const effectiveRate = taxable > 0
            ? Number(((gstAmount / taxable) * 100).toFixed(2))
            : fallbackRate;

        return {
            taxable: Math.round(amount > 0 ? (amount / (1 + (effectiveRate / 100))) : taxable),
            gstAmount: Math.max(0, amount - (amount > 0 ? (amount / (1 + (effectiveRate / 100))) : taxable)),
            gstRate: effectiveRate
        };
    };

    // Calculate cart totals with detailed breakdown
    const cartTotals = useMemo(() => {
        const totalDeliveryFreight = cart.reduce(
            (sum, kit) => sum + (Number(kit.delivery_cost) || 0),
            0
        );
        const itemsTotal = cart.reduce((sum, kit) => sum + (kit.qty * kit.ourPrice), 0);
        const total = itemsTotal + totalDeliveryFreight;
        const totalMarketPrice = cart.reduce((sum, kit) => sum + (kit.qty * kit.marketPrice), 0) + totalDeliveryFreight;
        const savings = totalMarketPrice - total;
        const totalItems = cart.reduce((sum, kit) => sum + kit.qty, 0);
        const totalKits = cart.length;

        // Calculate by specific Solar Kit
        const kitBreakdown = cart.reduce((acc, kit) => {
            const key = kit.cartItemId || kit.id || kit.kitName;
            const kitName = kit.kitName || kit.name || kit.title || "Solar Kit";
            const cap = kit.capacityKW || kit.capacity_kw || null;
            const unitPrice = Number(kit.ourPrice || kit.selling_price_inr || 0);
            const mPrice = Number(kit.marketPrice || unitPrice);
            const qty = Number(kit.qty || 1);
            const tier = kit.productTier || 'Basic';
            const img = kit.kitImage || kit.image_url || kit.image || (kit.variants?.[kit.variantIndex]?.image) || null;

            if (!acc[key]) {
                acc[key] = {
                    id: kit.id,
                    name: kitName,
                    capacityKW: cap,
                    tier: tier,
                    tierColor: kit.tierColor || null,
                    systemType: kit.systemType || kit.system_type || "",
                    image: img,
                    unitPrice: unitPrice,
                    count: 0,
                    total: 0,
                    savings: 0,
                };
            }
            acc[key].count += qty;
            acc[key].total += qty * unitPrice;
            acc[key].savings += Math.max(0, qty * (mPrice - unitPrice));
            return acc;
        }, {});

        // Calculate by tier
        const tierBreakdown = cart.reduce((acc, kit) => {
            const tier = kit.productTier?.toLowerCase() || 'basic';
            if (!acc[tier]) {
                acc[tier] = {
                    count: 0,
                    total: 0,
                    items: 0,
                    savings: 0,
                    tierColor: kit.tierColor || null
                };
            }
            acc[tier].count += kit.qty;
            acc[tier].items += 1;
            acc[tier].total += kit.qty * kit.ourPrice;
            acc[tier].savings += kit.qty * (kit.marketPrice - kit.ourPrice);
            return acc;
        }, {});

        // Calculate total delivery savings
        const totalDeliverySavings = cart.reduce(
            (sum, kit) => sum + (kit.includedDeliveryCharge || 0) * kit.qty,
            0
        );

        // Calculate by usage type
        const usageBreakdown = cart.reduce((acc, kit) => {
            const type = kit.usageType?.toLowerCase() || 'other';
            if (!acc[type]) {
                acc[type] = { count: 0, total: 0, savings: 0 };
            }
            acc[type].count += kit.qty;
            acc[type].total += kit.qty * kit.ourPrice;
            acc[type].savings += kit.qty * (kit.marketPrice - kit.ourPrice);
            return acc;
        }, {});

        const totalSavings = savings + totalDeliverySavings;
        // Calculate average discount
        const avgDiscount = totalMarketPrice > 0
            ? ((totalSavings / totalMarketPrice) * 100).toFixed(1)
            : 0;
        const { taxable: subtotalExcludingGst, gstAmount, gstRate } = getTaxBreakdown(itemsTotal);

        return {
            total,
            itemsTotal,
            totalMarketPrice,
            savings,
            totalSavings,
            totalItems,
            totalKits,
            avgDiscount,
            kitBreakdown,
            tierBreakdown,
            usageBreakdown,
            totalDeliverySavings,
            totalDeliveryFreight,
            gstRate,
            subtotalExcludingGst,
            gstAmount
        };
    }, [cart, checkoutSettings.gst_rate]);

    const totalKitsQuantity = useMemo(() => {
        return cart.reduce((sum, kit) => sum + kit.qty, 0);
    }, [cart]);

    useEffect(() => {
        setSelectedKit(selected ? cart.find((k) => k.cartItemId === selected) : null);
    }, [selected, cart]);

    const clearAllFilters = () => {
        setSearchTerm("");
        setSortBy("default");
    };

    // Tier badge colors using theme
    const getTierColor = (tier) => {
        switch (tier?.toLowerCase()) {
            case 'premium':
                return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
            case 'standard':
                return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30';
            default:
                return 'text-text-secondary bg-gray-50 dark:bg-surface border-border';
        }
    };

    // Usage type badge colors
    const getUsageTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'residential':
                return 'bg-success/10 text-success border border-success/30';
            case 'commercial':
                return 'bg-warning/10 text-warning border border-warning/30';
            case 'industrial':
                return 'bg-primary/10 text-primary dark:text-info border border-primary/30';
            default:
                return 'bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/30 dark:border-info/30';
        }
    };

    return (
        <div className="min-h-screen">
            {/* Enhanced Header with Theme Gradient and Stats */}
            <div className="gradient-primary rounded-2xl shadow-xl mb-6">
                <div className="mx-auto px-6 py-6 lg:py-7">
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/20 shadow-xs">
                                    <FaSolarPanel className="text-white text-2xl" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                                    Solar Kit Cart
                                </h1>
                            </div>
                            <p className="text-white/85 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
                                Review and manage your selected pre-configured solar solutions
                            </p>

                            {/* Quick Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6">
                                <div className="bg-white/15 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/25 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-white/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                            <FiPackage className="text-white text-xs" />
                                        </div>
                                        <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Total Kits</span>
                                    </div>
                                    <p className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight pl-0.5">
                                        {cartTotals.totalKits}
                                    </p>
                                </div>

                                <div className="bg-white/15 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/25 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-white/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                            <FiShoppingCart className="text-white text-xs" />
                                        </div>
                                        <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Total Items</span>
                                    </div>
                                    <p className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight pl-0.5">
                                        {cartTotals.totalItems}
                                    </p>
                                </div>

                                <div className="bg-white/15 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/25 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-white/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                            <FiDollarSign className="text-white text-xs" />
                                        </div>
                                        <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Cart Value</span>
                                    </div>
                                    <p className="text-white font-black text-lg sm:text-xl xl:text-2xl tracking-tight leading-tight truncate pl-0.5" title={`₹${cartTotals.total.toLocaleString("en-IN")}`}>
                                        ₹{cartTotals.total.toLocaleString("en-IN")}
                                    </p>
                                </div>

                                {cartTotals.totalSavings > 0 ? (
                                    <div className="bg-emerald-500/30 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-emerald-400/40 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-emerald-500/35">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-400/25 flex items-center justify-center shrink-0">
                                                <FiPercent className="text-emerald-200 text-xs" />
                                            </div>
                                            <span className="text-emerald-100 text-[11px] font-semibold uppercase tracking-wider">You Save</span>
                                        </div>
                                        <p className="text-white font-black text-lg sm:text-xl xl:text-2xl tracking-tight leading-tight truncate pl-0.5" title={`₹${cartTotals.totalSavings.toLocaleString("en-IN")}`}>
                                            ₹{cartTotals.totalSavings.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-white/10 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/15 shadow-xs flex flex-col justify-center min-h-[76px]">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                                                <FiPercent className="text-white/60 text-xs" />
                                            </div>
                                            <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Savings</span>
                                        </div>
                                        <p className="text-white/80 font-bold text-sm sm:text-base tracking-tight leading-tight pl-0.5">
                                            Standard Pricing
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Search + Controls */}
            <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mb-6">
                {/* Results Count and Quick Summary */}
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-text-secondary">
                        Showing <span className="font-semibold text-text-primary dark:text-info">{finalKits.length}</span> of{' '}
                        <span className="font-semibold text-text-primary dark:text-info">{cart.length}</span> kits in your cart
                    </p>

                    {/* Quick Summary Badge */}
                    {cartTotals.totalSavings > 0 && (
                        <div className="bg-success-soft text-success px-4 py-2 rounded-full text-sm font-semibold border border-success/30 flex items-center gap-2">
                            <FiTag size={14} />
                            <span>You save ₹{cartTotals.totalSavings.toLocaleString("en-IN")} ({cartTotals.avgDiscount}%)</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    {/* Search Bar using CustomInput */}
                    <div className="relative flex-1 w-full">
                        <CustomInput
                            type="text"
                            name="search"
                            placeholder="Search by kit name, type, tier, capacity..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                            leftIcon={<FiSearch size={20} />}
                            rightIcon={searchTerm && (
                                <IconButton
                                    onClick={() => setSearchTerm("")}
                                    variant="ghost"
                                    size="sm"
                                    className="bg-surface hover:bg-surface-hover"
                                >
                                    <FiX size={18} className="text-text-primary dark:text-info" />
                                </IconButton>
                            )}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-surface-hover rounded-xl p-1 border border-border">
                        <IconButton
                            onClick={() => setViewMode("grid")}
                            variant={viewMode === "grid" ? "primary" : "ghost"}
                            size="sm"
                            className={`rounded-lg ${viewMode === "grid" ? "bg-surface shadow-sm text-primary dark:text-info" : "text-text-secondary"}`}
                            title="Grid View"
                        >
                            <FiGrid size={20} />
                        </IconButton>
                        <IconButton
                            onClick={() => setViewMode("list")}
                            variant={viewMode === "list" ? "primary" : "ghost"}
                            size="sm"
                            className={`rounded-lg ${viewMode === "list" ? "bg-surface shadow-sm text-primary dark:text-info" : "text-text-secondary"}`}
                            title="List View"
                        >
                            <FiList size={20} />
                        </IconButton>
                    </div>

                    {/* Sort Dropdown using Dropdown component */}
                    <div className="w-full lg:w-64">
                        <Dropdown
                            value={sortBy}
                            onChange={setSortBy}
                            options={sortOptions}
                            placeholder="Sort by..."
                            className="w-full"
                        />
                    </div>

                    {/* Toggle Summary Button */}
                    <Button
                        onClick={() => setShowSummary(!showSummary)}
                        variant="ghost"
                        size="md"
                        leftIcon={<FiPieChart size={18} />}
                        className="text-text-secondary hover:text-text-primary dark:text-info"
                    >
                        {showSummary ? "Hide" : "Show"} Summary
                    </Button>
                </div>

                {/* Active Filters */}
                {(searchTerm || sortBy !== "default") && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
                        <span className="text-sm text-text-muted">Active filters:</span>
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary dark:text-info rounded-full text-sm border border-primary/20">
                                <FiSearch size={14} />"{searchTerm}"
                                <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-primary-hover">
                                    <FiX size={14} />
                                </button>
                            </span>
                        )}
                        {sortBy !== "default" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-hover text-text-primary dark:text-info rounded-full text-sm border border-border">
                                Sort: {sortOptions.find(opt => opt.value === sortBy)?.text}
                                <button onClick={() => setSortBy("default")} className="ml-1 hover:text-text-secondary">
                                    <FiX size={14} />
                                </button>
                            </span>
                        )}
                        <Button
                            onClick={clearAllFilters}
                            variant="ghost"
                            size="sm"
                            className="text-text-secondary hover:text-text-primary dark:text-info"
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </div>

            {/* Summary Section */}
            {showSummary && cart.length > 0 && (
                <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mb-6">
                    <h3 className="text-lg font-bold text-text-primary dark:text-info mb-4 flex items-center gap-2">
                        <FiTrendingUp className="text-primary dark:text-info" size={20} />
                        Order Summary
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Kit Breakdown */}
                        <div className="bg-surface-hover rounded-xl p-4 border border-border">
                            <h4 className="font-semibold text-text-primary dark:text-info mb-3 flex items-center gap-2">
                                <FiPackage className="text-primary dark:text-info" size={16} />
                                By Solar Kit
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(cartTotals.kitBreakdown || {}).map(([key, data]) => {
                                    const hasCustomColor = !!data.tierColor;
                                    return (
                                        <div
                                            key={key}
                                            className={`p-3 rounded-lg border bg-surface ${hasCustomColor ? '' : getTierColor(data.tier?.toLowerCase())}`}
                                            style={hasCustomColor ? {
                                                borderColor: `${data.tierColor}40`,
                                                backgroundColor: `${data.tierColor}06`
                                            } : undefined}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {data.image ? (
                                                        <img
                                                            src={resolveImageUrl(data.image)}
                                                            alt={data.name}
                                                            className="w-10 h-10 object-contain rounded-lg border border-border/60 bg-white dark:bg-slate-800 shrink-0 p-1"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <FiPackage className="text-primary" size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <h5 className="font-bold text-xs sm:text-sm text-text-primary dark:text-info truncate" title={data.name}>
                                                            {data.name}
                                                        </h5>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary mt-0.5">
                                                            {data.capacityKW && (
                                                                <span className="font-bold text-primary dark:text-info bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                                                                    {data.capacityKW} KW
                                                                </span>
                                                            )}
                                                            {data.tier && (
                                                                <span className="capitalize px-1.5 py-0.5 bg-surface rounded text-[10px] border border-border/70 font-semibold">
                                                                    {data.tier} Tier
                                                                </span>
                                                            )}
                                                            {data.unitPrice > 0 && (
                                                                <span className="text-text-muted">₹{data.unitPrice.toLocaleString("en-IN")}/unit</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    className="text-xs font-bold bg-surface px-2.5 py-1 rounded-full shrink-0 border border-border text-text-primary dark:text-info"
                                                    style={hasCustomColor ? { color: data.tierColor, borderColor: `${data.tierColor}30`, borderWidth: '1px' } : undefined}
                                                >
                                                    {data.count} {data.count === 1 ? 'Kit' : 'Kits'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                                                <div>
                                                    <span className="text-text-secondary">Value:</span>
                                                    <span className="font-bold ml-1 text-text-primary dark:text-info">₹{data.total.toLocaleString("en-IN")}</span>
                                                </div>
                                                {data.savings > 0 ? (
                                                    <div>
                                                        <span className="text-text-secondary">Save:</span>
                                                        <span className="font-bold ml-1 text-success">₹{data.savings.toLocaleString("en-IN")}</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="text-text-secondary">Pricing:</span>
                                                        <span className="font-medium ml-1 text-text-muted">Special Price</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Usage Type Breakdown */}
                        {Object.keys(cartTotals.usageBreakdown).length > 0 && (
                            <div className="bg-surface-hover rounded-xl p-4 border border-border">
                                <h4 className="font-semibold text-text-primary dark:text-info mb-3 flex items-center gap-2">
                                    <FiZap className="text-primary dark:text-info" size={16} />
                                    By Category
                                </h4>
                                <div className="space-y-3">
                                    {Object.entries(cartTotals.usageBreakdown).map(([type, data]) => (
                                        <div key={type} className={`p-3 rounded-lg border bg-surface ${getUsageTypeColor(type)}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold capitalize">{type}</span>
                                                <span className="text-sm font-bold bg-surface px-2 py-1 rounded-full">
                                                    {data.count} items
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-text-secondary">Value:</span>
                                                    <span className="font-medium ml-1 text-text-primary dark:text-info">₹{data.total.toLocaleString("en-IN")}</span>
                                                </div>
                                                {data.savings > 0 && (
                                                    <div>
                                                        <span className="text-text-secondary">Save:</span>
                                                        <span className="font-medium ml-1 text-success">₹{data.savings.toLocaleString("en-IN")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Order Value & Financial Breakdown */}
                        <div className="bg-surface-hover rounded-xl p-4 border border-border flex flex-col justify-between">
                            <div>
                                <h4 className="font-semibold text-text-primary dark:text-info mb-3 flex items-center gap-2">
                                    <FiAward className="text-primary dark:text-info" size={16} />
                                    Order Value Breakdown
                                </h4>
                                <div className="space-y-2.5 text-xs sm:text-sm">
                                    {cartTotals.totalMarketPrice > cartTotals.total && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-text-secondary">Market Value (Incl. GST):</span>
                                            <span className="font-medium line-through text-text-muted">₹{cartTotals.totalMarketPrice.toLocaleString("en-IN")}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">Items Subtotal (Excl. GST):</span>
                                        <span className="font-semibold text-text-primary dark:text-info">₹{cartTotals.subtotalExcludingGst.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary">GST ({cartTotals.gstRate}%):</span>
                                        <span className="font-semibold text-text-primary dark:text-info">₹{cartTotals.gstAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                    {cartTotals.totalDeliveryFreight > 0 && (
                                        <div className="flex justify-between items-center border-t border-border/50 pt-1.5">
                                            <span className="text-text-secondary flex items-center gap-1.5">
                                                <FiTruck className="text-primary dark:text-info" size={14} />
                                                <span>Delivery Charge {cart.find(k => k.delivery_pincode)?.delivery_pincode ? `(PIN ${cart.find(k => k.delivery_pincode).delivery_pincode})` : ''}:</span>
                                            </span>
                                            <span className="font-semibold text-primary dark:text-info">₹{cartTotals.totalDeliveryFreight.toLocaleString("en-IN")}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-border pt-2 text-sm font-bold">
                                        <span className="text-text-primary dark:text-info">Total Payable (Incl. GST):</span>
                                        <span className="font-black text-primary dark:text-info text-base sm:text-lg">₹{cartTotals.total.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </div>

                            {cartTotals.totalSavings > 0 ? (
                                <div className="mt-3 pt-2.5 border-t border-success/30 bg-emerald-500/10 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                    <span className="font-bold text-success flex items-center gap-1">
                                        <FiPercent size={14} /> Direct Savings:
                                    </span>
                                    <span className="font-black text-success text-sm">₹{cartTotals.totalSavings.toLocaleString("en-IN")}</span>
                                </div>
                            ) : (
                                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-text-muted flex items-center gap-1.5">
                                    <FiShield className="text-primary" size={13} />
                                    <span>All kits include standard warranty & verified Tier-1 equipment</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Multiple Milestone Policy Notice */}
            {hasMultipleMilestones && (
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-primary/10 border border-amber-500/30 flex items-start gap-4 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
                        <FiLayers size={22} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm sm:text-base text-gray-900 dark:text-gray-100">
                                Different Payment Milestone Policies in Cart
                            </h4>
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                                {milestoneGroups.length} Separate Checkout Cards
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                            Your selected ComboKits have distinct payment schedules (e.g. 20% Advance vs 50% Advance). To ensure exact payment collection, separate accounts verification, and milestone-linked warehouse dispatch, each policy is organized into its own **Checkout Card** below.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="">
                {hasMultipleMilestones ? (
                    /* ── Multiple Milestone Policies: Separate Checkout Cards ── */
                    <div className="space-y-8">
                        {milestoneGroups.map((grp, gIndex) => {
                            const grpKits = finalKits.filter(k => (k.milestone_group_key || `adv_${k.payment_milestones?.advance_percentage || 30}_rem_${k.payment_milestones?.remaining_percentage || 70}`) === grp.groupKey);
                            if (grpKits.length === 0) return null;

                            return (
                                <div key={grp.groupKey} className="bg-surface rounded-2xl border-2 border-primary/25 dark:border-info/25 shadow-lg overflow-hidden transition-all hover:border-primary/40">
                                    {/* Card Master Header */}
                                    <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-5">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary text-white shadow-xs">
                                                    Checkout Card {gIndex + 1} of {milestoneGroups.length}
                                                </span>
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/60">
                                                    {grp.is_trial_order ? "100% Upfront Trial Order" : `${grp.advance_percentage}% Advance + ${grp.remaining_percentage}% Before Dispatch`}
                                                </span>
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                                                {grp.policy_name}
                                            </h3>
                                            <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                                                {grp.is_trial_order
                                                    ? "Trial kit orders are paid 100% upfront at order placement."
                                                    : `Pay ${grp.advance_percentage}% Advance now to reserve factory inventory & generate PI. Final ${grp.remaining_percentage}% clears before logistics dispatch.`
                                                }
                                            </p>
                                        </div>

                                        {/* Visual Progress Bar */}
                                        <div className="w-full md:w-72 bg-surface p-3.5 rounded-xl border border-border shadow-xs shrink-0">
                                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                                <span className="text-amber-600 dark:text-amber-400">Advance: {grp.advance_percentage}%</span>
                                                <span className="text-primary dark:text-info">Balance: {grp.remaining_percentage}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                                                <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${grp.advance_percentage}%` }} />
                                                <div className="bg-primary dark:bg-info h-full transition-all duration-300" style={{ width: `${grp.remaining_percentage}%` }} />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                                                <span>At Order Placement</span>
                                                <span>Before Dispatch</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kits in this Card */}
                                    <div className="p-5 sm:p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                            {grpKits.map((kit) => (
                                                <KitCard
                                                    key={kit.cartItemId || kit.id}
                                                    kit={kit}
                                                    selected={selectedKit?.cartItemId === kit.cartItemId}
                                                    setSelected={() => setSelected(kit.cartItemId || kit.id)}
                                                    viewMode="grid"
                                                    isCart={true}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Bottom Financial Summary & Direct Checkout Button */}
                                    <div className="p-5 sm:p-6 bg-surface-hover/80 border-t border-border flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                                            <div>
                                                <span className="text-xs text-text-muted font-medium">Card Value (Incl. GST)</span>
                                                <p className="text-xl sm:text-2xl font-black text-text-primary">
                                                    ₹{grp.grandTotal.toLocaleString("en-IN")}
                                                </p>
                                                <span className="text-[11px] text-text-secondary">{grp.totalItems} {grp.totalItems === 1 ? 'kit' : 'kits'} in this card</span>
                                            </div>
                                            <div className="h-10 w-px bg-border hidden sm:block" />
                                            <div>
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                    Advance Due Today ({grp.advance_percentage}%)
                                                </span>
                                                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                                                    ₹{grp.advanceAmount.toLocaleString("en-IN")}
                                                </p>
                                                <span className="text-[11px] text-text-muted">Payable at Checkout</span>
                                            </div>
                                            <div className="h-10 w-px bg-border hidden sm:block" />
                                            <div>
                                                <span className="text-xs text-text-secondary font-medium">
                                                    Remaining on Dispatch ({grp.remaining_percentage}%)
                                                </span>
                                                <p className="text-lg sm:text-xl font-bold text-text-primary">
                                                    ₹{grp.remainingAmount.toLocaleString("en-IN")}
                                                </p>
                                                <span className="text-[11px] text-text-muted">Before Warehouse Dispatch</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleProceedToCheckout(grp.groupKey)}
                                            variant="primary"
                                            size="lg"
                                            disabled={!canCheckout}
                                            rightIcon={<FiChevronRight size={20} />}
                                            className="shadow-lg px-8 py-3.5 shrink-0 text-sm font-bold"
                                        >
                                            {canCheckout ? `Proceed to Checkout Card ${gIndex + 1}` : "Checkout Restricted"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Normal View (Single Milestone Policy) ── */
                    <>
                        {/* Desktop Results */}
                        <main className="flex-1 hidden lg:block">
                            {finalKits.length === 0 ? (
                                <div className="bg-surface rounded-xl p-16 text-center border border-border shadow-sm">
                                    <div className="w-24 h-24 gradient-primary-soft rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FiSearch size={40} className="text-primary dark:text-info" />
                                    </div>
                                    <h3 className="text-2xl font-semibold text-text-primary dark:text-info mb-3">No kits found</h3>
                                    <p className="text-text-secondary mb-8 max-w-md mx-auto text-lg">
                                        {searchTerm || sortBy !== "default"
                                            ? "No kits match your current filters. Try adjusting your search criteria."
                                            : "Your cart is empty. Browse our collection to add some solar kits!"
                                        }
                                    </p>
                                    {(searchTerm || sortBy !== "default") && (
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="primary"
                                            size="lg"
                                            className="px-8"
                                        >
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            ) : viewMode === "grid" ? (
                                <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                    {finalKits.map((kit) => (
                                        <KitCard
                                            key={kit.cartItemId || kit.id}
                                            kit={kit}
                                            selected={selectedKit?.cartItemId === kit.cartItemId}
                                            setSelected={() => setSelected(kit.cartItemId || kit.id)}
                                            viewMode={viewMode}
                                            isCart={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {finalKits.map((kit) => (
                                        <KitCard
                                            key={kit.cartItemId || kit.id}
                                            kit={kit}
                                            selected={selectedKit?.cartItemId === kit.cartItemId}
                                            setSelected={() => setSelected(kit.cartItemId || kit.id)}
                                            viewMode={viewMode}
                                            isCart={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </main>

                        {/* Mobile Results */}
                        <div className="lg:hidden w-full">
                            {finalKits.length === 0 ? (
                                <div className="bg-surface rounded-xl p-8 text-center border border-border">
                                    <div className="w-16 h-16 gradient-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiSearch size={24} className="text-primary dark:text-info" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-text-primary dark:text-info mb-2">No kits found</h3>
                                    <p className="text-text-secondary text-sm mb-6">
                                        {searchTerm || sortBy !== "default"
                                            ? "No kits match your current filters."
                                            : "Your cart is empty."
                                        }
                                    </p>
                                    {(searchTerm || sortBy !== "default") && (
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="primary"
                                            size="md"
                                            fullWidth
                                        >
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            ) : viewMode === "grid" ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {finalKits.map((kit) => (
                                        <KitCard
                                            key={kit.cartItemId || kit.id}
                                            kit={kit}
                                            selected={selectedKit?.cartItemId === kit.cartItemId}
                                            setSelected={() => setSelected(kit.cartItemId || kit.id)}
                                            viewMode={viewMode}
                                            compact={true}
                                            isCart={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {finalKits.map((kit) => (
                                        <KitCard
                                            key={kit.cartItemId || kit.id}
                                            kit={kit}
                                            selected={selectedKit?.cartItemId === kit.cartItemId}
                                            setSelected={() => setSelected(kit.cartItemId || kit.id)}
                                            viewMode={viewMode}
                                            compact={true}
                                            isCart={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Enhanced Sticky Footer with Detailed Summary */}
            {cart.length > 0 && (
                <div className="sticky -bottom-4 mt-8 z-30 bg-surface shadow-lg border-t border-border rounded-t-2xl">
                    <div className="mx-auto px-4 py-5">
                        {/* Bundle Progress & Panels Limit Block */}
                        {bundleOffer && (
                            <div className="mb-4 border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Progress Bar */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                                        <span className="text-text-primary dark:text-info">Bundle Progress: {totalKitsQuantity}/{bundleOffer.max_qty || 5} Kits Added</span>
                                        <span className={totalKitsQuantity >= (bundleOffer.max_qty || 5) ? "text-success" : "text-primary dark:text-info"}>
                                            {totalKitsQuantity >= (bundleOffer.max_qty || 5)
                                                ? `Bulk Discount Active (₹${bundleOffer.discount_value || 500}/KW)`
                                                : `Add ${(bundleOffer.max_qty || 5) - totalKitsQuantity} more to unlock bulk discount`}
                                        </span>
                                    </div>
                                    <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${totalKitsQuantity >= (bundleOffer.max_qty || 5) ? "bg-success" : "bg-primary"}`}
                                            style={{ width: `${Math.min(100, (totalKitsQuantity / (bundleOffer.max_qty || 5)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Footer Content */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Left Section - Totals */}
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                {/* Total Amount */}
                                <div className="flex items-center gap-4">
                                    <div className="gradient-primary p-3 rounded-xl shadow-md">
                                        <FiDollarSign className="text-text-inverse" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-text-muted text-sm">Total Amount (Incl. GST)</p>
                                        <div className="flex items-baseline gap-3">
                                            {cartTotals.totalSavings > 0 && (
                                                <del className="text-text-secondary text-lg font-medium">
                                                    ₹{cartTotals.totalMarketPrice.toLocaleString("en-IN")}
                                                </del>
                                            )}
                                            <span className="text-3xl font-bold gradient-text-primary dark:text-info">
                                                ₹{cartTotals.total.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Savings */}
                                {cartTotals.totalSavings > 0 && (
                                    <div className="flex items-center gap-4">
                                        <div className="gradient-success p-3 rounded-xl shadow-md">
                                            <FiTag className="text-text-inverse" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-text-muted text-sm">Total Savings</p>
                                            <p className="text-2xl font-bold text-success">
                                                ₹{cartTotals.totalSavings.toLocaleString("en-IN")}
                                            </p>
                                            <p className="text-xs text-success/70">
                                                Includes ₹{cartTotals.totalDeliverySavings.toLocaleString("en-IN")} delivery savings
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Section - Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Cart Stats */}
                                <div className="text-center sm:text-right bg-surface-hover p-3 rounded-xl">
                                    <p className="text-text-muted text-sm">Cart Summary</p>
                                    <div className="flex items-center gap-3 justify-center sm:justify-end">
                                        <span className="text-text-primary dark:text-info font-semibold">
                                            {cartTotals.totalKits} kits
                                        </span>
                                        <span className="text-border">•</span>
                                        <span className="text-text-primary dark:text-info font-semibold">
                                            {cartTotals.totalItems} items
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center sm:items-end gap-1">
                                    <Button
                                        onClick={() => handleProceedToCheckout(hasMultipleMilestones ? milestoneGroups[0]?.groupKey : null)}
                                        variant="primary"
                                        size="lg"
                                        disabled={!canCheckout}
                                        leftIcon={canCheckout ? <FiShoppingCart size={20} /> : <FiLock size={20} />}
                                        className={`shadow-lg px-8 py-4 ${canCheckout
                                                ? "btn-primary"
                                                : "opacity-60 cursor-not-allowed bg-slate-700 text-slate-300 border-slate-600"
                                            }`}
                                    >
                                        {canCheckout
                                            ? (hasMultipleMilestones ? `Checkout Card 1 (${milestoneGroups[0]?.advance_percentage}% Adv)` : "Proceed to Checkout")
                                            : "Checkout Restricted"}
                                    </Button>
                                    {!canCheckout && (
                                        <span className="text-[11px] text-amber-500 font-bold">
                                            Admin authorization required to place orders
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Savings Badges */}
                        {cartTotals.totalSavings > 0 && (
                            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-3">
                                <div className="bg-success-soft text-success text-sm font-semibold px-4 py-2 rounded-full border border-success/30 flex items-center gap-2">
                                    <FiPercent className="text-success" size={16} />
                                    You save {cartTotals.avgDiscount}% on your entire order
                                </div>
                                <div className="bg-primary/10 text-primary dark:text-info text-sm font-semibold px-4 py-2 rounded-full border border-primary/30 flex items-center gap-2">
                                    <FiTruck className="text-primary dark:text-info" size={16} />
                                    Free delivery on {cart.filter(k => k.includedDeliveryCharge > 0).length} kits
                                </div>
                                <div className="bg-amber-50 text-amber-500 text-sm font-semibold px-4 py-2 rounded-full border border-amber-200 flex items-center gap-2">
                                    <FiShield className="text-amber-500" size={16} />
                                    {cartTotals.totalKits} kits with warranty
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Kit Dialog */}
            {selectedKit && (
                <Dialog
                    isOpen={!!selectedKit}
                    title={selectedKit?.kitName}
                    onClose={() => setSelected(null)}
                    size="xl"
                >
                    <SelectedKitCard kit={selectedKit} initialVariantIndex={selectedKit.variantIndex} isCart={true} activeOffers={activeOffers} />
                </Dialog>
            )}

            <GstVerificationDialog
                isOpen={showGstDialog}
                onClose={() => setShowGstDialog(false)}
                stateId={gstStateId}
                onVerified={handleGstVerified}
            />
        </div>
    );
}