import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setAlert } from "./alert.slice";
import { refreshAccessToken, logout as authLogout } from "./auth.slice";
import { fetchUserModules } from "./modules.slice";

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
      try {
        await dispatch(refreshAccessToken()).unwrap();
      } catch (identErr) {
        console.warn('refreshAccessToken failed', identErr);
      }
      const token = getState().auth?.token || safeParse('login', null)?.token;

      if (!token) {
        dispatch(setAlert({ type: "error", message: "No token found" }));
        return rejectWithValue("No token found");
      }

      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await axios.get(`${import.meta.env.VITE_OPERATION_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/operation-management-api'}/user-data`, {
        headers: { Authorization: authHeader },
        timeout: 30000,
      });

      dispatch(setAlert({ type: "success", message: "User data loaded successfully" }));
      dispatch(fetchUserModules());
      return res.data.data;
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message === "Network Error") {
        console.warn("⚠️ Server not reachable or request timed out.");
        dispatch(setAlert({ type: "error", message: "Server unreachable. Check API URL or Network." }));
        return rejectWithValue("SERVER_DOWN");
      }

      const status = error.response?.status;
      const resp = error.response?.data;
      const msg = resp?.message || "Failed to fetch user data";

      if (status === 401 || resp?.auth === false || /Unauthorized/i.test(msg)) {
        try {
          await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/auth-api'}/logout`, {}, { withCredentials: true, timeout: 4000 });
        } catch (logoutErr) {
          console.warn('logout cleanup failed', logoutErr?.message || logoutErr);
        }

        dispatch(authLogout());
        localStorage.removeItem('login');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return rejectWithValue('Unauthorized');
      }

      dispatch(setAlert({ type: "error", message: msg }));
      return rejectWithValue(msg);
    }
  }
);

const savedScope = localStorage.getItem('op_selected_scope');
const initialUser = safeParse('user', null);

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: initialUser,
    loading: false,
    auth: !!initialUser,
    selectedScope: savedScope ? JSON.parse(savedScope) : { country: null, state: null, cluster: null },
  },
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.auth = false;
      state.selectedScope = { country: null, state: null, cluster: null };
      localStorage.removeItem('op_selected_scope');
    },
    setSelectedScope: (state, action) => {
      state.selectedScope = action.payload;
      localStorage.setItem('op_selected_scope', JSON.stringify(action.payload));
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
          state.selectedScope = { country: null, state: null, cluster: null };
          localStorage.removeItem('op_selected_scope');
        }
      });
  },
});

export const { logoutUser, setSelectedScope } = userSlice.actions;
export default userSlice.reducer;
