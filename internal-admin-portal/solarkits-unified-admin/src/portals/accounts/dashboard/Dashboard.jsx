import { Route, Routes, useLocation, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Drawer from "../components/Drawer";
import { FaHome, FaBuilding, FaFileInvoice, FaCreditCard, FaCheckCircle, FaHandshake, FaBoxes, FaLayerGroup, FaBalanceScale, FaBook, FaExchangeAlt, FaReceipt, FaFileInvoiceDollar, FaClipboardCheck, FaMoneyBillWave, FaWarehouse, FaChartLine, FaTruckLoading } from "react-icons/fa"
import { lazy, Suspense, useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion";
import { PermissionGuard } from "../components/PermissionGuard";
import { useSelector } from "react-redux";
import Loader from "../components/Loader";
import { selectAllowedUniqueIds, selectNoModulesForTier } from "../features/modules.slice";
import { getSidebarBadgeCounts, getTrialKitsBadgeCount } from "../api/accounts";

const Home = lazy(() => import("../pages/Home"));
const Profile = lazy(() => import("../pages/Profile"));
const AccountSettings = lazy(() => import("../pages/AccountSettings"));
const EWayBillManagement = lazy(() => import("../pages/accounts-management/EWayBillManagement"));
const CustomerInvoiceManagement = lazy(() => import("../pages/accounts-management/CustomerInvoiceManagement"));
const InventoryInwardInvoices = lazy(() => import("../pages/accounts-management/InventoryInwardInvoices"));

const SupplierRegistry = lazy(() => import("../pages/accounts-management/SupplierRegistry"));
const PurchaseOrders = lazy(() => import("../pages/accounts-management/PurchaseOrders"));
const OemPurchaseOrders = lazy(() => import("../pages/accounts-management/OemPurchaseOrders"));
const BoskitInventory = lazy(() => import("../pages/accounts-management/BoskitInventory"));
const Payments = lazy(() => import("../pages/accounts-management/Payments"));
const NewOrdersProcurement = lazy(() => import("../pages/accounts-management/NewOrdersProcurement"));
const Procurement = lazy(() => import("../pages/accounts-management/Procurement"));
const AccountingModule = lazy(() => import("../pages/accounting/AccountingModule"));
const GstManagementModule = lazy(() => import("../pages/gst/GstManagementModule"));
const InvoiceValidationModule = lazy(() => import("../pages/compliance/InvoiceValidationModule"));
const ExpenseManagementModule = lazy(() => import("../pages/expenses/ExpenseManagementModule"));
const WarehouseFinanceModule = lazy(() => import("../pages/warehouse-finance/WarehouseFinanceModule"));
const ExecutiveFinanceDashboard = lazy(() => import("../pages/executive/ExecutiveFinanceDashboard"));
const CompanyProfileAndFy = lazy(() => import("../pages/company-profile/CompanyProfileAndFy"));
const StatutoryRegistersHub = lazy(() => import("../pages/registers/StatutoryRegistersHub"));
const AccountsTrialKitStockPage = lazy(() => import("../pages/trial-kits/AccountsTrialKitStockPage"));
 
const TrialKitsOrdersPage = lazy(() => import("../pages/trial-kits/TrialKitsOrdersPage"));
const TrialKitsProcurementPage = lazy(() => import("../pages/trial-kits/TrialKitsProcurementPage"));
 

const getMenusWithBadges = (badgeCounts = {}) => [
  [
    {
      name: "Accounts Dashboard",
      icon: <FaHome />,
      path: "/account-panel/home",
      unique_id: "ACC_HOME"
    },
    {
      name: "Company Profile & FY",
      icon: <FaBuilding />,
      path: "/account-panel/company-profile",
      unique_id: "ACC_COMPANY_PROFILE"
    },
    {
      name: "Statutory Registers",
      icon: <FaBook />,
      path: "/account-panel/registers",
      unique_id: "ACC_REGISTERS"
    },
    {
      name: "New Orders",
      icon: <FaBoxes />,
      path: "/account-panel/new-orders",
      unique_id: "ACC_NEW_ORDERS",
      badge: badgeCounts.new_orders || 0
    },
    {
      name: "Trial Kits Management",
      icon: <FaBoxes />,
      unique_id: "ACC_TRIAL_KITS_MGMT",
      badge: ((Number(badgeCounts.trial_kits_procurement) || 0) + (Number(badgeCounts.trial_kits_orders) || 0)) || 0,
      subMenu: [
        {
          name: "Trial Kits Procurement",
          icon: <FaTruckLoading />,
          path: "/account-panel/trial-kits-procurement",
          unique_id: "ACC_TRIAL_KITS_PROCUREMENT",
          badge: badgeCounts.trial_kits_procurement || 0
        },
        {
          name: "Trial Kits Orders",
          icon: <FaBoxes />,
          path: "/account-panel/trial-kits-orders",
          unique_id: "ACC_TRIAL_KITS_ORDERS",
          badge: badgeCounts.trial_kits_orders || 0
        }
      ]
    },
    {
      name: "Procurement",
      icon: <FaLayerGroup />,
      path: "/account-panel/procurement",
      unique_id: "ACC_PROCUREMENT",
      badge: badgeCounts.procurement || 0
    },
    {
      name: "Supplier Registry",
      icon: <FaHandshake />,
      path: "/account-panel/suppliers",
      unique_id: "ACC_SUPPLIERS"
    },
    {
      name: "Purchase Orders",
      icon: <FaFileInvoice />,
      path: "/account-panel/purchase-orders",
      unique_id: "ACC_PO",
      badge: badgeCounts.purchase_orders || 0
    },
    // {
    //   name: "OEM Partner Orders",
    //   icon: <FaHandshake />,
    //   path: "/account-panel/oem-purchase-orders",
    //   unique_id: "ACC_OEM_PO"
    // },
    // {
    //   name: "BOSKIT Inventory",
    //   icon: <FaBoxes />,
    //   path: "/account-panel/boskit-inventory",
    //   unique_id: "ACC_BOSKIT_INV"
    // },
    {
      name: "Supplier Payments",
      icon: <FaCreditCard />,
      path: "/account-panel/payments",
      unique_id: "ACC_PAYMENTS",
      badge: badgeCounts.supplier_payments || 0
    },
    {
      name: "Inventory Inward Invoices",
      icon: <FaFileInvoice />,
      path: "/account-panel/inward-invoices",
      unique_id: "ACC_INWARD_INV"
    },
    {
      name: "E-Way Bill Management",
      icon: <FaFileInvoice />,
      path: "/account-panel/eway-bills",
      unique_id: "ACC_EWAY"
    },
    {
      name: "Customer Invoice Management",
      icon: <FaCreditCard />,
      path: "/account-panel/invoices",
      unique_id: "ACC_INVOICES"
    },
    {
      name: "Accounting & Ledgers",
      icon: <FaBalanceScale />,
      path: "/account-panel/accounting",
      unique_id: "ACC_ACCOUNTING",
      subMenu: [
        {
          name: "1. Chart of Accounts",
          icon: <FaBook />,
          path: "/account-panel/accounting/chart-of-accounts",
          unique_id: "ACC_ACCOUNTING"
        },
        {
          name: "2. Vouchers & Journal",
          icon: <FaExchangeAlt />,
          path: "/account-panel/accounting/vouchers",
          unique_id: "ACC_ACCOUNTING"
        },
        {
          name: "3. General Ledgers",
          icon: <FaReceipt />,
          path: "/account-panel/accounting/ledgers",
          unique_id: "ACC_ACCOUNTING"
        },
        {
          name: "4. Financial Statements",
          icon: <FaFileInvoiceDollar />,
          path: "/account-panel/accounting/financial-statements",
          unique_id: "ACC_ACCOUNTING"
        }
      ]
    },
    {
      name: "GST & Tax Compliance",
      icon: <FaFileInvoiceDollar />,
      path: "/account-panel/gst",
      unique_id: "ACC_GST"
    },
    {
      name: "Invoice Validation & Alerts",
      icon: <FaClipboardCheck />,
      path: "/account-panel/invoice-validation",
      unique_id: "ACC_INVOICE_VALIDATION"
    },
    {
      name: "Expense Management",
      icon: <FaMoneyBillWave />,
      path: "/account-panel/expenses",
      unique_id: "ACC_EXPENSES"
    },
  ],
];

const isModuleAllowed = (menu, allowedUniqueIds) => {
  if (!menu.unique_id) return true;
  if (
    menu.unique_id === "00000000" ||
    menu.unique_id.startsWith("ACC_TRIAL_") ||
    menu.unique_id === "ACC_ACCOUNTING" ||
    menu.unique_id === "ACC_GST" ||
    menu.unique_id === "ACC_INVOICE_VALIDATION" ||
    menu.unique_id === "ACC_EXPENSES" ||
    menu.unique_id === "ACC_COMPANY_PROFILE" ||
    menu.unique_id === "ACC_REGISTERS" ||
    menu.unique_id === "ACC_TRIAL_KITS" ||
    menu.unique_id === "ACC_TRIAL_KITS_ORDERS" ||
    menu.unique_id === "ACC_TRIAL_KITS_PROCUREMENT"
  ) return true;
  if ((menu.unique_id === "ACC_NEW_ORDERS" || menu.unique_id === "ACC_PROCUREMENT") && (allowedUniqueIds.includes("ACC_NEW_ORDERS") || allowedUniqueIds.includes("ACC_HOME") || allowedUniqueIds.includes("ACC_PO") || allowedUniqueIds.includes("ACC_PROCUREMENT"))) return true;
  if (menu.unique_id === "ACC_OEM_PO" && allowedUniqueIds.includes("ACC_PO")) return true;
  if (menu.unique_id === "ACC_BOSKIT_INV" && (allowedUniqueIds.includes("ACC_PO") || allowedUniqueIds.includes("ACC_INWARD_INV") || allowedUniqueIds.includes("ACC_HOME"))) return true;
  return allowedUniqueIds.includes(menu.unique_id);
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

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname));
  const noModulesForTier = useSelector((state) => selectNoModulesForTier(state, location.pathname));
  const { user, selectedScope } = useSelector((state) => state.user_slice);


  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/$/, "");
    if (normalizedPath === "/account-panel") {
      navigate("/account-panel/home", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
      else setIsOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [sidebarBadges, setSidebarBadges] = useState({
    new_orders: 0,
    trial_kits_orders: 0,
    trial_kits_procurement: 0,
    procurement: 0,
    supplier_payments: 0,
    purchase_orders: 0,
  });

  const fetchBadges = useCallback(async () => {
    try {
      const [res, tkBadgeRes] = await Promise.all([
        getSidebarBadgeCounts().catch(() => ({ data: {} })),
        getTrialKitsBadgeCount().catch(() => ({ data: {} }))
      ]);
      setSidebarBadges(prev => ({
        ...prev,
        ...(res?.data || {}),
        trial_kits_orders: tkBadgeRes?.data?.pending_account || 0
      }));
    } catch (err) {
      console.warn("Failed to fetch accounts sidebar badges:", err);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 45000);
    const handleRefresh = () => fetchBadges();
    window.addEventListener("accounts:badge-refresh", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("accounts:badge-refresh", handleRefresh);
    };
  }, [fetchBadges, location.pathname]);

  const filteredMenus = useMemo(() => {
    const rawMenus = getMenusWithBadges(sidebarBadges);
    return filterMenusByPermission(rawMenus, allowedUniqueIds);
  }, [sidebarBadges, allowedUniqueIds]);
  return (
    <div className="flex h-screen bg-bg w-full max-w-full overflow-hidden theme-transition">
      <Drawer
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isMobile={isMobile}
        menuItems={filteredMenus}
      />

      <div className="flex flex-col flex-1 min-w-0 max-w-full overflow-hidden">
        <Header
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isMobile={isMobile}
          title="Account Panel"
        />

        <main className="flex-1 relative overflow-hidden min-w-0 max-w-full mesh-grid bg-bg transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

          <div className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-hover p-4 md:p-6 w-full max-w-full min-w-0">

            {/* Tier mismatch banner — shown when the panel has level-specific modules
                but none of them match the user's currently selected active level. */}
            {noModulesForTier && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-500/30 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    No Modules Available for Your Account Tier
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                    This panel has no modules configured for the{" "}
                    <span className="font-semibold capitalize px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-700/40">
                      {(selectedScope?.level || user?.level || 'current').toUpperCase()}
                    </span>{" "}
                    level. Use the level selector in the header to switch to a tier that has available modules
                    (e.g. <strong>STATE</strong> or <strong>CLUSTER</strong>).
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="min-h-full w-full max-w-full min-w-0"
              >
                <Routes location={location}>
                  <Route
                    path="/trial-kits-orders/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Trial Kits Orders..." />}>
                        <TrialKitsOrdersPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/trial-kits-procurement/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Trial Kits Procurement..." />}>
                        <TrialKitsProcurementPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/trial-kits/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Trial Kit Stock..." />}>
                        <AccountsTrialKitStockPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/home/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_HOME">
                        <Suspense fallback={<Loader text="Loading home..." />}>
                          <Home />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/company-profile/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Company Profile & FY..." />}>
                        <CompanyProfileAndFy />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/registers/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Statutory Registers Hub..." />}>
                        <StatutoryRegistersHub />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/new-orders/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_NEW_ORDERS">
                        <Suspense fallback={<Loader text="Loading New Orders..." />}>
                          <NewOrdersProcurement />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/procurement/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_PROCUREMENT">
                        <Suspense fallback={<Loader text="Loading Procurement..." />}>
                          <Procurement />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/eway-bills/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_EWAY">
                        <Suspense fallback={<Loader text="Loading E-Way Bills..." />}>
                          <EWayBillManagement />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/invoices/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_INVOICES">
                        <Suspense fallback={<Loader text="Loading Invoices..." />}>
                          <CustomerInvoiceManagement />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/inward-invoices/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_INWARD_INV">
                        <Suspense fallback={<Loader text="Loading Inventory Inward Invoices..." />}>
                          <InventoryInwardInvoices />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path="/purchase-orders/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_PO">
                        <Suspense fallback={<Loader text="Loading Purchase Orders..." />}>
                          <PurchaseOrders />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/oem-purchase-orders/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_PO">
                        <Suspense fallback={<Loader text="Loading OEM Purchase Orders..." />}>
                          <OemPurchaseOrders />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/boskit-inventory/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_PO">
                        <Suspense fallback={<Loader text="Loading BOSKIT Inventory..." />}>
                          <BoskitInventory />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/payments/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_PAYMENTS">
                        <Suspense fallback={<Loader text="Loading Payments..." />}>
                          <Payments />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/suppliers/*"
                    element={
                      <PermissionGuard requiredUniqueId="ACC_SUPPLIERS">
                        <Suspense fallback={<Loader text="Loading Supplier Registry..." />}>
                          <SupplierRegistry />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <Suspense fallback={<Loader text="Loading profile..." />}>
                        <Profile />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/account-settings"
                    element={
                      <Suspense fallback={<Loader text="Loading settings..." />}>
                        <AccountSettings />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/accounting/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Accounting Module..." />}>
                        <AccountingModule />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/gst/*"
                    element={
                      <Suspense fallback={<Loader text="Loading GST Management..." />}>
                        <GstManagementModule />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/invoice-validation/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Invoice Validation..." />}>
                        <InvoiceValidationModule />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/expenses/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Expense Management..." />}>
                        <ExpenseManagementModule />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/warehouse-finance/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Warehouse Finance & Loan Module..." />}>
                        <WarehouseFinanceModule />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/executive-finance/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Executive Finance Dashboard..." />}>
                        <ExecutiveFinanceDashboard />
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
