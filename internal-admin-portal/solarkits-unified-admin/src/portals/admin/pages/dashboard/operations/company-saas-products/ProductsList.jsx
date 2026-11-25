import { useState, useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import CustomInput from "@/components/CustomInput";
import {
    FaGlobe,
    FaSearch,
    FaStar,
    FaArrowRight,
    FaBoxOpen,
    FaLayerGroup,
    FaCubes,
    FaCloud,
    FaRocket,
    FaBolt,
    FaCheckCircle,
    FaUsers,
    FaUserTie,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

// Map product slugs / types to icons & gradient classes based on the theme definitions
const PRODUCT_ICON_MAP = {
    default: { icon: FaBoxOpen, gradientClass: "gradient-primary text-white" },
    solar: { icon: FaBolt, gradientClass: "gradient-primary text-white" },
    cloud: { icon: FaCloud, gradientClass: "gradient-primary text-white" },
    saas: { icon: FaRocket, gradientClass: "gradient-primary text-white" },
    platform: { icon: FaLayerGroup, gradientClass: "gradient-primary text-white" },
    module: { icon: FaCubes, gradientClass: "gradient-primary text-white" },
};

const resolveIconAndGradient = (product) => {
    const key = Object.keys(PRODUCT_ICON_MAP).find(
        (k) => k !== "default" && (
            product.slug?.toLowerCase().includes(k) ||
            product.name?.toLowerCase().includes(k) ||
            product.type?.toLowerCase().includes(k)
        )
    );
    return PRODUCT_ICON_MAP[key || "default"];
};

export default function ProductsList({ moduleUniqueId }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchSaaSProducts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${API_URL}/saas-products/company-products?unique_id=${moduleUniqueId}&req_for=view`,
                { headers: authHeaderObj() }
            );
            if (res.data?.status === "success") {
                setProducts(res.data.data.products || []);
            } else {
                dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to load SaaS Products" }));
            }
        } catch (error) {
            console.error("Error fetching SaaS products:", error);
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Error loading SaaS Products" }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (moduleUniqueId) fetchSaaSProducts();
    }, [moduleUniqueId]);

    const filteredProducts = products.filter((p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <Loader text="Loading Company SaaS Products..." />;

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">

            {/* ── Header ───────────────────────────────────────────── */}
            <PageHeader
                title="Company SaaS Products"
                subtitle="Select a product to manage its country-wise activation settings."
                icon={FaGlobe}
                stats={[
                    { label: "Total Products", value: products.length, description: "Registered SaaS products" }
                ]}
            />

            {/* ── Search ───────────────────────────────────────────── */}
            <CustomInput
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<FaSearch className="text-text-secondary w-4 h-4" />}
                className="max-w-md"
            />

            {/* ── Empty State ──────────────────────────────────────── */}
            {filteredProducts.length === 0 ? (
                <div className="p-16 text-center bg-surface border border-dashed border-border rounded-3xl">
                    <FaGlobe size={40} className="mx-auto text-text-disabled mb-4 opacity-30" />
                    <p className="text-text-secondary font-bold">No SaaS products found matching your criteria.</p>
                </div>
            ) : (
                /* ── Cards Grid ─────────────────────────────────────── */
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                        const { icon: Icon, gradientClass } = resolveIconAndGradient(product);
                        const activeCountries = product.countries?.filter((c) => c.is_active).length ?? 0;
                        const totalCountries = product.countries?.length ?? 0;

                        return (
                            <div
                                key={product.id}
                                className="group relative card hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden flex"
                            >
                                <div className="relative p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        {/* Header with Icon and Title */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className={`
                                                w-14 h-14 rounded-2xl flex items-center justify-center 
                                                ${gradientClass}
                                                transition-transform duration-300 shadow-md group-hover:scale-110
                                            `}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-text-primary text-xl leading-tight">
                                                    {product.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${gradientClass}`}>
                                                        {product.slug || "SaaS"}
                                                    </span>
                                                    {product.is_active ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success px-2 py-0.5 rounded-full border border-success/10">
                                                            <FaStar size={8} />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-danger-soft text-danger px-2 py-0.5 rounded-full border border-danger/10">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-text-secondary text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                                            {product.description || "No description provided for this product."}
                                        </p>
                                    </div>

                                    <div>
                                        {/* Stats Section */}
                                        <div className="mb-4 space-y-2">
                                            {/* Active in countries row with progress bar */}
                                            <div className="p-3 rounded-xl bg-surface-hover border border-border">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                                                        <FaCheckCircle className="text-success" size={11} />
                                                        Active in
                                                    </div>
                                                    <span className="text-sm font-black text-text-primary">
                                                        {activeCountries}
                                                        <span className="text-text-secondary font-medium text-xs"> / {totalCountries} countries</span>
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-success to-success-hover transition-all duration-500"
                                                        style={{ width: totalCountries > 0 ? `${(activeCountries / totalCountries) * 100}%` : "0%" }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Staff Users + Product Users */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <FaUsers className="text-primary" size={12} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-text-primary leading-none">
                                                            {product.stats?.cmsUsers ?? product.cms_users_count ?? "—"}
                                                        </div>
                                                        <div className="text-[10px] text-text-secondary mt-0.5">Staff Users</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <FaUserTie className="text-primary" size={12} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-text-primary leading-none">
                                                            {product.stats?.productUsers ?? product.product_users_count ?? "—"}
                                                        </div>
                                                        <div className="text-[10px] text-text-secondary mt-0.5">Product Users</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA Button */}
                                        <Button
                                            variant="primary"
                                            size="md"
                                            className="w-full group/btn"
                                            onClick={() =>
                                                navigate(
                                                    `/admin-panel/operations/company-saas-products/${product.slug}/countries`
                                                )
                                            }
                                            rightIcon={
                                                <FaArrowRight
                                                    className="relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300"
                                                    size={14}
                                                />
                                            }
                                        >
                                            Manage Countries
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
