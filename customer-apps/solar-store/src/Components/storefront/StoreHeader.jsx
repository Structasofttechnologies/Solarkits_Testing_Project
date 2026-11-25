import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiShoppingCart,
  FiUser,
  FiLayers,
  FiMenu,
  FiX,
  FiTrash2,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiPackage,
  FiShield,
  FiHelpCircle,
  FiMapPin
} from "react-icons/fi";
import { MdLogin, MdLogout, MdSettings, MdShoppingBag } from "react-icons/md";
import { logout } from "@/features/auth.slice";
import { setAlert } from "@/features/alert.slice";
import {
  selectCartTotalItems,
  selectCartTotal,
  removeFromCart,
  setShowAuthDialog
} from "@/features/slice";
import { useTheme } from "@/hooks/useTheme";
import logo from "@/assets/images/logo.png";
import Button from "../Button";
import IconButton from "../IconButton";

export default function StoreHeader({
  onOpenMobileMenu,
  compareCount = 0,
  onOpenCompare,
  onOpenExpertHelp
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { toggleTheme, isDark } = useTheme();

  const cart = useSelector((state) => state.slice.cart);
  const totalCartItems = useSelector(selectCartTotalItems);
  const cartTotalAmount = useSelector(selectCartTotal);
  const availableKits = useSelector((state) => state.slice.availableKits || []);
  const { user, isAuthenticated } = useSelector((state) => state.auth_slice);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef(null);
  const cartRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setShowCartDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter kit suggestions for search dropdown
  const filteredSuggestions = React.useMemo(() => {
    if (!searchQuery.trim() || !Array.isArray(availableKits)) return [];
    const q = searchQuery.toLowerCase();
    return availableKits
      .filter((k) =>
        k.kitName?.toLowerCase().includes(q) ||
        k.usageType?.toLowerCase().includes(q) ||
        k.category?.toLowerCase().includes(q) ||
        k.brand?.toLowerCase().includes(q) ||
        `${k.capacityKW}kw`.includes(q.replace(/\s+/g, ''))
      )
      .slice(0, 5);
  }, [searchQuery, availableKits]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchSuggestions(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      dispatch(setAlert({ type: "success", message: "Logged out successfully" }));
      navigate("/auth/login");
    } catch (err) {
      dispatch(setAlert({ type: "error", message: "Logout failed. Please try again." }));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 space-y-2 md:space-y-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6">

          {/* Mobile hamburger + Brand Logo */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {onOpenMobileMenu && (
              <IconButton
                variant="ghost"
                size="md"
                onClick={onOpenMobileMenu}
                className="lg:hidden text-text-primary hover:bg-surface-hover p-1.5 sm:p-2 rounded-xl"
                aria-label="Open Mobile Menu"
              >
                <FiMenu size={22} />
              </IconButton>
            )}

            {/* Official SOLARKITS Logo */}
            <Link to="/" className="flex items-center group py-0.5 shrink-0" title="SOLARKITS - A Solar Marketplace">
              <img
                src={logo}
                alt="SOLARKITS - A Solar Marketplace"
                className="h-7 sm:h-8 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
              />
            </Link>
          </div>

          {/* Desktop/Tablet Center: Large E-Commerce Search Bar */}
          <div className="hidden md:block flex-1 max-w-2xl relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                placeholder="Search by kit size (e.g. 3kW, 5kW), application, or technology..."
                className="w-full pl-10 pr-24 py-2 sm:py-2.5 bg-surface-hover hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-full text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all"
              />
              <FiSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                size={17}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-16 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <FiX size={14} />
                </button>
              ) : null}
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Search</span>
              </button>
            </form>

            {/* Live Search Suggestions Dropdown */}
            {showSearchSuggestions && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-border">
                {filteredSuggestions.length > 0 ? (
                  <div className="py-2">
                    <div className="px-4 py-1 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Recommended Solar Kits
                    </div>
                    {filteredSuggestions.map((kit) => (
                      <Link
                        key={kit.id}
                        to={`/shop?search=${encodeURIComponent(kit.kitName)}`}
                        onClick={() => setShowSearchSuggestions(false)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-primary-soft transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                            <FiPackage className="text-primary" size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary">{kit.kitName}</p>
                            <p className="text-[11px] text-text-secondary">
                              {kit.capacityKW} kW • {kit.usageType || kit.category}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          ₹{kit.variants?.[0]?.ourPrice?.toLocaleString("en-IN") || ""}
                        </span>
                      </Link>
                    ))}
                    <div className="p-2 border-t border-border bg-surface-hover text-center">
                      <button
                        onClick={handleSearchSubmit}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        View all results for "{searchQuery}" →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-text-secondary">
                    No complete solar kits found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Compare, Store Locator, Cart, Theme, Account */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Find Nearby Store Trigger (Desktop) */}
            <Link
              to="/store-locator"
              className="relative hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
              title="Find Nearby SolarKit Store"
            >
              <FiMapPin size={16} className="text-secondary" />
              <span className="hidden lg:inline">Find Store</span>
            </Link>

            {/* Compare Kits trigger (Desktop) */}
            {onOpenCompare && (
              <button
                onClick={onOpenCompare}
                className="relative hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors cursor-pointer"
                title="Compare Solar Kits"
              >
                <FiLayers size={16} className="text-primary" />
                <span className="hidden lg:inline">Compare</span>
                {compareCount > 0 && (
                  <span className="bg-secondary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {compareCount}
                  </span>
                )}
              </button>
            )}


            {/* Theme Toggle */}
            <IconButton
              variant="ghost"
              size="md"
              onClick={toggleTheme}
              className="text-text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <FiSun className="text-amber-400" size={18} /> : <FiMoon size={18} />}
            </IconButton>

            {/* Shopping Cart Button + Dropdown */}
            <div className="relative" ref={cartRef}>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    dispatch(setShowAuthDialog(true));
                  } else {
                    setShowCartDropdown((prev) => !prev);
                  }
                }}
                className="relative flex items-center justify-center p-2 rounded-xl text-text-primary hover:bg-primary-soft transition-colors group cursor-pointer"
                aria-label="View Shopping Cart"
              >
                <FiShoppingCart size={21} className="text-text-primary group-hover:text-primary transition-colors" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-md animate-in zoom-in-95">
                    {totalCartItems > 99 ? "99+" : totalCartItems}
                  </span>
                )}
              </button>

              {/* Mini-Cart Dropdown Panel */}
              {showCartDropdown && isAuthenticated && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-primary-soft border-b border-border">
                    <div className="flex items-center gap-2">
                      <FiShoppingCart className="text-primary" size={17} />
                      <span className="font-bold text-sm text-text-primary">
                        Your Cart ({totalCartItems} {totalCartItems === 1 ? "Kit" : "Kits"})
                      </span>
                    </div>
                    <Link
                      to="/cart"
                      onClick={() => setShowCartDropdown(false)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      View Full Cart
                    </Link>
                  </div>

                  {cart.length === 0 ? (
                    <div className="p-8 text-center">
                      <FiShoppingCart className="text-text-muted mx-auto mb-2 opacity-40" size={36} />
                      <p className="text-sm font-semibold text-text-primary">Your cart is empty</p>
                      <p className="text-xs text-text-muted mt-1">Explore our complete solar power kits to get started</p>
                      <Button
                        onClick={() => {
                          setShowCartDropdown(false);
                          navigate("/shop");
                        }}
                        variant="primary"
                        size="sm"
                        className="mt-4"
                      >
                        Explore Solar Kits
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                        {cart.map((item) => (
                          <li key={item.cartItemId} className="p-3.5 hover:bg-surface-hover transition-colors flex items-center gap-3 group">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border p-1 flex items-center justify-center shrink-0">
                              <img
                                src={item.kitImage || "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=80"}
                                alt={item.kitName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-text-primary truncate">{item.kitName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-primary-soft text-primary font-bold px-1.5 py-0.5 rounded">
                                  {item.productTier}
                                </span>
                                <span className="text-[10px] text-text-secondary">Qty: {item.qty}</span>
                              </div>
                              <p className="text-xs font-bold text-primary mt-1">
                                ₹{(item.ourPrice * item.qty).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <button
                              onClick={() => dispatch(removeFromCart(item.cartItemId))}
                              className="text-text-muted hover:text-danger p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="p-4 bg-surface-hover border-t border-border space-y-3">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-text-secondary">Subtotal (Incl. GST):</span>
                          <span className="text-primary text-base font-extrabold">
                            ₹{cartTotalAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              setShowCartDropdown(false);
                              navigate("/cart");
                            }}
                            variant="secondary"
                            size="md"
                            fullWidth
                          >
                            View Cart
                          </Button>
                          <Button
                            onClick={() => {
                              setShowCartDropdown(false);
                              navigate("/checkout");
                            }}
                            variant="primary"
                            size="md"
                            fullWidth
                            rightIcon={<FiChevronRight size={14} />}
                          >
                            Checkout
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Account / Sign In */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown((prev) => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=0575B8&color=ffffff&bold=true`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-primary/40 shadow-xs"
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-text-primary truncate max-w-[120px]">{user.name}</p>
                    <p className="text-[10px] text-text-muted">Account</p>
                  </div>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-surface border border-border rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-xs font-bold text-text-primary">{user.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                    </div>
                    <ul className="py-1">
                      <li>
                        <Link
                          to="/track-status"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <MdShoppingBag size={16} className="text-primary" />
                          <span>My Orders & Tracking</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <FiUser size={16} className="text-primary" />
                          <span>Account Settings</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/compare"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <FiLayers size={16} className="text-primary" />
                          <span>Saved Comparisons</span>
                        </Link>
                      </li>
                    </ul>
                    <div className="pt-1 border-t border-border">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-danger hover:bg-danger-soft transition-colors"
                      >
                        <MdLogout size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/auth/login")}
                leftIcon={<MdLogin size={15} />}
                className="font-bold rounded-xl text-xs py-1.5 px-3"
              >
                <span>Sign In</span>
              </Button>
            )}

          </div>
        </div>

        {/* Mobile Full-Width Search Input Row (< md) */}
        <div className="block md:hidden relative pt-0.5" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder="Search solar kits (e.g. 3kW, 5kW, On-Grid)..."
              className="w-full pl-9 pr-20 py-2 bg-surface-hover hover:bg-slate-100 dark:hover:bg-slate-800 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none transition-all"
            />
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
              size={15}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
              >
                <FiX size={13} />
              </button>
            ) : null}
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center cursor-pointer"
            >
              <span>Search</span>
            </button>
          </form>

          {/* Mobile Live Search Suggestions Dropdown */}
          {showSearchSuggestions && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-border">
              {filteredSuggestions.length > 0 ? (
                <div className="py-1.5">
                  <div className="px-3 py-1 text-[9px] uppercase font-bold text-text-muted tracking-wider">
                    Recommended Solar Kits
                  </div>
                  {filteredSuggestions.map((kit) => (
                    <Link
                      key={kit.id}
                      to={`/shop?search=${encodeURIComponent(kit.kitName)}`}
                      onClick={() => setShowSearchSuggestions(false)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-primary-soft transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                          <FiPackage className="text-primary" size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{kit.kitName}</p>
                          <p className="text-[10px] text-text-secondary truncate">
                            {kit.capacityKW} kW • {kit.usageType || kit.category}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">
                        ₹{kit.variants?.[0]?.ourPrice?.toLocaleString("en-IN") || ""}
                      </span>
                    </Link>
                  ))}
                  <div className="p-1.5 border-t border-border bg-surface-hover text-center">
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      View all results for "{searchQuery}" →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-text-secondary">
                  No complete solar kits found matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
