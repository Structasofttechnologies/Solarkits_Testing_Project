import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BoskitAdminLayout from "./layout/BoskitAdminLayout";

// Operations & Core
const BoskitOverviewDashboard = lazy(() => import("./pages/BoskitOverviewDashboard"));
const OrdersAdminPage = lazy(() => import("./pages/OrdersAdminPage"));
const PaymentsAdminPage = lazy(() => import("./pages/PaymentsAdminPage"));

// Franchise & Dealer Network
const DistributorApplicationsPage = lazy(() => import("./pages/DistributorApplicationsPage"));
const DistributorDetailPage = lazy(() => import("./pages/DistributorDetailPage"));
const DistributorsListPage = lazy(() => import("./pages/DistributorsListPage"));
const DistributorPlansAdminPage = lazy(() => import("./pages/DistributorPlansAdminPage"));
const DealersAdminPage = lazy(() => import("./pages/DealersAdminPage"));
const TerritorySettingsAdminPage = lazy(() => import("./pages/TerritorySettingsAdminPage"));

// Commercial & Pricing Masters
const ChannelSettingsAdminPage = lazy(() => import("./pages/ChannelSettingsAdminPage"));
const ProductsAdminPage = lazy(() => import("./pages/ProductsAdminPage"));
const CategoriesAdminPage = lazy(() => import("./pages/CategoriesAdminPage"));
const MrpMasterAdminPage = lazy(() => import("./pages/MrpMasterAdminPage"));
const DistributorRateMasterAdminPage = lazy(() => import("./pages/DistributorRateMasterAdminPage"));
const DealerPricingAdminPage = lazy(() => import("./pages/DealerPricingAdminPage"));
const MoqSettingsAdminPage = lazy(() => import("./pages/MoqSettingsAdminPage"));
const GstSettingsAdminPage = lazy(() => import("./pages/GstSettingsAdminPage"));

// Marketing & Intelligence
const ContentManagementPage = lazy(() => import("./pages/ContentManagementPage"));
const CrossPlatformReportsPage = lazy(() => import("./pages/CrossPlatformReportsPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));

function SubLoader() {
  return (
    <div className="p-12 text-center text-slate-400 text-xs">
      Loading BOSKIT module...
    </div>
  );
}

export default function BoskitAdminPortalApp() {
  return (
    <Routes>
      <Route element={<BoskitAdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        
        {/* Operations & Core */}
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<SubLoader />}>
              <BoskitOverviewDashboard />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<SubLoader />}>
              <OrdersAdminPage />
            </Suspense>
          }
        />
        <Route
          path="payments"
          element={
            <Suspense fallback={<SubLoader />}>
              <PaymentsAdminPage />
            </Suspense>
          }
        />

        {/* Franchise & Dealer Network */}
        <Route
          path="applications"
          element={
            <Suspense fallback={<SubLoader />}>
              <DistributorApplicationsPage />
            </Suspense>
          }
        />
        <Route
          path="applications/:id"
          element={
            <Suspense fallback={<SubLoader />}>
              <DistributorDetailPage />
            </Suspense>
          }
        />
        <Route
          path="distributors"
          element={
            <Suspense fallback={<SubLoader />}>
              <DistributorsListPage />
            </Suspense>
          }
        />
        <Route
          path="plans"
          element={
            <Suspense fallback={<SubLoader />}>
              <DistributorPlansAdminPage />
            </Suspense>
          }
        />
        <Route
          path="dealers"
          element={
            <Suspense fallback={<SubLoader />}>
              <DealersAdminPage />
            </Suspense>
          }
        />
        <Route
          path="territories"
          element={
            <Suspense fallback={<SubLoader />}>
              <TerritorySettingsAdminPage />
            </Suspense>
          }
        />

        {/* Commercial & Pricing Masters */}
        <Route
          path="channel-settings"
          element={
            <Suspense fallback={<SubLoader />}>
              <ChannelSettingsAdminPage />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<SubLoader />}>
              <ProductsAdminPage />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<SubLoader />}>
              <CategoriesAdminPage />
            </Suspense>
          }
        />
        <Route
          path="mrp-master"
          element={
            <Suspense fallback={<SubLoader />}>
              <MrpMasterAdminPage />
            </Suspense>
          }
        />
        <Route
          path="distributor-rates"
          element={
            <Suspense fallback={<SubLoader />}>
              <DistributorRateMasterAdminPage />
            </Suspense>
          }
        />
        <Route
          path="dealer-pricing"
          element={
            <Suspense fallback={<SubLoader />}>
              <DealerPricingAdminPage />
            </Suspense>
          }
        />
        <Route
          path="moq-settings"
          element={
            <Suspense fallback={<SubLoader />}>
              <MoqSettingsAdminPage />
            </Suspense>
          }
        />
        <Route
          path="gst-settings"
          element={
            <Suspense fallback={<SubLoader />}>
              <GstSettingsAdminPage />
            </Suspense>
          }
        />

        {/* Marketing & Intelligence */}
        <Route
          path="content"
          element={
            <Suspense fallback={<SubLoader />}>
              <ContentManagementPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<SubLoader />}>
              <CrossPlatformReportsPage />
            </Suspense>
          }
        />
        <Route
          path="audit-logs"
          element={
            <Suspense fallback={<SubLoader />}>
              <AuditLogsPage />
            </Suspense>
          }
        />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
