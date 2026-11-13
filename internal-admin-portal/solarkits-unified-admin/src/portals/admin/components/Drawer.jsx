import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { MdExpandMore } from "react-icons/md";
import { FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/images/logo.png";
import usePipelineStatus from "../hooks/usePipelineStatus";

const MotionLink = typeof motion.create === "function" ? motion.create(Link) : motion(Link);

/**
 * Slide-over Drawer / Panel for Forms and Detail Views
 */
function SlideOverDrawer({
  isOpen,
  onClose,
  setIsOpen,
  title,
  children,
  size = "md",
}) {
  const isVisible = Boolean(isOpen);
  const handleClose = onClose || (() => setIsOpen && setIsOpen(false));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && handleClose) {
        handleClose();
      }
    };
    if (isVisible) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isVisible, handleClose]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw]",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`w-screen ${sizeClasses[size] || "max-w-xl"} bg-surface shadow-2xl flex flex-col border-l border-border`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 gradient-primary text-text-inverse shrink-0">
                <h2 className="text-base font-bold tracking-tight">{title || "Form"}</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-text-inverse ml-auto cursor-pointer"
                  aria-label="Close"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hover">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Sidebar Navigation Drawer
 */
function NavigationDrawer({
  isOpen,
  setIsOpen,
  isMobile,
  menuItems = [],
}) {
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const { pipelineStatus, sidebarCounts } = usePipelineStatus();

  const getItemBadgeInfo = (item) => {
    if (!item) return null;

    // 1. Explicit badge provided on item
    if (item.badge !== undefined && item.badge !== null && Number(item.badge) > 0) {
      return {
        count: Number(item.badge),
        hasPendingDot: false,
        isUrgent: false,
        tooltip: `${item.badge} active item(s)`,
      };
    }

    // 2. Parent item with subMenu: Roll up sub-items count first
    if (Array.isArray(item.subMenu) && item.subMenu.length > 0) {
      let subTotal = 0;
      let hasUrgent = false;
      for (const sub of item.subMenu) {
        const subInfo = getItemBadgeInfo(sub);
        if (subInfo?.count) {
          subTotal += subInfo.count;
          if (subInfo.isUrgent) hasUrgent = true;
        }
      }
      if (subTotal > 0) {
        return {
          count: subTotal,
          hasPendingDot: hasUrgent,
          isUrgent: hasUrgent,
          tooltip: `${subTotal} active item(s) in ${item.name}`,
        };
      }
      // If subTotal is 0, check if parent has a direct count in sidebarCounts
      const key = item.step || item.badgeKey;
      if (key && sidebarCounts && Number(sidebarCounts[key]) > 0) {
        return {
          count: Number(sidebarCounts[key]),
          hasPendingDot: false,
          isUrgent: false,
          tooltip: `${sidebarCounts[key]} active item(s)`,
        };
      }
      return null;
    }

    // 3. Leaf item resolution (check sub_counts first, then top-level sidebarCounts)
    if (sidebarCounts) {
      let count = 0;
      let tooltip = "";
      let isUrgent = false;

      // 3A. Check granular sub_counts (for submenu pages)
      if (sidebarCounts.sub_counts) {
        const subCounts = sidebarCounts.sub_counts;
        const lastSegment = item.path ? item.path.split("/").filter(Boolean).pop() : null;
        const normalizedName = item.name ? item.name.toLowerCase().replace(/^[0-9.]+\s*/, "").trim() : "";

        const candidateKeys = [
          item.badgeKey,
          item.unique_id,
          lastSegment,
          normalizedName,
          item.name?.toLowerCase(),
        ].filter(Boolean);

        for (const k of candidateKeys) {
          if (subCounts[k] !== undefined && subCounts[k] !== null) {
            const data = subCounts[k];
            if (typeof data === "number" && data > 0) {
              count = data;
              tooltip = `${count} active item(s)`;
            } else if (data && typeof data === "object" && Number(data.count) > 0) {
              count = Number(data.count);
              isUrgent = Boolean(data.is_urgent);
              tooltip = data.tooltip || `${count} active item(s)`;
            }
            if (count > 0) break;
          }
        }
      }

      // 3B. If not resolved from sub_counts, check top-level module keys
      if (count === 0) {
        const key = item.step || item.badgeKey;
        if (key && sidebarCounts[key] !== undefined) {
          count = Number(sidebarCounts[key]) || 0;
        } else if (item.unique_id && sidebarCounts[item.unique_id] !== undefined) {
          count = Number(sidebarCounts[item.unique_id]) || 0;
        } else {
          const n = item.name?.toLowerCase() || "";
          const p = item.path?.toLowerCase() || "";
          if ((n.includes("epc") && (n.includes("approve") || n.includes("lead") || n.includes("website"))) || p.includes("approve-new-epc") || p.includes("website-epc")) count = sidebarCounts["02"] || 0;
          else if (n.includes("po order") || p.includes("po-orders")) count = sidebarCounts["04"] || 0;
          else if (n.includes("loose order") || p.includes("loose-orders")) count = sidebarCounts["05"] || 0;
          else if (n.includes("epc order") || p.includes("epc-orders")) count = sidebarCounts["06"] || 0;
          else if (n.includes("stage approval") || p.includes("order-approvals")) count = sidebarCounts["07"] || 0;
          else if (n.includes("delivery") || p.includes("delivery-management")) count = sidebarCounts["08"] || 0;
          else if (n.includes("service ticket") || p.includes("service-tickets")) count = sidebarCounts["12"] || 0;
          else if (n.includes("franchisee") || p.includes("reseller-management")) count = sidebarCounts["13"] || 0;
          else if (n.includes("quote") || p.includes("quote-settings")) count = sidebarCounts["14"] || 0;
          else if (n.includes("payment") && (n.includes("config") || p.includes("payment-configuration"))) count = sidebarCounts["16"] || 0;
        }
      }

      // 3C. Urgent margin pipeline status
      const isMarginItem =
        item.step === "09" ||
        item.badgeKey === "company-margin" ||
        item.unique_id === "ADM_CO_MARGIN" ||
        item.name?.toLowerCase().includes("margin") ||
        item.path?.includes("/company-margin");

      if (isMarginItem && (pipelineStatus?.company_margin?.has_pending || sidebarCounts?.company_margin?.has_pending)) {
        const mCount = pipelineStatus?.company_margin?.count || sidebarCounts?.company_margin?.count || count;
        return {
          count: mCount,
          hasPendingDot: true,
          isUrgent: true,
          tooltip: `${mCount} kit(s) pending company margin configuration`,
        };
      }

      // 3D. Urgent kit activation pipeline status
      const isActivationItem =
        item.step === "10" ||
        item.unique_id === "ADM_WH_KIT_ACT" ||
        item.name?.toLowerCase().includes("kit activation") ||
        item.path?.includes("/warehouse-kit-activations");

      if (isActivationItem && (pipelineStatus?.kit_activations?.has_pending || sidebarCounts?.kit_activations?.has_pending)) {
        const aCount = pipelineStatus?.kit_activations?.count || sidebarCounts?.kit_activations?.count || count;
        return {
          count: aCount,
          hasPendingDot: true,
          isUrgent: true,
          tooltip: `${aCount} kit(s) pending warehouse kit activation`,
        };
      }

      // 3E. Format tooltip and urgency if count > 0
      if (count > 0) {
        if (!tooltip) {
          if (item.step === "02" || item.unique_id === "ADM_APPROVE_EPC" || item.name?.toLowerCase().includes("epc")) {
            tooltip = `${count} Website EPC Lead(s) pending onboarding`;
            isUrgent = true;
          } else if (item.step === "04") {
            tooltip = `${count} PO Order(s) in active pipeline`;
          } else if (item.step === "05") {
            tooltip = `${count} Loose Order(s) in active pipeline`;
          } else if (item.step === "06") {
            tooltip = `${count} EPC Order(s) pending verification`;
            isUrgent = true;
          } else if (item.step === "07") {
            tooltip = `${count} Stage Approval(s) awaiting Admin action`;
            isUrgent = true;
          } else if (item.step === "08") {
            tooltip = `${count} Order(s) in delivery queue / approval`;
          } else if (item.step === "11") {
            tooltip = `${count} Overdue order(s) requiring action`;
            isUrgent = true;
          } else if (item.step === "12") {
            tooltip = `${count} Open Service Ticket(s)`;
          } else if (item.step === "13") {
            tooltip = `${count} Franchisee store(s) / payout(s) pending`;
          } else if (item.step === "14") {
            tooltip = `${count} Custom Quote request(s) pending`;
          } else if (item.step === "16") {
            tooltip = `${count} Offline payment(s) pending verification`;
            isUrgent = true;
          } else {
            tooltip = `${count} active item(s)`;
          }
        }

        return {
          count,
          hasPendingDot: isUrgent,
          isUrgent,
          tooltip,
        };
      }
    }

    return null;
  };

  const getItemPendingStatus = getItemBadgeInfo;

  const getTargetPath = (path) => {
    if (!path) return "";
    if (path.includes("/industry-content/") || path.includes("/website-configuration")) {
      return path;
    }
    let targetPath = path;
    const slugs = [
      "solar-shop",
      "solar-shop-solarkits",
      "solar-shop-bos-kits",
      "solar-shop-boskits",
    ];
    for (const slug of slugs) {
      if (targetPath.includes(`/${slug}/`)) {
        const storedCountry = localStorage.getItem("selected_country_admin") || "india";
        targetPath = targetPath.replace(`/${slug}/`, `/${slug}/${storedCountry.toLowerCase()}/`);
      }
    }
    return targetPath;
  };

  // Collect all leaf navigation items with both rawPath and targetPath
  const leafNavItems = useMemo(() => {
    const leaves = [];
    const extract = (list) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (!item) continue;
        if (Array.isArray(item)) {
          extract(item);
        } else if (Array.isArray(item.subMenu) && item.subMenu.length > 0) {
          extract(item.subMenu);
        } else if (item.path) {
          const target = getTargetPath(item.path);
          leaves.push({
            name: item.name,
            path: item.path,
            targetPath: target.replace(/\/+$/, ""),
            rawPath: item.path.replace(/\/+$/, ""),
          });
        }
      }
    };
    extract(menuItems);
    return leaves;
  }, [menuItems]);

  // Determine the single active leaf item (exact match first, then query param match, then longest matching prefix)
  const activeLeafItem = useMemo(() => {
    const currentPath = (location.pathname || "").replace(/\/+$/, "");
    const currentSearch = location.search || "";
    const currentFull = (currentPath + currentSearch).replace(/\/+$/, "");
    if (!currentPath || leafNavItems.length === 0) return null;

    // 1. Exact match with full path + query string (for tabbed sub-items like ?tab=map)
    if (currentSearch) {
      const exactFull = leafNavItems.find(
        (leaf) => leaf.targetPath === currentFull || leaf.rawPath === currentFull
      );
      if (exactFull) return exactFull;

      // Match by comparing URLSearchParams
      const currentParams = new URLSearchParams(currentSearch);
      const queryMatch = leafNavItems.find((leaf) => {
        const leafTarget = leaf.targetPath || "";
        const leafRaw = leaf.rawPath || "";
        const [targetBase, targetQuery] = leafTarget.split("?");
        const [rawBase, rawQuery] = leafRaw.split("?");

        const baseMatches = targetBase === currentPath || rawBase === currentPath;
        if (!baseMatches) return false;

        const leafQuery = targetQuery || rawQuery;
        if (!leafQuery) return false;

        const leafParams = new URLSearchParams(leafQuery);
        let allMatch = true;
        for (const [key, val] of leafParams.entries()) {
          if (currentParams.get(key) !== val) {
            allMatch = false;
            break;
          }
        }
        return allMatch;
      });
      if (queryMatch) return queryMatch;
    }

    // 2. Exact match with pathname only (when no query string, or for sub-items without query strings)
    const exactPath = leafNavItems.find(
      (leaf) => leaf.targetPath === currentPath || leaf.rawPath === currentPath
    );
    if (exactPath) return exactPath;

    // 3. Fallback for default tab when on a parent route with tabs (e.g. /franchise-clusters defaults to tab=clusters)
    if (!currentSearch) {
      const defaultTabMatch = leafNavItems.find((leaf) => {
        const targetBase = (leaf.targetPath || "").split("?")[0];
        const rawBase = (leaf.rawPath || "").split("?")[0];
        if (targetBase === currentPath || rawBase === currentPath) {
          const query = (leaf.targetPath || "").split("?")[1] || (leaf.rawPath || "").split("?")[1] || "";
          return query.includes("tab=clusters") || query.includes("default=true");
        }
        return false;
      });
      if (defaultTabMatch) return defaultTabMatch;
    }

    // 4. Prefix match for sub-routes (e.g. details, edit forms)
    // Longest matching prefix wins so deeper child paths take priority over shorter base paths
    const prefixMatches = leafNavItems.filter((leaf) => {
      const targetBase = (leaf.targetPath || "").split("?")[0];
      const rawBase = (leaf.rawPath || "").split("?")[0];
      return (
        (targetBase && currentPath.startsWith(targetBase + "/")) ||
        (rawBase && currentPath.startsWith(rawBase + "/"))
      );
    });

    if (prefixMatches.length > 0) {
      prefixMatches.sort((a, b) => {
        const lenA = Math.max(a.targetPath.length, a.rawPath.length);
        const lenB = Math.max(b.targetPath.length, b.rawPath.length);
        return lenB - lenA;
      });
      return prefixMatches[0];
    }

    return null;
  }, [location.pathname, location.search, leafNavItems]);

  // Check if a parent item contains the active leaf
  const isParentOfActive = (parentItem) => {
    if (!parentItem || !activeLeafItem || !Array.isArray(parentItem.subMenu)) return false;
    return parentItem.subMenu.some((child) => {
      if (!child.subMenu || child.subMenu.length === 0) {
        return child.path === activeLeafItem.path && child.name === activeLeafItem.name;
      }
      return isParentOfActive(child);
    });
  };

  const toggleMenu = (name, depth) => {
    setOpenMenus((prev) => {
      const newOpenMenus = { ...prev };

      Object.keys(newOpenMenus).forEach((key) => {
        if (newOpenMenus[key]?.depth === depth) delete newOpenMenus[key];
      });

      const isCurrentlyOpen = prev[name]?.open;
      newOpenMenus[name] = { open: !isCurrentlyOpen, depth };
      return newOpenMenus;
    });
  };

  useEffect(() => {
    if (!activeLeafItem || !Array.isArray(menuItems) || menuItems.length === 0) return;

    const activeParents = {};
    const traverse = (items, depth = 0) => {
      if (!Array.isArray(items)) return false;
      let hasActive = false;
      for (const item of items) {
        if (!item) continue;
        if (Array.isArray(item)) {
          if (traverse(item, depth)) hasActive = true;
        } else if (Array.isArray(item.subMenu) && item.subMenu.length > 0) {
          const isChildActive = traverse(item.subMenu, depth + 1);
          if (isChildActive) {
            activeParents[item.name] = { open: true, depth };
            hasActive = true;
          }
        } else if (item.path === activeLeafItem.path && item.name === activeLeafItem.name) {
          hasActive = true;
        }
      }
      return hasActive;
    };

    traverse(menuItems);

    if (Object.keys(activeParents).length > 0) {
      setOpenMenus((prev) => {
        const nextOpen = { ...prev };
        Object.keys(activeParents).forEach((name) => {
          if (!nextOpen[name]?.open) {
            nextOpen[name] = { open: true, depth: activeParents[name].depth };
          }
        });
        return nextOpen;
      });
    }
  }, [activeLeafItem, menuItems]);

  const renderMenuItems = (items, depth = 0) => {
    if (!Array.isArray(items)) return null;
    return (
      <ul className={`${depth > 0 ? "ps-2 mt-1 space-y-1" : "px-2 space-y-1"}`}>
        {items.map((item) => {
          if (!item) return null;
          const hasSub = Array.isArray(item.subMenu) && item.subMenu.length > 0;
          const isOpen = openMenus[item.name]?.open;
          const isLeafActive = !hasSub && activeLeafItem && (activeLeafItem.path === item.path && activeLeafItem.name === item.name);
          const isParentActive = hasSub && isParentOfActive(item);
          const targetPath = hasSub ? "" : getTargetPath(item.path);
          const badgeInfo = getItemBadgeInfo(item);

          return (
            <div key={item.name || Math.random()}>
              <li>
                {hasSub ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleMenu(item.name, depth)}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group cursor-pointer text-left
                      ${isParentActive
                        ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-xs"
                        : "text-text-secondary bg-transparent hover:bg-surface-hover hover:text-primary"
                      }`}
                  >
                    <div className="flex gap-2.5 items-center min-w-0 flex-1 mr-1.5 text-left">
                      <span
                        className={`text-xl min-w-6 flex justify-center transition-colors ${
                          isParentActive ? "text-primary" : "text-primary group-hover:scale-110"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`flex-1 font-semibold text-[13.5px] tracking-tight truncate overflow-hidden text-ellipsis whitespace-nowrap text-left ${
                          isParentActive ? "text-primary font-bold" : "text-text-primary"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {badgeInfo?.count > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-black shrink-0 transition-all ${
                            isParentActive
                              ? "bg-primary text-white shadow-xs"
                              : badgeInfo.isUrgent
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-primary/15 text-primary border border-primary/25"
                          }`}
                          title={badgeInfo.tooltip}
                        >
                          {badgeInfo.count}
                        </span>
                      )}
                      {badgeInfo?.hasPendingDot && (
                        <span
                          className="relative flex items-center justify-center shrink-0 mr-0.5"
                          title={badgeInfo.tooltip}
                        >
                          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                        </span>
                      )}
                      <span
                        className={`text-lg flex justify-center transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <MdExpandMore />
                      </span>
                    </div>
                  </motion.button>
                ) : (
                  <MotionLink
                    to={targetPath}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      if (isMobile && setIsOpen) setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full ${
                      depth > 0 ? "px-3 py-2 pl-3.5 rounded-lg" : "px-3.5 py-2.5 rounded-xl"
                    } transition-all duration-300 whitespace-nowrap group
                    ${isLeafActive
                        ? "gradient-primary text-white shadow-md shadow-primary/20 font-bold"
                        : "text-text-secondary bg-transparent hover:bg-surface-hover hover:text-primary"
                      }`}
                  >
                    <div className="flex gap-2.5 items-center min-w-0 flex-1 mr-1.5 text-left">
                      <span
                        className={`${depth > 0 ? "text-lg min-w-5" : "text-xl min-w-6"} flex justify-center transition-colors ${
                          isLeafActive ? "text-white" : "text-primary group-hover:scale-110"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`flex-1 ${depth > 0 ? "text-[13px]" : "text-[13.5px]"} tracking-tight truncate overflow-hidden text-ellipsis whitespace-nowrap text-left ${
                          isLeafActive ? "text-white font-bold" : "text-text-primary font-semibold"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {badgeInfo?.count > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full ${depth > 0 ? "text-[10px]" : "text-[10.5px]"} font-mono font-black shrink-0 transition-all ${
                            isLeafActive
                              ? "bg-white text-primary shadow-xs"
                              : badgeInfo.isUrgent
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-primary/15 text-primary border border-primary/25"
                          }`}
                          title={badgeInfo.tooltip}
                        >
                          {badgeInfo.count}
                        </span>
                      )}
                      {badgeInfo?.hasPendingDot && !isLeafActive && (
                        <span
                          className="relative flex items-center justify-center shrink-0"
                          title={badgeInfo.tooltip}
                        >
                          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                        </span>
                      )}
                    </div>
                  </MotionLink>
                )}
              </li>

              {/* Animated submenu open/close */}
              {hasSub && (
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={item.name}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      {renderMenuItems(item.subMenu, depth + 1)}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </ul>
    );
  };

  const items = Array.isArray(menuItems) ? menuItems : [];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-999"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      {/* Drawer container with animation */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.aside
            key="drawer"
            initial={{ x: isMobile ? "-100%" : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ? "-100%" : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`shadow-xl flex flex-col transition-colors duration-300 ${
              isMobile
                ? "fixed top-0 left-0 h-screen z-1000 bg-surface w-72"
                : "h-screen w-64 bg-surface border-r border-border shrink-0"
            }`}
          >
            {/* Logo */}
            <div className="flex items-center justify-center p-6 border-b border-border min-h-[100px] bg-gradient-to-b from-primary/5 to-transparent">
              <img
                src={logo}
                alt="Logo"
                className="w-32 h-auto hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto scrollbar-hover py-4">
              {items.map((section, index) => {
                const sectionList = Array.isArray(section) ? section : [section];
                return (
                  <div
                    key={index}
                    className={`py-1 ${
                      index !== items.length - 1 ? "border-b border-border/50 mb-1" : ""
                    }`}
                  >
                    {renderMenuItems(sectionList)}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer/Support */}
            <div className="p-4 border-t border-border bg-gradient-to-t from-primary/5 to-transparent">
              <div className="bg-surface-hover rounded-2xl p-4 border border-border/50 group cursor-pointer hover:border-primary/30 transition-all duration-300">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Need Help?
                </p>
                <p className="text-sm text-text-primary font-medium group-hover:text-primary transition-colors">
                  Contact Support
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Dual-Mode Drawer Component:
 * - Slide-Over Mode: when `children` is provided.
 * - Sidebar Navigation Mode: when no `children` is provided.
 */
export default function Drawer(props) {
  if (props.children) {
    return <SlideOverDrawer {...props} />;
  }
  return <NavigationDrawer {...props} />;
}