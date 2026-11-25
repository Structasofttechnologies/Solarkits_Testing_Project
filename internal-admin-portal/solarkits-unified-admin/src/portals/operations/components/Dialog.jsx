import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";

const Dialog = ({ isOpen, onClose, children, title, footer, size = "md" }) => {
  // Track whether mousedown started on the backdrop
  const mouseDownOnBackdrop = useRef(false);

  // Close on ESC and prevent background scroll
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
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

  // Only close when BOTH mousedown AND mouseup happen on the backdrop itself
  const handleBackdropMouseDown = (e) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      {/* Modal Box — stop propagation so inner mouse events don't reach backdrop */}
      <div
        className={`bg-surface rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[92vh] relative flex flex-col animate-in zoom-in-95 duration-200`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Gradient */}
        <div className="sticky top-0 z-10 flex justify-between items-center gradient-primary text-text-inverse px-6 py-4 rounded-t-2xl shrink-0">
          {title && <h2 className="text-base font-bold tracking-tight">{title}</h2>}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-text-inverse ml-auto"
            aria-label="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal Content — scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hover p-6">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-border bg-surface-hover/20 rounded-b-2xl flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog;