import React from 'react';
import { FaMousePointer, FaUsers, FaFilePdf, FaExternalLinkAlt, FaDesktop, FaMobileAlt, FaTabletAlt } from 'react-icons/fa';

const formatClickDate = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const renderDeviceBadge = (device) => {
  const d = String(device || 'desktop').toLowerCase();
  if (d === 'mobile') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
        <FaMobileAlt className="w-2.5 h-2.5" /> Mobile
      </span>
    );
  }
  if (d === 'tablet') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
        <FaTabletAlt className="w-2.5 h-2.5" /> Tablet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
      <FaDesktop className="w-2.5 h-2.5" /> Desktop
    </span>
  );
};

export default function CampaignCtaBreakdownView({ ctaAnalytics }) {
  const totalClicks = Number(ctaAnalytics?.total_clicks || 0);
  const uniqueClickers = Number(ctaAnalytics?.unique_clickers || 0);
  const byCta = Array.isArray(ctaAnalytics?.by_cta) ? ctaAnalytics.by_cta : [];
  const userClicks = Array.isArray(ctaAnalytics?.user_clicks) ? ctaAnalytics.user_clicks : [];
  const maxCtaClicks = Math.max(1, ...byCta.map((b) => Number(b.clicks || 0)));

  if (byCta.length === 0 && userClicks.length === 0) {
    return (
      <div className="py-10 px-4 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
        <FaMousePointer className="w-6 h-6 text-slate-400 mx-auto" />
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
          No CTA button clicks recorded for this campaign yet.
        </div>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
          When EPC partners click any button, kit card, or PDF download link in your sent emails, each user and button click is tracked here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
          <div className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Total CTA Clicks</div>
          <div className="text-xl font-black text-indigo-900 dark:text-white mt-0.5">{totalClicks.toLocaleString('en-IN')}</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Unique Users Clicked</div>
          <div className="text-xl font-black text-emerald-900 dark:text-white mt-0.5">{uniqueClickers.toLocaleString('en-IN')}</div>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
          <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Distinct CTAs Pressed</div>
          <div className="text-xl font-black text-amber-900 dark:text-white mt-0.5">{byCta.length}</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
          <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Top Performing CTA</div>
          <div className="text-xs font-black text-blue-900 dark:text-white mt-1 truncate" title={byCta[0]?.cta_label || '-'}>
            {byCta[0]?.cta_label || '-'}
          </div>
        </div>
      </div>

      {/* 1. Button-wise Click Breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <FaMousePointer className="text-indigo-600 w-3 h-3" /> Clicks by CTA Button ({byCta.length})
        </h4>
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">CTA Button / Link</th>
                <th className="py-2.5 px-3">Total Clicks</th>
                <th className="py-2.5 px-3">Unique Users</th>
                <th className="py-2.5 px-3">Last Clicked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {byCta.map((item, idx) => {
                const widthPct = Math.max(8, Math.round((Number(item.clicks || 0) / maxCtaClicks) * 100));
                return (
                  <tr key={`${item.cta_label}_${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 max-w-[300px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">{item.cta_label}</span>
                        {item.is_pdf && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9.5px] font-bold">
                            <FaFilePdf className="w-2.5 h-2.5" /> PDF
                          </span>
                        )}
                        {item.cta_slot && (
                          <span className="text-[9.5px] font-mono text-slate-400">({item.cta_slot})</span>
                        )}
                      </div>
                      {item.target_url && (
                        <a
                          href={item.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate flex items-center gap-1 mt-0.5"
                          title={item.target_url}
                        >
                          <span className="truncate">{item.target_url}</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${widthPct}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-black text-indigo-700 dark:text-indigo-300">
                      {item.clicks}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                      {item.unique_users} users
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatClickDate(item.last_clicked_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. User-wise CTA Click Activity */}
      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <FaUsers className="text-emerald-600 w-3.5 h-3.5" /> User-wise CTA Click Activity ({userClicks.length} Users Clicked)
        </h4>
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">User / EPC Partner</th>
                <th className="py-2.5 px-3">Clicks</th>
                <th className="py-2.5 px-3">CTAs Pressed</th>
                <th className="py-2.5 px-3">Device &amp; Last Click</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {userClicks.map((u, idx) => (
                <tr key={u.recipient_id || u.email || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {u.email || u.phone || '-'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-black text-indigo-700 dark:text-indigo-300">
                    {u.click_count}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(u.clicked_ctas_summary || []).map((c, cIdx) => (
                        <span
                          key={`${c.cta_label}_${cIdx}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.is_pdf
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                          title={c.target_url}
                        >
                          {c.is_pdf && <FaFilePdf className="w-2.5 h-2.5 shrink-0" />}
                          <span>{c.cta_label}</span>
                          <span className="opacity-75">×{c.count}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 space-y-1 whitespace-nowrap">
                    <div>{renderDeviceBadge(u.cta_clicks?.[0]?.device_type)}</div>
                    <div className="text-[10.5px] text-slate-500">{formatClickDate(u.last_clicked_at)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
