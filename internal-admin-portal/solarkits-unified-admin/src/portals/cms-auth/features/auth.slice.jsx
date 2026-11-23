import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Attach Authorization header from localStorage if available
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('login');
      const token = raw ? (JSON.parse(raw)?.token || raw) : null;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
    } catch (e) {
      // ignore JSON parse errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Safe JSON parser — never crashes on bad/null data
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
      console.log('[Auth] Attempting login with credentials for:', credentials.email || credentials.phone);
      const res = await api.post(`/login`, credentials);
      return res.data;
    } catch (err) {
      console.warn('[Auth] Primary login attempt failed:', err.response?.status, err.response?.data || err.message);
      
      // Resilient fallback: Try direct backend auth endpoint if port or prefix fluctuated
      if (!err.response || err.response.status === 404 || err.response.status === 502) {
        try {
          const fallbackBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          console.log('[Auth] Retrying via fallback URL:', `${fallbackBase}/auth-api/login`);
          const fallbackRes = await axios.post(`${fallbackBase}/auth-api/login`, credentials, { withCredentials: true });
          if (fallbackRes?.data) {
            return fallbackRes.data;
          }
        } catch (fallbackErr) {
          console.warn('[Auth] Fallback login failed:', fallbackErr.message);
        }
      }

      const message = err.response?.data?.message || err.message || 'Login failed. Please check backend connection.';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for fetching user data
export const identifyUserPanel = createAsyncThunk(
  'auth/identifyUserPanel',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/identify-user-panel`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to refresh token';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for logging out a user
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post(`/logout`);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Logout failed';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  user: safeParse('user', null),
  token: safeParse('login', null)?.token || null,
  isAuthenticated: !!(safeParse('login', null)?.token),
  allowed_panels: safeParse('allowed_panels', []),
  url_prefix: localStorage.getItem('url_prefix') || null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearLocalAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.allowed_panels = [];
      state.url_prefix = null;
      localStorage.removeItem('user');
      localStorage.removeItem('allowed_panels');
      localStorage.removeItem('url_prefix');
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
        state.allowed_panels = action.payload.allowed_panels || [];
        state.url_prefix = action.payload.url_prefix || null;
        state.token = action.payload.token || null;
        state.error = null;
        
        localStorage.setItem('user', JSON.stringify(action.payload.user || null));
        localStorage.setItem('allowed_panels', JSON.stringify(action.payload.allowed_panels || []));
        localStorage.setItem('url_prefix', action.payload.url_prefix || '');
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
        state.user = null;
        state.allowed_panels = [];
        state.url_prefix = null;
      })
      .addCase(identifyUserPanel.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user || state.user;
        state.allowed_panels = action.payload.allowed_panels || state.allowed_panels;
        state.url_prefix = action.payload.url_prefix || state.url_prefix;
        
        localStorage.setItem('user', JSON.stringify(action.payload.user || state.user));
        localStorage.setItem('allowed_panels', JSON.stringify(action.payload.allowed_panels || state.allowed_panels));
        localStorage.setItem('url_prefix', action.payload.url_prefix || state.url_prefix || '');
        if (action.payload.token) {
          state.token = action.payload.token;
          localStorage.setItem('login', JSON.stringify({ token: action.payload.token }));
        }
        if (action.payload.refresh_token) {
          localStorage.setItem('refresh_token', action.payload.refresh_token);
        }
      })
      .addCase(identifyUserPanel.rejected, (state) => {
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.allowed_panels = [];
        state.url_prefix = null;
        localStorage.removeItem('user');
        localStorage.removeItem('allowed_panels');
        localStorage.removeItem('url_prefix');
        localStorage.removeItem('login');
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.allowed_panels = [];
        state.url_prefix = null;
        localStorage.removeItem('user');
        localStorage.removeItem('allowed_panels');
        localStorage.removeItem('url_prefix');
        localStorage.removeItem('login');
      });
  },
});

export const { clearLocalAuth } = authSlice.actions;
export default authSlice.reducer;