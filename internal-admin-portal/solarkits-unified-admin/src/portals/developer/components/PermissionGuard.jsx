import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";
import { selectAllowedUniqueIds } from "@/features/modules.slice";

export function PermissionGuard({ requiredUniqueId, children }) {
  const location = useLocation();
  const allowedUniqueIds = useSelector((state) => selectAllowedUniqueIds(state, location.pathname));
  const modulesLoading = useSelector((state) => state.modules_slice?.loading);

  if (modulesLoading) return <Loader text="Checking permissions..." />;

  if (!requiredUniqueId || !allowedUniqueIds.includes(requiredUniqueId)) {
    return <Navigate to="/developer-panel/home" replace />;
  }

  return children;
}
