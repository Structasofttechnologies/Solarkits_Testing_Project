/**
 * permissions.js
 *
 * Client-side authorization & capability helpers for EPC sub-users and roles.
 */

export const CAPABILITIES = [
  {
    id: "can_view_catalog",
    name: "Browse Store & Catalog",
    desc: "View solar combo kits, individual equipment, and real-time benchmark pricing",
  },
  {
    id: "can_add_to_cart",
    name: "Add to Cart",
    desc: "Configure kits, adjust component quantities, and add items into the cart",
  },
  {
    id: "can_checkout",
    name: "Checkout & Place Orders",
    desc: "Submit order requests, upload bank transfer receipts, and execute purchases",
  },
  {
    id: "can_view_orders",
    name: "View Orders & Invoices",
    desc: "Access order tracking, PO allocations, GST invoices, and payment receipts",
  },
  {
    id: "can_manage_offices",
    name: "Manage Offices & States",
    desc: "Onboard new state GSTs, setup district offices, and manage locations",
  },
  {
    id: "can_manage_team",
    name: "Manage Team Members",
    desc: "Create, update, or remove sub-users and configure their permissions (Admin only)",
  },
];

export const PERMISSION_PRESETS = [
  {
    id: "all",
    name: "All Capabilities (Full Access)",
    desc: "Full administrative access across all store operations, purchases, and offices",
    permissions: ["all"],
  },
  {
    id: "checkout_and_buy",
    name: "Checkout & Purchase",
    desc: "Allowed to browse products, add to cart, and place/checkout orders",
    permissions: ["can_view_catalog", "can_add_to_cart", "can_checkout", "can_view_orders"],
  },
  {
    id: "add_to_cart_only",
    name: "Add to Cart Only (Shopper)",
    desc: "Allowed to browse products and build the cart, but cannot place or checkout orders",
    permissions: ["can_view_catalog", "can_add_to_cart", "can_view_orders"],
  },
  {
    id: "accountant",
    name: "Finance & Accounts",
    desc: "Allowed to review orders, invoices, payment receipts, and execute checkout",
    permissions: ["can_view_catalog", "can_view_orders", "can_checkout"],
  },
  {
    id: "custom",
    name: "Custom Permissions",
    desc: "Select specific capabilities manually below",
    permissions: [],
  },
];

/**
 * Checks whether an EPC user has a specific permission.
 *
 * @param {object} user - Redux or auth user object
 * @param {string} permission - e.g. 'can_add_to_cart', 'can_checkout'
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  // Primary account owner always has all permissions
  if (user.is_owner || !user.parent_account_id) return true;

  // Role owner or admin has all permissions
  if (user.role === "owner" || user.role === "admin") return true;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];

  // 'all' wildcard grants everything
  if (perms.includes("all")) return true;

  return perms.includes(permission);
}

/**
 * Checks if user is an Admin or Owner who can manage team & profile
 */
export function isAdminOrOwner(user) {
  if (!user) return false;
  if (user.is_owner || !user.parent_account_id) return true;
  if (user.role === "owner" || user.role === "admin") return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes("all") || perms.includes("can_manage_team");
}
