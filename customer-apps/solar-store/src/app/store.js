import { configureStore } from "@reduxjs/toolkit"
import slice, { syncCartWithBackend } from "../features/slice";
import alertReducer from "../features/alert.slice";
import authReducer from "../features/auth.slice";
import estimatorReducer from "../features/estimator.slice";

let syncTimeout = null;
let isSyncing = false;
let pendingSync = false;

/**
 * Triggers a debounced cart sync to the backend.
 * Guards against overlapping requests: if a sync is already in flight,
 * marks pendingSync=true; a follow-up sync fires once the current one
 * completes. This prevents the "sync storm" where fetchLiveInventory
 * would trigger redundant POSTs on every inventory refresh.
 */
function scheduleSyncIfAuthenticated(store) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const state = store.getState();
    if (!state.auth_slice.isAuthenticated) return;

    if (isSyncing) {
      // Mark that another sync is needed once current one finishes
      pendingSync = true;
      return;
    }

    isSyncing = true;
    try {
      await store.dispatch(syncCartWithBackend());
    } finally {
      isSyncing = false;
      if (pendingSync) {
        pendingSync = false;
        scheduleSyncIfAuthenticated(store);
      }
    }
  }, 50); // 50ms fast debounce for instant backend sync
}

const cartSyncMiddleware = store => next => action => {
  const result = next(action);

  // Only sync the regular cart to backend (not bulk cart).
  // NOTE: 'solar/fetchLiveInventory/fulfilled' is intentionally EXCLUDED.
  // Inventory fetches are read-only and must not trigger a cart write,
  // otherwise every inventory poll causes a redundant POST /cart (sync storm).
  const cartActions = [
    'slice/addToCart',
    'slice/removeFromCart',
    'slice/increaseQty',
    'slice/decreaseQty',
    'slice/addCustomKitToCart',
    'slice/clearCart',
    'slice/updateCartVariant',
    'slice/undoRemove',
  ];

  if (cartActions.includes(action.type)) {
    scheduleSyncIfAuthenticated(store);
  }

  return result;
};

const store = configureStore({
    reducer: {
        slice: slice,
        alert_slice: alertReducer,
        auth_slice: authReducer,
        estimator_slice: estimatorReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(cartSyncMiddleware)
});

export default store;