import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState, useRef, useCallback } from "react";
import PreConfiguredKitOrderCart from "./PreConfiguredKitOrderCart";
import { FiShoppingCart, FiClock, FiAlertTriangle, FiX } from "react-icons/fi";
import { selectCartTotalItems, selectCartExpiryTime, clearCart, fetchCart } from "@/features/slice";

// ── Compact helper: format seconds → MM:SS ────────────────────────
const formatCountdown = (seconds) => {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function Cart() {
  const dispatch = useDispatch();
  const totalItems = useSelector(selectCartTotalItems);
  const cartExpiryTime = useSelector(selectCartExpiryTime);

  const [secondsLeft, setSecondsLeft] = useState(null);
  const [expiredToast, setExpiredToast] = useState(false);
  const intervalRef = useRef(null);

  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  // Fetch the latest cart from backend on mount (only for authenticated users).
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  // Compute seconds left whenever expiry changes
  const computeSeconds = useCallback(() => {
    if (!cartExpiryTime) return null;
    const diff = Math.floor((new Date(cartExpiryTime).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [cartExpiryTime]);

  useEffect(() => {
    if (!cartExpiryTime) {
      setSecondsLeft(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Kick off initial value
    setSecondsLeft(computeSeconds());

    // Clear any stale interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const remaining = computeSeconds();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        // Auto-clear the cart and show toast
        dispatch(clearCart());
        dispatch(fetchCart());
        setExpiredToast(true);
        setTimeout(() => setExpiredToast(false), 7000);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cartExpiryTime, computeSeconds, dispatch]);

  // Determine timer urgency colour
  const isUrgent = secondsLeft !== null && secondsLeft <= 120; // ≤ 2 minutes
  const isCritical = secondsLeft !== null && secondsLeft <= 60; // ≤ 1 minute

  return (
    <div className="min-h-screen">
      {/* Expiry-toast when reservation expired */}
      {expiredToast && (
        <div
          style={{
            position: "fixed",
            top: "1.25rem",
            right: "1.25rem",
            zIndex: 9999,
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "#fff",
            borderRadius: "0.875rem",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            boxShadow: "0 8px 32px rgba(239,68,68,0.35)",
            maxWidth: "360px",
            animation: "slideInRight 0.35s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <FiAlertTriangle size={22} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>
              Reservation Expired
            </p>
            <p style={{ fontSize: "0.8rem", margin: "0.15rem 0 0", opacity: 0.9 }}>
              Your solar panel reservation has expired and your cart has been cleared.
            </p>
          </div>
          <button
            onClick={() => setExpiredToast(false)}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", marginLeft: "auto", padding: "0.25rem" }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface p-4 rounded-xl shadow-md border border-border mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text-primary mb-1 flex items-center gap-2">
              <FiShoppingCart className="text-primary dark:text-info" />
              Your Cart
            </h1>
            <p className="text-text-secondary">
              Review and manage your selected solar kits before checkout
            </p>
          </div>
          {totalItems > 0 && (
            <div className="bg-primary/10 dark:bg-info/10 border border-primary/20 dark:border-info/20 px-4 py-2 rounded-xl">
              <span className="text-sm font-semibold text-primary dark:text-info">
                {totalItems} {totalItems === 1 ? "Kit" : "Kits"} in cart
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Countdown Timer Banner ────────────────────────────────── */}
      {secondsLeft !== null && totalItems > 0 && (
        <div
          style={{
            borderRadius: "0.875rem",
            marginBottom: "1.25rem",
            padding: "0.85rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: `1.5px solid ${isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "#22c55e"}`,
            background: isCritical
              ? "linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(185,28,28,0.07) 100%)"
              : isUrgent
              ? "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(180,83,9,0.07) 100%)"
              : "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(21,128,61,0.07) 100%)",
            boxShadow: isCritical
              ? "0 2px 16px rgba(239,68,68,0.15)"
              : isUrgent
              ? "0 2px 16px rgba(245,158,11,0.12)"
              : "0 2px 12px rgba(34,197,94,0.10)",
            transition: "all 0.5s ease",
          }}
        >
          <FiClock
            size={22}
            style={{
              flexShrink: 0,
              color: isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "#22c55e",
              animation: isCritical ? "pulse 1s ease-in-out infinite" : undefined,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "0.88rem",
                color: isCritical ? "#ef4444" : isUrgent ? "#d97706" : "#16a34a",
              }}
            >
              {isCritical
                ? "⚠️ Reservation expiring very soon!"
                : isUrgent
                ? "⏳ Reservation expiring soon"
                : "✅ Solar panel inventory reserved for you"}
            </p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              {isCritical
                ? "Complete checkout now to secure your solar panels before they are released."
                : "Your solar panels are reserved for this session. Add or remove items to restart the timer."}
            </p>
          </div>
          {/* Countdown chip */}
          <div
            style={{
              flexShrink: 0,
              background: isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "#22c55e",
              color: "#fff",
              borderRadius: "0.5rem",
              padding: "0.35rem 0.75rem",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "1.15rem",
              letterSpacing: "0.05em",
              minWidth: "4rem",
              textAlign: "center",
              boxShadow: isCritical ? "0 2px 8px rgba(239,68,68,0.40)" : undefined,
              animation: isCritical ? "pulse 1s ease-in-out infinite" : undefined,
            }}
          >
            {formatCountdown(secondsLeft)}
          </div>
        </div>
      )}

      {/* Cart Content */}
      <PreConfiguredKitOrderCart />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}