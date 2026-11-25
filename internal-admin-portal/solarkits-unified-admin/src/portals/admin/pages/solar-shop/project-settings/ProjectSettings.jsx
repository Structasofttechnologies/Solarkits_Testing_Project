import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "@/components/Loader";
import { PermissionGuard } from "../../../components/PermissionGuard";

const IndustryTypes = lazy(() => import("./IndustryTypes"));

/**
 * ProjectSettings router — wraps all Project Settings sub-pages.
 * Currently: IndustryTypes
 * Future: Project Categories (with extended fields), Subcategories
 */
function ProjectSettings() {
  return (
    <Routes>
      <Route
        path="/industry-types"
        element={
          <PermissionGuard requiredUniqueId="ADM_INDUSTRY_TYPES">
            <Suspense fallback={<Loader text="Loading Industry Types..." />}>
              <IndustryTypes moduleUniqueId="ADM_INDUSTRY_TYPES" />
            </Suspense>
          </PermissionGuard>
        }
      />
    </Routes>
  );
}

export default ProjectSettings;
