import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom"
import { useDispatch, Provider } from "react-redux";
import store from "./app/store";
import { ensureValidAccessToken } from "./features/auth.slice.jsx";
import './App.css';
import Alert from "./components/Alert";
import Loader from "./components/Loader";
import ProtectedRoutes from "./components/ProtectedRoutes";
import { ms_conversion } from "./utils/msConversion.jsx";

const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

function OperationsPortalInner() {
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
        <Route path='/*' element={<ProtectedRoutes />} >
          <Route path='solar-shop/*' element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path='*' element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
        </Route>
        <Route path='*' element={<Suspense fallback={<Loader />}><NotFound /></Suspense>} />
      </Routes>
      <Alert />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <OperationsPortalInner />
    </Provider>
  );
}
