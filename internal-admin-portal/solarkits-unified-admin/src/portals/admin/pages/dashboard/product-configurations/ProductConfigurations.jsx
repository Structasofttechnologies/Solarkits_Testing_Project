import { Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/components/PermissionGuard";
import Loader from "@/components/Loader";

const ProjectTypes = lazy(() => import("./ProjectTypes"));
const ProductTemplates = lazy(() => import("./ProductTemplates"));
const SKUMaster = lazy(() => import("./SKUMaster"));
const UnitsManagement = lazy(() => import("./UnitsManagement"));
const ComboKits = lazy(() => import("./SolarKits"));
const SolarKits = lazy(() => import("./SolarKits"));
const PriceMaster = lazy(() => import("./PriceMaster"));
const PriceRequests = lazy(() => import("./PriceRequests"));

export default function ProductConfigurations({ moduleUniqueId }) {
    return (
        <>
            <Routes>
                <Route
                    path="/project-types"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_PROJ_TYPES">
                            <Suspense fallback={<Loader text="Loading content..." />}>
                                <ProjectTypes moduleUniqueId="ADM_PROJ_TYPES" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route
                    path="/product-templates/*"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_PROD_TMPL">
                            <Suspense fallback={<Loader text="Loading content..." />}>
                                <ProductTemplates moduleUniqueId="ADM_PROD_TMPL" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route
                    path="/sku-master"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_SKU">
                            <Suspense fallback={<Loader text="Loading content..." />}>
                                <SKUMaster moduleUniqueId="ADM_SKU" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route
                    path="/units-management"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_UNITS">
                            <Suspense fallback={<Loader text="Loading content..." />}>
                                <UnitsManagement moduleUniqueId="ADM_UNITS" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route path='/combo-kits/*' element={
                    <PermissionGuard requiredUniqueId="ADM_PROD_CFG">
                        <Suspense fallback={<Loader text='Load combo kits...' />}>
                            <ComboKits />
                        </Suspense>
                    </PermissionGuard>
                } />
                <Route
                    path="/solar-kits"
                    element={
                        <PermissionGuard
                            requiredUniqueId="ADM_SOLAR_KITS"
                        >
                            <Suspense fallback={<Loader />}>
                                <SolarKits moduleUniqueId="ADM_SOLAR_KITS" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route
                    path="/price-master"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_BETCHMARK_PRICE_MASTER">
                            <Suspense fallback={<Loader text="Loading price master..." />}>
                                <PriceMaster moduleUniqueId="ADM_BETCHMARK_PRICE_MASTER" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route
                    path="/price-requests"
                    element={
                        <PermissionGuard requiredUniqueId="ADM_PRICE_REQS">
                            <Suspense fallback={<Loader text="Loading price requests..." />}>
                                <PriceRequests moduleUniqueId="ADM_PRICE_REQS" />
                            </Suspense>
                        </PermissionGuard>
                    }
                />
                <Route path="/" element={<Navigate to="project-types" replace />} />
                <Route path="*" element={<Navigate to="project-types" replace />} />
            </Routes>
        </>
    )
}
