import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

import Header from "../components/Header";
import Drawer from "../components/Drawer";
import Loader from "../components/Loader";
import { PermissionGuard } from "../components/PermissionGuard";
import { selectAllowedUniqueIds } from "../features/modules.slice";

import { FaHome, FaIndustry, FaRulerCombined, FaUserPlus, FaUserShield, FaUserTie, FaUsers, FaUsersCog, FaGlobe, FaCoins, FaStore, FaFileContract, FaUserCheck, FaChartLine } from "react-icons/fa";
import {
  MdAccountTree,
  MdEngineering,
  MdLocationOn,
  MdManageAccounts,
  MdQrCode2,
  MdSettings,
  MdTune,
  MdWarehouse,
  MdVisibility,
} from "react-icons/md";
import { FaMagnifyingGlassLocation, FaMapLocationDot } from "react-icons/fa6";
import { BiSolidLayerPlus } from "react-icons/bi";
import { GoProject } from "react-icons/go";
import { HiCube, HiOutlineTemplate } from "react-icons/hi";
import { FiSmartphone, FiUsers } from "react-icons/fi";
import VisionDashboard from "../pages/dashboard/vision-dashboard/VisionDashboard";

/* ===================== Lazy Pages ===================== */

const Home = lazy(() => import("../pages/dashboard/Home"));
const Operations = lazy(() => import("../pages/dashboard/operations/Operations"));
const Settings = lazy(() => import("../pages/dashboard/settings/Settings"));
const ManageUsers = lazy(() => import("../pages/dashboard/manage-users/ManageUsers"));
const ProductConfigurations = lazy(() => import("../pages/dashboard/product-configurations/ProductConfigurations"));
const Profile = lazy(() => import("../pages/Profile"));
const AccountSettings = lazy(() => import("../pages/AccountSettings"));
const CreateUsers = lazy(() => import("../pages/CreateUsers"));
const IndustryContentManagement = lazy(() => import("../pages/dashboard/industry-content/IndustryContentManagement"));
const IndustryTypeManagement = lazy(() => import("../pages/dashboard/industry-content/IndustryTypeManagement"));
const WebsiteConfiguration = lazy(() => import("../pages/dashboard/website-configuration/WebsiteConfiguration"));
const BdeManagement = lazy(() => import("../pages/dashboard/bde-management/BdeManagement"));
const StoreSetupManagement = lazy(() => import("../pages/dashboard/store-setup/StoreSetupManagement"));
const ConfigurationDashboard = lazy(() => import("../pages/dashboard/configuration-dashboard/ConfigurationDashboard"));
const OperationsDashboard = lazy(() => import("../pages/dashboard/operations-dashboard/OperationsDashboard"));
const StoreDashboard = lazy(() => import("../pages/dashboard/store-dashboard/StoreDashboard"));
const EpcAnalyticsDashboard = lazy(() => import("../pages/dashboard/epc-analytics/EpcAnalyticsDashboard"));
const NotFound = lazy(() => import("../pages/NotFound"));

/* ===================== MENU CONFIG ===================== */

