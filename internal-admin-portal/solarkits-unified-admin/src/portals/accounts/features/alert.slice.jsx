import { createSlice } from "@reduxjs/toolkit";

const alertSlice = createSlice({
  name: "alert_slice",
  initialState: {
    alerts: [],
  },
  reducers: {
    setAlert: (state, action) => {
      state.alerts.push({
        id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
        type: action.payload.type || "info",
        message: action.payload.message,
      });
      if (state.alerts.length > 3) {
        state.alerts.shift();
      }
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter(
        (alert) => alert.id !== action.payload
      );
    },
    clearAlerts: (state) => {
      state.alerts = [];
    },
  },
});

export const { setAlert, removeAlert, clearAlerts } = alertSlice.actions;
export default alertSlice.reducer;