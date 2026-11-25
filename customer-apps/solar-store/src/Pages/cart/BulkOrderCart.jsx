import { useEffect, useMemo, useState } from "react";
import {
    FiGrid, FiList, FiSearch, FiX, FiShoppingCart,
    FiDollarSign, FiTag, FiPackage, FiPercent, FiTruck,
    FiShield, FiClock, FiAward, FiStar, FiHome, FiBox,
    FiTrendingUp, FiPieChart, FiCheckSquare
} from 'react-icons/fi';
import { FaGem, FaBoxOpen, FaPallet, FaWarehouse } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import BulkKitCard from "@/Pages/bulk-buy/components/BulkKitCard";
import Dialog from "@/Components/Dialog";
import SelectedBulkKitCard from "@/Pages/bulk-buy/components/SelectedBulkKitCard";
import Button from "@/Components/Button";
import IconButton from "@/Components/IconButton";
import Dropdown from "@/Components/Dropdown";
import CustomInput from "@/Components/CustomInput";
import { useNavigate } from "react-router-dom";
import { clearBulkCart } from "@/features/slice";
import GstVerificationDialog from "@/Components/GstVerificationDialog";

export default function BulkOrderCart() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const cart = useSelector((state) => state.slice.bulkCart);
    const [selected, setSelected] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [sortBy, setSortBy] = useState("default");
    const [showSummary, setShowSummary] = useState(true);

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [submittedOrder, setSubmittedOrder] = useState(null);

    // GST State Verification
    const selectedState = useSelector((state) => state.slice.selectedState);
    const [showGstDialog, setShowGstDialog] = useState(false);
    const [gstStateId, setGstStateId] = useState("");

    // Checkout Settings
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

    const handleSubmitRequestOrder = async () => {
        const stateId = selectedState?.id || selectedState?._id;
        if (stateId) {
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const res = await axios.get(`${apiBase}/india/v1/shop/gst/status?state_id=${stateId}`, { withCredentials: true });
                if (res.data?.success && !res.data.verified) {
                    setGstStateId(stateId);
                    setShowGstDialog(true);
                    return;
                }
            } catch (err) {
                console.error("GST request order re-check failed:", err);
            }
        }

        try {
            setSubmitting(true);
            setError("");
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            const response = await axios.post(
                `${apiBase}/india/v1/shop/request-order`,
                {
                    items: cart.map(item => ({
                        id: item.id,
                        variantIndex: item.variantIndex,
                        qty: item.qty,
                        productTier: item.productTier,
                        ourPrice: item.ourPrice,
                        bulkPack: item.bulkPack
                    })),
                    total_amount: cartTotals.total
                },
                { withCredentials: true }
            );

            if (response.data?.success) {
                setSubmittedOrder(response.data.data);
                dispatch(clearBulkCart());
            } else {
                setError(response.data?.message || "Failed to submit request order.");
            }
        } catch (err) {
            console.error("Submit request order error:", err);
            setError(err.response?.data?.message || "Failed to submit request order.");
        } finally {
            setSubmitting(false);
        }
    };

    // Sort options for dropdown
    const sortOptions = [
        { value:"default", text:"Default Sorting" },
        { value:"price-low", text:"Price: Low to High" },
        { value:"price-high", text:"Price: High to Low" },
        { value:"capacity", text:"Capacity: High to Low" },
        { value:"discount", text:"Pack Discount: High to Low" },
        { value:"savings", text:"Savings: High to Low" },
        { value:"name-asc", text:"Name: A to Z" },
        { value:"name-desc", text:"Name: Z to A" },
        { value:"kits-per-pack", text:"Kits per Pack: High to Low" },
    ];

    const finalItems = useMemo(() => {
        let result = [...cart];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (item) =>
                    item.kitName?.toLowerCase().includes(term) ||
                    item.usageType?.toLowerCase().includes(term) ||
                    item.productTier?.toLowerCase().includes(term) ||
                    item.description?.toLowerCase().includes(term) ||
                    item.capacityKW?.toString().includes(term)
            );
        }

        // Apply sorting
        if (sortBy ==="price-low") {
            result.sort((a, b) => a.bulkPack?.pricePerKitAfterDiscount - b.bulkPack?.pricePerKitAfterDiscount);
        } else if (sortBy ==="price-high") {
            result.sort((a, b) => b.bulkPack?.pricePerKitAfterDiscount - a.bulkPack?.pricePerKitAfterDiscount);
        } else if (sortBy ==="capacity") {
            result.sort((a, b) => b.capacityKW - a.capacityKW);
        } else if (sortBy ==="discount") {
            result.sort((a, b) => b.bulkPack?.packDiscountPercent - a.bulkPack?.packDiscountPercent);
        } else if (sortBy ==="savings") {
            result.sort((a, b) => b.bulkPack?.totalSavingsPerPack - a.bulkPack?.totalSavingsPerPack);
        } else if (sortBy ==="name-asc") {
            result.sort((a, b) => a.kitName.localeCompare(b.kitName));
        } else if (sortBy ==="name-desc") {
            result.sort((a, b) => b.kitName.localeCompare(a.kitName));
        } else if (sortBy ==="kits-per-pack") {
            result.sort((a, b) => b.bulkPack?.kitsPerPack - a.bulkPack?.kitsPerPack);
        }

        return result;
    }, [cart, searchTerm, sortBy]);

    // Calculate cart totals with detailed breakdown
    const cartTotals = useMemo(() => {
        const total = cart.reduce((sum, item) => {
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            const pricePerKit = bulkPack.pricePerKitAfterDiscount || item.ourPrice;
            return sum + (item.qty * pricePerKit * kitsPerPack);
        }, 0);
        
        const totalMarketPrice = cart.reduce((sum, item) => {
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            return sum + (item.qty * item.marketPrice * kitsPerPack);
        }, 0);
        
        const totalOurPrice = cart.reduce((sum, item) => {
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            return sum + (item.qty * item.ourPrice * kitsPerPack);
        }, 0);
        
        const totalPacks = cart.reduce((sum, item) => sum + item.qty, 0);
        const totalKits = cart.reduce((sum, item) => {
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            return sum + (item.qty * kitsPerPack);
        }, 0);
        const totalProducts = cart.length;

        // Individual level savings (comparing to our regular price)
        const individualSavings = totalOurPrice - total;
        
        // Bulk level savings (comparing to market price)
        const bulkSavings = totalMarketPrice - total;
        
        // Calculate total delivery savings
        const totalDeliverySavings = cart.reduce(
            (sum, item) => sum + (item.includedDeliveryCharge || 0) * item.qty,
            0
        );

        const totalSavings = bulkSavings + totalDeliverySavings;

        // Calculate average discount
        const avgDiscount = totalMarketPrice > 0
            ? ((totalSavings / totalMarketPrice) * 100).toFixed(1)
            : 0;

        // Calculate by tier
        const tierBreakdown = cart.reduce((acc, item) => {
            const tier = item.productTier?.toLowerCase() || 'basic';
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            const pricePerKit = bulkPack.pricePerKitAfterDiscount || item.ourPrice;
            
            if (!acc[tier]) {
                acc[tier] = {
                    packs: 0,
                    kits: 0,
                    total: 0,
                    marketValue: 0,
                    ourValue: 0,
                    bulkSavings: 0,
                    individualSavings: 0,
                    products: 0,
                    tierColor: item.tierColor || null
                };
            }
            acc[tier].packs += item.qty;
            acc[tier].products += 1;
            acc[tier].kits += item.qty * kitsPerPack;
            acc[tier].total += item.qty * pricePerKit * kitsPerPack;
            acc[tier].marketValue += item.qty * item.marketPrice * kitsPerPack;
            acc[tier].ourValue += item.qty * item.ourPrice * kitsPerPack;
            acc[tier].individualSavings += (item.ourPrice - pricePerKit) * item.qty * kitsPerPack;
            acc[tier].bulkSavings += (item.marketPrice - pricePerKit) * item.qty * kitsPerPack;
            return acc;
        }, {});

        // Calculate by pack size
        const packSizeBreakdown = cart.reduce((acc, item) => {
            const bulkPack = item.bulkPack || {};
            const size = bulkPack.kitsPerPack || 1;
            const pricePerKit = bulkPack.pricePerKitAfterDiscount || item.ourPrice;
            
            if (!acc[size]) {
                acc[size] = { 
                    packs: 0, 
                    kits: 0, 
                    total: 0,
                    marketValue: 0,
                    ourValue: 0,
                    savings: 0 
                };
            }
            acc[size].packs += item.qty;
            acc[size].kits += item.qty * size;
            acc[size].total += item.qty * pricePerKit * size;
            acc[size].marketValue += item.qty * item.marketPrice * size;
            acc[size].ourValue += item.qty * item.ourPrice * size;
            acc[size].savings += (item.marketPrice - pricePerKit) * item.qty * size;
            return acc;
        }, {});

        // Count products with free delivery
        const productsWithFreeDelivery = cart.filter(item => item.includedDeliveryCharge > 0).length;
        const packsWithFreeDelivery = cart.filter(item => item.includedDeliveryCharge > 0)
            .reduce((sum, item) => sum + item.qty, 0);

        const fallbackRate = Number(checkoutSettings.gst_rate ?? 13.8);
        let taxable = 0;
        let gstAmount = 0;

        cart.forEach((item) => {
            const bulkPack = item.bulkPack || {};
            const kitsPerPack = bulkPack.kitsPerPack || 1;
            const pricePerKit = bulkPack.pricePerKitAfterDiscount || item.ourPrice;
            const itemValue = item.qty * pricePerKit * kitsPerPack;
            const itemGstRate = Number(item.gstRate ?? item.gst_rate ?? item.pricing?.gstRate ?? item.pricing?.gst_rate ?? item.tax_pct ?? fallbackRate);
            const itemTaxable = Math.round(itemValue / (1 + (itemGstRate / 100)));
            const itemGst = Math.max(0, itemValue - itemTaxable);
            taxable += itemTaxable;
            gstAmount += itemGst;
        });

        const gstRate = taxable > 0 ? Number(((gstAmount / taxable) * 100).toFixed(2)) : fallbackRate;
        const subtotalExcludingGst = Math.round(total > 0 ? (total / (1 + (gstRate / 100))) : taxable);
        const effectiveGstAmount = Math.max(0, total - subtotalExcludingGst);

        return {
            total,
            totalMarketPrice,
            totalOurPrice,
            individualSavings,
            bulkSavings,
            totalSavings,
            totalPacks,
            totalKits,
            totalProducts,
            avgDiscount,
            tierBreakdown,
            packSizeBreakdown,
            totalDeliverySavings,
            productsWithFreeDelivery,
            packsWithFreeDelivery,
            gstRate,
            subtotalExcludingGst,
            gstAmount: effectiveGstAmount
        };
    }, [cart, checkoutSettings.gst_rate]);

    useEffect(() => {
        setSelectedItem(selected ? cart.find((item) => item.id === selected) : null);
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

    if (submittedOrder) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <div className="bg-surface border border-border shadow-2xl rounded-2xl p-8 max-w-xl w-full text-center">
                    <div className="w-20 h-20 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiCheckSquare size={44} className="text-success" />
                    </div>
                    <h1 className="text-3xl font-black gradient-text-primary dark:text-info mb-4">
                        Request Submitted!
                    </h1>
                    <p className="text-text-secondary text-base mb-6 max-w-md mx-auto">
                        Your bulk order request has been logged successfully. Our team will review your request and get in touch with you shortly.
                    </p>

                    <div className="bg-surface-hover rounded-xl p-5 border border-border text-left mb-8 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Request ID:</span>
                            <span className="font-mono font-bold text-text-primary">{submittedOrder.id || submittedOrder._id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Total Products:</span>
                            <span className="font-bold text-text-primary">{submittedOrder.items?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Estimated Total:</span>
                            <span className="font-black text-primary dark:text-info">₹{submittedOrder.total_amount?.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => navigate('/bulk-buy')}
                            variant="primary"
                            size="lg"
                            className="flex-1 bg-gradient-to-r from-primary to-primary-end font-bold py-3"
                        >
                            Return to Bulk Buy
                        </Button>
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="ghost"
                            size="lg"
                            className="flex-1 border border-border"
                        >
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Enhanced Header with Theme Gradient and Stats */}
            <div className="gradient-primary rounded-xl shadow-lg mb-6">
                <div className="mx-auto px-4 py-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                    <FaBoxOpen className="text-text-inverse text-2xl" />
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-bold text-text-inverse">
                                    Request Order
                                </h1>
                            </div>
                            <p className="text-text-inverse/90 text-lg max-w-2xl">
                                Manage your request orders with special pack pricing
                            </p>

                            {/* Quick Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6">
                                <div className="bg-white/15 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/25 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-white/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                            <FaPallet className="text-white text-xs" />
                                        </div>
                                        <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Total Packs</span>
                                    </div>
                                    <p className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight pl-0.5">
                                        {cartTotals.totalPacks}
                                    </p>
                                </div>

                                <div className="bg-white/15 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/25 shadow-xs flex flex-col justify-center min-h-[76px] transition-all hover:bg-white/20">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                            <FaBoxOpen className="text-white text-xs" />
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
                                            <FiPackage className="text-white text-xs" />
                                        </div>
                                        <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Products</span>
                                    </div>
                                    <p className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight pl-0.5">
                                        {cartTotals.totalProducts}
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
                        Showing <span className="font-semibold text-text-primary dark:text-info">{finalItems.length}</span> of{' '}
                        <span className="font-semibold text-text-primary dark:text-info">{cart.length}</span> bulk products in your cart
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
                            variant={viewMode ==="grid" ?"primary" :"ghost"}
                            size="sm"
                            className={`rounded-lg ${viewMode ==="grid" ?"bg-surface shadow-sm text-primary dark:text-info" :"text-text-secondary"}`}
                            title="Grid View"
                        >
                            <FiGrid size={20} />
                        </IconButton>
                        <IconButton
                            onClick={() => setViewMode("list")}
                            variant={viewMode ==="list" ?"primary" :"ghost"}
                            size="sm"
                            className={`rounded-lg ${viewMode ==="list" ?"bg-surface shadow-sm text-primary dark:text-info" :"text-text-secondary"}`}
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
                        {showSummary ?"Hide" :"Show"} Summary
                    </Button>
                </div>

                {/* Active Filters */}
                {(searchTerm || sortBy !=="default") && (
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
                        {sortBy !=="default" && (
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
                        Bulk Order Summary
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tier Breakdown */}
                        <div className="bg-surface-hover rounded-xl p-4 border border-border">
                            <h4 className="font-semibold text-text-primary dark:text-info mb-3 flex items-center gap-2">
                                <FiPackage className="text-primary dark:text-info" size={16} />
                                By Combo Kit Type
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(cartTotals.tierBreakdown).map(([tier, data]) => {
                                    const hasCustomColor = !!data.tierColor;
                                    return (
                                        <div
                                            key={tier}
                                            className={`p-3 rounded-lg border ${hasCustomColor ? '' : getTierColor(tier)}`}
                                            style={hasCustomColor ? {
                                                borderColor: `${data.tierColor}40`,
                                                backgroundColor: `${data.tierColor}06`
                                            } : undefined}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {tier === 'premium' && <FaGem className="text-amber-500" style={hasCustomColor ? { color: data.tierColor } : undefined} size={14} />}
                                                    {tier === 'standard' && <FiStar className="text-blue-600" style={hasCustomColor ? { color: data.tierColor } : undefined} size={14} />}
                                                    {tier === 'basic' && <FiHome className="text-text-secondary" style={hasCustomColor ? { color: data.tierColor } : undefined} size={14} />}
                                                    <span
                                                        className="font-semibold capitalize"
                                                        style={hasCustomColor ? { color: data.tierColor } : undefined}
                                                    >{tier} Combo Kit</span>
                                                </div>
                                                <span
                                                    className="text-sm font-bold bg-surface px-2 py-1 rounded-full"
                                                    style={hasCustomColor ? { color: data.tierColor, borderColor: `${data.tierColor}30`, borderWidth: '1px' } : undefined}
                                                >
                                                    {data.packs} {data.packs === 1 ? 'pack' : 'packs'}
                                                </span>
                                            </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-text-secondary">Solar Kits:</span>
                                                <span className="font-medium ml-1">{data.kits}</span>
                                            </div>
                                            <div>
                                                <span className="text-text-secondary">Value:</span>
                                                <span className="font-medium ml-1">₹{data.total.toLocaleString("en-IN")}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs space-y-1">
                                            <div className="flex justify-between text-success">
                                                <span>Individual Savings:</span>
                                                <span className="font-semibold">₹{data.individualSavings.toLocaleString("en-IN")}</span>
                                            </div>
                                            <div className="flex justify-between text-primary dark:text-info">
                                                <span>Bulk Extra Savings:</span>
                                                <span className="font-semibold">₹{(data.bulkSavings - data.individualSavings).toLocaleString("en-IN")}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-success border-t border-success/20 pt-1 mt-1">
                                                <span>Total Savings:</span>
                                                <span>₹{data.bulkSavings.toLocaleString("en-IN")}</span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pack Size Breakdown */}
                        {Object.keys(cartTotals.packSizeBreakdown).length > 0 && (
                            <div className="bg-surface-hover rounded-xl p-4 border border-border">
                                <h4 className="font-semibold text-text-primary dark:text-info mb-3 flex items-center gap-2">
                                    <FaWarehouse className="text-primary dark:text-info" size={16} />
                                    By Pack Size
                                </h4>
                                <div className="space-y-3">
                                    {Object.entries(cartTotals.packSizeBreakdown).map(([size, data]) => (
                                        <div key={size} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold">{size} solar-kits/pack</span>
                                                <span className="text-sm font-bold bg-surface px-2 py-1 rounded-full">
                                                    {data.packs} {data.packs === 1 ? 'pack' : 'packs'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-text-secondary">Total Kits:</span>
                                                    <span className="font-medium ml-1">{data.kits}</span>
                                                </div>
                                                <div>
                                                    <span className="text-text-secondary">Value:</span>
                                                    <span className="font-medium ml-1">₹{data.total.toLocaleString("en-IN")}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs">
                                                <div className="flex justify-between text-success">
                                                    <span>Savings per Pack:</span>
                                                    <span className="font-semibold">₹{(data.savings / data.packs).toFixed(0).toLocaleString("en-IN")}</span>
                                                </div>
                                                <div className="flex justify-between text-success mt-1">
                                                    <span>Total Savings:</span>
                                                    <span className="font-semibold">₹{data.savings.toLocaleString("en-IN")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Savings Summary */}
                        {cartTotals.totalSavings > 0 && (
                            <div className="bg-gradient-success-soft rounded-xl p-4 border border-success/30">
                                <h4 className="font-semibold text-success mb-3 flex items-center gap-2">
                                    <FiAward className="text-success" size={16} />
                                    Your Savings Breakdown
                                </h4>

                                <div className="space-y-4">
                                    {/* Price Comparison */}
                                    <div>
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <span className="text-text-secondary">Market Price (Incl. GST):</span>
                                            <span className="font-medium line-through">₹{cartTotals.totalMarketPrice.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <span className="text-text-secondary">Our Regular Price (Incl. GST):</span>
                                            <span className="font-medium line-through text-text-secondary">₹{cartTotals.totalOurPrice.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-2 border-t border-border pt-2 pb-1">
                                            <span className="text-text-secondary text-xs">Bulk Subtotal (Excl. GST):</span>
                                            <span className="font-semibold text-text-primary text-xs">₹{cartTotals.subtotalExcludingGst.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-2 border-b border-border pb-2">
                                            <span className="text-text-secondary text-xs">GST ({cartTotals.gstRate}%):</span>
                                            <span className="font-semibold text-text-primary text-xs">₹{cartTotals.gstAmount.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <span className="text-text-secondary font-bold">Bulk Price (Incl. GST):</span>
                                            <span className="font-black text-primary dark:text-info text-base">₹{cartTotals.total.toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>

                                    {/* Savings Breakdown */}
                                    <div className="border-t border-success/20 pt-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-text-secondary">Individual Savings:</span>
                                            <span className="font-semibold text-success">₹{cartTotals.individualSavings.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-text-secondary">Bulk Extra Savings:</span>
                                            <span className="font-semibold text-primary dark:text-info">₹{(cartTotals.bulkSavings - cartTotals.individualSavings).toLocaleString("en-IN")}</span>
                                        </div>
                                        {cartTotals.totalDeliverySavings > 0 && (
                                            <div className="bg-white/50 rounded-lg p-2 mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FiTruck className="text-success" size={14} />
                                                        <span className="text-sm text-text-secondary">Free Delivery Savings:</span>
                                                    </div>
                                                    <span className="font-semibold text-success">₹{cartTotals.totalDeliverySavings.toLocaleString("en-IN")}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total Savings */}
                                    <div className="border-t border-success/20 pt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-success">Total Savings:</span>
                                            <span className="font-bold text-success text-xl">₹{cartTotals.totalSavings.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1 text-sm">
                                            <span className="text-success/70">Average Discount:</span>
                                            <span className="font-semibold text-success">{cartTotals.avgDiscount}%</span>
                                        </div>
                                    </div>

                                    {/* Per Unit Averages */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/50 rounded-lg p-2 text-center">
                                            <span className="text-xs text-text-secondary block">Avg. per Pack</span>
                                            <span className="text-sm font-bold text-success">
                                                ₹{(cartTotals.totalSavings / cartTotals.totalPacks).toFixed(0).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                        <div className="bg-white/50 rounded-lg p-2 text-center">
                                            <span className="text-xs text-text-secondary block">Avg. per Kit</span>
                                            <span className="text-sm font-bold text-success">
                                                ₹{(cartTotals.totalSavings / cartTotals.totalKits).toFixed(0).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="">
                {/* Desktop Results */}
                <main className="flex-1 hidden lg:block">
                    {finalItems.length === 0 ? (
                        <div className="bg-surface rounded-xl p-16 text-center border border-border shadow-sm">
                            <div className="w-24 h-24 gradient-primary-soft rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiSearch size={40} className="text-primary dark:text-info" />
                            </div>
                            <h3 className="text-2xl font-semibold text-text-primary dark:text-info mb-3">No products found</h3>
                            <p className="text-text-secondary mb-8 max-w-md mx-auto text-lg">
                                {searchTerm || sortBy !=="default"
                                    ?"No products match your current filters. Try adjusting your search criteria."
                                    :"Your bulk cart is empty. Add some products to get started!"
                                }
                            </p>
                            {(searchTerm || sortBy !=="default") && (
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
                    ) : viewMode ==="grid" ? (
                        <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {finalItems.map((kit) => (
                                <BulkKitCard
                                    key={kit.id}
                                    kit={kit}
                                    selected={selectedItem?.id === kit.id}
                                    setSelected={() => setSelected(kit.id)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {finalItems.map((kit) => (
                                <BulkKitCard
                                    key={kit.id}
                                    kit={kit}
                                    selected={selectedItem?.id === kit.id}
                                    setSelected={() => setSelected(kit.id)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {/* Mobile Results */}
                <div className="lg:hidden w-full">
                    {finalItems.length === 0 ? (
                        <div className="bg-surface rounded-xl p-8 text-center border border-border">
                            <div className="w-16 h-16 gradient-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiSearch size={24} className="text-primary dark:text-info" />
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary dark:text-info mb-2">No products found</h3>
                            <p className="text-text-secondary text-sm mb-6">
                                {searchTerm || sortBy !=="default"
                                    ?"No products match your current filters."
                                    :"Your bulk cart is empty."
                                }
                            </p>
                            {(searchTerm || sortBy !=="default") && (
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
                    ) : viewMode ==="grid" ? (
                        <div className="grid grid-cols-1 gap-4">
                            {finalItems.map((kit) => (
                                <BulkKitCard
                                    key={kit.id}
                                    kit={kit}
                                    selected={selectedItem?.id === kit.id}
                                    setSelected={() => setSelected(kit.id)}
                                    viewMode={viewMode}
                                    compact={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {finalItems.map((kit) => (
                                <BulkKitCard
                                    key={kit.id}
                                    kit={kit}
                                    selected={selectedItem?.id === kit.id}
                                    setSelected={() => setSelected(kit.id)}
                                    viewMode={viewMode}
                                    compact={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Sticky Footer with Detailed Summary */}
            {cart.length > 0 && (
                <div className="sticky -bottom-4 mt-8 z-30 bg-surface shadow-lg border-t border-border rounded-t-2xl">
                    <div className="mx-auto px-4 py-5">
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
                                        <p className="text-text-muted text-sm">Bulk Total (Incl. GST)</p>
                                        <div className="flex items-baseline gap-3">
                                            <del className="text-text-secondary text-lg font-medium">
                                                ₹{cartTotals.totalMarketPrice.toLocaleString("en-IN")}
                                            </del>
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
                                                Includes ₹{(cartTotals.bulkSavings).toLocaleString("en-IN")} bulk + 
                                                ₹{cartTotals.totalDeliverySavings.toLocaleString("en-IN")} delivery
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Section - Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                       <div className="text-center sm:text-right bg-surface-hover p-3 rounded-xl">
                                    <p className="text-text-muted text-sm">Request Summary</p>
                                    <div className="flex items-center gap-3 justify-center sm:justify-end">
                                        <span className="text-text-primary dark:text-info font-semibold">
                                            {cartTotals.totalProducts} {cartTotals.totalProducts === 1 ? 'product' : 'products'}
                                        </span>
                                        <span className="text-border">•</span>
                                        <span className="text-text-primary dark:text-info font-semibold">
                                            {cartTotals.totalPacks} {cartTotals.totalPacks === 1 ? 'pack' : 'packs'}
                                        </span>
                                        <span className="text-border">•</span>
                                        <span className="text-text-primary dark:text-info font-semibold">
                                            {cartTotals.totalKits} {cartTotals.totalKits === 1 ? 'kit' : 'kits'}
                                        </span>
                                    </div>
                                </div>

                                {error && <span className="text-red-500 text-sm font-semibold mr-2">{error}</span>}
                                <Button
                                    onClick={handleSubmitRequestOrder}
                                    variant="primary"
                                    size="lg"
                                    disabled={submitting}
                                    leftIcon={submitting ? null : <FiShoppingCart size={20} />}
                                    className="btn-primary shadow-lg px-8 py-4 bg-gradient-to-r from-primary to-primary-end font-bold rounded-xl"
                                >
                                    {submitting ? "Submitting Request..." : "Submit Order Request"}
                                </Button>
                            </div>
                        </div>

                        {/* Savings Badges */}
                        {cartTotals.totalSavings > 0 && (
                            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-3">
                                <div className="bg-success-soft text-success text-sm font-semibold px-4 py-2 rounded-full border border-success/30 flex items-center gap-2">
                                    <FiPercent className="text-success" size={16} />
                                    You save {cartTotals.avgDiscount}% on your bulk order
                                </div>
                                
                                {cartTotals.totalDeliverySavings > 0 && (
                                    <div className="bg-primary/10 text-primary dark:text-info text-sm font-semibold px-4 py-2 rounded-full border border-primary/30 flex items-center gap-2">
                                        <FiTruck className="text-primary dark:text-info" size={16} />
                                        Free delivery on {cartTotals.packsWithFreeDelivery} {cartTotals.packsWithFreeDelivery === 1 ? 'pack' : 'packs'}
                                    </div>
                                )}
                                
                                <div className="bg-amber-50 text-amber-500 text-sm font-semibold px-4 py-2 rounded-full border border-amber-200 flex items-center gap-2">
                                    <FaWarehouse className="text-amber-500" size={16} />
                                    {cartTotals.totalPacks} bulk {cartTotals.totalPacks === 1 ? 'pack' : 'packs'}
                                </div>

                                <div className="bg-blue-50 text-blue-600 text-sm font-semibold px-4 py-2 rounded-full border border-blue-200 flex items-center gap-2">
                                    <FiPackage className="text-blue-500" size={16} />
                                    {cartTotals.totalKits} total {cartTotals.totalKits === 1 ? 'kit' : 'kits'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Item Dialog */}
            {selectedItem && (
                <Dialog
                    isOpen={!!selectedItem}
                    title={selectedItem?.kitName}
                    onClose={() => setSelected(null)}
                    size="xl"
                >
                    <SelectedBulkKitCard kit={selectedItem} />
                </Dialog>
            )}

            <GstVerificationDialog
                isOpen={showGstDialog}
                onClose={() => setShowGstDialog(false)}
                stateId={gstStateId}
                onVerified={() => setShowGstDialog(false)}
            />
        </div>
    );
}