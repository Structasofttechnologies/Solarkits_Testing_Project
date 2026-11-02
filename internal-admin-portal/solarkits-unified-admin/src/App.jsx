import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import TestingModeBanner from "./components/TestingModeBanner.jsx";


function FullPageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#f8fafc',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #263880',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const CmsAuthPortalApp = lazy(() => import("./portals/cms-auth/App.jsx"));
const AdminPortalApp = lazy(() => import("./portals/admin/App.jsx"));
const AccountsPortalApp = lazy(() => import("./portals/accounts/App.jsx"));
const OperationsPortalApp = lazy(() => import("./portals/operations/App.jsx"));
const WarehousePortalApp = lazy(() => import("./portals/warehouse/App.jsx"));
const DeveloperPortalApp = lazy(() => import("./portals/developer/App.jsx"));
const BoskitAdminPortalApp = lazy(() => import("./portals/boskit/App.jsx"));


export default function App() {
  return (
    <BrowserRouter>
      <TestingModeBanner />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* BOSKIT B2B Admin Platform */}
          <Route path="/boskit-admin/*" element={<BoskitAdminPortalApp />} />

          {/* Admin Panel */}
          <Route path="/admin-panel/*" element={<AdminPortalApp />} />

          {/* Accounts Panel */}
          <Route path="/account-panel/*" element={<AccountsPortalApp />} />

          {/* Operations Panel */}
          <Route path="/operation-management-panel/*" element={<OperationsPortalApp />} />

          {/* Developer Panel */}
          <Route path="/developer-panel/*" element={<DeveloperPortalApp />} />

          {/* Warehouse Panel */}
          <Route path="/warehouse-management-panel/*" element={<WarehousePortalApp />} />
          <Route path="/warehouse-profile/*" element={<WarehousePortalApp />} />
          <Route path="/pending-validation/*" element={<WarehousePortalApp />} />
          <Route path="/in-review/*" element={<WarehousePortalApp />} />
          <Route path="/rejected/*" element={<WarehousePortalApp />} />
          <Route path="/unauthorized/*" element={<WarehousePortalApp />} />
          <Route path="/warehouse/*" element={<WarehousePortalApp />} />

          {/* Legacy / Direct shortcuts for solar-shop to avoid dropping to panel choose */}
          <Route path="/solar-shop/delivery-management/queue/*" element={<Navigate to="/warehouse-management-panel/delivery-management/queue" replace />} />
          <Route path="/solar-shop/delivery-management/*" element={<Navigate to="/warehouse-management-panel/delivery-management" replace />} />
          <Route path="/solar-shop/*" element={<Navigate to="/admin-panel/solar-shop/india/home" replace />} />

          {/* CMS Auth Portal & Fallback */}
          <Route path="/*" element={<CmsAuthPortalApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
