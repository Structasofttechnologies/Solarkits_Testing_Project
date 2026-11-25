import React, { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Loader from '../../../components/Loader';
import { PermissionGuard } from '../../../components/PermissionGuard';

const BdeDashboard = lazy(() => import('./BdeDashboard'));
const AllBdes = lazy(() => import('./AllBdes'));
const CreateBde = lazy(() => import('./CreateBde'));
const EditBde = lazy(() => import('./EditBde'));
const BdeProfile = lazy(() => import('./BdeProfile'));
const TerritoryAssignment = lazy(() => import('./TerritoryAssignment'));
const GoalAssignment = lazy(() => import('./GoalAssignment'));
const BdeActivityHistory = lazy(() => import('./BdeActivityHistory'));
const BdeLeads = lazy(() => import('./BdeLeads'));
const BdeFranchisees = lazy(() => import('./BdeFranchisees'));
const TerritoryExceptions = lazy(() => import('./TerritoryExceptions'));
const BdeConversionFunnel = lazy(() => import('./BdeConversionFunnel'));

export default function BdeManagement({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading BDE dashboard..." />}>
              <BdeDashboard moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="all"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading BDE list..." />}>
              <AllBdes moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="leads"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading BDE leads..." />}>
              <BdeLeads moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="franchisees"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading attributed franchisees..." />}>
              <BdeFranchisees moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="territory-exceptions"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading territory exceptions..." />}>
              <TerritoryExceptions moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="conversion-funnel"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading conversion funnel..." />}>
              <BdeConversionFunnel moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="create"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading creation form..." />}>
              <CreateBde moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="edit/:id"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading edit form..." />}>
              <EditBde moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="profile/:id"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading BDE profile..." />}>
              <BdeProfile moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="territory-assignment"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading territory assignments..." />}>
              <TerritoryAssignment moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="goal-assignment"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading goal assignments..." />}>
              <GoalAssignment moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route
        path="activity-history"
        element={
          <PermissionGuard requiredUniqueId={moduleUniqueId}>
            <Suspense fallback={<Loader text="Loading activity history..." />}>
              <BdeActivityHistory moduleUniqueId={moduleUniqueId} />
            </Suspense>
          </PermissionGuard>
        }
      />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
