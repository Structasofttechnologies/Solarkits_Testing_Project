import { Route, Routes } from "react-router-dom"
import RenderIfPermission from "@/components/PermissionCheck"
import { Navigate } from "react-router-dom";
import Departments from "./role-settings/Departments"
import RoleBasedAccessControl from "./role-settings/RoleBasedAccessControl"
import RoleDetails from "./role-settings/RoleDetails"

export default function RoleSettings() {
    return (
        <Routes>
            <Route path="/departments/*" element={
                <RenderIfPermission requiredUniqueId="ADM_DEPTS" permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <Departments moduleUniqueId="ADM_DEPTS" />
                </RenderIfPermission>
            } />
            <Route path="/role-based-access-control/role/:id" element={
                <RenderIfPermission requiredUniqueId="ADM_RBAC" permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <RoleDetails moduleUniqueId="ADM_RBAC" />
                </RenderIfPermission>
            } />
            <Route path="/role-based-access-control/*" element={
                <RenderIfPermission requiredUniqueId="ADM_RBAC" permission="view" fallback={<Navigate to="/admin-panel/home" replace />}>
                    <RoleBasedAccessControl moduleUniqueId="ADM_RBAC" />
                </RenderIfPermission>
            } />
            <Route path="/" element={<Navigate to="role-based-access-control" replace />} />
            <Route path="*" element={<Navigate to="role-based-access-control" replace />} />
        </Routes>
    )
}
