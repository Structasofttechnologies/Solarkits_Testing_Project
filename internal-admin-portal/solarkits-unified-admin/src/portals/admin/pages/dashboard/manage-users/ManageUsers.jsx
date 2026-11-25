import { Route, Routes, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import Loader from "@/components/Loader";
import { PermissionGuard } from "@/components/PermissionGuard";

const EPCs = lazy(() => import("./EPCs"));
const Suppliers = lazy(() => import("./Suppliers"));

export default function ManageUsers() {
  return (
    <Routes>
      <Route path='/epcs/*' element={
        <PermissionGuard requiredUniqueId="ADM_EPC">
          <Suspense fallback={<Loader text='Load EPCs...' />}>
            <EPCs moduleUniqueId="ADM_EPC" />
          </Suspense>
        </PermissionGuard>
      } />
      <Route path='/suppliers/*' element={
        <PermissionGuard requiredUniqueId="ADM_SUPPLIERS">
          <Suspense fallback={<Loader text='Load Suppliers...' />}>
            <Suppliers moduleUniqueId="ADM_SUPPLIERS" />
          </Suspense>
        </PermissionGuard>
      } />
      <Route path="/" element={<Navigate to="epcs" replace />} />
      <Route path="*" element={<Navigate to="epcs" replace />} />
    </Routes>
  )
}
