import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom"
import { useDispatch } from "react-redux";
import { Provider } from "react-redux";
import store from "./app/store";
import { ensureValidAccessToken, setAuthToken } from "./features/auth.slice.jsx";
import './App.css';
import Alert from "./components/Alert";
import Loader from "./components/Loader";
import ProtectedRoutes from "./components/ProtectedRoutes";
import { ms_conversion } from "./utils/msConversion.jsx";

const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const SolarShopDashboard = lazy(() => import("./dashboard/SolarshopDashboard"));
const SolarShopBosKitDashboard = lazy(() => import("./dashboard/SolarShopBosKitDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

import PaymentAlertPopup from "./components/PaymentAlertPopup";

// Inner component that uses dispatch (must be inside Provider)
function AdminPortalInner() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(ensureValidAccessToken());
    const id = setInterval(() => {
      dispatch(ensureValidAccessToken());
    }, ms_conversion(import.meta.env.VITE_AUTH_TIMEOUT));

    const handleTokenRefreshed = (e) => {
      if (e.detail) {
        dispatch(setAuthToken(e.detail));
      }
    };
    window.addEventListener('token_refreshed', handleTokenRefreshed);

    return () => {
      clearInterval(id);
      window.removeEventListener('token_refreshed', handleTokenRefreshed);
    };
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path='/*' element={<ProtectedRoutes />} >
          <Route path='solar-shop/*' element={<Suspense fallback={<Loader />}><SolarShopDashboard /></Suspense>} />
          <Route path='solar-shop-solarkits/*' element={<Suspense fallback={<Loader />}><SolarShopDashboard /></Suspense>} />
          <Route path='solar-shop-bos-kits/*' element={<Suspense fallback={<Loader />}><SolarShopBosKitDashboard /></Suspense>} />
          <Route path='solar-shop-boskits/*' element={<Suspense fallback={<Loader />}><SolarShopBosKitDashboard /></Suspense>} />
          <Route path='*' element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
        </Route>
        <Route path='*' element={<Suspense fallback={<Loader />}><NotFound /></Suspense>} />
      </Routes>
      <Alert />
      <PaymentAlertPopup role="admin" />
    </>
  );
}

// Exported App — wraps with Admin's own isolated Redux store
export default function App() {
  return (
    <Provider store={store}>
      <AdminPortalInner />
    </Provider>
  );
}
