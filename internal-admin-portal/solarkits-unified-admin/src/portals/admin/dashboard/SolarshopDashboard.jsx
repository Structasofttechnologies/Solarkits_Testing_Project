import { lazy, Suspense, useEffect, useState } from "react";
import { FaHome, FaUserCheck, FaUsers, FaUserShield, FaLayerGroup, FaFileInvoiceDollar, FaCoins, FaToggleOn, FaWallet, FaBoxes, FaStore, FaPercent, FaTruck, FaAward, FaHandshake, FaFilePdf } from "react-icons/fa";
import { HiCube } from "react-icons/hi";
import { useSelector, useDispatch } from "react-redux";
import { setAlert } from "../features/alert.slice";
import { selectAllowedUniqueIds } from "../features/modules.slice";
import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Drawer from "../components/Drawer";
import { PermissionGuard } from "../components/PermissionGuard";
import Loader from "../components/Loader";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
const ComboKitConfigurations = lazy(() => import("../pages/solar-shop/combokit-configurations/ComboKitConfigurations"));
import { FiSliders, FiUsers, FiTag, FiSettings, FiMapPin, FiPackage, FiFileText, FiDollarSign, FiTarget, FiBarChart2, FiLayers, FiTool, FiShield, FiCheckSquare, FiClock, FiPlusCircle, FiCreditCard } from "react-icons/fi";

// ── Margin & Commission Settings Module ─────────────────────────────────────────
const MarginCommissionHome = lazy(() => import("../pages/solar-shop/company-margin/MarginCommissionHome"));
const OffersDiscountSettings = lazy(() => import("../pages/solar-shop/company-margin/OffersDiscountSettings"));
const CompanyGoalsSettings = lazy(() => import("../pages/solar-shop/company-margin/CompanyGoalsSettings"));
const MarginAnalytics = lazy(() => import("../pages/solar-shop/company-margin/MarginAnalytics"));

// ── Service Ticket Module ────────────────────────────────────────────────────
const ServiceTicketsAdmin = lazy(() => import("../pages/solar-shop/service-tickets/ServiceTicketsAdmin"));

// ── Phase 1: Reseller Management ────────────────────────────────────────────
const ResellerManagement = lazy(() => import("../pages/solar-shop/reseller-management/ResellerManagement"));
const ResellerSettings = lazy(() => import("../pages/solar-shop/reseller-management/ResellerSettings"));
const StoreOnboardingQueue = lazy(() => import("../pages/solar-shop/reseller-management/StoreOnboardingQueue"));
const StoreCreationWizard = lazy(() => import("../pages/solar-shop/reseller-management/StoreCreationWizard"));

// ── Quote Settings & Analytics Module ─────────────────────────────────────
const QuoteSettingsAdmin = lazy(() => import("../pages/solar-shop/quote-settings/QuoteSettings"));
const WarrantyOptionsAdmin = lazy(() => import("../pages/solar-shop/quote-settings/WarrantyOptions"));
const QuoteAnalyticsAdmin = lazy(() => import("../pages/solar-shop/quote-settings/QuoteAnalytics"));

// ── Know My Margin (KMM) Estimator Module ────────────────────────────────────
const ProjectBomSettingsAdmin = lazy(() => import("../pages/solar-shop/project-bom-settings/ProjectBomSettings"));
const EstimatorSettingsAdmin = lazy(() => import("../pages/solar-shop/estimator-settings/EstimatorSettings"));

// ── Region Payment Configuration & Offline Approval Queue ───────────────────
const RegionPaymentConfig = lazy(() => import("../pages/solar-shop/payment-configuration/RegionPaymentConfig"));
const OfflineApprovalQueue = lazy(() => import("../pages/solar-shop/payment-configuration/OfflineApprovalQueue"));
const PaymentMilestoneSettings = lazy(() => import("../pages/solar-shop/payment-configuration/PaymentMilestoneSettings"));

const Home = lazy(() => import("../pages/solar-shop/Home"));
const ApproveNewEPC = lazy(() => import("../pages/solar-shop/approve-new-epc/ApproveNewEPC"));
const WebsiteEpcLeads = lazy(() => import("../pages/dashboard/website-configuration/WebsiteEpcLeads"));
const PoOrders = lazy(() => import("../pages/solar-shop/po-orders/PoOrders"));
const WarehousePoConfig = lazy(() => import("../pages/solar-shop/po-orders/WarehousePoConfig"));
const LooseOrders = lazy(() => import("../pages/solar-shop/loose-orders/LooseOrders"));
const WarehouseLooseOrders = lazy(() => import("../pages/solar-shop/loose-orders/WarehouseLooseOrders"));
const AdminEpcOrders = lazy(() => import("../pages/solar-shop/epc-orders/AdminEpcOrders"));
const OrderManagementSettings = lazy(() => import("../pages/solar-shop/order-management-settings/OrderManagementSettings"));
const OffersManagement = lazy(() => import("../pages/solar-shop/order-management-settings/OffersManagement"));
const CheckoutCartSettings = lazy(() => import("../pages/solar-shop/order-management-settings/CheckoutCartSettings"));

