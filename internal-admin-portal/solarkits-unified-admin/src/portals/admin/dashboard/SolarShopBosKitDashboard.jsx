import { lazy, Suspense, useEffect, useState } from "react";
import { FaHome, FaLayerGroup, FaFileInvoiceDollar, FaCoins, FaToggleOn } from "react-icons/fa";
import { HiCube } from "react-icons/hi";
import { useSelector, useDispatch } from "react-redux";
import { setAlert } from "../features/alert.slice";
import { selectAllowedUniqueIds } from "../features/modules.slice";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Drawer from "../components/Drawer";
import { PermissionGuard } from "../components/PermissionGuard";
import Loader from "../components/Loader";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { FiSliders, FiUsers, FiFileText, FiShield, FiLayers, FiPieChart, FiActivity } from "react-icons/fi";

// Lazy Loaded Pages
const BosKitHome = lazy(() => import("../pages/solar-shop-bos-kits/BosKitHome"));
const BosKitManager = lazy(() => import("../pages/solar-shop/combokit-configurations/bos-kits/BosKitManager"));
const CustomizeKits = lazy(() => import("../pages/solar-shop/combokit-configurations/customize-kits/CustomizeKits"));
const BulkComboKits = lazy(() => import("../pages/solar-shop/combokit-configurations/bulk-combo-kits/BulkComboKits"));
const WarehouseBulkConfig = lazy(() => import("../pages/solar-shop/combokit-configurations/bulk-combo-kits/WarehouseBulkConfig"));
const ComboKitVariants = lazy(() => import("../pages/solar-shop/combokit-configurations/combo-kit-variants/ComboKitVariants"));

// Distribution & B2B Distributor Governance
const DistributorApplicationsPage = lazy(() => import("../../boskit/pages/DistributorApplicationsPage"));
const DistributorDetailPage = lazy(() => import("../../boskit/pages/DistributorDetailPage"));
const DistributorsListPage = lazy(() => import("../../boskit/pages/DistributorsListPage"));
const DistributorPlansAdminPage = lazy(() => import("../../boskit/pages/DistributorPlansAdminPage"));
const DealersAdminPage = lazy(() => import("../../boskit/pages/DealersAdminPage"));

// Operations & Fulfillment
const PoOrders = lazy(() => import("../pages/solar-shop/po-orders/PoOrders"));
const WarehousePoConfig = lazy(() => import("../pages/solar-shop/po-orders/WarehousePoConfig"));
const LooseOrders = lazy(() => import("../pages/solar-shop/loose-orders/LooseOrders"));
const WarehouseLooseOrders = lazy(() => import("../pages/solar-shop/loose-orders/WarehouseLooseOrders"));
const CompanyMargin = lazy(() => import("../pages/solar-shop/company-margin/CompanyMargin"));
const WarehouseMarginConfig = lazy(() => import("../pages/solar-shop/company-margin/WarehouseMarginConfig"));
const WarehouseKitActivations = lazy(() => import("../pages/solar-shop/warehouse-kit-activations/WarehouseKitActivations"));
const WarehouseKitConfig = lazy(() => import("../pages/solar-shop/warehouse-kit-activations/WarehouseKitConfig"));

// Order & Cart Settings
const OrderManagementSettings = lazy(() => import("../pages/solar-shop/order-management-settings/OrderManagementSettings"));
const OffersManagement = lazy(() => import("../pages/solar-shop/order-management-settings/OffersManagement"));
const CheckoutCartSettings = lazy(() => import("../pages/solar-shop/order-management-settings/CheckoutCartSettings"));

// Reports & Audits
const CrossPlatformReportsPage = lazy(() => import("../../boskit/pages/CrossPlatformReportsPage"));
const AuditLogsPage = lazy(() => import("../../boskit/pages/AuditLogsPage"));

