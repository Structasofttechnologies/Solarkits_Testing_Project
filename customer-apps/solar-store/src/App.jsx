import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Provider, useDispatch, useSelector } from "react-redux"
import store from "./app/store"
import Alert from "./Components/Alert"
import { Toaster } from "react-hot-toast"
import AuthDialog from "./Components/AuthDialog"
import { useEffect } from "react"
import { checkAuth } from "./features/auth.slice"
import { fetchCart } from "./features/slice"

// Landing page (solar-store's own landing)
import LandingPage from "./Pages/LandingPage.jsx"
import ShopPage from "./Pages/ShopPage.jsx"

// Browse pages
import BrowseByIndustry from "./Pages/browse/BrowseByIndustry.jsx"
import BrowseByGovtTender from "./Pages/browse/BrowseByGovtTender.jsx"

// Auth pages
import Login from "./Pages/Login"
import SignUp from "./Pages/SignUp"
import ForgotPassword from "./Pages/ForgotPassword"

// Policy pages
import PrivacyPolicy from "./Pages/policies/PrivacyPolicy"
import TermsOfService from "./Pages/policies/TermsOfService"
import RefundPolicy from "./Pages/policies/RefundPolicy"
import ShippingPolicy from "./Pages/policies/ShippingPolicy"

// Protected store board
import Board from "./Pages/Board"

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth_slice);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <>
      <Alert />
      <Toaster position="top-right" />
      <AuthDialog />
      <Routes>
        {/* Public landing and shop pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/shop" element={<ShopPage />} />

        {/* Public Browse pages */}
        <Route path="/browse/industry" element={<BrowseByIndustry />} />
        <Route path="/browse/govt-tender" element={<BrowseByGovtTender />} />
        <Route path="/industry-brochure" element={<BrowseByIndustry />} />

        {/* Legal & Policy pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />

        {/* Auth routes */}
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* Protected store dashboard (Board handles all store routes) */}
        <Route path="/*" element={<Board />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  )
}

export default App
