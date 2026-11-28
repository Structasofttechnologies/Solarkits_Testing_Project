import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, Provider } from "react-redux";
import store from "../admin/app/store";
import { ensureValidAccessToken, setAuthToken } from "../admin/features/auth.slice.jsx";
import "../admin/App.css";
import Alert from "../admin/components/Alert";
import Loader from "../admin/components/Loader";
import ProtectedRoutes from "../admin/components/ProtectedRoutes";
import { ms_conversion } from "../admin/utils/msConversion.jsx";

const LeadMarketingDashboardPortal = lazy(() => import("./dashboard/Dashboard"));

function LeadMarketingPortalInner() {
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
    window.addEventListener("token_refreshed", handleTokenRefreshed);

    return () => {
      clearInterval(id);
      window.removeEventListener("token_refreshed", handleTokenRefreshed);
    };
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path="/*" element={<ProtectedRoutes basePath="/lead-marketing-panel" />}>
          <Route
            path="*"
            element={
              <Suspense fallback={<Loader text="Loading Lead Marketing Panel..." />}>
                <LeadMarketingDashboardPortal />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      <Alert />
    </>
  );
}

export default function LeadMarketingPortalApp() {
  return (
    <Provider store={store}>
      <LeadMarketingPortalInner />
    </Provider>
  );
}