const CompanyMargin = lazy(() => import("../pages/solar-shop/company-margin/CompanyMargin"));
const WarehouseMarginConfig = lazy(() => import("../pages/solar-shop/company-margin/WarehouseMarginConfig"));
const WarehouseKitActivations = lazy(() => import("../pages/solar-shop/warehouse-kit-activations/WarehouseKitActivations"));
const WarehouseKitConfig = lazy(() => import("../pages/solar-shop/warehouse-kit-activations/WarehouseKitConfig"));

// ── Warehouse & Order Delivery Management Module ──────────────────────────────
const DeliveryDashboard = lazy(() => import("../pages/solar-shop/delivery-management/DeliveryDashboard"));
const DeliveryQueue = lazy(() => import("../pages/solar-shop/delivery-management/DeliveryQueue"));
const DeliveryTracking = lazy(() => import("../pages/solar-shop/delivery-management/DeliveryTracking"));
const RouteConsolidationSettings = lazy(() => import("../pages/solar-shop/delivery-management/RouteConsolidationSettings"));
const VehicleMaster = lazy(() => import("../pages/solar-shop/delivery-management/VehicleMaster"));
const TransportVendors = lazy(() => import("../pages/solar-shop/delivery-management/TransportVendors"));
const PhysicalVehicles = lazy(() => import("../pages/solar-shop/delivery-management/PhysicalVehicles"));
const ComboKitWeightMaster = lazy(() => import("../pages/solar-shop/delivery-management/ComboKitWeightMaster"));
const DeliveryCostSettings = lazy(() => import("../pages/solar-shop/delivery-management/DeliveryCostSettings"));
const DeliveryApprovalQueue = lazy(() => import("../pages/solar-shop/delivery-management/DeliveryApprovalQueue"));
const ClusterWarehouseRouting = lazy(() => import("../pages/solar-shop/order-management-settings/ClusterWarehouseRouting"));
const AdminSupplierSettings = lazy(() => import("../pages/solar-shop/order-management-settings/AdminSupplierSettings"));
const KitDisplayChecklist = lazy(() => import("../pages/solar-shop/order-management-settings/KitDisplayChecklist"));
const OrderOverdueSettings = lazy(() => import("../pages/solar-shop/order-management-settings/OrderOverdueSettings"));
const OrderJourneyDashboard = lazy(() => import("../pages/solar-shop/order-management-settings/OrderJourneyDashboard"));
const AdminOrderApprovalDashboard = lazy(() => import("../pages/solar-shop/order-approvals/AdminOrderApprovalDashboard"));



