import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import {
  FiUsers,
  FiUserPlus,
  FiUserCheck,
  FiShield,
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiEdit2,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiArrowRight,
  FiCheck,
  FiX,
  FiShoppingBag,
  FiCreditCard
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { setAlert } from "@/features/alert.slice";
import Button from "@/Components/Button";
import Dialog from "@/Components/Dialog";
import Loader from "@/Components/Loader";
import {
  CAPABILITIES,
  PERMISSION_PRESETS,
  hasPermission,
  isAdminOrOwner
} from "@/utils/permissions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLES = [
  {
    id: "admin",
    name: "EPC Co-Admin",
    desc: "Full administrative access under your primary EPC account (manage team, offices, orders, cart)",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    defaultPreset: "all",
    defaultPermissions: ["all"],
  },
  {
    id: "account",
    name: "Accountant / Finance",
    desc: "Financial & billing management (track orders, invoices, payment receipts, checkout)",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    defaultPreset: "accountant",
    defaultPermissions: ["can_view_catalog", "can_view_orders", "can_checkout"],
  },
  {
    id: "shopper",
    name: "Shopper / Purchaser",
    desc: "Store buyer access (browse products, configure kits, add to cart, purchase)",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    defaultPreset: "checkout_and_buy",
    defaultPermissions: ["can_view_catalog", "can_add_to_cart", "can_checkout", "can_view_orders"],
  },
];

const getRoleObj = (roleId) => {
  return (
    ROLES.find((r) => r.id === roleId) || {
      id: roleId,
      name: roleId ? roleId.charAt(0).toUpperCase() + roleId.slice(1) : "Shopper",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    }
  );
};

