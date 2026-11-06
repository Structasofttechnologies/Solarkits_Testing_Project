import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import FranchiseLanding from "./pages/FranchiseLanding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import KycWorkspace from "./pages/KycWorkspace";
// import PlansPortal from "./pages/PlansPortal";
import MyTerritories from "./pages/MyTerritories";
import AuthorizedCatalog from "./pages/AuthorizedCatalog";
import MyOrders from "./pages/MyOrders";
import WalletPortal from "./pages/WalletPortal";
import MyCommission from "./pages/MyCommission";
import ProcurementInventory from "./pages/ProcurementInventory";
import StorefrontListings from "./pages/StorefrontListings";
import MyEpcBuyers from "./pages/MyEpcBuyers";
import EligibilityChecker from "./pages/EligibilityChecker";
import PoOrder from "./pages/PoOrder";
import LooseOrder from "./pages/LooseOrder";
import OnboardingPortal from "./pages/OnboardingPortal";
import ServiceTickets from "./pages/ServiceTickets";
import EpcQuotes from "./pages/EpcQuotes";
import CreateEpcQuote from "./pages/CreateEpcQuote";
import EpcQuoteDetail from "./pages/EpcQuoteDetail";
import EpcQuoteFollowupList from "./pages/EpcQuoteFollowupList";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Solarkits B2B Platform & Franchisee Storefront Routes */}
        <Route path="/" element={<FranchiseLanding />} />
        <Route path="/solarkits" element={<FranchiseLanding />} />
        <Route path="/store" element={<FranchiseLanding />} />
        <Route path="/products" element={<FranchiseLanding />} />
        <Route path="/franchise" element={<FranchiseLanding />} />
        <Route path="/franchise-plans" element={<FranchiseLanding />} />
        <Route path="/store-availability" element={<FranchiseLanding />} />
        <Route path="/eligibility" element={<EligibilityChecker />} />
        <Route path="/revenue-potential" element={<FranchiseLanding />} />

        {/* Partner Auth & Onboarding Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<OnboardingPortal />} />

        {/* Dashboard Layout & Protected Pages */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/kyc" element={<KycWorkspace />} />
          {/* <Route path="/plans" element={<PlansPortal />} /> */}
          <Route path="/territories" element={<MyTerritories />} />
          <Route path="/catalog" element={<AuthorizedCatalog />} />
          <Route path="/procurement-inventory" element={<ProcurementInventory />} />
          <Route path="/storefront-listings" element={<StorefrontListings />} />
          <Route path="/epc-buyers" element={<MyEpcBuyers />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/my-commission" element={<MyCommission />} />
          <Route path="/commission-rates" element={<Navigate to="/my-commission" replace />} />
          <Route path="/wallet" element={<WalletPortal />} />
          <Route path='/po-order' element={<PoOrder />} />
          <Route path='/loose-order' element={<LooseOrder />} />
          <Route path='/service-tickets' element={<ServiceTickets />} />
          <Route path='/epc-quotes' element={<EpcQuotes />} />
          <Route path='/epc-quotes/create' element={<CreateEpcQuote />} />
          <Route path='/epc-quotes/:id' element={<EpcQuoteDetail />} />
          <Route path='/epc-quote-followups' element={<EpcQuoteFollowupList />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
