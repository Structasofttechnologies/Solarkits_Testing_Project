import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "./Loader";
import { selectAllowedUniqueIds } from "@/features/modules.slice";

export function PermissionGuard({ requiredUniqueId, children }) {
  return children;
}
