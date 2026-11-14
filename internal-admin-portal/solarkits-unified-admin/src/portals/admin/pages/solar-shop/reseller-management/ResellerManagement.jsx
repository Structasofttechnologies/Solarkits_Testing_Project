import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "@/components/Loader";
import { PermissionGuard } from "../../../components/PermissionGuard";

const ResellerManagementHome = lazy(() => import("./ResellerManagementHome"));
const ResellerLeads = lazy(() => import("./ResellerLeads"));
const ResellerTypes = lazy(() => import("./ResellerTypes"));
const ResellerPlans = lazy(() => import("./ResellerPlans"));
const FranchiseeSubtypes = lazy(() => import("./FranchiseeSubtypes"));
const StoreOnboardingQueue = lazy(() => import("./StoreOnboardingQueue"));
const StoreCreationWizard = lazy(() => import("./StoreCreationWizard"));
const ResellerList = lazy(() => import("./ResellerList"));
const ResellerDetail = lazy(() => import("./ResellerDetail"));
const ResellerTerritories = lazy(() => import("./ResellerTerritories"));
const ResellerProductAuth = lazy(() => import("./ResellerProductAuth"));
const ResellerEpcBuyers = lazy(() => import("./ResellerEpcBuyers"));
const ResellerOrders = lazy(() => import("./ResellerOrders"));
const ResellerWalletManager = lazy(() => import("./ResellerWalletManager"));
const ResellerSettings = lazy(() => import("./ResellerSettings"));

// ── Phase FPO: Franchisee PO Ordering, Commission, Goal & Performance ─────────
const FranchiseeSettings             = lazy(() => import("./FranchiseeSettings"));
const FranchiseePOSettings           = lazy(() => import("./FranchiseePOSettings"));
const FranchiseeMoqRules             = lazy(() => import("./FranchiseeMoqRules"));
const FranchiseeKitTargets           = lazy(() => import("./FranchiseeKitTargets"));
const FranchiseePerformanceTracker   = lazy(() => import("./FranchiseePerformanceTracker"));
const FranchiseeCommissionSettings   = lazy(() => import("./FranchiseeCommissionSettings"));
const FranchiseeCommissionLedger     = lazy(() => import("./FranchiseeCommissionLedger"));
const StoreSetupManagement = lazy(() => import("../../dashboard/store-setup/StoreSetupManagement"));

/**
 * ResellerManagement router — top-level router for all reseller management sub-pages.
 * Mounted at: /admin-panel/solar-shop/reseller-management/*
 */
