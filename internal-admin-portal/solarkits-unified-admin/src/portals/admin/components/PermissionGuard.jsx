import { useSelector, shallowEqual } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";
import { selectAllowedUniqueIds } from "@/features/modules.slice";

export function PermissionGuard({ requiredUniqueId, children }) {
  const location = useLocation();
  const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname), shallowEqual);
  const modulesStatus = useSelector((state) => state.modules_slice?.status);

  // Wait while modules are not yet loaded (idle = never fetched, loading = in progress)
  if (modulesStatus === 'idle' || modulesStatus === 'loading') {
    return <Loader text="Checking permissions..." />;
  }

  if (!requiredUniqueId) {
    return <Navigate to="/admin-panel/home" replace />;
  }

  const idsToCheck = Array.isArray(requiredUniqueId) ? requiredUniqueId : [requiredUniqueId];
  const hasPermission = idsToCheck.some((id) =>
    allowedUniqueIds.includes(id) ||
    allowedUniqueIds.includes("00000000") ||
    (id.startsWith("FPO_") && allowedUniqueIds.includes("RSL_MGMT"))
  );

  if (!hasPermission) {
    return <Navigate to="/admin-panel/home" replace />;
  }

  return children;
}
