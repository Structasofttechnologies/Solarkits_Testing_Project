import { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { FiClock, FiX, FiArrowRight, FiUser, FiInfo } from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

export default function BomRateHistory({ bomItem, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bomItem?._id) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms/${bomItem._id}/history`, {
          headers: authHeaderObj(),
        });
        if (res.data?.status === "success") {
          setHistory(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load rate history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [bomItem?._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <FiClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                Rate History: {bomItem.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono">Code: {bomItem.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Loading audit history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <FiInfo className="w-8 h-8 opacity-40" />
              <p>No rate modifications recorded yet for this item.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-amber-200 dark:border-amber-900 space-y-6">
              {history.map((record, index) => (
                <div key={record._id || index} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 shadow" />

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="text-slate-400 line-through">₹{record.old_rate?.toLocaleString("en-IN")}</span>
                        <FiArrowRight className="text-amber-500 w-4 h-4" />
                        <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{record.new_rate?.toLocaleString("en-IN")}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          {record.rate_type}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {record.created_at ? new Date(record.created_at).toLocaleString("en-IN") : "Recent"}
                      </span>
                    </div>

                    {record.reason && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                        "{record.reason}"
                      </p>
                    )}

                    {record.location_rules_snapshot?.length > 0 && (
                      <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                        <span className="font-medium">Location Rules: </span>
                        {record.location_rules_snapshot.map((lr, i) => (
                          <span key={i} className="inline-block mr-2">
                            {lr.state_name || lr.district_name || lr.pincode}: ₹{lr.rate}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
