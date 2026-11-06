import { Route, Routes, useLocation, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Drawer from "../components/Drawer";
import { FaHome } from "react-icons/fa"
import { lazy, Suspense, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion";
import { MdEngineering, MdViewModule } from "react-icons/md";
import { PermissionGuard } from "../components/PermissionGuard";
import { useSelector } from "react-redux";
import Loader from "../components/Loader";
import { selectAllowedUniqueIds } from "../features/modules.slice";

const Home = lazy(() => import("../pages/Home"));
const UserPanels = lazy(() => import("../pages/UserPanels"));
const Modules = lazy(() => import("../pages/Modules"));
const Profile = lazy(() => import("../pages/Profile"));
const AccountSettings = lazy(() => import("../pages/AccountSettings"));

const menus = [
  [
    {
      name: "Dashboard",
      icon: <FaHome />,
      path: "/developer-panel/home",
      unique_id: "00000000"
    },
  ],
  [
    {
      name: "User Panels",
      icon: <MdEngineering />,
      path: "/developer-panel/user-panels",
      unique_id: "DEV_PANELS"
    },
    {
      name: "Modules",
      icon: <MdViewModule />,
      path: "/developer-panel/modules",
      unique_id: "DEV_MODULES"
    },
    {
      name: "Warehouse Modules",
      icon: <MdViewModule />,
      path: "/developer-panel/warehouse-modules",
      unique_id: "DEV_WH_MODULES"
    },
  ],
];

const isModuleAllowed = (menu, allowedUniqueIds) => {
  if (!menu.unique_id) return false;
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


  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/$/, "");
    if (normalizedPath === "/developer-panel") {
      navigate("/developer-panel/home", { replace: true });
    } else if (normalizedPath.startsWith("/developer-panel/solar-shop")) {
      navigate("/admin-panel/solar-shop/india/home", { replace: true });
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

  const filteredMenus = filterMenusByPermission(menus, allowedUniqueIds);
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
          title="Developer Dashboard"
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
                    path="/home/*"
                    element={
                      <PermissionGuard requiredUniqueId="00000000">
                        <Suspense fallback={<Loader text="Loading home..." />}>
                          <Home />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/user-panels"
                    element={
                      <PermissionGuard requiredUniqueId="DEV_PANELS">
                        <Suspense fallback={<Loader text="Loading user panels..." />}>
                          <UserPanels moduleUniqueId="DEV_PANELS" />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/modules"
                    element={
                      <PermissionGuard requiredUniqueId="DEV_MODULES">
                        <Suspense fallback={<Loader text="Loading modules..." />}>
                          <Modules moduleUniqueId="DEV_MODULES" />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/warehouse-modules"
                    element={
                      <PermissionGuard requiredUniqueId="DEV_WH_MODULES">
                        <Suspense fallback={<Loader text="Loading warehouse modules..." />}>
                          <Modules moduleUniqueId="DEV_WH_MODULES" presetPanelPrefix="/warehouse-management-panel" />
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
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