const menus = [
  [
    { name: "Dashboard", icon: <FaHome />, path: "/admin-panel/home", unique_id: "00000000" },
    { name: "Vision Dashboard", icon: <MdVisibility />, path: "/admin-panel/vision-dashboard", unique_id: "00000000" },
    { name: "Configuration Dashboard", icon: <MdTune />, path: "/admin-panel/configuration-dashboard", unique_id: "00000000" },
    { name: "Operations Dashboard", icon: <MdEngineering />, path: "/admin-panel/operations-dashboard", unique_id: "00000000" },
    { name: "Store Dashboard", icon: <FaStore />, path: "/admin-panel/store-dashboard", unique_id: "00000000" },
    { name: "EPC Analytics", icon: <FaChartLine />, path: "/admin-panel/epc-analytics", unique_id: "00000000" },
  ],
  [
    {
      name: "BDE Management",
      icon: <FaUserTie />,
      path: "/admin-panel/bde-management",
      unique_id: "ADM_BDE_MGMT",
      subMenu: [
        {
          name: "BDE Dashboard",
          icon: <FaHome />,
          path: "/admin-panel/bde-management/dashboard",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "All BDEs",
          icon: <FaUsers />,
          path: "/admin-panel/bde-management/all",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "BDE Leads",
          icon: <FaUsersCog />,
          path: "/admin-panel/bde-management/leads",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Attributed Franchisees",
          icon: <FaStore />,
          path: "/admin-panel/bde-management/franchisees",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Territory Exceptions",
          icon: <FaMapLocationDot />,
          path: "/admin-panel/bde-management/territory-exceptions",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Conversion Funnel",
          icon: <FaCoins />,
          path: "/admin-panel/bde-management/conversion-funnel",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Create BDE",
          icon: <FaUserPlus />,
          path: "/admin-panel/bde-management/create",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Territory Assignment",
          icon: <FaMapLocationDot />,
          path: "/admin-panel/bde-management/territory-assignment",
          unique_id: "ADM_BDE_MGMT",
        },
        {
          name: "Goal Assignment",
          icon: <FaCoins />,
          path: "/admin-panel/bde-management/goal-assignment",
          unique_id: "ADM_BDE_MGMT",
        },
        // {
        //   name: "BDE Activity History",
        //   icon: <FaFileContract />,
        //   path: "/admin-panel/bde-management/activity-history",
        //   unique_id: "ADM_BDE_MGMT",
        // },
      ],
    },
    {
      name: "Operations",
      icon: <MdEngineering />,
      path: "/admin-panel/operations",
      unique_id: "ADM_OPS",
      subMenu: [
        {
          name: "Company Warehouses",
          icon: <MdWarehouse />,
          path: "/admin-panel/operations/company-warehouses",
          unique_id: "ADM_WAREHOUSES"
        },
        {
          name: "Manufacturing Brands",
          icon: <FaIndustry />,
          path: "/admin-panel/operations/manufacturing-brands",
          unique_id: "ADM_MFG_BRANDS"
        },
      ],
    },
    {
      name: "Settings",
      icon: <MdSettings />,
      path: "/admin-panel/settings",
      unique_id: "ADM_SETTINGS",
      subMenu: [
        {
          name: "Role Settings",
          icon: <FaUsersCog />,
          path: "/admin-panel/settings/role-settings",
          unique_id: "ADM_ROLE_SETTINGS",
          subMenu: [
            {
              name: "Role-Based Access Control",
              icon: <FaUserShield />,
              path: "/admin-panel/settings/role-settings/role-based-access-control",
              unique_id: "ADM_RBAC"
            },
            {
              name: "Departments",
              icon: <MdAccountTree />,
              path: "/admin-panel/settings/role-settings/departments",
              unique_id: "ADM_DEPTS"
            },
          ],
        },
        {
          name: "HR Settings",
          icon: <MdManageAccounts />,
          path: "/admin-panel/settings/hr-settings",
          subMenu: [
            {
              name: "Temporary Incharge Setting",
              icon: <FaUserTie />,
              path: "/admin-panel/settings/hr-settings/temporary-incharge-setting",
              unique_id: "ADM_TEMP_INCHARGE"
            },
          ],
        },
        {
          name: "Location Setting",
          icon: <MdLocationOn />,
          path: "/admin-panel/settings/location-setting",
          unique_id: "ADM_LOC",
          subMenu: [
            {
              name: "Location Overview",
              icon: <FaMagnifyingGlassLocation />,
              path: "/admin-panel/settings/location-setting/location-overview",
              unique_id: "ADM_LOC_OVERVIEW"
            },
            {
              name: "Setup Location",
              icon: <FaMapLocationDot />,
              path: "/admin-panel/settings/location-setting/setup-location",
              unique_id: "ADM_SETUP_LOC"
            },
            {
              name: "Cluster Setup",
              icon: <BiSolidLayerPlus />,
              path: "/admin-panel/settings/location-setting/cluster-setup",
              unique_id: "ADM_CLUSTER_SETUP"
            },
          ],
        },
        {
          name: "EPC Types",
          icon: <FaUserCheck />,
          path: "/admin-panel/settings/epc-types",
          unique_id: "00000000"
        }
      ],
    },
    {
      name: "Manage Users",
      icon: <MdManageAccounts />,
      path: "/admin-panel/manage-users",
      unique_id: "ADM_USERS",
      subMenu: [
        {
          name: "EPCs",
          icon: <FaUsers />,
          path: "/admin-panel/manage-users/epcs",
          unique_id: "ADM_EPC"
        },
        {
          name: "Suppliers",
          icon: <FaUsers />,
          path: "/admin-panel/manage-users/suppliers",
          unique_id: "ADM_SUPPLIERS"
        },
      ]
    },
    {
      name: "Product Configurations",
      icon: <MdTune />,
      path: "/admin-panel/product-configuration",
      unique_id: "ADM_PROD_CFG",
      subMenu: [
        {
          name: "Project Types",
          icon: <GoProject />,
          path: "/admin-panel/product-configurations/project-types",
          unique_id: "ADM_PROJ_TYPES"
        },
        {
          name: "Product Templates",
          icon: <HiOutlineTemplate />,
          path: "/admin-panel/product-configurations/product-templates",
          unique_id: "ADM_PROD_TMPL"
        },
        {
          name: "SKU Master",
          icon: <MdQrCode2 />,
          path: "/admin-panel/product-configurations/sku-master",
          unique_id: "ADM_SKU"
        },
        {
          name: "Units Management",
          icon: <FaRulerCombined />,
          path: "/admin-panel/product-configurations/units-management",
          unique_id: "ADM_UNITS"
        },
        {
          name: "Solar Kits",
          icon: <HiCube />,
          path: "/admin-panel/product-configurations/solar-kits",
          unique_id: "ADM_SOLAR_KITS"
        },
        {
          name: "Benchmark Price Master",
          icon: <FaCoins />,
          path: "/admin-panel/product-configurations/price-master",
          unique_id: "ADM_PRICE_MASTER"
        },
        {
          name: "Price Requests",
          icon: <FaCoins />,
          path: "/admin-panel/product-configurations/price-requests",
          unique_id: "ADM_PRICE_REQS"
        }
      ]
    },
    {
      name: "Website Configurations",
      icon: <FaGlobe />,
      path: "/admin-panel/website-configurations",
      unique_id: "ADM_WEBSITE_CONFIG",
      subMenu: [
        {
          name: "SolarKits Website",
          icon: <HiCube />,
          path: "/admin-panel/website-configurations/solar-kits",
          unique_id: "ADM_WEBSITE_SOLARKITS"
        },
        {
          name: "Franchise Website",
          icon: <FaFileContract />,
          path: "/admin-panel/website-configurations/franchise",
          unique_id: "ADM_WEBSITE_FRANCHISE"
        },
        {
          name: "Solar Store Website",
          icon: <FaStore />,
          path: "/admin-panel/website-configurations/solar-store",
          unique_id: "ADM_WEBSITE_SOLARSTORE"
        },
        {
          name: "Website EPC Leads",
          icon: <FiUsers />,
          path: "/admin-panel/website-configurations/epc-leads",
          unique_id: "ADM_WEBSITE_LEADS"
        }
      ]
    },
    {
      name: "Website EPC Leads",
      icon: <FiUsers />,
      path: "/admin-panel/website-configurations/epc-leads",
      unique_id: "ADM_WEBSITE_LEADS"
    }
  ],
  [



    {
      name: "Industry CMS",
      icon: <FaIndustry />,
      path: "/admin-panel/industry-content/cms",
      unique_id: "ADM_INDUSTRY_CONTENT",
    },
  ],
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

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname));


  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/$/, "");
    if (normalizedPath === "/admin-panel") {
      navigate("/admin-panel/home", { replace: true });
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
    if (path.includes('/home')) return 'Home Dashboard';
    if (path.includes('/vision-dashboard')) return 'Vision Dashboard';
    if (path.includes('/configuration-dashboard')) return 'Configuration Dashboard';
    if (path.includes('/operations-dashboard')) return 'Admin Operations Dashboard';
    if (path.includes('/store-dashboard')) return 'Store & Market Analytics Dashboard';
    if (path.includes('/epc-analytics')) return 'EPC Analytics';
    if (path.includes('/bde-management')) return 'BDE Management';
    if (path.includes('/operations')) return 'Operations Management';
    if (path.includes('/settings')) return 'System Settings';
    if (path.includes('/manage-users')) return 'User Management';
    if (path.includes('/product-configurations')) return 'Product Configuration';
    if (path.includes('/epc-leads')) return 'Website EPC Leads Management';
    if (path.includes('/website-configurations') || path.includes('/website-configuration')) return 'Website Configurations';
    if (path.includes('/industry-content')) return 'Industry CMS';
    if (path.includes('/profile')) return 'My Profile';
    if (path.includes('/account-settings')) return 'Account Settings';
    return 'Dashboard';
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

      <div className="flex flex-col flex-1 min-w-0 max-w-full">
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
                    path="/vision-dashboard"
                    element={
                      <PermissionGuard requiredUniqueId={["VISION_DASHBOARD", "00000000"]}>
                        <Suspense fallback={<Loader text="Loading vision dashboard..." />}>
                          <VisionDashboard moduleUniqueId="VISION_DASHBOARD" />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/configuration-dashboard"
                    element={
                      <PermissionGuard requiredUniqueId="00000000">
                        <Suspense fallback={<Loader text="Loading configuration dashboard..." />}>
                          <ConfigurationDashboard />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/operations-dashboard"
                    element={
                      <PermissionGuard requiredUniqueId="00000000">
                        <Suspense fallback={<Loader text="Loading Operations Dashboard..." />}>
                          <OperationsDashboard />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/epc-analytics"
                    element={
                      <PermissionGuard requiredUniqueId="00000000">
                        <Suspense fallback={<Loader text="Loading EPC Analytics Dashboard..." />}>
                          <EpcAnalyticsDashboard />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/store-dashboard"
                    element={
                      <PermissionGuard requiredUniqueId="00000000">
                        <Suspense fallback={<Loader text="Loading Store Analytics Dashboard..." />}>
                          <StoreDashboard />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
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
                    path="/bde-management/*"
                    element={
                      <PermissionGuard requiredUniqueId="ADM_BDE_MGMT">
                        <Suspense fallback={<Loader text="Loading BDE Management..." />}>
                          <BdeManagement moduleUniqueId="ADM_BDE_MGMT" />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/store-setup/*"
                    element={<Navigate to="/admin-panel/solar-shop/reseller-management/store-setup" replace />}
                  />
                  <Route
                    path="/operations/*"
                    element={
                      <PermissionGuard requiredUniqueId="ADM_OPS">
                        <Suspense fallback={<Loader text="Loading operations..." />}>
                          <Operations />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/settings/*"
                    element={
                      <PermissionGuard requiredUniqueId="ADM_ROLE_SETTINGS">
                        <Suspense fallback={<Loader text="Loading settings..." />}>
                          <Settings />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/manage-users/*"
                    element={
                      <PermissionGuard requiredUniqueId="ADM_EPC">
                        <Suspense fallback={<Loader text="Loading users..." />}>
                          <ManageUsers />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/create-users/*"
                    element={
                      <Suspense fallback={<Loader text="Loading user management..." />}>
                        <CreateUsers />
                      </Suspense>
                    }
                  />

                  <Route
                    path="/product-configurations/*"
                    element={
                      <PermissionGuard requiredUniqueId="ADM_PROD_CFG">
                        <Suspense fallback={<Loader text="Loading content..." />}>
                          <ProductConfigurations moduleUniqueId="ADM_PROD_CFG" />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/website-leads/*"
                    element={<Navigate to="/admin-panel/website-configurations/epc-leads" replace />}
                  />
                  <Route
                    path="/website-configurations/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Website Configurations..." />}>
                        <WebsiteConfiguration />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/website-configuration/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Website Configurations..." />}>
                        <WebsiteConfiguration />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/industry-content/*"
                    element={
                      <Suspense fallback={<Loader text="Loading Industry CMS..." />}>
                        <Routes>
                          <Route path="/cms" element={<IndustryContentManagement />} />
                          <Route path="/types" element={<IndustryTypeManagement />} />
                          <Route path="*" element={<IndustryContentManagement />} />
                        </Routes>
                      </Suspense>
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
