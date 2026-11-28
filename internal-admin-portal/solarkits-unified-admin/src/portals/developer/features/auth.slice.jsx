import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { ms_conversion } from "@/utils/msConversion";

const safeParse = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'null' || raw === 'undefined') return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

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
                `${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/auth-api'}/refresh-access-token`,
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
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
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

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/auth-api'}/logout`, {}, {
                withCredentials: true,
            });

            if (res.data?.status === 'success') {
                dispatch({ type: 'user/logoutUser' });
                dispatch({ type: 'auth/clearAuth' });
                localStorage.removeItem('login');
                localStorage.removeItem('user');
                localStorage.removeItem('allowed_panels');
                return res.data;
            }

            return rejectWithValue(res.data?.message || 'Logout failed');
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to logout';
            return rejectWithValue(message);
        }
    }
);

const initialToken = safeParse('login', null)?.token || null;

const initialState = {
    token: initialToken,
    url_prefix: localStorage.getItem('url_prefix') || null,
    expiresAt: initialToken ? Date.now() + 14 * 60 * 1000 : null,
    status: 'idle',
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuth(state) {
            state.token = null;
            state.url_prefix = null;
            state.expiresAt = null;
            state.status = 'idle';
            state.error = null;
            localStorage.removeItem('login');
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(refreshAccessToken.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(refreshAccessToken.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.token = action.payload.token || null;
                state.url_prefix = action.payload.url_prefix || null;
                state.error = null;
                const EXPIRE_MS = 14 * 60 * 1000;
                state.expiresAt = state.token ? Date.now() + EXPIRE_MS : null;
            })
            .addCase(refreshAccessToken.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error?.message;
            });
        builder
            .addCase(logout.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(logout.fulfilled, (state) => {
                state.status = 'idle';
                state.token = null;
                state.url_prefix = null;
                state.expiresAt = null;
                state.error = null;
            })
            .addCase(logout.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error?.message;
            });
    },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
