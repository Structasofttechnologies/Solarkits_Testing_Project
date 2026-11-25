import React, { useState } from "react";
import { FiCalendar, FiClock, FiX } from "react-icons/fi";

export default function SchedulePickerModal({ content, onSaveSchedule, onClose }) {
  const [startAt, setStartAt] = useState(
    content.start_at ? new Date(content.start_at).toISOString().slice(0, 16) : ""
  );
  const [endAt, setEndAt] = useState(
    content.end_at ? new Date(content.end_at).toISOString().slice(0, 16) : ""
  );
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startAt) {
      setError("Start date and time are required for scheduling.");
      return;
    }

    if (endAt && new Date(endAt) <= new Date(startAt)) {
      setError("End date must be later than start date.");
      return;
    }

    onSaveSchedule({
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FiCalendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Schedule Content Publishing</h3>
              <p className="text-[11px] text-slate-400 font-medium">Set automatic start and expiry times</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Publish Start Date & Time <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => {
                  setStartAt(e.target.value);
                  setError("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Auto-Expiry Date & Time (Optional)
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => {
                  setEndAt(e.target.value);
                  setError("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Leave blank if this banner should never expire.</p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              Confirm Schedule
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
