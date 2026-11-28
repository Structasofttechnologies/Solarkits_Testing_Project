import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

const Dialog = ({ isOpen, onClose, children, title, footer, size = "md" }) => {
  // Track whether pointer press started on the backdrop itself
  const pointerDownOnBackdrop = useRef(false);

  // Close on ESC and prevent background scroll
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]"
  };

  // Only close when BOTH press start and click happen on the backdrop itself
  const handleBackdropPointerDown = (e) => {
    pointerDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e) => {
    if (pointerDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose?.();
    }
    pointerDownOnBackdrop.current = false;
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200"
      onPointerDown={handleBackdropPointerDown}
      onPointerCancel={() => { pointerDownOnBackdrop.current = false; }}
      onClick={handleBackdropClick}
    >
      {/* Modal Box — stop propagation so inner pointer/click events don't reach backdrop */}
      <div
        className={`bg-surface rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[92vh] relative flex flex-col animate-in zoom-in-95 duration-200`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Gradient */}
        <div className="sticky top-0 z-10 flex justify-between items-center gap-2 gradient-primary text-text-inverse px-4 sm:px-6 py-3 sm:py-3.5 rounded-t-2xl shrink-0">
          {title && <h2 className="text-sm sm:text-base font-bold tracking-tight">{title}</h2>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors text-text-inverse ml-auto shrink-0 cursor-pointer touch-manipulation select-none relative z-20"
            aria-label="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal Content — scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hover p-4 sm:p-6">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-surface-hover/20 rounded-b-2xl flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalNode;
  return createPortal(modalNode, document.body);
};

export default Dialog;