const menus = [
    [{ name: "Dashboard", icon: <FaHome />, path: "/admin-panel/solar-shop-bos-kits/home", unique_id: "00000000" }],
    [
        {
            name: "BOS Kit Configurations",
            icon: <FaLayerGroup />,
            path: "/admin-panel/solar-shop-bos-kits/boskit-configurations",
            unique_id: "ADM_COMBO_CFG",
            subMenu: [
                {
                    name: "BOS Kits Manager",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/boskit-configurations/bos-kits",
                    unique_id: "ADM_COMBO_KITS"
                },
                {
                    name: "Customize Components",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/boskit-configurations/customize-kits",
                    unique_id: "ADM_CUSTOMIZE_KITS"
                },
                {
                    name: "Bulk BOS Kits",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/boskit-configurations/bulk-kits",
                    unique_id: "ADM_BULK_COMBO"
                },
                {
                    name: "BOS Kit Variants",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/boskit-configurations/variants",
                    unique_id: "ADM_COMBO_KIT_VARIANTS"
                }
            ]
        },
        {
            name: "Distribution Network",
            icon: <FiUsers />,
            path: "/admin-panel/solar-shop-bos-kits/distribution",
            unique_id: "RSL_MGMT",
            subMenu: [
                {
                    name: "Distributor Applications",
                    icon: <FiFileText />,
                    path: "/admin-panel/solar-shop-bos-kits/distribution/applications",
                    unique_id: "RSL_MGMT"
                },
                {
                    name: "Authorized Distributors",
                    icon: <FiShield />,
                    path: "/admin-panel/solar-shop-bos-kits/distribution/distributors",
                    unique_id: "RSL_MGMT"
                },
                {
                    name: "Distributor Plans",
                    icon: <FiLayers />,
                    path: "/admin-panel/solar-shop-bos-kits/distribution/plans",
                    unique_id: "RSL_PLAN"
                },
                {
                    name: "Dealer Network",
                    icon: <FiUsers />,
                    path: "/admin-panel/solar-shop-bos-kits/distribution/dealers",
                    unique_id: "RSL_TERRITORY"
                }
            ]
        },
        { name: "PO Orders", icon: <FaFileInvoiceDollar />, path: "/admin-panel/solar-shop-bos-kits/po-orders", unique_id: "ADM_PO_ORDERS" },
        { name: "Loose Orders", icon: <FaBoxes />, path: "/admin-panel/solar-shop-bos-kits/loose-orders", unique_id: "ADM_PO_ORDERS" },
        { name: "Company Margin", icon: <FaCoins />, path: "/admin-panel/solar-shop-bos-kits/company-margin", unique_id: "ADM_CO_MARGIN" },
        { name: "Warehouse Kit Activations", icon: <FaToggleOn />, path: "/admin-panel/solar-shop-bos-kits/warehouse-kit-activations", unique_id: "ADM_WH_KIT_ACT" },
        {
            name: "Order Management Settings",
            icon: <FiSliders />,
            path: "/admin-panel/solar-shop-bos-kits/order-management-settings",
            unique_id: "ADM_ORDER_SETTINGS",
            subMenu: [
                {
                    name: "Order Settings",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/order-management-settings",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Offers Management",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/order-management-settings/offers",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Checkout Cart Settings",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop-bos-kits/order-management-settings/checkout-cart",
                    unique_id: "ADM_ORDER_SETTINGS"
                }
            ]
        },
        {
            name: "Reports & Audits",
            icon: <FiPieChart />,
            path: "/admin-panel/solar-shop-bos-kits/reports",
            unique_id: "00000000",
            subMenu: [
                {
                    name: "Executive Reports",
                    icon: <FiPieChart />,
                    path: "/admin-panel/solar-shop-bos-kits/reports",
                    unique_id: "00000000"
                },
                {
                    name: "Audit Trail",
                    icon: <FiActivity />,
                    path: "/admin-panel/solar-shop-bos-kits/audit-logs",
                    unique_id: "00000000"
                }
            ]
        }
    ]
];

const isModuleAllowed = (menu, allowedUniqueIds) => {
    if (!menu.unique_id || menu.unique_id === "00000000") return true;
    return (
        allowedUniqueIds.includes(menu.unique_id) || 
        menu.unique_id.startsWith("ADM_") ||
        menu.unique_id.startsWith("RSL_") ||
        menu.unique_id.startsWith("FPO_") ||
        menu.unique_id.startsWith("BDE_")
    );
};

// Filter menu tree recursively
const filterMenusByPermission = (menus, allowedUniqueIds) => {
    return menus
        .map((group) =>
            group
                .map((menu) => {
                    if (menu.subMenu) {
                        const filteredSubMenu =
                            filterMenusByPermission([menu.subMenu], allowedUniqueIds)[0];

                        if (filteredSubMenu?.length > 0 || isModuleAllowed(menu, allowedUniqueIds)) {
                            return { ...menu, subMenu: filteredSubMenu };
                        }
                        return null;
                    }

                    return isModuleAllowed(menu, allowedUniqueIds) ? menu : null;
                })
                .filter(Boolean)
        )
        .filter((group) => group.length > 0);
};

