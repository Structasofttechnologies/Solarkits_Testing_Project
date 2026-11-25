import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, Provider } from "react-redux";
import store from "./app/store";
import { ensureValidAccessToken } from "./features/auth.slice.jsx";
import './App.css';
import Alert from "./components/Alert";
import Loader from "./components/Loader";
import ProtectedRoutes from "./components/ProtectedRoutes";
import { ms_conversion } from "./utils/msConversion.jsx";
const Dashboard = lazy(() => import("./dashboard/Dashboard"));

function DeveloperPortalInner() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(ensureValidAccessToken());
    const id = setInterval(() => {
      dispatch(ensureValidAccessToken());
    }, ms_conversion(import.meta.env.VITE_AUTH_TIMEOUT));
    return () => clearInterval(id);
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path='/*' element={<ProtectedRoutes />}>
          {/* Redirect SaaS product solar-shop to the real solar shop dashboard */}
          <Route path='solar-shop/*' element={<Navigate to="/admin-panel/solar-shop/india/home" replace />} />
          <Route path='solar-shop' element={<Navigate to="/admin-panel/solar-shop/india/home" replace />} />
          <Route path='*' element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
        </Route>
      </Routes>
      <Alert />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <DeveloperPortalInner />
    </Provider>
  );
}
