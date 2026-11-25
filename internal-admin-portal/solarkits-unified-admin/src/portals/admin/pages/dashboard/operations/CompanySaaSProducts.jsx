import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import RenderIfPermission from "@/components/PermissionCheck";
import Loader from "@/components/Loader";

const ProductsList = lazy(() => import("./company-saas-products/ProductsList"));
const ProductCountries = lazy(() => import("./company-saas-products/ProductCountries"));

export default function CompanySaaSProducts({ moduleUniqueId }) {
    return (
        <Routes>
            <Route path="/" element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Suspense fallback={<Loader text='Loading Company SaaS Products...' />}>
                        <ProductsList moduleUniqueId={moduleUniqueId} />
                    </Suspense>
                </RenderIfPermission>
            } />
            <Route path="/:productSlug/countries" element={
                <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Suspense fallback={<Loader text='Loading Product Countries...' />}>
                        <ProductCountries moduleUniqueId={moduleUniqueId} />
                    </Suspense>
                </RenderIfPermission>
            } />
        </Routes>
    );
}