export default function SolarShopBosKitDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [isOpen, setIsOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname));
    const token = useSelector((state) => state.auth.token);

    // Instant non-blocking route normalization
    useEffect(() => {
        const path = location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 2 && (parts[1] === 'solar-shop-bos-kits' || parts[1] === 'solar-shop-boskits')) {
            const storedCountry = localStorage.getItem('selected_country_admin') || 'india';
            navigate(`/admin-panel/${parts[1]}/${storedCountry}/home`, { replace: true });
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (!token) return;

        const checkProductMarket = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/saas-products/company-products?unique_id=ADM_SAAS_PRODS&req_for=view`,
                    { headers: authHeaderObj() }
                );
                if (res.data?.status === "success") {
                    const allProducts = res.data.data.products || [];
                    const foundProduct = allProducts.find(p => p.slug === "solar-shop-bos-kits" || p.slug === "solar-shop-boskits");
                    const activeOnes = (foundProduct?.countries || []).filter(c => c.is_active);

                    if (foundProduct && activeOnes.length === 0) {
                        dispatch(setAlert({ type: "warning", message: "BOS Kits is not active in any country" }));
                        navigate('/admin-panel/home', { replace: true });
                        return;
                    }

                    const parts = window.location.pathname.split('/');
                    const slugIndex = parts.findIndex(p => p === "solar-shop-bos-kits" || p === "solar-shop-boskits");
                    if (slugIndex !== -1 && activeOnes.length > 0) {
                        const nextSegment = parts[slugIndex + 1];
                        const activeCountriesNames = activeOnes.map(c => c.name.toLowerCase());
                        const hasCountry = nextSegment && activeCountriesNames.includes(nextSegment.toLowerCase());

                        if (hasCountry) {
                            localStorage.setItem('selected_country_admin', nextSegment.toLowerCase());
                        } else {
                            const storedCountry = localStorage.getItem('selected_country_admin');
                            const defaultCountry = (storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase()))
                                ? storedCountry.toLowerCase()
                                : activeOnes[0].name.toLowerCase();

                            const subPathParts = parts.slice(slugIndex + 1);
                            let subPath = subPathParts.filter(Boolean).join('/');
                            if (!subPath || subPath === 'home') {
                                subPath = 'home';
                            }
                            navigate(`/admin-panel/${parts[slugIndex]}/${defaultCountry}/${subPath}`, { replace: true });
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking product markets in SolarShopBosKitDashboard:", error);
            }
        };
        checkProductMarket();
    }, [token, dispatch, navigate]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            setIsOpen(!mobile);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const filteredMenus = filterMenusByPermission(menus, allowedUniqueIds);

    /* ===================== RENDER ===================== */

    return (
        <div className="flex h-screen bg-bg w-screen theme-transition">
            <Drawer
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isMobile={isMobile}
                menuItems={filteredMenus}
            />

            <div className="flex flex-col flex-1 min-w-0 max-w-full">
                <Header
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    isMobile={isMobile}
                    title="Dashboard"
                />

                <main className="flex-1 relative overflow-hidden mesh-grid bg-bg transition-colors duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                    <div className="relative h-full overflow-y-auto scrollbar-hover p-4 md:p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                className="min-h-full"
                            >
                                <Routes location={location}>
                                    <Route
                                        path="/home"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading BOS Kits dashboard..." />}>
                                                    <BosKitHome />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading BOS Kits dashboard..." />}>
                                                    <BosKitHome />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/home"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading BOS Kits dashboard..." />}>
                                                    <BosKitHome />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* BOS Kit Configurations */}
                                    <Route
                                        path="/boskit-configurations/bos-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading BOS Kits Manager..." />}>
                                                <BosKitManager />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/boskit-configurations/bos-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading BOS Kits Manager..." />}>
                                                <BosKitManager />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/boskit-configurations/customize-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Custom BOS Components..." />}>
                                                <CustomizeKits moduleUniqueId="ADM_CUSTOMIZE_KITS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/boskit-configurations/customize-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Custom BOS Components..." />}>
                                                <CustomizeKits moduleUniqueId="ADM_CUSTOMIZE_KITS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/boskit-configurations/bulk-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Bulk BOS Kits..." />}>
                                                <BulkComboKits moduleUniqueId="ADM_BULK_COMBO" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/boskit-configurations/bulk-kits"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Bulk BOS Kits..." />}>
                                                <BulkComboKits moduleUniqueId="ADM_BULK_COMBO" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/boskit-configurations/bulk-kits/:warehouseId"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Bulk Configuration..." />}>
                                                <WarehouseBulkConfig moduleUniqueId="ADM_BULK_COMBO" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/boskit-configurations/variants"
                                        element={
                                            <Suspense fallback={<Loader text="Loading BOS Kit Variants..." />}>
                                                <ComboKitVariants moduleUniqueId="ADM_COMBO_KIT_VARIANTS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/boskit-configurations/variants"
                                        element={
                                            <Suspense fallback={<Loader text="Loading BOS Kit Variants..." />}>
                                                <ComboKitVariants moduleUniqueId="ADM_COMBO_KIT_VARIANTS" />
                                            </Suspense>
                                        }
                                    />

                                    {/* Distribution Network */}
                                    <Route
                                        path="/distribution/applications"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Applications..." />}>
                                                <DistributorApplicationsPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/distribution/applications"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Applications..." />}>
                                                <DistributorApplicationsPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/distribution/applications/:id"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Application Details..." />}>
                                                <DistributorDetailPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/distribution/applications/:id"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Application Details..." />}>
                                                <DistributorDetailPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/distribution/distributors"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Distributors..." />}>
                                                <DistributorsListPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/distribution/distributors"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Distributors..." />}>
                                                <DistributorsListPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/distribution/plans"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Distributor Plans..." />}>
                                                <DistributorPlansAdminPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/distribution/plans"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Distributor Plans..." />}>
                                                <DistributorPlansAdminPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/distribution/dealers"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Dealers..." />}>
                                                <DealersAdminPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/distribution/dealers"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Dealers..." />}>
                                                <DealersAdminPage />
                                            </Suspense>
                                        }
                                    />

                                    {/* PO Orders */}
                                    <Route
                                        path="/po-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading PO Orders..." />}>
                                                <PoOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/po-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading PO Orders..." />}>
                                                <PoOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/po-orders/:warehouseId"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse PO Config..." />}>
                                                <WarehousePoConfig moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />

                                    {/* Loose Orders */}
                                    <Route
                                        path="/loose-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Loose Orders..." />}>
                                                <LooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/loose-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Loose Orders..." />}>
                                                <LooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/loose-orders/:warehouseId"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Loose Order Configuration..." />}>
                                                <WarehouseLooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />

                                    {/* Company Margin */}
                                    <Route
                                        path="/company-margin"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Company Margin..." />}>
                                                <CompanyMargin moduleUniqueId="ADM_CO_MARGIN" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Company Margin..." />}>
                                                <CompanyMargin moduleUniqueId="ADM_CO_MARGIN" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin/:warehouseId"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Margin Config..." />}>
                                                <WarehouseMarginConfig moduleUniqueId="ADM_CO_MARGIN" />
                                            </Suspense>
                                        }
                                    />

                                    {/* Warehouse Kit Activations */}
                                    <Route
                                        path="/warehouse-kit-activations"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Kit Activations..." />}>
                                                <WarehouseKitActivations moduleUniqueId="ADM_WH_KIT_ACT" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/warehouse-kit-activations"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Kit Activations..." />}>
                                                <WarehouseKitActivations moduleUniqueId="ADM_WH_KIT_ACT" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/warehouse-kit-activations/:warehouseId"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warehouse Kit Config..." />}>
                                                <WarehouseKitConfig moduleUniqueId="ADM_WH_KIT_ACT" />
                                            </Suspense>
                                        }
                                    />

                                    {/* Order Settings */}
                                    <Route
                                        path="/order-management-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Order Settings..." />}>
                                                <OrderManagementSettings moduleUniqueId="ADM_ORDER_SETTINGS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Order Settings..." />}>
                                                <OrderManagementSettings moduleUniqueId="ADM_ORDER_SETTINGS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/offers"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Offers..." />}>
                                                <OffersManagement />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/offers"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Offers..." />}>
                                                <OffersManagement />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/checkout-cart"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Checkout Settings..." />}>
                                                <CheckoutCartSettings />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/checkout-cart"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Checkout Settings..." />}>
                                                <CheckoutCartSettings />
                                            </Suspense>
                                        }
                                    />

                                    {/* Reports & Audits */}
                                    <Route
                                        path="/reports"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Reports..." />}>
                                                <CrossPlatformReportsPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reports"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Reports..." />}>
                                                <CrossPlatformReportsPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/audit-logs"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Audit Logs..." />}>
                                                <AuditLogsPage />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/audit-logs"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Audit Logs..." />}>
                                                <AuditLogsPage />
                                            </Suspense>
                                        }
                                    />
                                </Routes>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
