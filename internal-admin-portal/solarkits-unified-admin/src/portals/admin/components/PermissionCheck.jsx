import React from "react";
import { useSelector } from "react-redux";

function normalizePermissionKeys(perm) {
  if (!perm) return [];
  if (/^add$/i.test(perm)) return ["can_add", "is_add"];
  if (/^(update|edit)$/i.test(perm)) return ["can_edit", "is_update", "can_update"];
  if (/^delete$/i.test(perm)) return ["can_delete", "is_delete"];
  if (/^view$/i.test(perm)) return ["can_view", "is_view"];
  return [perm];
}

function findModuleRecursive(list = [], predicate) {
  for (const m of list) {
    if (predicate(m)) return m;
    if (m.children && m.children.length) {
      const found = findModuleRecursive(m.children, predicate);
      if (found) return found;
    }
  }
  return null;
}

const EMPTY_ARRAY = [];

// Hook: checks permission by searching modules tree for either module id or unique id
export function useHasPermission({ moduleId, requiredUniqueId, permission }) {
  const modules = useSelector((state) => state.modules_slice?.modules || EMPTY_ARRAY);
  if (!permission) return false;

  const keys = normalizePermissionKeys(permission);

  const predicate = (m) => {
    if (!m) return false;
    if (moduleId && m.id === moduleId) return true;
    if (requiredUniqueId && m.unique_id === requiredUniqueId) return true;
    return false;
  };

  const mod = findModuleRecursive(modules, predicate);
  if (!mod) return false;

  return keys.some((k) => !!mod[k]);
}

// Component: render children only when permission exists for given unique id or module id
export function RenderIfPermission({ moduleId, requiredUniqueId, permission, children, fallback = null }) {
  const allowed = useHasPermission({ moduleId, requiredUniqueId, permission });
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export default RenderIfPermission;
