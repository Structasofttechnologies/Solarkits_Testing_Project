import { useEffect, useState, useMemo } from "react";
import Drawer from "../Components/Drawer";
import Header from "../Components/Header";
import ProtectedRoute from "../Components/ProtectedRoute";
import LocationChangeCartWarning from "../Components/LocationChangeCartWarning";
import { Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import PreconfiguredComboKit from "./dashboard/PreconfiguredComboKit";
import CustomComboKit from "./dashboard/CustomComboKit";
import SolarBosKit from "./dashboard/SolarBosKit";
import Cart from "./cart/Cart";
import { useDispatch, useSelector } from "react-redux";
import { getAvailableKitData, fetchLiveInventory, getBulkKitBuyData, fetchShopHierarchy } from "../features/slice";
import BulkBuy from "./bulk-buy/BulkBuy";
import BulkOrderCart from "./cart/BulkOrderCart";
import CheckOut from "./CheckOut";
import ProjectOrderStatus from "./dashboard/ProjectOrderStatus";
import EpcCatalogue from "./dashboard/EpcCatalogue";
import EpcPoAllocations from "./dashboard/EpcPoAllocations";
import StoreLocatorPage from "./store-locator/StoreLocatorPage";
import KnowMyMargin from "./know-my-margin/KnowMyMargin";
import EpcProfile from "./profile/EpcProfile";
import EpcTeamUsers from "./users/EpcTeamUsers";
import EpcQuotations from "./dashboard/EpcQuotations";
import EpcQuoteDetail from "./dashboard/EpcQuoteDetail";
import {
  MdDashboard,
  MdShoppingCart,
  MdListAlt,
  MdSettings,
} from "react-icons/md";
import { FaBoxes, FaSolarPanel, FaShoppingBag, FaMapMarkerAlt, FaFileInvoiceDollar } from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";

const INVENTORY_POLL_INTERVAL_MS = 30000; // 30 seconds

export default function Board() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const dispatch = useDispatch();
  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);
  const { user, isAuthenticated } = useSelector((state) => state.auth_slice);

  // Determine if logged-in EPC user was onboarded via a Franchisee Partner
  const isFranchiseeEpc = Boolean(
    isAuthenticated && (
      user?.reseller?.business_name ||
      user?.reseller ||
      user?.onboarding_source === 'reseller' ||
      user?.onboarding_source === 'franchisee' ||
      user?.onboarded_by_reseller_id ||
      user?.primary_reseller_id
    )
  );

  // Menu items for Direct EPC Solar Store
  const menuItems = useMemo(() => {
    const defaultGroup = [
      { name: "Combo Kit", icon: <FaSolarPanel />, path: "/preconfigured-combo-kit" },
      // { name: "Custom Combo Kit", icon: <MdSettings />, path: "/custom-combo-kit", requiresAuth: true },
      { name: "Know My Margin", icon: <FiTrendingUp />, path: "/know-my-margin" },
      // { name: "Bulk Buy", icon: <FaBoxes />, path: "/bulk-buy", requiresAuth: true },
      { name: "Request Order", icon: <MdListAlt />, path: "/request-order", requiresAuth: true },
      { name: "Cart", icon: <MdShoppingCart />, path: "/cart", requiresAuth: true },
    ];

    if (isAuthenticated) {
      defaultGroup.push({ name: "Quotations", icon: <FaFileInvoiceDollar />, path: "/my-quotes", requiresAuth: true });
      defaultGroup.push({ name: "PO Orders", icon: <FaShoppingBag />, path: "/po-orders", requiresAuth: true });
    }

    return [
      defaultGroup,
      [
        { name: "Find Nearby Store", icon: <FaMapMarkerAlt />, path: "/store-locator" },
        { name: "Track Order Status", icon: <MdListAlt />, path: "/track-status", requiresAuth: true },
      ],
      // [{ name: "Settings", icon: <MdSettings />, path: "/settings", requiresAuth: true }]
    ];
  }, [isAuthenticated]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
      else setIsOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // Load hierarchy and kits when district changes
  useEffect(() => {
    dispatch(fetchShopHierarchy());
    if (selectedDistrict?.id) {
      dispatch(getAvailableKitData({ districtId: selectedDistrict.id }));
      dispatch(getBulkKitBuyData({ districtId: selectedDistrict.id }));
    } else {
      dispatch(getAvailableKitData());
      dispatch(getBulkKitBuyData());
    }
  }, [selectedDistrict?.id, dispatch]);

  // Live inventory polling every 30 seconds
  useEffect(() => {
    const poll = () => {
      if (selectedDistrict?.id) {
        dispatch(fetchLiveInventory({ districtId: selectedDistrict.id }));
      } else {
        dispatch(fetchLiveInventory({}));
      }
    };

    // Initial poll
    poll();

    const intervalId = setInterval(poll, INVENTORY_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [selectedDistrict?.id, dispatch]);

  return (
    <div className="flex h-screen bg-bg text-text-primary transition-colors duration-200">
      {/* Sidebar */}
      <Drawer isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} menuItems={menuItems} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} />

        <main className="flex-1 p-4 overflow-y-auto scrollbar-hover">
          <Routes>
            {/* Default and Dashboard routes directly open Solar Combo Kit */}
            <Route path="/" element={<PreconfiguredComboKit />} />
            <Route path="/dashboard" element={<PreconfiguredComboKit />} />
            <Route path="/dashboard/*" element={<PreconfiguredComboKit />} />

            {/* Direct EPC Store Kit Routes */}
            <Route path="/shop" element={<PreconfiguredComboKit />} />
            <Route path="/preconfigured-combo-kit" element={<PreconfiguredComboKit />} />
            <Route path="/custom-combo-kit" element={<ProtectedRoute><CustomComboKit /></ProtectedRoute>} />
            {/* <Route path="/solar-bos-kit" element={<ProtectedRoute><SolarBosKit /></ProtectedRoute>} /> */}

            {/* Know My Margin Calculator Module */}
            <Route path="/know-my-margin/*" element={<KnowMyMargin />} />
            <Route path="/know-my-margin" element={<KnowMyMargin />} />

            {/* Franchisee Product Catalogue & PO Lifecycle */}
            <Route path="/epc-catalogue" element={<ProtectedRoute><EpcCatalogue /></ProtectedRoute>} />
            <Route path="/po-orders" element={<ProtectedRoute><EpcPoAllocations /></ProtectedRoute>} />
            <Route path="/po-allocations" element={<ProtectedRoute><EpcPoAllocations /></ProtectedRoute>} />
            <Route path="/my-quotes" element={<ProtectedRoute><EpcQuotations /></ProtectedRoute>} />
            <Route path="/my-quotes/:id" element={<ProtectedRoute><EpcQuoteDetail /></ProtectedRoute>} />
            <Route path="/epc-quotes" element={<ProtectedRoute><EpcQuotations /></ProtectedRoute>} />
            <Route path="/epc-quotes/:id" element={<ProtectedRoute><EpcQuoteDetail /></ProtectedRoute>} />

            <Route path="/bulk-buy" element={<ProtectedRoute><BulkBuy /></ProtectedRoute>} />
            <Route path="/request-order" element={<ProtectedRoute><BulkOrderCart /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/store-locator" element={<StoreLocatorPage />} />
            <Route path="/find-store" element={<StoreLocatorPage />} />
            <Route path="/stores" element={<StoreLocatorPage />} />
            <Route path="/checkout" element={<ProtectedRoute><CheckOut /></ProtectedRoute>} />
            <Route path="/track-status" element={<ProtectedRoute><ProjectOrderStatus /></ProtectedRoute>} />
            <Route path="/track-order" element={<ProtectedRoute><ProjectOrderStatus /></ProtectedRoute>} />
            <Route path="/order-status" element={<ProtectedRoute><ProjectOrderStatus /></ProtectedRoute>} />
            <Route path="/dashboard/order-status" element={<ProtectedRoute><ProjectOrderStatus /></ProtectedRoute>} />

            {/* EPC Profile: Multi-State GST & Home Office Tagging */}
            <Route path="/profile" element={<ProtectedRoute><EpcProfile /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><EpcProfile /></ProtectedRoute>} />

            {/* EPC Team: Create Users with Activated District Scoping */}
            <Route path="/users/create" element={<ProtectedRoute><EpcTeamUsers /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><EpcTeamUsers /></ProtectedRoute>} />
            <Route path="/create-users" element={<ProtectedRoute><EpcTeamUsers /></ProtectedRoute>} />

            <Route path="*" element={<PreconfiguredComboKit />} />
          </Routes>
        </main>
      </div>

      {/* Location change warning dialog — rendered at root level */}
      <LocationChangeCartWarning />
    </div>
  );
}
