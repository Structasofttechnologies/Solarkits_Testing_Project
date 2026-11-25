import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import './App.css';
import LandingPage from "./pages/LandingPage";
import IndustriesPage from "./pages/IndustriesPage";
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TermsOfService from "./pages/policies/TermsOfService";
import RefundPolicy from "./pages/policies/RefundPolicy";
import ShippingPolicy from "./pages/policies/ShippingPolicy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Industry Solutions & Media Showcase */}
        <Route path="/industries" element={<IndustriesPage />} />
        <Route path="/industries/:industrySlug" element={<IndustriesPage />} />

        {/* Legal & Policy Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />

        {/* Fallback all other routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
