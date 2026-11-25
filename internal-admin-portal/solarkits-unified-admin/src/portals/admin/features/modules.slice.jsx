import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import axios from "axios";
import { setAlert } from "./alert.slice";
import { refreshAccessToken } from "./auth.slice";
import { resolveApiUrl } from "@/utils/resolveApiUrl";

const extractUniqueIdsFromModules = (modules = []) => {
  let uniqueIds = [];

  modules.filter((module) => module.can_view == true).forEach((module) => {
    if (module.unique_id) uniqueIds.push(module.unique_id);
    if (module.children?.length) {
      uniqueIds = uniqueIds.concat(extractUniqueIdsFromModules(module.children));
    }
  });

  return uniqueIds;
};

const safeParse = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'null' || raw === 'undefined') return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

const initialCachedModules = safeParse('admin_modules', []);
const initialCachedUniqueIds = extractUniqueIdsFromModules(initialCachedModules);

export const fetchUserModules = createAsyncThunk(
  "modules/fetchUserModules",
  async (_, { rejectWithValue, getState }) => {
    try {
      const rawToken = getState().auth?.token;
      let token = rawToken;
      if (!token) {
        try {
          const raw = localStorage.getItem('login');
          token = raw ? (JSON.parse(raw)?.token || raw) : null;
        } catch (e) {}
      }

      if (!token) {
        return rejectWithValue("No token found");
      }

      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await axios.get(`${resolveApiUrl(import.meta.env.VITE_API_URL, 'http://localhost:5000/admin-api')}/user-modules`, {
        headers: { Authorization: authHeader },
        timeout: 10000,
      });

      const modules = res.data?.data || [];
      const uniqueIds = extractUniqueIdsFromModules(modules);

      return { modules, uniqueIds };
    } catch (error) {
      if (error.code === "ECONNABORTED" || error.message === "Network Error") {
        return rejectWithValue("SERVER_DOWN");
      }

      const resp = error.response?.data;
      const msg = resp?.message || "Failed to fetch modules";
      return rejectWithValue(msg);
    }
  }
);

const modulesSlice = createSlice({
  name: "modules",
  initialState: {
    modules: initialCachedModules,
    uniqueIds: initialCachedUniqueIds,
    status: initialCachedModules.length > 0 ? 'success' : 'idle',
    loading: false,
    error: null,
  },
  reducers: {
    clearModules: (state) => {
      state.modules = [];
      state.uniqueIds = [];
      state.status = 'idle';
      try {
        localStorage.removeItem('admin_modules');
      } catch (e) {}
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserModules.pending, (state) => {
        state.loading = true;
        if (state.modules.length === 0) {
          state.status = 'loading';
        }
        state.error = null;
      })
      .addCase(fetchUserModules.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'success';
        state.modules = action.payload.modules || [];
        state.uniqueIds = action.payload.uniqueIds || [];
        try {
          localStorage.setItem('admin_modules', JSON.stringify(action.payload.modules || []));
        } catch (e) {}
      })
      .addCase(fetchUserModules.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      });
  },
});

const EMPTY_ARRAY = [];

const selectModulesState = (state) => state.modules_slice?.modules;
const selectUserState = (state) => state.user_slice?.user;
const selectSelectedScopeState = (state) => state.user_slice?.selectedScope;
const selectPathname = (_, pathname) => pathname;

export const selectAllowedUniqueIds = createSelector(
  [selectModulesState, selectUserState, selectSelectedScopeState, selectPathname],
  (rawModules = EMPTY_ARRAY, user, selectedScope, pathname) => {
    if (!pathname) return EMPTY_ARRAY;

    // Super Admin or Admin gets full module access
    const isSuperAdmin = !user || user.role === 'Super Admin' || user.role_id?.name === 'Super Admin' || user.is_super_admin;
    if (isSuperAdmin) {
      const ids = rawModules.map(m => m.unique_id).filter(Boolean);
      if (!ids.includes("00000000")) ids.push("00000000");
      return ids;
    }

    if (!user.allowed_panels) {
      const ids = rawModules.map(m => m.unique_id).filter(Boolean);
      if (!ids.includes("00000000")) ids.push("00000000");
      return ids;
    }

    const activeLevel = (selectedScope?.level || user.level || '').toLowerCase();

    const activePanel = user.allowed_panels.find(p => pathname.startsWith(p.url_prefix));
    if (!activePanel) {
      const ids = rawModules.map(m => m.unique_id).filter(Boolean);
      if (!ids.includes("00000000")) ids.push("00000000");
      return ids;
    }

    const activeProduct = activePanel.saas_products?.find(prod =>
      pathname.startsWith(`${activePanel.url_prefix}/${prod.slug}`)
    );

    if (activeProduct) {
      const activeProdId = (activeProduct.id || activeProduct._id)?.toString();
      const ids = rawModules
        .filter(m => {
          const matchesProd = m.dashboard_context === "product" && (
            String(m.saas_product_id?._id || m.saas_product_id) === String(activeProdId)
          );
          const isGeneric = !m.dashboard_context || m.dashboard_context === "default";
          const matchesLevel = !m.level_name || m.level_name.toLowerCase() === activeLevel || activeLevel === 'global' || activeLevel === 'standard access';
          return (matchesProd || isGeneric) && matchesLevel;
        })
        .map(m => m.unique_id);
      if (!ids.includes("00000000")) ids.push("00000000");
      return ids;
    } else {
      const ids = rawModules
        .filter(m => {
          const isGeneric = !m.dashboard_context || m.dashboard_context === "default";
          const matchesLevel = !m.level_name || m.level_name.toLowerCase() === activeLevel || activeLevel === 'global' || activeLevel === 'standard access';
          return isGeneric && matchesLevel;
        })
        .map(m => m.unique_id);
      if (!ids.includes("00000000")) ids.push("00000000");
      return ids;
    }
  }
);

export const { clearModules } = modulesSlice.actions;
export default modulesSlice.reducer;
