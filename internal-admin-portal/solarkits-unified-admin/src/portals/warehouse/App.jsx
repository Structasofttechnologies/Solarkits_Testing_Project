import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom"
import { Provider } from "react-redux";
import store from "./app/store"
import Alert from "./components/Alert";
import Loader from "./components/Loader";
import ProtectedRoutes from "./components/ProtectedRoutes";
import AuthInitializer from "./components/auth/AuthInitializer";

const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WarehouseProfile = lazy(() => import("./pages/WarehouseProfile"));
const PendingValidation = lazy(() => import("./pages/PendingValidation"));
const InReview = lazy(() => import("./pages/InReview"));
const Rejected = lazy(() => import("./pages/Rejected"));
const UnauthorizedRole = lazy(() => import("./pages/UnauthorizedRole"));

export default function App() {
  return (
    <Provider store={store}>
      <AuthInitializer />
      <Routes>
        <Route path='/unauthorized' element={<Suspense fallback={<Loader />}><UnauthorizedRole /></Suspense>} />
        <Route path='/*' element={<ProtectedRoutes />} >
          <Route path="warehouse-profile" element={<Suspense fallback={<Loader />}><WarehouseProfile /></Suspense>} />
          <Route path="pending-validation" element={<Suspense fallback={<Loader />}><PendingValidation /></Suspense>} />
          <Route path="in-review" element={<Suspense fallback={<Loader />}><InReview /></Suspense>} />
          <Route path="rejected" element={<Suspense fallback={<Loader />}><Rejected /></Suspense>} />
          <Route path="solar-shop/*" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path="solar-shop" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path="solar-shop-solarkits/*" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path="solar-shop-solarkits" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path='*' element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
        </Route>
        <Route path='*' element={<Suspense fallback={<Loader />}><NotFound /></Suspense>} />
      </Routes>
      <Alert />
    </Provider>
  )
}