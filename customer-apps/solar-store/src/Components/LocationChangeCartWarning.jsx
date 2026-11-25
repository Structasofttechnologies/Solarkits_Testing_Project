// components/LocationChangeCartWarning.jsx
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  clearPendingLocationChange,
  commitLocationChange,
  getAvailableKitData,
  fetchLiveInventory,
  selectCartTotalItems,
} from "@/features/slice";
import { FiMapPin, FiShoppingCart, FiAlertTriangle, FiTrash2, FiX, FiArrowRight } from "react-icons/fi";
import Button from "./Button";

export default function LocationChangeCartWarning() {
  return null;

  const newDistrict = pendingLocationChange.selectedDistrict;
  const newState = pendingLocationChange.selectedState;

  const handleCheckout = () => {
    dispatch(clearPendingLocationChange());
    navigate("/checkout");
  };

  const handleClearCart = () => {
    dispatch(commitLocationChange({ clearCartOnChange: true }));
    const districtId = newDistrict?.id;
    if (districtId) {
      dispatch(getAvailableKitData({ districtId }));
      dispatch(fetchLiveInventory({ districtId }));
    } else {
      dispatch(getAvailableKitData());
      dispatch(fetchLiveInventory({}));
    }
  };

  const handleDismiss = () => {
    dispatch(clearPendingLocationChange());
  };

  const uniqueKitNames = [...new Set(cart.map(i => i.kitName))];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={handleDismiss}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-warning/10 to-primary/10 p-5 rounded-t-2xl border-b border-border relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
                <FiAlertTriangle className="text-warning text-xl" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                Checkout Required
              </h2>
            </div>
            <p className="text-sm text-text-secondary ml-13 pl-[52px] -mt-1">
              Cart is not empty
            </p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Description */}
            <p className="text-sm text-text-secondary leading-relaxed">
              To change your location, please either complete your checkout now or clear your cart to start fresh in the new district.
            </p>

            {/* Location change info */}
            <div className="flex items-center gap-3 bg-surface-hover rounded-xl p-4 border border-border">
              <FiMapPin className="text-primary dark:text-info shrink-0" size={18} />
              <div className="text-sm">
                <p className="text-text-muted text-xs mb-0.5">Changing location to</p>
                <p className="font-semibold text-text-primary">
                  {newDistrict?.name || "—"}, {newState?.name || "—"}
                </p>
              </div>
            </div>

            {/* Cart summary */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiShoppingCart className="text-warning shrink-0" size={16} />
                <span className="text-sm font-semibold text-warning">
                  {totalItems} {totalItems === 1 ? "kit" : "kits"} in your cart
                </span>
              </div>
              <div className="space-y-1">
                {uniqueKitNames.slice(0, 3).map((name, i) => (
                  <p key={i} className="text-xs text-text-secondary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                    {name}
                  </p>
                ))}
                {uniqueKitNames.length > 3 && (
                  <p className="text-xs text-text-muted">
                    +{uniqueKitNames.length - 3} more items
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {/* Checkout */}
              <Button
                onClick={handleCheckout}
                variant="primary"
                size="md"
                fullWidth
                leftIcon={<FiArrowRight size={16} />}
                className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md"
              >
                Proceed to Checkout
              </Button>

              {/* Clear cart */}
              <button
                onClick={handleClearCart}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-danger/5 border border-danger/20 hover:bg-danger/10 transition-colors group"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-danger">Clear Cart & Switch Location</p>
                  <p className="text-xs text-text-muted">Remove all items and start fresh</p>
                </div>
                <FiTrash2 className="text-danger shrink-0" size={16} />
              </button>

              {/* Dismiss/Cancel */}
              <Button
                onClick={handleDismiss}
                variant="secondary"
                size="md"
                fullWidth
              >
                Cancel & Stay Here
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
