import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setAlert } from "./alert.slice";
import { refreshAccessToken } from "./auth.slice";

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

const initialCachedModules = safeParse('accounts_modules', []);
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
      const res = await axios.get(`${import.meta.env.VITE_ACCOUNT_API_URL || import.meta.env.VITE_API_URL}/user-modules`, {
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
        localStorage.removeItem('accounts_modules');
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
          localStorage.setItem('accounts_modules', JSON.stringify(action.payload.modules || []));
        } catch (e) {}
      })
      .addCase(fetchUserModules.rejected, (state, action) => {
        state.loading = false;
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      });
  },
});

export const selectAllowedUniqueIds = (state, pathname) => {
  const rawModules = state.modules_slice?.modules || [];
  const user = state.user_slice?.user;
  const selectedScope = state.user_slice?.selectedScope;

  if (!user || !user.allowed_panels) return [];

  const activeLevel = (selectedScope?.level || user.level || '').toLowerCase();

  const activePanel = user.allowed_panels.find(p => pathname.startsWith(p.url_prefix));
  if (!activePanel) return [];

  // Helper: check if a set of modules has any at the global tier (null level_name or 'global').
  // The global bypass is intentional for panels like admin-panel that create global-level
  // modules — but should NOT apply to panels that only have state/cluster modules.
  const hasGlobalLevelModules = (modules) =>
    modules.some(m => !m.level_name || m.level_name.toLowerCase() === 'global');

  // Level filter: matches the active level, or falls back to global ONLY when the module set
  // actually contains global-level modules (preserves admin-panel behaviour).
  const matchesActiveLevel = (m) => {
    const mLevel = m.level_name?.toLowerCase();
    if (mLevel === activeLevel) return true;
    if (activeLevel === 'global' && !mLevel) return true;
    return false;
  };

  const activeProduct = activePanel.saas_products?.find(prod =>
    pathname.startsWith(`${activePanel.url_prefix}/${prod.slug}`)
  );

  if (activeProduct) {
    const activeProdId = (activeProduct.id || activeProduct._id)?.toString();
    const productModules = rawModules.filter(m =>
      m.dashboard_context === "product" &&
      String(m.saas_product_id?._id || m.saas_product_id) === String(activeProdId)
    );
    const ids = productModules
      .filter(m => matchesActiveLevel(m))
      .map(m => m.unique_id);
    if (!ids.includes("ACC_HOME")) ids.push("ACC_HOME");
    return ids;
  } else {
    const defaultModules = rawModules.filter(m => !m.dashboard_context || m.dashboard_context === "default");
    const ids = defaultModules
      .filter(m => matchesActiveLevel(m))
      .map(m => m.unique_id);
    if (!ids.includes("ACC_HOME")) ids.push("ACC_HOME");
    return ids;
  }
};

/**
 * Returns true when:
 *  - Modules have finished loading for this panel
 *  - The panel has tier-specific (non-global) modules
 *  - None of those modules match the user's currently active level
 *
 * Use this to show a "No modules for your tier — switch level" message in the UI.
 */
export const selectNoModulesForTier = (state, pathname) => {
  const rawModules = state.modules_slice?.modules || [];
  const user = state.user_slice?.user;
  const selectedScope = state.user_slice?.selectedScope;
  const status = state.modules_slice?.status;

  // Only signal after a successful load
  if (!user || !user.allowed_panels || status !== 'success') return false;

  const activeLevel = (selectedScope?.level || user.level || '').toLowerCase();
  const activePanel = user.allowed_panels.find(p => pathname.startsWith(p.url_prefix));
  if (!activePanel) return false;

  // Look at non-product, non-home default modules
  const defaultModules = rawModules.filter(m =>
    (!m.dashboard_context || m.dashboard_context === "default") &&
    m.unique_id !== "00000000"
  );

  if (defaultModules.length === 0) return false;

  // If ALL modules have no level (pure global panel), never show the tier message
  const hasTierSpecificModules = defaultModules.some(
    m => m.level_name && m.level_name.toLowerCase() !== 'global'
  );
  if (!hasTierSpecificModules) return false;

  // If global modules exist and user is at global level, they see them normally
  const hasGlobalModules = defaultModules.some(
    m => !m.level_name || m.level_name.toLowerCase() === 'global'
  );
  if (activeLevel === 'global' && hasGlobalModules) return false;

  // Tier mismatch: panel has level-specific modules but none match the active level
  return !defaultModules.some(m => m.level_name?.toLowerCase() === activeLevel);
};

export default modulesSlice.reducer;
