import { Route, Routes, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import Loader from "@/components/Loader";
import { PermissionGuard } from "@/components/PermissionGuard";

const CompanyWarehouses = lazy(() => import("./CompanyWarehouses"));
const ManufacturingBrands = lazy(() => import("./ManufacturingBrands"));

export default function Operations() {
    return (
        <Routes>
            <Route path='/company-warehouses/*' element={
                <PermissionGuard requiredUniqueId="ADM_WAREHOUSES">
                    <Suspense fallback={<Loader text='Load Compnany Warehouses...' />}>
                        <CompanyWarehouses moduleUniqueId="ADM_WAREHOUSES" />
                    </Suspense>
                </PermissionGuard>
            } />
            <Route path='/manufacturing-brands/*' element={
                <PermissionGuard requiredUniqueId="ADM_MFG_BRANDS">
                    <Suspense fallback={<Loader text='Load Manufacturing Brands...' />}>
                        <ManufacturingBrands moduleUniqueId="ADM_MFG_BRANDS" />
                    </Suspense>
                </PermissionGuard>
            } />
            <Route path="/" element={<Navigate to="company-warehouses" replace />} />
            <Route path="*" element={<Navigate to="company-warehouses" replace />} />
        </Routes>
    )
}
