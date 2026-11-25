import { useState } from "react";
import { FaUserShield } from "react-icons/fa";
import {
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash,
  FaCheckCircle, FaTimesCircle, FaUser, FaKey,
  FaLock, FaUnlock, FaShieldAlt,
} from "react-icons/fa";
import { MdSecurity } from "react-icons/md";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockRoles = [
  { id: "ROLE-001", name: "Operation Manager", description: "Full access to all operation management modules", modules: ["OP_MATERIAL", "OP_INVENTORY", "OP_LOGISTICS", "OP_SUPPLIER", "OP_WAREHOUSE", "OP_ACCESS"], users: 4, isSystem: true },
  { id: "ROLE-002", name: "Warehouse Supervisor", description: "Access to warehouse ops and material handling", modules: ["OP_MATERIAL", "OP_WAREHOUSE"], users: 8, isSystem: false },
  { id: "ROLE-003", name: "Logistics Coordinator", description: "Manage dispatch, logistics and supplier coordination", modules: ["OP_LOGISTICS", "OP_SUPPLIER"], users: 6, isSystem: false },
  { id: "ROLE-004", name: "Inventory Analyst", description: "Read-only access to inventory planning data", modules: ["OP_INVENTORY"], users: 5, isSystem: false },
];

const mockUsers = [
  { id: "USR-001", name: "Arjun Mehta", email: "arjun@solarkits.com", role: "Order Manager", lastLogin: "2 mins ago", status: "Active" },
  { id: "USR-002", name: "Priya Nair", email: "priya@solarkits.com", role: "Warehouse Supervisor", lastLogin: "1 hr ago", status: "Active" },
  { id: "USR-003", name: "Rohit Singh", email: "rohit@solarkits.com", role: "Logistics Coordinator", lastLogin: "3 hrs ago", status: "Active" },
  { id: "USR-004", name: "Sneha Das", email: "sneha@solarkits.com", role: "Inventory Analyst", lastLogin: "Yesterday", status: "Inactive" },
  { id: "USR-005", name: "Karan Verma", email: "karan@solarkits.com", role: "Warehouse Supervisor", lastLogin: "30 mins ago", status: "Active" },
  { id: "USR-006", name: "Divya Patel", email: "divya@solarkits.com", role: "Logistics Coordinator", lastLogin: "2 days ago", status: "Suspended" },
];

const userStatusConfig = {
  Active: { color: "bg-success/10 text-success", dot: "bg-success" },
  Inactive: { color: "bg-text-muted/10 text-text-muted", dot: "bg-text-muted" },
  Suspended: { color: "bg-danger/10 text-danger", dot: "bg-danger" },
};

const moduleLabels = {
  OP_MATERIAL: "Material",
  OP_INVENTORY: "Inventory",
  OP_LOGISTICS: "Logistics",
  OP_SUPPLIER: "Supplier",
  OP_WAREHOUSE: "Warehouse",
  OP_ACCESS: "Access Mgmt",
};

export default function AccessManagement() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("users");
  const [userFilter, setUserFilter] = useState("All");

  const filteredUsers = mockUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = userFilter === "All" || u.status === userFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Access Management"
        subtitle="Configure roles, permissions, and manage user access levels for the Operation Management Panel."
        icon={FaUserShield}
        stats={[
          { label: "Total Users", value: mockUsers.length.toString(), description: "Panel members" },
          { label: "Active", value: mockUsers.filter(u => u.status === "Active").length.toString(), description: "Currently active" },
          { label: "Roles Defined", value: mockRoles.length.toString(), description: "Permission sets" },
          { label: "Modules", value: "6", description: "Total modules" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaKey size={12} />}>Manage Roles</Button>
            <Button variant="primary" size="sm" leftIcon={<FaPlus size={12} />}>Add User</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: mockUsers.length, icon: FaUser, color: "text-primary", bg: "gradient-primary-soft" },
          { label: "Active", value: mockUsers.filter(u => u.status === "Active").length, icon: FaCheckCircle, color: "text-success", bg: "gradient-success-soft" },
          { label: "Suspended", value: mockUsers.filter(u => u.status === "Suspended").length, icon: FaLock, color: "text-danger", bg: "gradient-danger-soft" },
          { label: "Roles", value: mockRoles.length, icon: FaShieldAlt, color: "text-primary", bg: "gradient-primary-soft" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`${s.color} text-lg`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                <p className="text-text-secondary text-xs">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-border">
          {[
            { id: "users", label: "Users", icon: FaUser },
            { id: "roles", label: "Roles & Permissions", icon: FaShieldAlt },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  tab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
                <FaSearch className="text-text-muted" size={14} />
                <input
                  className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full"
                  placeholder="Search user name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-text-muted" size={13} />
                {["All", "Active", "Inactive", "Suspended"].map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${userFilter === f ? "gradient-primary text-white shadow-sm" : "bg-bg text-text-secondary border border-border hover:border-primary/30"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["User", "Role", "Last Login", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const sc = userStatusConfig[u.status];
                    return (
                      <tr key={u.id} className="hover:bg-surface-hover transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary text-sm">{u.name}</div>
                              <div className="text-text-muted text-xs">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs gradient-primary-soft text-primary px-2 py-0.5 rounded-full font-medium">{u.role}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-text-secondary">{u.lastLogin}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center" title="Edit">
                              <FaEdit size={11} />
                            </button>
                            <button className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${u.status === "Active" ? "bg-warning/10 text-warning hover:bg-warning hover:text-white" : "bg-success/10 text-success hover:bg-success hover:text-white"}`} title={u.status === "Active" ? "Suspend" : "Activate"}>
                              {u.status === "Active" ? <FaLock size={11} /> : <FaUnlock size={11} />}
                            </button>
                            <button className="w-7 h-7 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center" title="Delete">
                              <FaTrash size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Roles Tab */}
        {tab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {mockRoles.map((role) => (
              <div key={role.id} className="border border-border rounded-xl p-4 bg-surface hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shrink-0">
                      <FaShieldAlt className="text-white" size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm">{role.name}</p>
                      <p className="text-text-muted text-xs">{role.users} users assigned</p>
                    </div>
                  </div>
                  {role.isSystem && (
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">System</span>
                  )}
                </div>
                <p className="text-text-secondary text-xs mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {role.modules.map((mod) => (
                    <span key={mod} className="text-[10px] font-semibold gradient-primary-soft text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      {moduleLabels[mod] || mod}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!role.isSystem && (
                    <>
                      <button className="flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-2.5 py-1 rounded-lg transition-all">
                        <FaEdit size={10} /> Edit
                      </button>
                      <button className="flex items-center gap-1 text-xs bg-danger/10 text-danger hover:bg-danger hover:text-white px-2.5 py-1 rounded-lg transition-all">
                        <FaTrash size={10} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Add new role card */}
            <button className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-text-muted hover:border-primary hover:text-primary transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                <FaPlus size={16} />
              </div>
              <p className="text-sm font-medium">Create New Role</p>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-text-muted text-xs">
            {tab === "users" ? `Showing ${filteredUsers.length} of ${mockUsers.length} users` : `${mockRoles.length} roles configured`}
          </p>
        </div>
      </div>
    </div>
  );
}
