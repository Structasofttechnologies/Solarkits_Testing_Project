import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { ms_conversion } from "../utils/msConversion.jsx";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const localToken = getState()?.auth?.token || safeParse('login', null)?.token;
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const headers = {};
      if (localToken) {
        headers['Authorization'] = localToken.startsWith('Bearer ') ? localToken : `Bearer ${localToken}`;
      }
      if (storedRefreshToken) {
        headers['x-refresh-token'] = storedRefreshToken;
      }

      const res = await axios.post(
        `${import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/auth-api'}/refresh-access-token`,
        storedRefreshToken ? { refresh_token: storedRefreshToken } : {},
        {
          headers,
          withCredentials: true,
          timeout: ms_conversion('30s'),
        }
      );
      const { token, refresh_token: newRefreshToken, url_prefix } = res.data || {};
      if (token) {
        localStorage.setItem('login', JSON.stringify({ token }));
      }
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }
      if (token && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token_refreshed', { detail: token }));
      }
      return { token: token || null, refresh_token: newRefreshToken || null, url_prefix: url_prefix || null };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to refresh access token';
      if (err.response?.data?.auth === false || err.response?.status === 401) {
        localStorage.removeItem('login');
        localStorage.removeItem('refresh_token');
        const publicPaths = ["/login", "/verify", "/forgot-password", "/set-passcode"];
        const targetLogin = '/login';
        if (typeof window !== 'undefined' && window.location.pathname !== targetLogin && !publicPaths.includes(window.location.pathname)) {
          window.location.href = targetLogin;
        }
      }
      return rejectWithValue(message);
    }
  }
);

export const ensureValidAccessToken = createAsyncThunk(
  'auth/ensureValidAccessToken',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const auth = state.auth || {};
      const now = Date.now();
      if (auth.token && auth.expiresAt && auth.expiresAt > now) {
        return auth.token;
      }
      const payload = await dispatch(refreshAccessToken()).unwrap();
      return payload?.token || null;
    } catch (err) {
      return rejectWithValue(err || 'Failed to ensure access token');
    }
  }
);

// Safe JSON parser - never crashes on bad/null data
const safeParse = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'null' || raw === 'undefined') return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

// Async thunk for logging in a user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', credentials);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

// identifyUserPanel removed

const initialState = {
  user: safeParse('user', null),
  token: safeParse('login', null)?.token || null,
  expiresAt: safeParse('login', null)?.token ? Date.now() + 14 * 60 * 1000 : null,
  isAuthenticated: !!(safeParse('login', null)?.token),
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.expiresAt = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('login');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.user = action.payload.user || null;
        state.token = action.payload.token || null;
        state.expiresAt = state.token ? Date.now() + 14 * 60 * 1000 : null; // 14 minutes expiration
        state.error = null;

        localStorage.setItem('user', JSON.stringify(action.payload.user || null));
        if (action.payload.token) {
          localStorage.setItem('login', JSON.stringify({ token: action.payload.token }));
        }
        if (action.payload.refresh_token) {
          localStorage.setItem('refresh_token', action.payload.refresh_token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.isAuthenticated = false;
        state.token = null;
        state.expiresAt = null;
        state.user = null;
      })
      .addCase(refreshAccessToken.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token || null;
        state.expiresAt = state.token ? Date.now() + 14 * 60 * 1000 : null; // 14 minutes expiration
        state.error = null;
        if (action.payload.token) {
          localStorage.setItem('login', JSON.stringify({ token: action.payload.token }));
        }
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
        state.token = null;
        state.expiresAt = null;
        state.isAuthenticated = false;
        state.user = null;
        localStorage.removeItem('user');
        localStorage.removeItem('login');
      });
  },
});

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, {
        withCredentials: true,
      });
      if (res.data?.status === 'success') {
        dispatch(logoutUser());
        return res.data;
      }
      return rejectWithValue(res.data?.message || 'Logout failed');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to logout';
      return rejectWithValue(message);
    }
  }
);

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;
