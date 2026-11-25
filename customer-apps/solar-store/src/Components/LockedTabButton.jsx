// components/LockedTabButton.jsx
import { FaLock } from "react-icons/fa";
import Tooltip from "./Tooltip";

export default function LockedTabButton({ 
  children, 
  onClick, 
  isLocked, 
  label,
  icon: Icon,
  count,
  isActive,
  ...buttonProps 
}) {
  const buttonContent = (
    <button
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300
        px-4 py-2 text-sm
        ${isLocked 
          ? 'opacity-50 cursor-not-allowed bg-surface text-text-secondary border-1 border-border'
          : isActive
          ? 'btn-primary'
          : 'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-primary'
        }
      `}
      {...buttonProps}
    >
      <span className="mr-2">
        <Icon size={16} />
      </span>
      <p className="flex items-center gap-2 whitespace-nowrap">
        {label}
        {count > 0 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${isActive && !isLocked
                ? "bg-white/20 text-text-inverse"
                : "bg-gradient-to-r from-primary to-primary-end text-text-inverse"
              }
              ${isLocked && "opacity-50"}
            `}
          >
            {count}
          </span>
        )}
      </p>
      {isLocked && (
        <span className="ml-2">
          <FaLock size={12} />
        </span>
      )}
    </button>
  );

  if (isLocked) {
    return (
      <Tooltip text="Sign In to use this functionality" position="top">
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
}