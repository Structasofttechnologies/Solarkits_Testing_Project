import React, { useState, useEffect } from "react";
import { FiUsers, FiX, FiCheck, FiTrash2, FiSearch, FiAlertCircle } from "react-icons/fi";
import { assignUserToIndustry, revokeUserFromIndustry, getUserIndustryAssignments } from "../../api/industryContentApi";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function IndustryUserAssignmentModal({ industry, onClose }) {
  const [userType, setUserType] = useState("RESELLER"); // RESELLER | EPC
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchAssignments = async () => {
    if (!industry) return;
    setLoading(true);
    try {
      const res = await getUserIndustryAssignments({
        industry_type_id: industry.id || industry._id,
        user_type: userType,
      });
      if (res.status === "success") {
        setAssignments(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [userType, industry]);

  // Search users based on userType
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (userType === "RESELLER") {
        const res = await axios.get(
          `${API_URL}/reseller-mgmt/list?search=${encodeURIComponent(searchQuery)}&unique_id=RSL_MGMT&req_for=view`,
          { headers: authHeaderObj() }
        );
        setSearchResults(res.data?.data || []);
      } else {
        const res = await axios.get(
          `${API_URL}/epcs/get-epcs?search=${encodeURIComponent(searchQuery)}&unique_id=ADM_EPC&req_for=view`,
          { headers: authHeaderObj() }
        );
        setSearchResults(res.data?.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async (userId) => {
    try {
      const res = await assignUserToIndustry({
        user_type: userType,
        user_id: userId,
        industry_type_id: industry.id || industry._id,
        approval_status: "APPROVED",
      });
      if (res.status === "success") {
        setMessage({ type: "success", text: "User assigned successfully!" });
        setSearchResults([]);
        setSearchQuery("");
        fetchAssignments();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to assign user" });
    }
  };

  const handleRevoke = async (userId) => {
    if (!window.confirm("Are you sure you want to revoke this user's industry access?")) return;
    try {
      const res = await revokeUserFromIndustry({
        user_type: userType,
        user_id: userId,
        industry_type_id: industry.id || industry._id,
      });
      if (res.status === "success") {
        setMessage({ type: "success", text: "Access revoked" });
        fetchAssignments();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to revoke access" });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FiUsers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Industry User Access: {industry.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Manage which partners are authorized to access this industry segment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {message && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
                <FiX size={14} />
              </button>
            </div>
          )}

          {/* User Type Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setUserType("RESELLER")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                userType === "RESELLER"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              Reseller Partners
            </button>
            <button
              onClick={() => setUserType("EPC")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                userType === "EPC"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              EPC Buyers
            </button>
          </div>

          {/* Search to Assign */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Search & Assign New {userType === "RESELLER" ? "Reseller" : "EPC Buyer"}
            </label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder={`Search by name, email, or company...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2 bg-primary text-white font-bold rounded-2xl text-xs shadow-sm hover:bg-primary/90 transition-all cursor-pointer shrink-0"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-lg max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id || user._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {user.business_name || user.name || user.company_name}
                      </p>
                      <p className="text-[11px] text-slate-400">{user.email || user.phone}</p>
                    </div>
                    <button
                      onClick={() => handleAssign(user.id || user._id)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Assign Access
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Assignments Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Authorized Users ({assignments.length})
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-semibold">
                No {userType.toLowerCase()} users assigned to this industry yet.
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((item) => (
                  <div
                    key={item.id || item._id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">
                        User ID: {item.user_id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Status: <strong className="text-emerald-600 uppercase">{item.approval_status}</strong> •
                        Assigned: {new Date(item.assigned_date).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRevoke(item.user_id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Revoke access"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
