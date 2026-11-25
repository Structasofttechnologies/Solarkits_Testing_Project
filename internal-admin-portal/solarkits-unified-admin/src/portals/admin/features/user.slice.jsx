import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setAlert } from "./alert.slice";
import { refreshAccessToken, logout as authLogout } from "./auth.slice";
import { fetchUserModules } from "./modules.slice";
import { resolveApiUrl, getAuthPortalUrl } from "@/utils/resolveApiUrl";

const safeParse = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'null' || raw === 'undefined') return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

export const getUserData = createAsyncThunk(
  "user/getUserData",
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      let token = getState().auth?.token;
      if (!token) {
        const parsed = safeParse('login', null);
        token = parsed?.token || parsed;
      }

      if (!token) {
        try {
          const refreshRes = await dispatch(refreshAccessToken()).unwrap();
          token = refreshRes?.token;
        } catch (identErr) {
          console.warn('refreshAccessToken failed', identErr);
        }
      }

      if (!token) {
        dispatch(setAlert({ type: "error", message: "No token found" }));
        return rejectWithValue("No token found");
      }

      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await axios.get(`${resolveApiUrl(import.meta.env.VITE_API_URL, 'http://localhost:5000/admin-api')}/user-data`, {
        headers: { Authorization: authHeader },
        timeout: 10000,
      });

      // Dispatch fetchUserModules asynchronously without blocking user data
      dispatch(fetchUserModules());
      return res.data.data;
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message === "Network Error") {
        console.warn("⚠️ Server not reachable or request timed out.");
        return rejectWithValue("SERVER_DOWN");
      }

      const status = error.response?.status;
      const resp = error.response?.data;
      const msg = resp?.message || "Failed to fetch user data";

      // If backend explicitly says auth:false or returns 401, treat as unauthenticated
      if (status === 401 || resp?.auth === false || /Unauthorized/i.test(msg)) {
        try {
          await axios.post(`${resolveApiUrl(import.meta.env.VITE_AUTH_API_URL, 'http://localhost:5000/auth-api')}/logout`, {}, { withCredentials: true, timeout: 4000 });
        } catch (logoutErr) {
          console.warn('logout cleanup failed', logoutErr?.message || logoutErr);
        }

        dispatch(authLogout());
        localStorage.removeItem('login');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_modules');
        window.location.href = getAuthPortalUrl();
        return rejectWithValue('Unauthorized');
      }

      dispatch(setAlert({ type: "error", message: msg }));
      return rejectWithValue(msg);
    }
  }
);

const initialUser = safeParse('user', null);

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: initialUser,
    loading: false,
    auth: !!initialUser,
  },
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.auth = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserData.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.auth = true;
        state.loading = false;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(getUserData.rejected, (state, action) => {
        state.loading = false;
        if (action.payload === "No token found" || action.payload === "Unauthorized") {
          state.user = null;
          state.auth = false;
        }
      });
  },
});

export const { logoutUser } = userSlice.actions;
export default userSlice.reducer;