function ResellerManagement() {
  return (
    <Routes>
      {/* Home / Overview */}
      <Route
        index
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Reseller Management..." />}>
              <ResellerManagementHome />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Onboard New Store Wizard */}
      <Route
        path="/create-store"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
              <StoreCreationWizard />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="create-store"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
              <StoreCreationWizard />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="/onboarding/create"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
              <StoreCreationWizard />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="onboarding/create"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Wizard..." />}>
              <StoreCreationWizard />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Store Onboarding Lifecycle Queue */}
      <Route
        path="/onboarding"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Queue..." />}>
              <StoreOnboardingQueue />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="onboarding"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Onboarding Queue..." />}>
              <StoreOnboardingQueue />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Franchisee Application Leads */}
      <Route
        path="/leads"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Franchisee Leads..." />}>
              <ResellerLeads moduleUniqueId="RSL_MGMT" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Accounts List */}
      <Route
        path="/resellers"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Reseller List..." />}>
              <ResellerList moduleUniqueId="RSL_MGMT" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Account Detail & KYC Review */}
      <Route
        path="/resellers/:id"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Reseller Detail..." />}>
              <ResellerDetail moduleUniqueId="RSL_MGMT" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Types */}
      <Route
        path="/types"
        element={
          <PermissionGuard requiredUniqueId="RSL_TYPES">
            <Suspense fallback={<Loader text="Loading Reseller Types..." />}>
              <ResellerTypes moduleUniqueId="RSL_TYPES" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Plans */}
      <Route
        path="/plans"
        element={
          <PermissionGuard requiredUniqueId="RSL_PLAN">
            <Suspense fallback={<Loader text="Loading Reseller Plans..." />}>
              <ResellerPlans moduleUniqueId="RSL_PLAN" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Franchisee Subtypes */}
      <Route
        path="/subtypes"
        element={
          <PermissionGuard requiredUniqueId="RSL_PLAN">
            <Suspense fallback={<Loader text="Loading Franchisee Subtypes..." />}>
              <FranchiseeSubtypes />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Territories */}
      <Route
        path="/territories"
        element={
          <PermissionGuard requiredUniqueId="RSL_TERRITORY">
            <Suspense fallback={<Loader text="Loading Territory Management..." />}>
              <ResellerTerritories moduleUniqueId="RSL_TERRITORY" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Product Authorization Matrix */}
      <Route
        path="/product-auth"
        element={
          <PermissionGuard requiredUniqueId="RSL_PROD_AUTH">
            <Suspense fallback={<Loader text="Loading Product Authorization Matrix..." />}>
              <ResellerProductAuth moduleUniqueId="RSL_PROD_AUTH" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller EPC Buyers */}
      <Route
        path="/epc-buyers"
        element={
          <PermissionGuard requiredUniqueId="RSL_EPC_BUYERS">
            <Suspense fallback={<Loader text="Loading Reseller EPC Buyers..." />}>
              <ResellerEpcBuyers moduleUniqueId="RSL_EPC_BUYERS" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Orders */}
      <Route
        path="/orders"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Reseller Orders..." />}>
              <ResellerOrders moduleUniqueId="RSL_MGMT" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Commission Engine & Wallet Ledger */}
      <Route
        path="/wallet"
        element={
          <PermissionGuard requiredUniqueId="RSL_WALLET">
            <Suspense fallback={<Loader text="Loading Wallet & Ledger System..." />}>
              <ResellerWalletManager moduleUniqueId="RSL_WALLET" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Reseller Platform Settings */}
      <Route
        path="/settings"
        element={
          <PermissionGuard requiredUniqueId="RSL_SETTINGS">
            <Suspense fallback={<Loader text="Loading Reseller Settings..." />}>
              <ResellerSettings moduleUniqueId="RSL_SETTINGS" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* ── Unified Franchisee Settings: MOQ, Commission, PO Settings ── */}
      <Route
        path="/franchise-settings"
        element={
          <PermissionGuard requiredUniqueId="FPO_SETTINGS">
            <Suspense fallback={<Loader text="Loading Franchisee Settings..." />}>
              <FranchiseeSettings />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="/fpo/po-settings"
        element={
          <PermissionGuard requiredUniqueId="FPO_SETTINGS">
            <Suspense fallback={<Loader text="Loading Franchisee Settings..." />}>
              <FranchiseeSettings />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="/fpo/moq-rules"
        element={
          <PermissionGuard requiredUniqueId="FPO_SETTINGS">
            <Suspense fallback={<Loader text="Loading Franchisee Settings..." />}>
              <FranchiseeSettings />
            </Suspense>
          </PermissionGuard>
        }
      />
      {/* ── Unified Franchise Goal Settings Redirect: Consolidated to Franchise Cluster Hub ── */}
      <Route
        path="/fpo/kit-targets"
        element={<Navigate to="/admin-panel/solar-shop/franchise-clusters?tab=goals" replace />}
      />
      <Route
        path="fpo/kit-targets"
        element={<Navigate to="/admin-panel/solar-shop/franchise-clusters?tab=goals" replace />}
      />
      <Route
        path="/fpo/performance"
        element={
          <PermissionGuard requiredUniqueId="FPO_ANALYTICS">
            <Suspense fallback={<Loader text="Loading Performance Tracker..." />}>
              <FranchiseePerformanceTracker />
            </Suspense>
          </PermissionGuard>
        }
      />
      {/* ── Margin & Commission Module: Commission Settings & Ledger ── */}
      <Route
        path="/commission-settings"
        element={
          <PermissionGuard requiredUniqueId="FPO_COMM">
            <Suspense fallback={<Loader text="Loading Commission Settings..." />}>
              <FranchiseeCommissionSettings moduleUniqueId="FPO_COMM" />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="/commission-ledger"
        element={
          <PermissionGuard requiredUniqueId="FPO_COMM">
            <Suspense fallback={<Loader text="Loading Commission Ledger..." />}>
              <FranchiseeCommissionLedger moduleUniqueId="FPO_COMM" />
            </Suspense>
          </PermissionGuard>
        }
      />

      {/* Franchisee Store Setup & Operations */}
      <Route
        path="/store-setup/*"
        element={
          <PermissionGuard requiredUniqueId="RSL_MGMT">
            <Suspense fallback={<Loader text="Loading Store Setup Management..." />}>
              <StoreSetupManagement />
            </Suspense>
          </PermissionGuard>
        }
      />
    </Routes>
  );
}

export default ResellerManagement;