export default function EpcTeamUsers() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentAuthUser } = useSelector((state) => state.auth_slice);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activatedDistricts, setActivatedDistricts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State with Role and Capability Eligibility
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    password: "",
    role: "shopper",
    permission_preset: "checkout_and_buy",
    permissions: ["can_view_catalog", "can_add_to_cart", "can_checkout", "can_view_orders"],
    assigned_districts: [],
    is_active: true,
  });

  // Fetch team users & activated districts
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, profileRes] = await Promise.all([
        axios.get(`${API_URL}/india/v1/shop/epc/users`, {
          withCredentials: true,
        }),
        axios.get(`${API_URL}/india/v1/shop/epc/profile`, {
          withCredentials: true,
        }),
      ]);

      if (usersRes.data?.success) {
        setUsers(usersRes.data.users || []);
      }
      if (profileRes.data?.success) {
        setActivatedDistricts(profileRes.data.activated_districts || []);
      }
    } catch (err) {
      console.error("Failed to fetch team users:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to load team users.",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // District checkbox toggle
  const handleDistrictToggle = (districtId) => {
    setForm((prev) => {
      const exists = prev.assigned_districts.includes(districtId);
      return {
        ...prev,
        assigned_districts: exists
          ? prev.assigned_districts.filter((id) => id !== districtId)
          : [...prev.assigned_districts, districtId],
      };
    });
  };

  // Select all / clear all districts
  const handleSelectAllDistricts = () => {
    const allIds = activatedDistricts.map((d) => d.district_id);
    setForm((prev) => ({
      ...prev,
      assigned_districts:
        prev.assigned_districts.length === allIds.length ? [] : allIds,
    }));
  };

  // Handle Role selection change
  const handleRoleChange = (newRole) => {
    const roleConfig = ROLES.find((r) => r.id === newRole);
    setForm((prev) => ({
      ...prev,
      role: newRole,
      permission_preset: roleConfig?.defaultPreset || "custom",
      permissions: roleConfig?.defaultPermissions || prev.permissions,
    }));
  };

  // Handle Preset selection change
  const handlePresetChange = (presetId) => {
    const preset = PERMISSION_PRESETS.find((p) => p.id === presetId);
    setForm((prev) => ({
      ...prev,
      permission_preset: presetId,
      permissions: preset?.permissions || prev.permissions,
    }));
  };

  // Toggle individual capability permission
  const handlePermissionToggle = (permId) => {
    setForm((prev) => {
      let current = [...prev.permissions];
      if (current.includes("all")) {
        current = CAPABILITIES.map((c) => c.id).filter((c) => c !== permId);
      } else if (current.includes(permId)) {
        current = current.filter((p) => p !== permId);
      } else {
        current.push(permId);
      }
      return {
        ...prev,
        permission_preset: "custom",
        permissions: current,
      };
    });
  };

  // Reset form
  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      whatsapp: "",
      password: "",
      role: "shopper",
      permission_preset: "checkout_and_buy",
      permissions: ["can_view_catalog", "can_add_to_cart", "can_checkout", "can_view_orders"],
      assigned_districts: [],
      is_active: true,
    });
    setShowPassword(false);
  };

  // Create User Submit
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.whatsapp) {
      dispatch(
        setAlert({
          type: "warning",
          message: "Please fill in all required fields.",
        })
      );
      return;
    }

    if (form.password.length < 6) {
      dispatch(
        setAlert({
          type: "warning",
          message: "Password must be at least 6 characters.",
        })
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API_URL}/india/v1/shop/epc/users`,
        {
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp,
          password: form.password,
          role: form.role,
          permissions: form.permissions,
          assigned_districts: form.assigned_districts,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: res.data.message || "Team member created successfully!",
          })
        );
        setShowAddModal(false);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error("Create user error:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to create user.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    const userRole = user.role || "shopper";
    const userPerms = Array.isArray(user.permissions) && user.permissions.length > 0
      ? user.permissions
      : (userRole === "admin"
          ? ["all"]
          : userRole === "account"
            ? ["can_view_catalog", "can_view_orders", "can_checkout"]
            : ["can_view_catalog", "can_add_to_cart", "can_checkout", "can_view_orders"]);

    let matchedPreset = "custom";
    if (userPerms.includes("all")) {
      matchedPreset = "all";
    } else {
      const found = PERMISSION_PRESETS.find(
        (p) =>
          p.id !== "all" &&
          p.id !== "custom" &&
          p.permissions.length === userPerms.length &&
          p.permissions.every((perm) => userPerms.includes(perm))
      );
      if (found) matchedPreset = found.id;
    }

    setForm({
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp,
      password: "",
      role: userRole,
      permission_preset: matchedPreset,
      permissions: userPerms,
      assigned_districts: (user.assigned_districts || []).map((d) => d.id),
      is_active: user.is_active !== false,
    });
    setShowEditModal(true);
  };

  // Update User Submit
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSubmitting(true);
      const payload = {
        name: form.name,
        whatsapp: form.whatsapp,
        role: form.role,
        permissions: form.permissions,
        assigned_districts: form.assigned_districts,
        is_active: form.is_active,
      };
      if (form.password && form.password.trim().length >= 6) {
        payload.password = form.password.trim();
      }

      const res = await axios.put(
        `${API_URL}/india/v1/shop/epc/users/${editingUser.id}`,
        payload,
        { withCredentials: true }
      );

      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: "User updated successfully!",
          })
        );
        setShowEditModal(false);
        setEditingUser(null);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error("Update user error:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to update user.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove user "${userName}"?`)) {
      return;
    }

    try {
      const res = await axios.delete(
        `${API_URL}/india/v1/shop/epc/users/${userId}`,
        { withCredentials: true }
      );

      if (res.data?.success) {
        dispatch(
          setAlert({
            type: "success",
            message: "User removed successfully.",
          })
        );
        fetchData();
      }
    } catch (err) {
      console.error("Delete user error:", err);
      dispatch(
        setAlert({
          type: "error",
          message:
            err.response?.data?.message || "Failed to delete user.",
        })
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader text="Loading Team Users & District Permissions..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* ── TOP BANNER (Solar Store Theme) ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-[#1e2f70] to-[#152250] text-white border border-primary-400/20 shadow-xl shadow-primary/15 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-xl ring-4 ring-white/15 shrink-0">
              <FiUsers size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  EPC Team & Sub-Users
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                  <FiShield size={13} /> Admin Managed
                </span>
              </div>
              <p className="text-white/80 text-sm mt-1 max-w-xl leading-relaxed">
                Create sub-logins for your team to work on your behalf. Grant
                district-level permissions to ensure staff only access regions
                where your EPC has activated offices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-accent to-amber-500 hover:from-amber-500 hover:to-accent text-white font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-200 border-0 shrink-0 flex items-center gap-2 cursor-pointer text-sm"
          >
            <FiUserPlus size={18} />
            <span>Create New User</span>
          </button>
        </div>

        {/* Metric Badges (Frosted Glass Solar Store Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/15">
          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
              Total Sub-Users
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {users.length}
            </span>
            <span className="text-[11px] text-white/70">Created staff accounts</span>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
              Active Logins
            </span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">
              {users.filter((u) => u.is_active).length}
            </span>
            <span className="text-[11px] text-white/70">Can access portal</span>
          </div>

          <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-200 text-white col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
              Activated EPC Districts
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              {activatedDistricts.length}
            </span>
            <span className="text-[11px] text-white/70">
              Assigned across offices
            </span>
          </div>
        </div>
      </div>

      {/* ── NOTICE BANNER: DISTRICT PERMISSIONS ──────────────────────────── */}
      {activatedDistricts.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <FiAlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">No District Offices Activated Yet</p>
            <p className="mt-0.5 leading-relaxed">
              To restrict users to specific operating districts, first add district
              offices in your{" "}
              <button
                onClick={() => navigate("/profile")}
                className="underline font-bold hover:text-amber-500 cursor-pointer"
              >
                EPC Profile
              </button>
              . Once added, those districts will appear below for role assignment.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-between text-xs text-text-secondary shadow-xs">
          <span className="flex items-center gap-2">
            <FiMapPin className="text-primary font-bold" />
            <span>
              <strong>{activatedDistricts.length} Districts</strong> activated by your
              EPC Admin across onboarded states:{" "}
              {activatedDistricts.map((d) => d.district_name).join(", ")}
            </span>
          </span>
          <button
            onClick={() => navigate("/profile")}
            className="text-primary hover:text-primary-hover font-bold shrink-0 ml-4 cursor-pointer"
          >
            Manage Offices in Profile →
          </button>
        </div>
      )}

      {/* ── TEAM USERS LIST ──────────────────────────────────────────────── */}
      {users.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <FiUsers size={28} />
          </div>
          <h3 className="text-base font-bold text-text-primary">
            No Sub-Users Created Yet
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-1 mb-5">
            Your EPC Owner login is currently the only account. Create logins for
            project managers, site engineers, or procurement staff to operate on
            your behalf.
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <FiUserPlus size={15} />
            <span>Create Your First User</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((u) => {
            const roleObj =
              ROLES.find((r) => r.id === u.role) || ROLES[0];

            return (
              <div
                key={u.id}
                className="bg-surface rounded-2xl border border-border hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-base text-text-primary leading-tight">
                          {u.name}
                        </h3>
                        <span
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1 ${roleObj.color}`}
                        >
                          {roleObj.name}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-surface-hover text-text-muted border border-border"
                      }`}
                    >
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>

                  {/* Contact Details */}
                  <div className="bg-surface-hover/80 rounded-xl p-3 border border-border/80 space-y-1.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <FiMail className="text-primary shrink-0" />
                      <span className="font-mono text-text-primary truncate">
                        {u.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-emerald-500 shrink-0" />
                      <span>+91 {u.whatsapp}</span>
                    </div>
                  </div>

                  {/* Assigned Districts */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                      Assigned District Jurisdiction:
                    </span>
                    {u.assigned_districts && u.assigned_districts.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {u.assigned_districts.map((dist) => (
                          <span
                            key={dist.id || dist.name}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg border border-primary/20"
                          >
                            <FiMapPin size={11} />
                            {dist.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">
                        All Activated Districts (Unrestricted)
                      </span>
                    )}
                  </div>

                  {/* Capabilities / Eligibility */}
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                      Allowed Capabilities:
                    </span>
                    {Array.isArray(u.permissions) && u.permissions.includes("all") ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-500/10 text-purple-600 px-2.5 py-1 rounded-lg border border-purple-500/20">
                        ⚡ Full Access (All Capabilities)
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(u.permissions) && u.permissions.length > 0 ? (
                          u.permissions.map((p) => {
                            const cap = CAPABILITIES.find((c) => c.id === p);
                            return (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-surface-hover text-text-primary px-2 py-0.5 rounded-md border border-border"
                              >
                                <FiCheck size={11} className="text-emerald-500" />
                                {cap ? cap.name : p}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-text-muted italic">
                            No capabilities assigned
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-surface-hover/60 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-[10px] text-text-muted">
                    Created:{" "}
                    {new Date(u.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="text-text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface transition-colors"
                      title="Edit Permissions"
                    >
                      <FiEdit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="text-text-secondary hover:text-danger p-1.5 rounded-lg hover:bg-surface transition-colors"
                      title="Delete User"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE NEW SUB-USER                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Team Member / Sub-User"
        size="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 py-2">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <FiUserPlus size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sub-Account Credentials & Scoping</p>
              <p className="text-text-secondary mt-0.5">
                The user can log into the Solar Store with their email and password.
                They will only be able to place orders or operate in the districts you
                grant below.
              </p>
            </div>
          </div>

          {/* Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Ramesh Patel"
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Role & Designation <span className="text-danger">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                {ROLES.find((r) => r.id === form.role)?.desc}
              </p>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Login Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value.toLowerCase(),
                  }))
                }
                placeholder="user@yourcompany.com"
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-mono text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                WhatsApp / Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile number"
                maxLength={10}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
              Login Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-border rounded-xl text-sm font-mono text-text-primary focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* ── REQUIREMENT 4: AUTHORIZATIONS & ELIGIBILITY (ALLOWED ACTIONS) ── */}
          <div className="pt-2 border-t border-border">
            <div className="mb-2">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider block">
                Allowed Capabilities / Eligibility (Authorizations) <span className="text-danger">*</span>
              </label>
              <p className="text-[11px] text-text-muted mt-0.5">
                Limit what actions this sub-user is permitted to perform in the Solar Store.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {PERMISSION_PRESETS.filter((p) => p.id !== "custom").map((preset) => {
                const isSelected = form.permission_preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary"
                        : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:border-border/80"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{preset.name}</div>
                    <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Granular Capabilities Checklist */}
            <div className="bg-surface-hover/50 border border-border rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Granular Capability Switches:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAPABILITIES.map((cap) => {
                  const isAllActive = form.permissions.includes("all");
                  const isChecked = isAllActive || form.permissions.includes(cap.id);
                  return (
                    <label
                      key={cap.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary font-bold"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAllActive && cap.id !== "all"}
                        onChange={() => handlePermissionToggle(cap.id)}
                        className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary shrink-0"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">{cap.name}</span>
                        <span className="text-[10px] text-text-muted block leading-tight mt-0.5">
                          {cap.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── DISTRICT ACTIVATION / ASSIGNMENT SECTION ────────────────── */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-black text-text-primary uppercase tracking-wider block">
                  Assign Activated Districts
                </label>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Only districts where your Solar EPC has established offices are
                  available.
                </p>
              </div>

              {activatedDistricts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDistricts}
                  className="text-xs font-bold text-primary hover:text-primary-hover underline underline-offset-2"
                >
                  {form.assigned_districts.length === activatedDistricts.length
                    ? "Deselect All"
                    : "Select All Activated"}
                </button>
              )}
            </div>

            {activatedDistricts.length === 0 ? (
              <div className="bg-surface-hover border border-border rounded-xl p-3 text-xs text-text-muted text-center">
                No district offices configured yet. User will have open access
                until you tag district offices in your EPC profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-border rounded-xl bg-surface-hover/40">
                {activatedDistricts.map((dist) => {
                  const isChecked = form.assigned_districts.includes(
                    dist.district_id
                  );
                  return (
                    <label
                      key={dist.district_id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary/30 text-primary font-bold"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleDistrictToggle(dist.district_id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <div className="text-xs truncate">
                        <span className="font-bold block truncate">
                          {dist.district_name}
                        </span>
                        <span className="text-[10px] text-text-muted block">
                          State: {dist.state_name}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-primary to-primary-end hover:from-primary-600 hover:to-primary text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Creating User..." : "Create Team Member"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT SUB-USER                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title={`Edit User: ${editingUser?.name || ""}`}
        size="lg"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
          {/* Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Role & Designation <span className="text-danger">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                {ROLES.find((r) => r.id === form.role)?.desc}
              </p>
            </div>
          </div>

          {/* Email (Readonly) & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                Login Email (Fixed)
              </label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full px-3.5 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-mono text-text-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
                WhatsApp / Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                maxLength={10}
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Optional Password Reset */}
          <div>
            <label className="text-xs font-black text-text-secondary uppercase tracking-wider block mb-1.5">
              Reset Password (Optional — leave blank to keep existing)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Enter new password if resetting"
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-mono text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="bg-surface-hover border border-border rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text-primary block">
                Account Status
              </span>
              <span className="text-[11px] text-text-muted">
                Suspended accounts cannot log in or make changes.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, is_active: !prev.is_active }))
              }
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                form.is_active
                  ? "bg-success/20 text-success border border-success/30"
                  : "bg-danger/20 text-danger border border-danger/30"
              }`}
            >
              {form.is_active ? "Active" : "Suspended"}
            </button>
          </div>

          {/* ── REQUIREMENT 4: AUTHORIZATIONS & ELIGIBILITY (ALLOWED ACTIONS) IN EDIT MODAL ── */}
          <div className="pt-2 border-t border-border">
            <div className="mb-2">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider block">
                Allowed Capabilities / Eligibility (Authorizations) <span className="text-danger">*</span>
              </label>
              <p className="text-[11px] text-text-muted mt-0.5">
                Limit what actions this sub-user is permitted to perform in the Solar Store.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {PERMISSION_PRESETS.filter((p) => p.id !== "custom").map((preset) => {
                const isSelected = form.permission_preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary"
                        : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:border-border/80"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{preset.name}</div>
                    <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Granular Capabilities Checklist */}
            <div className="bg-surface-hover/50 border border-border rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Granular Capability Switches:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAPABILITIES.map((cap) => {
                  const isAllActive = form.permissions.includes("all");
                  const isChecked = isAllActive || form.permissions.includes(cap.id);
                  return (
                    <label
                      key={cap.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary font-bold"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAllActive && cap.id !== "all"}
                        onChange={() => handlePermissionToggle(cap.id)}
                        className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary shrink-0"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">{cap.name}</span>
                        <span className="text-[10px] text-text-muted block leading-tight mt-0.5">
                          {cap.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Districts Checkbox */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-text-primary uppercase tracking-wider block">
                Assigned Districts
              </label>
              {activatedDistricts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllDistricts}
                  className="text-xs font-bold text-primary hover:text-primary-hover underline underline-offset-2"
                >
                  {form.assigned_districts.length === activatedDistricts.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-border rounded-xl bg-surface-hover/40">
              {activatedDistricts.map((dist) => {
                const isChecked = form.assigned_districts.includes(
                  dist.district_id
                );
                return (
                  <label
                    key={dist.district_id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/10 border-primary/30 text-primary font-bold"
                        : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleDistrictToggle(dist.district_id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs truncate">
                      {dist.district_name} ({dist.state_name})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-primary hover:bg-primary-hover font-bold px-6"
            >
              {submitting ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
