import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/images/logo.png"

const MotionLink = motion.create(Link);

export default function Drawer({ isOpen, setIsOpen, isMobile, menuItems }) {
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleClick = (item, depth) => {
    if (item.subMenu) {
      toggleMenu(item.name, depth);
    } else {
      navigate(item.path);
      if (isMobile) setIsOpen(false);
    }
  };

  const renderMenuItems = (items, depth = 0) => (
    <ul className={`${depth > 0 ? "ps-2 mt-1 space-y-1" : "px-2 space-y-1"}`}>
      {items.map((item) => {
        const isActive = location.pathname.includes(item.path);
        const isOpen = openMenus[item.name]?.open;
        const hasSub = !!item.subMenu;

        return (
          <div key={item.name}>
            <li>
              {hasSub ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => toggleMenu(item.name, depth)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group
                    ${isActive
                      ? "gradient-primary text-white shadow-md shadow-primary/20"
                      : "text-text-secondary bg-transparent hover:bg-surface-hover hover:text-primary"
                    }`}
                >
                  <div
                    className="flex gap-3 items-center max-w-[calc(100%-20px)]"
                  >
                    <span
                      className={`text-xl min-w-6 flex justify-center transition-colors ${isActive ? "text-white" : "text-primary group-hover:scale-110"
                        }`}
                    >
                      {item.icon}
                    </span>
                    <span className={`flex-1 font-semibold text-[13.5px] tracking-tight truncate overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? "text-white" : "text-text-primary"}`}>
                      {item.name}
                    </span>
                  </div>
                  <span className={`text-lg flex justify-center transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                    <MdExpandMore />
                  </span>
                </motion.button>
              ) : (
                <MotionLink
                  to={item.path}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (isMobile) setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group
                    ${isActive
                      ? "gradient-primary text-white shadow-md shadow-primary/20"
                      : "text-text-secondary bg-transparent hover:bg-surface-hover hover:text-primary"
                    }`}
                >
                  <div className="flex gap-3 items-center max-w-full">
                    <span
                      className={`text-xl min-w-6 flex justify-center transition-colors ${isActive ? "text-white" : "text-primary group-hover:scale-110"
                        }`}
                    >
                      {item.icon}
                    </span>
                    <span className={`flex-1 font-semibold text-[13.5px] tracking-tight truncate overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? "text-white" : "text-text-primary"}`}>
                      {item.name}
                    </span>
                  </div>
                </MotionLink>
              )}
            </li>

            {/* 🔹 Animated submenu open/close */}
            {item.subMenu && (
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

  return (
    <>
      {/* 🔹 Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-999"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🔹 Drawer container with animation */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.aside
            key="drawer"
            initial={{ x: isMobile ? "-100%" : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ? "-100%" : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`shadow-xl flex flex-col transition-colors duration-300 ${isMobile
                ? "fixed top-0 left-0 h-screen z-1000 bg-surface w-72"
                : "h-screen w-64 bg-surface border-r border-border shrink-0"
              }`}
          >
            {/* Logo */}
            <div className="flex items-center justify-center p-6 border-b border-border min-h-[100px] bg-gradient-to-b from-primary/5 to-transparent">
              <img src={logo} alt="Logo" className="w-32 h-auto hover:scale-105 transition-transform duration-300" />
            </div>

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto scrollbar-hover py-4">
              {menuItems.map((section, index) => (
                <div key={index} className={`py-1 ${index !== menuItems.length - 1 ? "border-b border-border/50 mb-1" : ""}`}>
                  {renderMenuItems(section)}
                </div>
              ))}
            </div>

            {/* Sidebar Footer/Support */}
            <div className="p-4 border-t border-border bg-gradient-to-t from-primary/5 to-transparent">
              <div className="bg-surface-hover rounded-2xl p-4 border border-border/50 group cursor-pointer hover:border-primary/30 transition-all duration-300">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Need Help?</p>
                <p className="text-sm text-text-primary font-medium group-hover:text-primary transition-colors">Contact Support</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}