const menus = [
    [{ step: "01", badgeKey: "01", name: "Dashboard", icon: <FaHome />, path: "/admin-panel/solar-shop/home", unique_id: "00000000" }],
    [
        { step: "02", badgeKey: "02", name: "Website EPC Leads", icon: <FaUsers />, path: "/admin-panel/solar-shop/approve-new-epc", unique_id: "ADM_APPROVE_EPC" },
        {
            step: "03",
            badgeKey: "03",
            name: "Solar Kit Configurations",
            icon: <FaLayerGroup />,
            path: "/admin-panel/solar-shop/combokit-configurations",
            unique_id: "ADM_COMBO_CFG",
            subMenu: [
                {
                    name: "Combo Kits",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/combokit-configurations/combo-kits",
                    unique_id: "ADM_COMBO_KITS",
                    badgeKey: "combo-kits"
                },
                {
                    name: "Customize Kits",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/combokit-configurations/customize-kits",
                    unique_id: "ADM_CUSTOMIZE_KITS",
                    badgeKey: "customize-kits"
                },
                {
                    name: "Bulk Combo Kits",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/combokit-configurations/bulk-combo-kits",
                    unique_id: "ADM_BULK_COMBO",
                    badgeKey: "bulk-combo-kits"
                },
                {
                    name: "Combo Kit Variants",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/combokit-configurations/combo-kit-variants",
                    unique_id: "ADM_COMBO_KIT_VARIANTS",
                    badgeKey: "combo-kit-variants"
                },
                {
                    name: "Pincode Delivery Costs",
                    icon: <FaTruck />,
                    path: "/admin-panel/solar-shop/combokit-configurations/pincode-delivery-costs",
                    unique_id: "ADM_PINCODE_COSTS",
                    badgeKey: "pincode-delivery-costs"
                },
                {
                    name: "Best Seller Configuration",
                    icon: <FaAward />,
                    path: "/admin-panel/solar-shop/combokit-configurations/best-seller",
                    unique_id: "ADM_BEST_SELLER",
                    badgeKey: "best-seller"
                },
                {
                    name: "Product Datasheets",
                    icon: <FaFilePdf />,
                    path: "/admin-panel/solar-shop/combokit-configurations/product-datasheets",
                    unique_id: "ADM_PRODUCT_DATASHEETS",
                    badgeKey: "product-datasheets"
                }
            ]
        },
        { step: "04", badgeKey: "04", name: "PO Orders", icon: <FaFileInvoiceDollar />, path: "/admin-panel/solar-shop/po-orders", unique_id: "00000000" },
        { step: "05", badgeKey: "05", name: "Loose Orders", icon: <FaBoxes />, path: "/admin-panel/solar-shop/loose-orders", unique_id: "00000000" },
        { step: "06", badgeKey: "06", name: "EPC Orders & Approvals", icon: <FaUserShield />, path: "/admin-panel/solar-shop/epc-orders", unique_id: "00000000" },
        { step: "07", badgeKey: "07", name: "Order & Stage Approvals", icon: <FiCheckSquare />, path: "/admin-panel/solar-shop/order-approvals", unique_id: "ADM_ORDER_APPROVALS" },
        {
            step: "08",
            badgeKey: "08",
            name: "Delivery Management",
            icon: <FaTruck />,
            path: "/admin-panel/solar-shop/delivery-management/vehicle-master",
            unique_id: "ADM_DELIVERY_MGMT",
            subMenu: [
                {
                    name: "1. Vehicle Master (Catalog)",
                    icon: <FaTruck />,
                    path: "/admin-panel/solar-shop/delivery-management/vehicle-master",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "vehicle-master"
                },
                {
                    name: "2. Transport Vendors",
                    icon: <FiUsers />,
                    path: "/admin-panel/solar-shop/delivery-management/providers",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "providers"
                },
                {
                    name: "3. Live Fleet & Vehicles",
                    icon: <FaTruck />,
                    path: "/admin-panel/solar-shop/delivery-management/fleet",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "fleet"
                },
                {
                    name: "4. ComboKit Weight Master",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/delivery-management/kit-weights",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "kit-weights"
                },
                {
                    name: "5. Delivery Cost Settings",
                    icon: <FiDollarSign />,
                    path: "/admin-panel/solar-shop/delivery-management/cost-settings",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "cost-settings"
                },
                {
                    name: "6. Route & Consolidation",
                    icon: <FiSliders />,
                    path: "/admin-panel/solar-shop/delivery-management/routes",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "routes"
                },
                {
                    name: "7. Dashboard & Analytics",
                    icon: <FiBarChart2 />,
                    path: "/admin-panel/solar-shop/delivery-management/dashboard",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "delivery-dashboard"
                },
                {
                    name: "8. Approval Queue",
                    icon: <FiShield />,
                    path: "/admin-panel/solar-shop/delivery-management/approval-queue",
                    unique_id: "ADM_DELIVERY_MGMT",
                    badgeKey: "approval-queue"
                }
            ]
        },

        {
            step: "09",
            badgeKey: "09",
            name: "Margin & Commission",
            icon: <FaCoins />,
            path: "/admin-panel/solar-shop/company-margin",
            unique_id: "ADM_CO_MARGIN",
            subMenu: [
                {
                    name: "Warehouse Margins",
                    icon: <FaPercent />,
                    path: "/admin-panel/solar-shop/company-margin",
                    unique_id: "ADM_CO_MARGIN",
                    badgeKey: "company-margin"
                },
                {
                    name: "Offers & Discounts",
                    icon: <FiTag />,
                    path: "/admin-panel/solar-shop/company-margin/offers",
                    unique_id: "ADM_CO_MARGIN",
                    badgeKey: "offers"
                },
                {
                    name: "Company Goals",
                    icon: <FiTarget />,
                    path: "/admin-panel/solar-shop/company-margin/goals",
                    unique_id: "ADM_CO_MARGIN"
                },
                {
                    name: "Margin Analytics",
                    icon: <FiBarChart2 />,
                    path: "/admin-panel/solar-shop/company-margin/analytics",
                    unique_id: "ADM_CO_MARGIN"
                },
            ]
        },
        { step: "10", badgeKey: "10", name: "Warehouse Kit Activations", icon: <FaToggleOn />, path: "/admin-panel/solar-shop/warehouse-kit-activations", unique_id: "ADM_WH_KIT_ACT" },
        {
            step: "11",
            badgeKey: "11",
            name: "Order Management Settings",
            icon: <FiSliders />,
            path: "/admin-panel/solar-shop/order-management-settings",
            unique_id: "ADM_ORDER_SETTINGS",
            subMenu: [
                {
                    name: "Order Settings",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/order-management-settings",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Offers Management",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/order-management-settings/offers",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Checkout Cart Settings",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/order-management-settings/checkout-cart",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Cluster Warehouse Routing",
                    icon: <FiMapPin />,
                    path: "/admin-panel/solar-shop/order-management-settings/cluster-routing",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Admin Supplier Settings",
                    icon: <FaHandshake />,
                    path: "/admin-panel/solar-shop/order-management-settings/admin-supplier-settings",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                // {
                //     name: "OEM Partner Products",
                //     icon: <HiCube />,
                //     path: "/admin-panel/solar-shop/order-management-settings/admin-supplier-settings?tab=oem-products",
                //     unique_id: "ADM_ORDER_SETTINGS"
                // },
                {
                    name: "Kit Display Checklist",
                    icon: <FiCheckSquare />,
                    path: "/admin-panel/solar-shop/order-management-settings/kit-checklist",
                    unique_id: "ADM_ORDER_SETTINGS"
                },
                {
                    name: "Overdue Settings",
                    icon: <FiClock />,
                    path: "/admin-panel/solar-shop/order-management-settings/overdue-settings",
                    unique_id: "ADM_ORDER_SETTINGS",
                    badgeKey: "overdue-settings"
                },
                {
                    name: "Order Journey Dashboard",
                    icon: <FiBarChart2 />,
                    path: "/admin-panel/solar-shop/order-management-settings/journey-dashboard",
                    unique_id: "ADM_ORDER_SETTINGS"
                }
            ]
        },
    ],
    [
        // ── Service Tickets Module ───────────────────────────────────────────
        { step: "12", badgeKey: "12", name: "Service Tickets", icon: <FiTool />, path: "/admin-panel/solar-shop/service-tickets", unique_id: "ADM_SKT_MGMT" },

        // ── Store Management Module (Converted from Franchisee Management) ────────
        {
            step: "13",
            badgeKey: "13",
            name: "Franchisee Management",
            icon: <FiUsers />,
            path: "/admin-panel/solar-shop/reseller-management",
            unique_id: "RSL_MGMT",
            subMenu: [
                // ── Section 1: Master Configurations (Foundation Rules) ──
                {
                    name: "Franchisee Subtypes",
                    icon: <FiLayers />,
                    path: "/admin-panel/solar-shop/reseller-management/subtypes",
                    unique_id: "RSL_PLAN"
                },
                {
                    name: "Store Type Settings",
                    icon: <HiCube />,
                    path: "/admin-panel/solar-shop/reseller-management/plans",
                    unique_id: "RSL_PLAN"
                },
                {
                    name: "Territories",
                    icon: <FiMapPin />,
                    path: "/admin-panel/solar-shop/reseller-management/territories",
                    unique_id: "RSL_TERRITORY"
                },
                {
                    name: "Product Authorization",
                    icon: <FiPackage />,
                    path: "/admin-panel/solar-shop/reseller-management/product-auth",
                    unique_id: "RSL_PROD_AUTH"
                },
                {
                    name: "Commission Settings",
                    icon: <FiDollarSign />,
                    path: "/admin-panel/solar-shop/reseller-management/commission-settings",
                    unique_id: "FPO_COMM"
                },
                {
                    name: "Franchisee Settings",
                    icon: <FiSliders />,
                    path: "/admin-panel/solar-shop/reseller-management/franchise-settings",
                    unique_id: "FPO_SETTINGS"
                },
                {
                    name: "Agreement Settings",
                    icon: <FiFileText />,
                    path: "/admin-panel/solar-shop/reseller-management/settings",
                    unique_id: "RSL_SETTINGS"
                },

                // ── Section 2: Onboarding & Partner Pipeline ─────────────
                {
                    name: "Franchisee Leads",
                    icon: <FiFileText />,
                    path: "/admin-panel/solar-shop/reseller-management/leads",
                    unique_id: "RSL_MGMT",
                    badgeKey: "leads"
                },
                {
                    name: "Website EPC Leads",
                    icon: <FiUsers />,
                    path: "/admin-panel/website-configurations/epc-leads",
                    unique_id: "ADM_WEBSITE_CONFIG",
                    badgeKey: "website-leads"
                },
                {
                    name: "Onboard New Store",
                    icon: <FiPlusCircle />,
                    path: "/admin-panel/solar-shop/reseller-management/create-store",
                    unique_id: "RSL_MGMT"
                },
                {
                    name: "Store Onboarding Queue",
                    icon: <FaStore />,
                    path: "/admin-panel/solar-shop/reseller-management/onboarding",
                    unique_id: "RSL_MGMT",
                    badgeKey: "onboarding"
                },
                {
                    name: "Store Setup & Operations",
                    icon: <FaStore />,
                    path: "/admin-panel/solar-shop/reseller-management/store-setup",
                    unique_id: "RSL_MGMT"
                },
                {
                    name: "Franchisee Accounts",
                    icon: <FiUsers />,
                    path: "/admin-panel/solar-shop/reseller-management/resellers",
                    unique_id: "RSL_MGMT",
                    badgeKey: "resellers"
                },

                // ── Section 3: Live Operations, Sales & Financials ────────
                {
                    name: "Franchisee EPC Buyers",
                    icon: <FaUserCheck />,
                    path: "/admin-panel/solar-shop/reseller-management/epc-buyers",
                    unique_id: "RSL_EPC_BUYERS"
                },
                {
                    name: "Franchisee Orders",
                    icon: <FaFileInvoiceDollar />,
                    path: "/admin-panel/solar-shop/reseller-management/orders",
                    unique_id: "RSL_MGMT",
                    badgeKey: "orders"
                },
                {
                    name: "Performance Tracker",
                    icon: <FiBarChart2 />,
                    path: "/admin-panel/solar-shop/reseller-management/fpo/performance",
                    unique_id: "FPO_ANALYTICS"
                },
                {
                    name: "Commission Ledger",
                    icon: <FiFileText />,
                    path: "/admin-panel/solar-shop/reseller-management/commission-ledger",
                    unique_id: "FPO_COMM"
                },
                {
                    name: "Earnings & Settlement",
                    icon: <FaWallet />,
                    path: "/admin-panel/solar-shop/reseller-management/wallet",
                    unique_id: "RSL_WALLET",
                    badgeKey: "wallet"
                },
            ]
        },
        // ── EPC Quotation Management Module ─────────────────────────────────
        {
            step: "14",
            badgeKey: "14",
            name: "EPC Quote Management",
            icon: <FiFileText />,
            path: "/admin-panel/solar-shop/quote-settings",
            unique_id: "00000000",
            subMenu: [
                {
                    name: "Quote Settings",
                    icon: <FiSettings />,
                    path: "/admin-panel/solar-shop/quote-settings",
                    unique_id: "00000000",
                    badgeKey: "quote-settings"
                },
                {
                    name: "Warranty Options",
                    icon: <FiShield />,
                    path: "/admin-panel/solar-shop/quote-settings/warranties",
                    unique_id: "00000000"
                },
                {
                    name: "Quote Analytics",
                    icon: <FiBarChart2 />,
                    path: "/admin-panel/solar-shop/quote-settings/analytics",
                    unique_id: "00000000"
                },
            ]
        },
        // ── Know My Margin (KMM) Module ─────────────────────────────────────
        {
            step: "15",
            badgeKey: "15",
            name: "Know My Margin",
            icon: <FiDollarSign />,
            path: "/admin-panel/solar-shop/project-bom-settings",
            unique_id: "00000000",
            subMenu: [
                {
                    name: "Project BOM Settings",
                    icon: <FiSliders />,
                    path: "/admin-panel/solar-shop/project-bom-settings",
                    unique_id: "00000000",
                    badgeKey: "project-bom-settings"
                },
                {
                    name: "Estimator Settings",
                    icon: <FiSettings />,
                    path: "/admin-panel/solar-shop/estimator-settings",
                    unique_id: "00000000"
                },
            ]
        },
        // ── Region Payment Configuration & Offline Approval Queue ───────────
        {
            step: "16",
            badgeKey: "16",
            name: "Payment Configuration",
            icon: <FiCreditCard />,
            path: "/admin-panel/solar-shop/payment-configuration",
            unique_id: "00000000",
            subMenu: [
                {
                    name: "Region Payment Settings",
                    icon: <FiSliders />,
                    path: "/admin-panel/solar-shop/payment-configuration",
                    unique_id: "00000000"
                },
                {
                    name: "Payment Milestones",
                    icon: <FaPercent />,
                    path: "/admin-panel/solar-shop/payment-configuration/milestones",
                    unique_id: "00000000"
                },
                {
                    name: "Offline Approval Queue",
                    icon: <FiCheckSquare />,
                    path: "/admin-panel/solar-shop/payment-configuration/offline-approvals",
                    unique_id: "00000000",
                    badgeKey: "offline-approvals"
                },
            ]
        },
    ],
];

const isModuleAllowed = (menu, allowedUniqueIds) => {
    if (!menu.unique_id || menu.unique_id === "00000000") return true;
    if (menu.name === "Loose Orders" || menu.unique_id === "ADM_LOOSE_ORDERS") {
        return (
            allowedUniqueIds.includes("ADM_PO_ORDERS") ||
            allowedUniqueIds.includes("ADM_LOOSE_ORDERS") ||
            allowedUniqueIds.includes("00000000")
        );
    }
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

export default function SolarShopDashboard() {
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
        // If path is exactly /admin-panel/solar-shop or /admin-panel/solar-shop-solarkits
        if (parts.length === 2 && (parts[1] === 'solar-shop' || parts[1] === 'solar-shop-solarkits')) {
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
                    const foundProduct = allProducts.find(p => p.slug === "solar-shop" || p.slug === "solar-shop-solarkits");
                    const activeOnes = (foundProduct?.countries || []).filter(c => c.is_active);

                    if (foundProduct && activeOnes.length === 0) {
                        dispatch(setAlert({ type: "warning", message: "This product is not active in any country" }));
                        navigate('/admin-panel/home', { replace: true });
                        return;
                    }

                    const parts = window.location.pathname.split('/');
                    const slugIndex = parts.findIndex(p => p === "solar-shop" || p === "solar-shop-solarkits");
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
                        }
                    }
                }
            } catch (error) {
                if (error.response?.status !== 401) {
                    console.warn("Notice checking product markets in SolarshopDashboard:", error?.message || error);
                }
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
                                                <Suspense fallback={<Loader text="Loading home..." />}>
                                                    <Home />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/approve-new-epc"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_APPROVE_EPC">
                                                <Suspense fallback={<Loader text="Loading content..." />}>
                                                    <ApproveNewEPC moduleUniqueId="ADM_APPROVE_EPC" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/website-epc-leads"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_APPROVE_EPC">
                                                <Suspense fallback={<Loader text="Loading Website EPC Leads..." />}>
                                                    <WebsiteEpcLeads />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/po-orders"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_PO_ORDERS">
                                                <Suspense fallback={<Loader text="Loading PO Orders..." />}>
                                                    <PoOrders moduleUniqueId="ADM_PO_ORDERS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/loose-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Loose Orders..." />}>
                                                <LooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/epc-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading EPC Orders & Approvals..." />}>
                                                <AdminEpcOrders />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/order-approvals"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_APPROVALS">
                                                <Suspense fallback={<Loader text="Loading Order & Stage Approvals..." />}>
                                                    <AdminOrderApprovalDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/vehicles-drivers"
                                        element={<Navigate to="../delivery-management/fleet" replace />}
                                    />
                                    <Route
                                        path="/company-margin"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Company Margin..." />}>
                                                    <CompanyMargin moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading home..." />}>
                                                    <Home />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/home"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading home..." />}>
                                                    <Home />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/approve-new-epc"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_APPROVE_EPC">
                                                <Suspense fallback={<Loader text="Loading content..." />}>
                                                    <ApproveNewEPC moduleUniqueId="ADM_APPROVE_EPC" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/website-epc-leads"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_APPROVE_EPC">
                                                <Suspense fallback={<Loader text="Loading Website EPC Leads..." />}>
                                                    <WebsiteEpcLeads />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/po-orders"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_PO_ORDERS">
                                                <Suspense fallback={<Loader text="Loading PO Orders..." />}>
                                                    <PoOrders moduleUniqueId="ADM_PO_ORDERS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/po-orders/:warehouseId"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_PO_ORDERS">
                                                <Suspense fallback={<Loader text="Loading Warehouse PO Configuration..." />}>
                                                    <WarehousePoConfig moduleUniqueId="ADM_PO_ORDERS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/loose-orders"
                                        element={
                                            <PermissionGuard requiredUniqueId="00000000">
                                                <Suspense fallback={<Loader text="Loading Loose Orders..." />}>
                                                    <LooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/epc-orders"
                                        element={
                                            <Suspense fallback={<Loader text="Loading EPC Orders & Approvals..." />}>
                                                <AdminEpcOrders />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-approvals"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_APPROVALS">
                                                <Suspense fallback={<Loader text="Loading Order & Stage Approvals..." />}>
                                                    <AdminOrderApprovalDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/vehicles-drivers"
                                        element={<Navigate to="../delivery-management/fleet" replace />}
                                    />
                                    <Route
                                        path="/:countryName/loose-orders/:warehouseId"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_PO_ORDERS">
                                                <Suspense fallback={<Loader text="Loading Warehouse Loose Order Configuration..." />}>
                                                    <WarehouseLooseOrders moduleUniqueId="ADM_PO_ORDERS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    <Route
                                        path="/:countryName/company-margin"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Company Margin..." />}>
                                                    <CompanyMargin moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin/:warehouseId"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Warehouse Margin Configuration..." />}>
                                                    <WarehouseMarginConfig moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    {/* ── Margin & Commission: New Sub-Pages ────────────────────────────── */}
                                    <Route
                                        path="/:countryName/company-margin/overview"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Margin Overview..." />}>
                                                    <MarginCommissionHome moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin/offers"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Offers & Discounts..." />}>
                                                    <OffersDiscountSettings moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin/goals"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Company Goals..." />}>
                                                    <CompanyGoalsSettings moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/company-margin/analytics"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_CO_MARGIN">
                                                <Suspense fallback={<Loader text="Loading Margin Analytics..." />}>
                                                    <MarginAnalytics moduleUniqueId="ADM_CO_MARGIN" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/combokit-configurations/*"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_COMBO_CFG">
                                                <Suspense fallback={<Loader text="Loading content..." />}>
                                                    <ComboKitConfigurations />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/combokit-configurations/*"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_COMBO_CFG">
                                                <Suspense fallback={<Loader text="Loading content..." />}>
                                                    <ComboKitConfigurations />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/warehouse-kit-activations"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_WH_KIT_ACT">
                                                <Suspense fallback={<Loader text="Loading Warehouse Kit Activations..." />}>
                                                    <WarehouseKitActivations moduleUniqueId="ADM_WH_KIT_ACT" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/warehouse-kit-activations"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_WH_KIT_ACT">
                                                <Suspense fallback={<Loader text="Loading Warehouse Kit Activations..." />}>
                                                    <WarehouseKitActivations moduleUniqueId="ADM_WH_KIT_ACT" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Order Settings..." />}>
                                                    <OrderManagementSettings moduleUniqueId="ADM_ORDER_SETTINGS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/offers"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Offers..." />}>
                                                    <OffersManagement />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/checkout-cart"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Checkout Settings..." />}>
                                                    <CheckoutCartSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/cluster-routing"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Cluster Routing..." />}>
                                                    <ClusterWarehouseRouting />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/admin-supplier-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Supplier Settings..." />}>
                                                    <AdminSupplierSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/kit-checklist"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Kit Checklist..." />}>
                                                    <KitDisplayChecklist />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/overdue-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Overdue Settings..." />}>
                                                    <OrderOverdueSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-management-settings/journey-dashboard"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Order Journey Dashboard..." />}>
                                                    <OrderJourneyDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Order Settings..." />}>
                                                    <OrderManagementSettings moduleUniqueId="ADM_ORDER_SETTINGS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/offers"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Offers..." />}>
                                                    <OffersManagement />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/checkout-cart"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Checkout Settings..." />}>
                                                    <CheckoutCartSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/cluster-routing"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Cluster Routing..." />}>
                                                    <ClusterWarehouseRouting />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/admin-supplier-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Supplier Settings..." />}>
                                                    <AdminSupplierSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/kit-checklist"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Kit Checklist..." />}>
                                                    <KitDisplayChecklist />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/overdue-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Overdue Settings..." />}>
                                                    <OrderOverdueSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/order-management-settings/journey-dashboard"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_ORDER_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Order Journey Dashboard..." />}>
                                                    <OrderJourneyDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/warehouse-kit-activations/:warehouseId"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_WH_KIT_ACT">
                                                <Suspense fallback={<Loader text="Loading Warehouse Kit Configuration..." />}>
                                                    <WarehouseKitConfig moduleUniqueId="ADM_WH_KIT_ACT" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* ── Store Management: Dedicated Wizard & Queue Routes ─── */}
                                    <Route
                                        path="/reseller-management/create-store"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
                                                    <StoreCreationWizard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reseller-management/create-store"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
                                                    <StoreCreationWizard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/reseller-management/onboarding/create"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
                                                    <StoreCreationWizard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reseller-management/onboarding/create"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
                                                    <StoreCreationWizard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/reseller-management/onboarding"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Queue..." />}>
                                                    <StoreOnboardingQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reseller-management/onboarding"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Store Onboarding Queue..." />}>
                                                    <StoreOnboardingQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* ── Phase 1: Franchisee Management ─────────────────────── */}
                                    <Route
                                        path="/reseller-management/*"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Franchisee Management..." />}>
                                                    <ResellerManagement />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reseller-management/*"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_MGMT">
                                                <Suspense fallback={<Loader text="Loading Franchisee Management..." />}>
                                                    <ResellerManagement />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/reseller-management/settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Franchisee Settings..." />}>
                                                    <ResellerSettings moduleUniqueId="RSL_SETTINGS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/reseller-management/settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="RSL_SETTINGS">
                                                <Suspense fallback={<Loader text="Loading Franchisee Settings..." />}>
                                                    <ResellerSettings moduleUniqueId="RSL_SETTINGS" />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* ── Service Ticket / Kit Replacement Module ───────────────── */}
                                    {/* ── Service Tickets — direct path ───────────────────── */}
                                    <Route
                                        path="/service-tickets/*"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Service Tickets..." />}>
                                                <ServiceTicketsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    {/* ── Service Tickets — country-prefixed path ──────────── */}
                                    <Route
                                        path="/:countryName/service-tickets/*"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Service Tickets..." />}>
                                                <ServiceTicketsAdmin />
                                            </Suspense>
                                        }
                                    />

                                    {/* ── EPC Quotation Management Settings & Analytics ─────── */}
                                    <Route
                                        path="/quote-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Quote Settings..." />}>
                                                <QuoteSettingsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/quote-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Quote Settings..." />}>
                                                <QuoteSettingsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/quote-settings/warranties"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warranty Options..." />}>
                                                <WarrantyOptionsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/quote-settings/warranties"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Warranty Options..." />}>
                                                <WarrantyOptionsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/quote-settings/analytics"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Quote Analytics..." />}>
                                                <QuoteAnalyticsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/quote-settings/analytics"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Quote Analytics..." />}>
                                                <QuoteAnalyticsAdmin />
                                            </Suspense>
                                        }
                                    />

                                    {/* ── Know My Margin (KMM) Estimator Module ────────────────── */}
                                    <Route
                                        path="/project-bom-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Project BOM Settings..." />}>
                                                <ProjectBomSettingsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/project-bom-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Project BOM Settings..." />}>
                                                <ProjectBomSettingsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/estimator-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Estimator Settings..." />}>
                                                <EstimatorSettingsAdmin />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/estimator-settings"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Estimator Settings..." />}>
                                                <EstimatorSettingsAdmin />
                                            </Suspense>
                                        }
                                    />

                                    {/* ── Warehouse & Order Delivery Management Module ───────────── */}
                                    {/* Direct Paths */}
                                    <Route
                                        path="/delivery-management"
                                        element={<Navigate to="vehicle-master" replace />}
                                    />
                                    <Route
                                        path="/delivery-management/vehicle-master"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Vehicle Master..." />}>
                                                    <VehicleMaster />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/providers"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Transport Vendors..." />}>
                                                    <TransportVendors />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/fleet"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Physical Fleet..." />}>
                                                    <PhysicalVehicles />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/kit-weights"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading ComboKit Weight Master..." />}>
                                                    <ComboKitWeightMaster />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/cost-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Cost Settings..." />}>
                                                    <DeliveryCostSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/routes"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Route Consolidation Settings..." />}>
                                                    <RouteConsolidationSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/queue"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Queue..." />}>
                                                    <DeliveryQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/tracking"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Tracking..." />}>
                                                    <DeliveryTracking />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/dashboard"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Dashboard..." />}>
                                                    <DeliveryDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/delivery-management/approval-queue"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Approval Queue..." />}>
                                                    <DeliveryApprovalQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* Country-prefixed Paths */}
                                    <Route
                                        path="/:countryName/delivery-management"
                                        element={<Navigate to="vehicle-master" replace />}
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/vehicle-master"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Vehicle Master..." />}>
                                                    <VehicleMaster />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/providers"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Transport Vendors..." />}>
                                                    <TransportVendors />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/fleet"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Physical Fleet..." />}>
                                                    <PhysicalVehicles />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/kit-weights"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading ComboKit Weight Master..." />}>
                                                    <ComboKitWeightMaster />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/cost-settings"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Cost Settings..." />}>
                                                    <DeliveryCostSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/routes"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Route Consolidation Settings..." />}>
                                                    <RouteConsolidationSettings />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/queue"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Queue..." />}>
                                                    <DeliveryQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/tracking"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Tracking..." />}>
                                                    <DeliveryTracking />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/dashboard"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Dashboard..." />}>
                                                    <DeliveryDashboard />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/delivery-management/approval-queue"
                                        element={
                                            <PermissionGuard requiredUniqueId="ADM_DELIVERY_MGMT">
                                                <Suspense fallback={<Loader text="Loading Delivery Approval Queue..." />}>
                                                    <DeliveryApprovalQueue />
                                                </Suspense>
                                            </PermissionGuard>
                                        }
                                    />

                                    {/* ── Region Payment Configuration & Offline Approval Queue ──── */}
                                    <Route
                                        path="/payment-configuration"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Payment Configuration..." />}>
                                                <RegionPaymentConfig />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/payment-configuration"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Payment Configuration..." />}>
                                                <RegionPaymentConfig />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/payment-configuration/milestones"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Payment Milestones..." />}>
                                                <PaymentMilestoneSettings />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/payment-configuration/milestones"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Payment Milestones..." />}>
                                                <PaymentMilestoneSettings />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/payment-configuration/offline-approvals"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Offline Approval Queue..." />}>
                                                <OfflineApprovalQueue />
                                            </Suspense>
                                        }
                                    />
                                    <Route
                                        path="/:countryName/payment-configuration/offline-approvals"
                                        element={
                                            <Suspense fallback={<Loader text="Loading Offline Approval Queue..." />}>
                                                <OfflineApprovalQueue />
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
