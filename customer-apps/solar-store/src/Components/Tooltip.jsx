// components/Tooltip.jsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children, text, position = "top" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top, left;

        switch (position) {
          case "top":
            top = rect.top - 8;
            left = rect.left + rect.width / 2;
            break;
          case "right":
            top = rect.top + rect.height / 2;
            left = rect.right + 8;
            break;
          case "bottom":
            top = rect.bottom + 8;
            left = rect.left + rect.width / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2;
            left = rect.left - 8;
            break;
          default:
            top = rect.top - 8;
            left = rect.left + rect.width / 2;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, 300);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block w-full"
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            className="fixed z-9999 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)",
              ...(position === "right" && { transform: "translate(0, -50%)" }),
              ...(position === "left" && { transform: "translate(-100%, -50%)" }),
              ...(position === "bottom" && { transform: "translate(-50%, 0)" }),
            }}
          >
            {text}
            <div
              style={{
                position: "absolute",
                width: 0,
                height: 0,
                borderLeft: position === "left" ? "6px solid #111" : "6px solid transparent",
                borderRight: position === "right" ? "6px solid #111" : "6px solid transparent",
                borderTop: position === "top" ? "6px solid #111" : "6px solid transparent",
                borderBottom: position === "bottom" ? "6px solid #111" : "6px solid transparent",
                ...(position === "top" && {
                  bottom: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }),
                ...(position === "bottom" && {
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }),
                ...(position === "right" && {
                  left: "-12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }),
                ...(position === "left" && {
                  right: "-12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }),
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}