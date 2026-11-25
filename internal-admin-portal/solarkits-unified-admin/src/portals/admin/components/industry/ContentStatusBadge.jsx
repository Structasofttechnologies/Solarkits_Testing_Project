import React from "react";

const STATUS_CONFIG = {
  PUBLISHED: { label: "Published", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DRAFT: { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  SCHEDULED: { label: "Scheduled", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  PAUSED: { label: "Paused", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  EXPIRED: { label: "Expired", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  ARCHIVED: { label: "Archived", bg: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export default function ContentStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status || "Unknown", bg: "bg-slate-100 text-slate-700 border-slate-200" };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase border ${config.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {config.label}
    </span>
  );
}
