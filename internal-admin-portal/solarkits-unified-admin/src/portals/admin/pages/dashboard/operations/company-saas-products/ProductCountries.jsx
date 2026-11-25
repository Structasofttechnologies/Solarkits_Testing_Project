import { useState, useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";
import ReactCountryFlag from "react-country-flag";
import Loader from "@/components/Loader";
import ToggleButton from "@/components/ToggleButton";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import CustomInput from "@/components/CustomInput";
import {
    FaGlobe,
    FaSearch,
    FaArrowLeft,
    FaLayerGroup,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductCountries({ moduleUniqueId }) {
    const { productSlug } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [togglingId, setTogglingId] = useState(null);
    const [filter, setFilter] = useState("all"); // "all" | "active" | "inactive"

    // Confirmation popup state
    const [confirmPopup, setConfirmPopup] = useState({
        isOpen: false,
        countryId: null,
        countryName: "",
        otpMode: false,
        isLoading: false,
        otp: "",
        message: "",
        confirmText: "",
        actionType: "deactivate", // "activate" | "deactivate"
        variant: "danger",
        title: ""
    });

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `${API_URL}/saas-products/company-products?unique_id=${moduleUniqueId}&req_for=view`,
                { headers: authHeaderObj() }
            );
            if (res.data?.status === "success") {
                const allProducts = res.data.data.products || [];
                const found = allProducts.find((p) => String(p.slug) === String(productSlug));
                if (found) {
                    setProduct(found);
                } else {
                    dispatch(setAlert({ type: "error", message: "Product not found." }));
                    navigate("/admin-panel/operations/company-saas-products");
                }
            } else {
                dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to load product." }));
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Error loading product." }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (moduleUniqueId && productSlug) fetchProduct();
    }, [moduleUniqueId, productSlug]);

    const handleToggleCountry = async (countryId, currentState, otp = "") => {
        setTogglingId(countryId);
        try {
            const res = await axios.post(
                `${API_URL}/saas-products/toggle-country?unique_id=${moduleUniqueId}&req_for=edit`,
                {
                    saas_product_id: product.id,
                    country_id: countryId,
                    is_active: !currentState,
                    otp: otp || undefined
                },
                { headers: authHeaderObj() }
            );

            if (res.data?.status === "success") {
                setProduct((prev) => ({
                    ...prev,
                    countries: prev.countries.map((c) =>
                        c.id === countryId ? { ...c, is_active: !currentState } : c
                    ),
                }));
                dispatch(setAlert({ type: "success", message: res.data.message }));
                handleCancelConfirm();
            } else {
                dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to update country mapping." }));
            }
        } catch (error) {
            console.error("Error toggling country:", error);
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Error updating country mapping." }));
        } finally {
            setTogglingId(null);
            setConfirmPopup((prev) => ({ ...prev, isLoading: false }));
        }
    };

    const handleToggleClick = (countryId, countryName, currentState) => {
        if (currentState === true) {
            // Deactivating -> Show confirmation dialog (danger variant) and request OTP
            setConfirmPopup({
                isOpen: true,
                countryId,
                countryName,
                otpMode: false,
                isLoading: false,
                otp: "",
                message: `Are you sure you want to deactivate SaaS product mapping for ${countryName}?`,
                confirmText: "Send OTP",
                actionType: "deactivate",
                variant: "danger",
                title: "Deactivate Country SaaS Product"
            });
        } else {
            // Activating -> Show confirmation popup (success variant) without OTP
            setConfirmPopup({
                isOpen: true,
                countryId,
                countryName,
                otpMode: false,
                isLoading: false,
                otp: "",
                message: `Are you sure you want to activate SaaS product mapping for ${countryName}?`,
                confirmText: "Yes, Activate",
                actionType: "activate",
                variant: "success",
                title: "Activate Country SaaS Product"
            });
        }
    };

    const handleConfirmAction = async (otp = "") => {
        const { countryId, countryName, otpMode, actionType } = confirmPopup;
        setConfirmPopup((prev) => ({ ...prev, isLoading: true }));

        try {
            if (actionType === "activate") {
                // Direct activation (no OTP required)
                await handleToggleCountry(countryId, false);
            } else {
                // Deactivation workflow
                if (!otpMode) {
                    // Step 1: Send OTP for deactivation
                    const res = await axios.post(
                        `${API_URL}/saas-products/send-deactivate-otp?unique_id=${moduleUniqueId}&req_for=edit`,
                        {
                            saas_product_id: product.id,
                            country_id: countryId
                        },
                        { headers: authHeaderObj() }
                    );

                    if (res.data?.status === "success") {
                        dispatch(setAlert({ type: "success", message: "OTP sent to your registered email." }));
                        setConfirmPopup((prev) => ({
                            ...prev,
                            otpMode: true,
                            isLoading: false,
                            message: `Please enter the verification OTP sent to your registered email to deactivate ${countryName}.`,
                            confirmText: "Confirm Deactivation"
                        }));
                    } else {
                        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to send OTP." }));
                        setConfirmPopup((prev) => ({ ...prev, isLoading: false }));
                    }
                } else {
                    // Step 2: Confirm deactivation with OTP
                    await handleToggleCountry(countryId, true, otp);
                }
            }
        } catch (error) {
            console.error("Confirmation action error:", error);
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Action failed." }));
            setConfirmPopup((prev) => ({ ...prev, isLoading: false }));
        }
    };

    const handleCancelConfirm = () => {
        setConfirmPopup({
            isOpen: false,
            countryId: null,
            countryName: "",
            otpMode: false,
            isLoading: false,
            otp: "",
            message: "",
            confirmText: "",
            actionType: "deactivate",
            variant: "danger",
            title: ""
        });
    };

    if (loading) return <Loader text="Loading country activation settings..." />;
    if (!product) return null;

    const countries = product.countries || [];
    const activeCount = countries.filter((c) => c.is_active).length;
    const inactiveCount = countries.length - activeCount;

    const filteredCountries = countries.filter((c) => {
        const matchesSearch =
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.iso2?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filter === "all" ||
            (filter === "active" && c.is_active) ||
            (filter === "inactive" && !c.is_active);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">

            {/* ── Page Header ──────────────────────────────────────── */}
            <PageHeader
                title={product.name}
                subtitle="Country-wise activation — toggle countries to enable or disable this product."
                icon={FaLayerGroup}
                stats={[
                    { label: "Total Countries", value: countries.length, description: "All regions" },
                    { label: "Active", value: activeCount, description: "Enabled regions" },
                    { label: "Inactive", value: inactiveCount, description: "Disabled regions" }
                ]}
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => navigate("/admin-panel/operations/company-saas-products")}
                        leftIcon={<FaArrowLeft size={12} />}
                    >
                        Back to Products
                    </Button>
                }
            />

            {/* ── Search + Filter Bar ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <CustomInput
                    placeholder="Search countries by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<FaSearch className="text-text-secondary w-4 h-4" />}
                    className="flex-1"
                />
                {/* Filter pills */}
                <div className="flex gap-2">
                    {["all", "active", "inactive"].map((f) => (
                        <Button
                            key={f}
                            onClick={() => setFilter(f)}
                            variant={filter === f ? "primary" : "secondary"}
                            size="md"
                            className="capitalize rounded-xl font-semibold text-xs h-[46px] px-5"
                        >
                            {f}
                        </Button>
                    ))}
                </div>
            </div>

            {/* ── Countries Grid ───────────────────────────────────── */}
            {filteredCountries.length === 0 ? (
                <div className="p-16 text-center bg-surface border border-dashed border-border rounded-3xl">
                    <FaGlobe size={40} className="mx-auto text-text-disabled mb-4 opacity-30" />
                    <p className="text-text-secondary font-bold">No countries match your search or filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredCountries.map((country) => {
                        const isToggling = togglingId === country.id;
                        return (
                            <div
                                key={country.id}
                                className={`flex flex-col p-4 bg-surface border rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md ${
                                    country.is_active
                                        ? "border-success/30 hover:border-success/60 bg-success/[0.01]"
                                        : "border-border hover:border-primary/20"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-surface-hover border border-border shadow-inner shrink-0">
                                            <ReactCountryFlag
                                                countryCode={country.iso2}
                                                svg
                                                style={{ width: "1.4em", height: "1.4em" }}
                                                title={country.name}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-text-primary leading-tight truncate">
                                                {country.name}
                                            </div>
                                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                                                country.is_active ? "text-success" : "text-text-muted"
                                            }`}>
                                                {country.is_active ? "Active" : "Inactive"}
                                            </div>
                                        </div>
                                    </div>
                                    <ToggleButton
                                        checked={country.is_active}
                                        onChange={() => handleToggleClick(country.id, country.name, country.is_active)}
                                        disabled={isToggling}
                                    />
                                </div>
                                {country.is_active && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full text-xs font-semibold py-1.5 h-auto rounded-xl border border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/5 mt-3 transition-all duration-200"
                                        onClick={() => navigate(`/admin-panel/${productSlug}/${country.name.toLowerCase()}`)}
                                    >
                                        Configure Dashboard
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Confirmation + OTP Deactivation Popup ───────────── */}
            <ConfirmationPopup
                isOpen={confirmPopup.isOpen}
                title={confirmPopup.title}
                message={confirmPopup.message}
                mode={confirmPopup.otpMode ? "otp" : "text"}
                variant={confirmPopup.variant}
                isLoading={confirmPopup.isLoading}
                onConfirm={handleConfirmAction}
                onCancel={handleCancelConfirm}
                confirmText={confirmPopup.confirmText}
                cancelText={confirmPopup.otpMode ? "Cancel" : "No, Keep"}
                otpMessage="Enter the verification code sent to your email"
            />
        </div>
    );
}
