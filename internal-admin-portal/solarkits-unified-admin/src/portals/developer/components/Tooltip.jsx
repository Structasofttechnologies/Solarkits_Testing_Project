import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Intelligent Tooltip Component
 * Automatically detects the best position and ensures the arrow always points to the trigger's center.
 */
export default function Tooltip({ children, text, position = "top" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ 
    top: 0, 
    left: 0, 
    finalPosition: position,
    arrowTop: '50%',
    arrowLeft: '50%'
  });
  
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const offset = 10; // Space between trigger and tooltip
    const padding = 8; // Min space from viewport edges

    let finalPos = position;
    let top, left;

    // 1. Auto-positioning logic based on available space
    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    if (finalPos === "top" && spaceTop < tooltipRect.height + offset) {
      if (spaceBottom > tooltipRect.height + offset) finalPos = "bottom";
      else finalPos = "right";
    } 
    if (finalPos === "bottom" && spaceBottom < tooltipRect.height + offset) {
      if (spaceTop > tooltipRect.height + offset) finalPos = "top";
      else finalPos = "right";
    }
    if (finalPos === "left" && spaceLeft < tooltipRect.width + offset) {
      if (spaceRight > tooltipRect.width + offset) finalPos = "right";
      else finalPos = "top";
    }
    if (finalPos === "right" && spaceRight < tooltipRect.width + offset) {
      if (spaceLeft > tooltipRect.width + offset) finalPos = "left";
      else finalPos = "top";
    }

    // 2. Initial coordinate calculation
    switch (finalPos) {
      case "top":
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + offset;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + offset;
        break;
    }

    // 3. Viewport containment (push back if overflowing)
    const constrainedLeft = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
    const constrainedTop = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));

    // 4. Arrow position calculation (ensure it points to the center of the trigger)
    let arrowLeft = '50%';
    let arrowTop = '50%';

    if (finalPos === 'top' || finalPos === 'bottom') {
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      arrowLeft = `${Math.max(8, Math.min(tooltipRect.width - 8, triggerCenter - constrainedLeft))}px`;
    } else {
      const triggerCenter = triggerRect.top + triggerRect.height / 2;
      arrowTop = `${Math.max(8, Math.min(tooltipRect.height - 8, triggerCenter - constrainedTop))}px`;
    }

    setCoords({ 
      top: constrainedTop, 
      left: constrainedLeft, 
      finalPosition: finalPos,
      arrowTop,
      arrowLeft
    });
  };

  useEffect(() => {
    if (isVisible) {
      // Small delay to let the DOM render the tooltip so we can measure it
      const frame = requestAnimationFrame(calculatePosition);
      
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible, text]);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), 150);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block w-fit"
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-9999 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wider text-white bg-gray-900 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none transition-opacity duration-200"
            style={{
              top: coords.top,
              left: coords.left,
              opacity: coords.top === 0 ? 0 : 1
            }}
          >
            {text}
            <div
              className="absolute w-0 h-0 border-4"
              style={{
                borderColor: 'transparent',
                ...(coords.finalPosition === "top" && {
                  bottom: "-8px",
                  left: coords.arrowLeft,
                  transform: "translateX(-50%)",
                  borderTopColor: "#111827",
                }),
                ...(coords.finalPosition === "bottom" && {
                  top: "-8px",
                  left: coords.arrowLeft,
                  transform: "translateX(-50%)",
                  borderBottomColor: "#111827",
                }),
                ...(coords.finalPosition === "right" && {
                  left: "-8px",
                  top: coords.arrowTop,
                  transform: "translateY(-50%)",
                  borderRightColor: "#111827",
                }),
                ...(coords.finalPosition === "left" && {
                  right: "-8px",
                  top: coords.arrowTop,
                  transform: "translateY(-50%)",
                  borderLeftColor: "#111827",
                }),
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}