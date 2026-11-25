import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

import Header from "../components/Header";
import Drawer from "../components/Drawer";
import Loader from "../components/Loader";
import { PermissionGuard } from "../components/PermissionGuard";
import { selectAllowedUniqueIds } from "../features/modules.slice";

import { FaHome, FaWarehouse, FaChartBar, FaBrain, FaExchangeAlt, FaShoppingCart, FaBoxes } from "react-icons/fa";

/* ===================== Lazy Pages ===================== */

const Profile = lazy(() => import("../pages/Profile"));
const AccountSettings = lazy(() => import("../pages/AccountSettings"));
const NotFound = lazy(() => import("../pages/NotFound"));

/* ===================== Operation Management Pages ===================== */
const OrderFulfillment = lazy(() => import("../pages/order-management/OrderFulfillment"));
const AnalyticsDashboard = lazy(() => import("../pages/order-management/AnalyticsDashboard"));
const OrderPrediction = lazy(() => import("../pages/order-management/OrderPrediction"));
const Home = lazy(() => import("../pages/dashboard/Home"));
const StockTransferManagement = lazy(() => import("../pages/operations-management/StockTransferManagement"));
const ProcurementModule = lazy(() => import("../pages/operations-management/ProcurementModule"));
const WarehouseStockReport = lazy(() => import("../pages/operations-management/WarehouseStockReport"));

/* ===================== MENU CONFIG ===================== */

const menus = [
  [{ name: "Dashboard", icon: <FaHome />, path: "/operation-management-panel/home", unique_id: "OP_HOME" }],
  [
    {
      name: "Order Operations",
      icon: <FaWarehouse />,
      unique_id: "OP_OPERATIONS_GROUP",
      subMenu: [
        {
          name: "Order Fulfillment",
          icon: <FaWarehouse />,
          path: "/operation-management-panel/order-fulfillment",
          unique_id: "OP_FULFILLMENT"
        },
        {
          name: "Stock Transfer Mgmt",
          icon: <FaExchangeAlt />,
          path: "/operation-management-panel/stock-transfer",
          unique_id: "OP_STOCK_TRANSFER"
        },
        {
          name: "Supplier Procurement",
          icon: <FaShoppingCart />,
          path: "/operation-management-panel/procurement",
          unique_id: "OP_PROCUREMENT"
        },
        {
          name: "Warehouse Stock Report",
          icon: <FaBoxes />,
          path: "/operation-management-panel/warehouse-stock-report",
          unique_id: "OP_WH_STOCK_REPORT"
        }
      ]
    },
    {
      name: "Intelligence & Reports",
      icon: <FaChartBar />,
      unique_id: "OP_INTEL_GROUP",
      subMenu: [
        {
          name: "Analytics Suite",
          icon: <FaChartBar />,
          path: "/operation-management-panel/analytics-suite",
          unique_id: "OP_ANALYTICS"
        },
        {
          name: "Demand Prediction AI",
          icon: <FaBrain />,
          path: "/operation-management-panel/demand-prediction",
          unique_id: "OP_PREDICTION"
        }
      ]
    }
  ],
];

const isModuleAllowed = (menu, allowedUniqueIds) => {
  if (!allowedUniqueIds || allowedUniqueIds.length === 0) return true;
  if (menu.subMenu) {
    return menu.subMenu.some(sub => allowedUniqueIds.includes(sub.unique_id));
  }
  return allowedUniqueIds.includes(menu.unique_id);
};

const filterMenusByPermission = (menus, allowedUniqueIds) => {
  if (!allowedUniqueIds || allowedUniqueIds.length === 0) return menus;
  return menus.map(group =>
    group.filter(menu => isModuleAllowed(menu, allowedUniqueIds)).map(menu => ({
      ...menu,
      subMenu: menu.subMenu?.filter(sub => allowedUniqueIds.includes(sub.unique_id))
    }))
  ).filter(group => group.length > 0);
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname));

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/$/, "");
    if (normalizedPath === "/operation-management-panel") {
      navigate("/operation-management-panel/home", { replace: true });
    }
  }, [location.pathname, navigate]);

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

  // Dynamic Title detection
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/home')) return 'Operation Management Dashboard';
    if (path.includes('/order-fulfillment')) return 'Order Fulfillment Allocation';
    if (path.includes('/stock-transfer')) return 'Stock Transfer & Balancing';
    if (path.includes('/procurement')) return 'Supplier Procurement Module';
    if (path.includes('/warehouse-stock-report')) return 'Warehouse Stock & Price Report';
    if (path.includes('/analytics-suite')) return 'Operations Analytics Suite';
    if (path.includes('/demand-prediction')) return 'AI Demand Forecasting';
    if (path.includes('/profile')) return 'My Profile';
    if (path.includes('/account-settings')) return 'Account Settings';
    return 'Operation Management';
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="flex h-screen bg-bg w-screen theme-transition">
      <Drawer
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isMobile={isMobile}
        menuItems={filteredMenus}
      />

      <div className="flex flex-col flex-1 max-w-full">
        <Header
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isMobile={isMobile}
          title={getPageTitle()}
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
                    path="home"
                    element={
                      <PermissionGuard requiredUniqueId="OP_HOME">
                        <Suspense fallback={<Loader text="Loading home..." />}>
                          <Home />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="order-fulfillment/*"
                    element={
                      <PermissionGuard requiredUniqueId="OP_FULFILLMENT">
                        <Suspense fallback={<Loader text="Loading order fulfillment..." />}>
                          <OrderFulfillment />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="stock-transfer/*"
                    element={
                      <PermissionGuard requiredUniqueId="OP_STOCK_TRANSFER">
                        <Suspense fallback={<Loader text="Loading stock transfer..." />}>
                          <StockTransferManagement />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="procurement/*"
                    element={
                      <PermissionGuard requiredUniqueId="OP_PROCUREMENT">
                        <Suspense fallback={<Loader text="Loading procurement..." />}>
                          <ProcurementModule />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="warehouse-stock-report"
                    element={
                      <PermissionGuard requiredUniqueId="OP_WH_STOCK_REPORT">
                        <Suspense fallback={<Loader text="Loading warehouse stock report..." />}>
                          <WarehouseStockReport />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="analytics-suite/*"
                    element={
                      <PermissionGuard requiredUniqueId="OP_ANALYTICS">
                        <Suspense fallback={<Loader text="Loading analytics..." />}>
                          <AnalyticsDashboard />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="demand-prediction/*"
                    element={
                      <PermissionGuard requiredUniqueId="OP_PREDICTION">
                        <Suspense fallback={<Loader text="Loading prediction..." />}>
                          <OrderPrediction />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="profile"
                    element={
                      <Suspense fallback={<Loader text="Loading profile..." />}>
                        <Profile />
                      </Suspense>
                    }
                  />
                  <Route
                    path="account-settings"
                    element={
                      <Suspense fallback={<Loader text="Loading settings..." />}>
                        <AccountSettings />
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<Suspense fallback={<Loader />}><NotFound /></Suspense>} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
