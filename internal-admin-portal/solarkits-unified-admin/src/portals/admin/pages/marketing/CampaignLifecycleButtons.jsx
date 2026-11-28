import React from 'react';
import { FaPlay, FaPause, FaBan, FaEdit, FaRedo } from 'react-icons/fa';

const LIFECYCLE_ACTIONS = [
  {
    showFor: (status) => ['draft', 'scheduled'].includes(status),
    action: 'launch',
    label: 'Start',
    title: 'Start / Launch Campaign Now',
    Icon: FaPlay,
    cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    showFor: (status) => status === 'paused',
    action: 'resume',
    label: 'Resume',
    title: 'Resume Paused Campaign',
    Icon: FaPlay,
    cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    showFor: (status) => ['running', 'scheduled'].includes(status),
    action: 'pause',
    label: 'Pause',
    title: 'Pause Campaign',
    Icon: FaPause,
    cls: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  },
  {
    showFor: (status) => ['draft', 'scheduled', 'running', 'paused'].includes(status),
    action: 'cancel',
    label: 'Stop',
    title: 'Stop / Cancel Campaign',
    Icon: FaBan,
    cls: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
  },
  {
    showFor: (status) => status === 'draft',
    action: 'edit',
    label: 'Edit Draft',
    title: 'Edit Draft Campaign',
    Icon: FaEdit,
    cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
  },
  {
    showFor: (status) => ['scheduled', 'paused', 'cancelled', 'failed'].includes(status),
    action: 'draft',
    label: 'Edit & Move to Draft',
    title: 'Move to Draft & Open Campaign Editor',
    Icon: FaEdit,
    cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
  },
  {
    showFor: (status) => ['completed', 'cancelled', 'paused', 'draft', 'failed'].includes(status),
    action: 'rerun',
    label: 'Rerun',
    title: 'Rerun Campaign Now',
    Icon: FaRedo,
    cls: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
  }
];

/**
 * Renders clearly labeled icon+text lifecycle control buttons for a campaign row.
 */
export default function CampaignLifecycleButtons({ campaignId, status, disabled = false, onAction }) {
  return LIFECYCLE_ACTIONS
    .filter((btn) => btn.showFor(status))
    .map((btn) => {
      const BtnIcon = btn.Icon;
      return (
        <button
          key={btn.action}
          type="button"
          disabled={disabled}
          onClick={() => onAction(campaignId, btn.action)}
          title={btn.title}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${btn.cls}`}
        >
          <BtnIcon className="w-2.5 h-2.5 shrink-0" />
          <span>{btn.label}</span>
        </button>
      );
    });
}
