// components/Drawer.jsx
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { FaLock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "./Tooltip";
import logo from "@/assets/images/logo.png";
import { setShowAuthDialog } from "@/features/slice";

const MotionLink = motion.create(Link);

export default function Drawer({ isOpen, setIsOpen, isMobile, menuItems }) {
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get authentication state from Redux
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

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

  const handleClick = (item, depth, isLocked) => {
    // Show auth dialog if locked
    if (isLocked) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    
    if (item.subMenu) {
      toggleMenu(item.name, depth);
    } else {
      navigate(item.path);
      if (isMobile) setIsOpen(false);
    }
  };

  const renderMenuItems = (items, depth = 0) => (
    <ul className={`${depth > 0 ?"ps-2 mt-1 space-y-1" :"px-2 space-y-1"}`}>
      {items.map((item) => {
        // Check if item is locked
        const isLocked = item.requiresAuth && !isAuthenticated;
        const isActive = !isLocked && (
          location.pathname.includes(item.path) ||
          (item.path === "/preconfigured-combo-kit" && (location.pathname.includes("/dashboard") || location.pathname === "/"))
        );
        const isOpen = openMenus[item.name]?.open;
        const hasSub = !!item.subMenu;

        const linkClasses =`flex items-center justify-between w-full px-2 py-2 rounded-md transition-colors whitespace-nowrap
          ${isLocked
            ?"text-text-secondary opacity-50 cursor-not-allowed"
            : isActive
            ?"btn-primary text-text-inverse"
            :"text-text-secondary bg-surface hover:bg-surface-hover hover:text-text-primary"
          }`;

        const innerContent = (
          <div
            className={`flex gap-2 items-center ${
              item.subMenu && !isLocked
                ?"max-w-[calc(100%-15px)]"
                :"max-w-full"
            }`}
          >
            <span
              className={`text-xl min-w-6 flex justify-center ${
                isLocked
                  ?"text-text-secondary"
                  : isActive
                  ?"text-text-inverse"
                  :"text-primary dark:text-text-secondary"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1 font-medium text-[14px] truncate overflow-hidden text-ellipsis whitespace-nowrap">
              {item.name}
            </span>
          </div>
        );

        const rightIcons = (
          <div className="flex items-center gap-1">
            {isLocked && (
              <span className="text-sm flex justify-center">
                <FaLock />
              </span>
            )}
            {item?.subMenu && !isLocked && (
              <span className="text-xl flex justify-center">
                {isOpen ? <MdExpandLess /> : <MdExpandMore />}
              </span>
            )}
          </div>
        );

        const renderItemLink = () => {
          if (isLocked || hasSub) {
            return (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleClick(item, depth, isLocked)}
                className={linkClasses}
              >
                {innerContent}
                {rightIcons}
              </motion.button>
            );
          } else {
            return (
              <MotionLink
                to={item.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isMobile) setIsOpen(false);
                }}
                className={linkClasses}
              >
                {innerContent}
                {rightIcons}
              </MotionLink>
            );
          }
        };

        const itemContent = renderItemLink();

        return (
          <div key={item.name}>
            <li>
              {isLocked ? (
                <Tooltip text="Sign In to use this functionality" position="right">
                  {itemContent}
                </Tooltip>
              ) : (
                itemContent
              )}
            </li>

            {/* Submenu - only render if not locked */}
            {item.subMenu && !isLocked && (
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={item.name}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height:"auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease:"easeInOut" }}
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

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-999"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer container with animation */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.aside
            key="drawer"
            initial={{ x: isMobile ?"-100%" : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ?"-100%" : 0 }}
            transition={{ duration: 0.25, ease:"easeInOut" }}
            className={`shadow-lg ${
              isMobile
                ?"fixed top-0 left-0 h-screen z-1000 bg-surface w-72"
                :"h-screen w-60 bg-surface border-r border-border shrink-0"
            }`}
          >
            {/* Logo */}
            <div className="flex items-center justify-center p-4 border-b border-border min-h-25">
              <img src={logo} alt="Logo" className="w-28 h-auto" />
            </div>

            {/* Menu Sections */}
            <div className="flex-1 max-h-[calc(100vh-110px)] overflow-y-auto scrollbar-hover">
              {menuItems.map((section, index) => (
                <div key={index} className="border-b border-border py-2">
                  {renderMenuItems(section)}
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}