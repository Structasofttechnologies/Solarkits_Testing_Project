/**
 * ContentEmptyState.jsx
 *
 * Empty state component with icon + message for industry content sections.
 */

import { MdOutlineImageNotSupported } from 'react-icons/md';
import { FiInbox } from 'react-icons/fi';

export default function ContentEmptyState({
  icon: Icon = FiInbox,
  title = 'No content available',
  message = 'Content for this industry will appear here once published.',
  compact = false,
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6 px-4' : 'py-12 px-6'}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={26} className="text-slate-400" />
      </div>
      <p className="font-black text-slate-600 text-sm mb-1">{title}</p>
      <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">{message}</p>
    </div>
  );
}
