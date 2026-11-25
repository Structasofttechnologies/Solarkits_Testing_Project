import { lazy, Suspense } from "react";
import { Route, Routes, Navigate, useParams } from "react-router-dom";
import RenderIfPermission from "@/components/PermissionCheck";
import Loader from "@/components/Loader";

const ViewWarehouses = lazy(() => import("./company-warehouses/ViewWarehouses"));
const AddWarehouse = lazy(() => import("./company-warehouses/AddWarehouse"));

function WarehouseDirectRedirect() {
    const { warehouseId } = useParams();
    return <Navigate to={`/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}`} replace />;
}


export default function CompanyWarehouses({ moduleUniqueId }) {
    return (
        <Routes>
            <Route path="/" element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Suspense fallback={<Loader text='Load warehouses...' />}><ViewWarehouses moduleUniqueId={moduleUniqueId} /></Suspense>
                </RenderIfPermission>
            } />
            <Route path='/add-warehouse/*' element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Suspense fallback={<Loader text='Load add warehouse page.' />}><AddWarehouse moduleUniqueId={moduleUniqueId} /></Suspense>
                </RenderIfPermission>
            } />
            <Route path='/edit-warehouse/:warehouseId/*' element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Suspense fallback={<Loader text='Load edit warehouse page.' />}><AddWarehouse moduleUniqueId={moduleUniqueId} /></Suspense>
                </RenderIfPermission>
            } />
            <Route path='/:warehouseId' element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <WarehouseDirectRedirect />
                </RenderIfPermission>
            } />
        </Routes>
    )
}
