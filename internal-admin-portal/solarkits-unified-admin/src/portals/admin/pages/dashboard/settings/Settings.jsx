import { Route, Routes, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import Loader from "@/components/Loader";
import { PermissionGuard } from "@/components/PermissionGuard";

const RoleSettings = lazy(() => import("./RoleSettings"));
const HRSettings = lazy(() => import("./HRSettings"));
const LocationSetting = lazy(() => import("./LocationSetting"));
const EpcTypeSettings = lazy(() => import("./EpcTypeSettings"));
const BusinessProfileSettings = lazy(() => import("./BusinessProfileSettings"));

export default function Settings() {
    return (
        <Routes>
            <Route path='/epc-types/*' element={
                <Suspense fallback={<Loader text='Loading EPC type settings...' />}>
                    <EpcTypeSettings />
                </Suspense>
            } />
            <Route path='/business-profiles/*' element={
                <Suspense fallback={<Loader text='Loading Business Profile settings...' />}>
                    <BusinessProfileSettings />
                </Suspense>
            } />
            <Route path='/role-settings/*' element={
                <PermissionGuard requiredUniqueId="ADM_ROLE_SETTINGS">
                    <Suspense fallback={<Loader text='Load role settings...' />}>
                        <RoleSettings />
                    </Suspense>
                </PermissionGuard>
            } />
            <Route path='/hr-settings/*' element={
                <PermissionGuard requiredUniqueId="00000000">
                    <Suspense fallback={<Loader text='Load HR settings...' />}>
                        <HRSettings />
                    </Suspense>
                </PermissionGuard>
            } />
            <Route path='/location-setting/*' element={
                <PermissionGuard requiredUniqueId="ADM_LOC">
                    <Suspense fallback={<Loader text='Load location settings...' />}>
                        <LocationSetting />
                    </Suspense>
                </PermissionGuard>
            } />
            <Route path="/" element={<Navigate to="role-settings" replace />} />
            <Route path="*" element={<Navigate to="role-settings" replace />} />
        </Routes>
    )
}