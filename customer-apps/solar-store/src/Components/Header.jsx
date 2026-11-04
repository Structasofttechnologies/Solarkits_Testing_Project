import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MdMenu, MdSettings, MdLogin, MdLogout } from "react-icons/md";
import { FaWarehouse, FaLock, FaExclamationTriangle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { HiUser, HiUserAdd } from "react-icons/hi";
import { FiSun, FiMoon, FiShoppingCart, FiTrash2, FiChevronRight, FiMapPin, FiUsers, FiBriefcase, FiExternalLink } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/features/auth.slice";
import { setAlert } from "@/features/alert.slice";
import {
  setSelectedLocation,
  setPendingLocationChange,
  setShowAuthDialog,
  selectCartTotalItems,
  removeFromCart,
} from "@/features/slice";
import { useTheme } from "@/hooks/useTheme";
import Button from "./Button";
import IconButton from "./IconButton";
import DropdownWithSearchInput from "./DropdownWithSearchInput";
import PincodeLocationModal from "./PincodeLocationModal";
import axios from "axios";

export default function Header({ isOpen, setIsOpen, isMobile }) {
  const { toggleTheme, isDark } = useTheme();
  const { cart, selectedState, selectedDistrict, selectedPincode } = useSelector((state) => state.slice);
  const [pincodeModalOpen, setPincodeModalOpen] = useState(false);
  const totalCartItems = useSelector(selectCartTotalItems);
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth_slice);
  const [showPopup, setShowPopup] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const popupRef = useRef(null);
  const cartDropdownRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


  const isEpcUser = Boolean(user && (user.gstin || user.primaryLocation || user.registeredStates));
  const epcRegisteredState = user?.primaryLocation?.state || (user?.registeredStates && user.registeredStates[0]) || null;
  const epcRegisteredDistrict = user?.primaryLocation?.district || (user?.registeredDistricts && user.registeredDistricts[0]) || null;

  // 🔒 Lock EPC contractor location strictly to their registered GSTIN location
  useEffect(() => {
    if (isEpcUser && epcRegisteredState && epcRegisteredDistrict) {
      const stateMatches = (selectedState?.id || selectedState?._id) === (epcRegisteredState.id || epcRegisteredState._id);
      const districtMatches = (selectedDistrict?.id || selectedDistrict?._id) === (epcRegisteredDistrict.id || epcRegisteredDistrict._id);
      if (!stateMatches || !districtMatches) {
        dispatch(setSelectedLocation({
          selectedState: epcRegisteredState,
          selectedDistrict: epcRegisteredDistrict
        }));
      }
    } else if (user && user.primaryLocation && !selectedState && !selectedDistrict) {
      const { state, district } = user.primaryLocation;
      if (state && district) {
        dispatch(setSelectedLocation({ selectedState: state, selectedDistrict: district }));
      }
    }
  }, [isEpcUser, epcRegisteredState, epcRegisteredDistrict, user, selectedState, selectedDistrict, dispatch]);

  // Fetch or set states list
  useEffect(() => {
    // If EPC is logged in, restrict states strictly to their registered GST state
    if (isEpcUser && epcRegisteredState) {
      const userStates = (user.registeredStates && user.registeredStates.length > 0)
        ? user.registeredStates
        : [epcRegisteredState];
      setStatesList(userStates);
      return;
    }

    const fetchStates = async () => {
      try {
        const response = await axios.get(`${apiBase}/india/v1/geo/states`);
        if (response.data?.states) {
          setStatesList(response.data.states);
        }
      } catch (error) {
        console.error("Error fetching states in Header:", error);
      }
    };
    fetchStates();
  }, [isEpcUser, epcRegisteredState, user?.registeredStates, apiBase]);

  // Fetch or set districts list
  useEffect(() => {
    // If EPC is logged in, restrict districts strictly to their registered GST district
    if (isEpcUser && epcRegisteredDistrict) {
      const userDistricts = (user.registeredDistricts && user.registeredDistricts.length > 0)
        ? user.registeredDistricts
        : [epcRegisteredDistrict];
      setDistrictsList(userDistricts);
      return;
    }

    const fetchDistricts = async () => {
      if (!selectedState?.id && !selectedState?._id) {
        setDistrictsList([]);
        return;
      }
      try {
        const stateId = selectedState.id || selectedState._id;
        const response = await axios.get(`${apiBase}/india/v1/geo/districts?state_id=${stateId}`);
        if (response.data?.districts) {
          setDistrictsList(response.data.districts);
          if (!selectedDistrict && response.data.districts.length > 0) {
            dispatch(setSelectedLocation({ selectedState, selectedDistrict: response.data.districts[0] }));
          }
        }
      } catch (error) {
        console.error("Error fetching districts in Header:", error);
      }
    };
    fetchDistricts();
  }, [isEpcUser, epcRegisteredDistrict, user?.registeredDistricts, selectedState?.id, selectedState?._id, apiBase, dispatch, selectedDistrict]);

  const handleLocationChange = (newSelectedState, newSelectedDistrict) => {
    // For registered EPCs, forbid switching away from registered state/district
    if (isEpcUser) {
      return;
    }
    if (cart && cart.length > 0 && selectedState && newSelectedState) {
      const currentId = (selectedState.id || selectedState._id || '').toString();
      const newId = (newSelectedState.id || newSelectedState._id || '').toString();
      if (currentId && newId && currentId !== newId) {
        dispatch(setAlert({
          type: "warning",
          message: "Please check out first! Multiple state orders are not allowed at the same time."
        }));
        setShowLocationWarning(true);
        return;
      }
    }
    dispatch(setSelectedLocation({ selectedState: newSelectedState, selectedDistrict: newSelectedDistrict }));
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

  const menuItems = [
    { icon: <HiUser />, name: "Profile", action: () => { navigate("/profile"); } },
    { icon: <HiUserAdd />, name: "Create Users", action: () => { navigate("/users/create"); } },
    { icon: <MdSettings />, name: "Settings", action: () => { navigate("/settings"); } },
    { icon: <FaWarehouse />, name: "Add Warehouse", action: () => { navigate("/warehouse/add"); } },
    { icon: <MdLogout />, name: "Logout", action: handleLogout },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(event.target)) {
        setShowCartDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shadow-sm relative z-30">
        <div className="flex items-center space-x-6">
          <div className="animate-pulse h-9 w-9 bg-gray-300 rounded-full"></div>
        </div>
      </header>
    );
  }

  const stateOptions = statesList.map(s => ({ text: s.name, value: s.id || s._id }));
  const districtOptions = districtsList.map(d => ({ text: d.name, value: d.id || d._id }));

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shadow-sm relative z-30 transition-colors duration-200">
        {/* Left side - Mobile Menu Toggle */}
        {isMobile ? (
          <IconButton
            variant="ghost"
            size="md"
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-primary dark:text-info hover:bg-surface-hover"
          >
            <MdMenu />
          </IconButton>
        ) : (
          <span></span>
        )}

        {/* Middle - Geolocation Selector */}
        <div className="flex items-center space-x-2.5 bg-surface-hover px-4 py-1.5 rounded-full border border-border shadow-inner">
          <div 
            onClick={() => !isEpcUser && setPincodeModalOpen(true)}
            className="flex items-center space-x-1.5 text-text-secondary cursor-pointer hover:opacity-80"
            title="Click to enter Pincode"
          >
            <FiMapPin size={13} className="text-primary dark:text-info" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {selectedPincode ? `PIN ${selectedPincode}:` : "Location:"}
            </span>
          </div>

          {/* State Dropdown */}
          <DropdownWithSearchInput
            value={selectedState?.id || selectedState?._id || ""}
            onChange={(val) => {
              if (isEpcUser) return;
              const found = statesList.find(s => (s.id || s._id) === val);
              if (found) {
                handleLocationChange(found, null);
              } else {
                handleLocationChange(null, null);
              }
            }}
            options={stateOptions}
            disabled={isEpcUser && stateOptions.length <= 1}
            placeholder="Select State"
            searchPlaceholder="Search State..."
            className="w-40 text-xs text-text-primary dark:text-info !"
            forceDown={true}
          />

          <span className="text-text-muted/30 text-xs">|</span>

          {/* District Dropdown */}
          <DropdownWithSearchInput
            value={selectedDistrict?.id || selectedDistrict?._id || ""}
            onChange={(val) => {
              if (isEpcUser) return;
              const found = districtsList.find(d => (d.id || d._id) === val);
              if (found) {
                handleLocationChange(selectedState, found);
              } else {
                handleLocationChange(selectedState, null);
              }
            }}
            options={districtOptions}
            disabled={(isEpcUser && districtOptions.length <= 1) || !selectedState}
            placeholder="Select District"
            searchPlaceholder="Search District..."
            className="w-40 text-xs text-text-primary dark:text-info !"
            forceDown={true}
          />
          {!isEpcUser && (
            <button
              type="button"
              onClick={() => setPincodeModalOpen(true)}
              className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 cursor-pointer shrink-0 transition-colors"
              title="Enter 6-digit Pincode"
            >
              {selectedPincode ? `PIN: ${selectedPincode}` : "Enter PIN"}
            </button>
          )}

          {isEpcUser && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              title={`Registered GST Location: ${user.gstin ? `GSTIN ${user.gstin}` : 'Verified Contractor'}`}
            >
              GST Registered
            </span>
          )}
        </div>

        {/* Franchisee Partner Badge */}
        {user?.reseller?.business_name && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xs"
            title={`Attributed Franchisee Partner: ${user.reseller.business_name} (${user.reseller.commercial_mode || 'Partner'} Mode)`}
          >
            <FiUsers className="text-emerald-500" size={13} />
            <span>Partner Network: <strong className="text-emerald-700 dark:text-emerald-300">{user.reseller.business_name}</strong></span>
          </div>
        )}

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">

          {/* Find Nearby Store */}
          <button
            onClick={() => navigate("/store-locator")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-soft border border-secondary/30 text-secondary hover:bg-secondary/15 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Find Nearby Authorized SolarKits Stores"
          >
            <FiMapPin size={13} className="text-secondary" />
            <span className="hidden sm:inline">Find Store</span>
          </button>

          {/* Theme Toggle */}
          <IconButton
            variant="ghost"
            size="md"
            onClick={toggleTheme}
            className="text-text-primary dark:text-info hover:bg-surface-hover transition-colors duration-200"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <FiSun className="text-warning text-lg" /> : <FiMoon className="text-primary dark:text-info text-lg" />}
          </IconButton>

          {/* Cart Button + Dropdown */}
          <div className="relative" ref={cartDropdownRef}>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  dispatch(setShowAuthDialog(true));
                } else {
                  setShowCartDropdown(prev => !prev);
                }
              }}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-surface-hover transition-colors text-text-primary dark:text-info"
            >
              <FiShoppingCart size={20} />
              {/* Badge */}
              {!isAuthenticated ? (
                <span className="absolute -top-1 -right-1 bg-warning text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center border border-surface shadow-sm">
                  <FaLock size={6} />
                </span>
              ) : totalCartItems > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center border-2 border-surface shadow-sm animate-in zoom-in-95 duration-200">
                  {totalCartItems > 99 ? "99+" : totalCartItems}
                </span>
              ) : null}
            </button>

            {/* Cart Dropdown Panel */}
            {showCartDropdown && isAuthenticated && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 dark:from-info/5 dark:to-info/10">
                  <div className="flex items-center gap-2">
                    <FiShoppingCart className="text-primary dark:text-info" size={16} />
                    <span className="font-semibold text-sm text-text-primary">
                      Cart
                      {totalCartItems > 0 && (
                        <span className="ml-2 bg-primary dark:bg-info text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                          {totalCartItems} {totalCartItems === 1 ? "kit" : "kits"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Cart Items */}
                {cart.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FiShoppingCart className="text-text-muted mx-auto mb-2 opacity-30" size={32} />
                    <p className="text-sm text-text-muted">Your cart is empty</p>
                    <p className="text-xs text-text-muted opacity-60 mt-1">Add solar kits to get started</p>
                  </div>
                ) : (
                  <>
                    <ul className="max-h-64 overflow-y-auto divide-y divide-border">
                      {cart.map((item) => (
                        <li key={item.cartItemId} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors group">
                          {/* Kit image or placeholder */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 dark:bg-info/10 flex items-center justify-center shrink-0">
                            {item.kitImage ? (
                              <img src={item.kitImage} alt={item.kitName} className="w-full h-full object-cover" />
                            ) : (
                              <FiShoppingCart className="text-primary dark:text-info opacity-50" size={16} />
                            )}
                          </div>

                          {/* Kit info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary truncate">
                              {item.kitName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                                style={item.tierColor ? {
                                  color: item.tierColor,
                                  borderColor: `${item.tierColor}40`,
                                  backgroundColor: `${item.tierColor}12`
                                } : {}}
                              >
                                {item.productTier}
                              </span>
                              <span className="text-[10px] text-text-muted">×{item.qty}</span>
                            </div>
                            {!item.inStock && (
                              <span className="text-[10px] text-danger font-medium">Out of Stock</span>
                            )}
                          </div>

                          {/* Price + remove */}
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-text-primary">
                              ₹{(item.ourPrice * item.qty).toLocaleString("en-IN")}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch(removeFromCart(item.cartItemId));
                              }}
                              className="text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all mt-0.5"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Dropdown Footer */}
                    <div className="p-3 border-t border-border bg-surface-hover">
                      <Button
                        onClick={() => {
                          setShowCartDropdown(false);
                          navigate("/cart");
                        }}
                        variant="primary"
                        size="md"
                        fullWidth
                        rightIcon={<FiChevronRight size={16} />}
                      >
                        View Full Cart
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Info or Sign In Button */}
          {isAuthenticated && user ? (
            <div
              className="flex items-center space-x-3 cursor-pointer group relative"
              onClick={() => setShowPopup(!showPopup)}
              ref={popupRef}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${user?.name}&background=253880&color=ffffff`}
                alt={user?.name}
                className="w-9 h-9 rounded-full border-2 border-border group-hover:border-primary/55 transition-all"
              />
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-text-primary dark:text-info">{user?.name}</p>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    user?.is_owner !== false && !user?.parent_account_id
                      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      : user?.role === "admin"
                      ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                      : user?.role === "account"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  }`}>
                    {user?.is_owner !== false && !user?.parent_account_id
                      ? "Owner"
                      : user?.role === "admin"
                      ? "Co-Admin"
                      : user?.role === "account"
                      ? "Finance"
                      : "Shopper"}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{user?.email}</p>
                {user?.reseller?.business_name && (
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <FiUsers size={10} /> Partner: {user.reseller.business_name}
                  </p>
                )}
              </div>

              {/* User Menu Popup */}
              {showPopup && (
                <ul className="absolute right-0 top-[calc(100%+12px)] bg-surface border border-border shadow-xl rounded-lg w-56 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {menuItems.map((item, idx) => (
                    <li key={idx}>
                      <button
                        onClick={item.action}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary dark:text-info"
                      >
                        <span className="text-lg text-primary dark:text-info">{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate("/auth/login")}
              leftIcon={<MdLogin />}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>
      {createPortal(
        <AnimatePresence>
          {showLocationWarning && (
            <div
              className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              style={{ zIndex: 99999 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="bg-surface border border-border shadow-2xl rounded-2xl max-w-sm w-full overflow-hidden p-6 text-center space-y-4"
              >
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-warning/10 text-warning">
                  <FaExclamationTriangle className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-text-primary">
                    Location Conflict
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Please check out first! Multiple state orders are not allowed at the same time.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowLocationWarning(false)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-warning to-amber-500 hover:from-warning-hover hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}