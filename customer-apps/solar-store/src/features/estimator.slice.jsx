import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance";

// ── Thunks ───────────────────────────────────────────────────────────────────

export const fetchEligibleIndustries = createAsyncThunk(
  "estimator/fetchEligibleIndustries",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/india/v1/estimator/industries");
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch industry types");
    }
  }
);

export const fetchProjectTypes = createAsyncThunk(
  "estimator/fetchProjectTypes",
  async (industryTypeId, { rejectWithValue }) => {
    try {
      const params = industryTypeId ? { industry_type_id: industryTypeId } : {};
      const res = await axiosInstance.get("/india/v1/estimator/project-types", { params });
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch project types");
    }
  }
);

export const fetchProjectSubTypes = createAsyncThunk(
  "estimator/fetchProjectSubTypes",
  async (projectCategoryId, { rejectWithValue }) => {
    try {
      const params = projectCategoryId ? { project_category_id: projectCategoryId } : {};
      const res = await axiosInstance.get("/india/v1/estimator/project-sub-types", { params });
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch sub-types");
    }
  }
);

export const fetchEligibleSolutions = createAsyncThunk(
  "estimator/fetchEligibleSolutions",
  async (params, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/india/v1/estimator/eligible-solutions", { params });
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch solutions");
    }
  }
);

export const fetchEligibleBoms = createAsyncThunk(
  "estimator/fetchEligibleBoms",
  async (params, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/india/v1/estimator/eligible-boms", { params });
      return res.data || { data: [] };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch BOM items");
    }
  }
);

export const fetchGstSettings = createAsyncThunk(
  "estimator/fetchGstSettings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/india/v1/estimator/eligible-gst");
      return res.data?.data || {};
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch GST settings");
    }
  }
);

export const calculateMargin = createAsyncThunk(
  "estimator/calculateMargin",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/india/v1/estimator/calculate", payload);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Calculation failed");
    }
  }
);

export const compareSolutionsThunk = createAsyncThunk(
  "estimator/compareSolutions",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/india/v1/estimator/compare-solutions", payload);
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Comparison failed");
    }
  }
);

export const saveEstimateThunk = createAsyncThunk(
  "estimator/saveEstimate",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/india/v1/estimates", payload);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to save estimate");
    }
  }
);

export const fetchMyEstimates = createAsyncThunk(
  "estimator/fetchMyEstimates",
  async (params, { getState, rejectWithValue }) => {
    try {
      const { isAuthenticated } = getState().auth_slice || {};
      if (!isAuthenticated) return { data: [] };
      const res = await axiosInstance.get("/india/v1/estimates", { params });
      return res.data || { data: [] };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch estimates");
    }
  }
);

export const fetchEstimateDetail = createAsyncThunk(
  "estimator/fetchEstimateDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/india/v1/estimates/${id}`);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch estimate detail");
    }
  }
);

export const deleteEstimateThunk = createAsyncThunk(
  "estimator/deleteEstimate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.delete(`/india/v1/estimates/${id}`);
      return { id, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete estimate");
    }
  }
);

export const generateQuoteThunk = createAsyncThunk(
  "estimator/generateQuote",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/india/v1/estimates/${id}/generate-quote`);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Quote generation failed");
    }
  }
);

export const fetchEstimatesStats = createAsyncThunk(
  "estimator/fetchEstimatesStats",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { isAuthenticated } = getState().auth_slice || {};
      if (!isAuthenticated) return null;
      const res = await axiosInstance.get("/india/v1/estimates/dashboard");
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch dashboard stats");
    }
  }
);

// ── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  // Wizard flow data
  industries: [],
  projectTypes: [],
  projectSubTypes: [],
  solutions: [],
  eligibleBoms: [],
  gstSettings: {
    gst_calculation_method: "on_cost_plus_margin",
    default_gst_rate: 18,
    allowed_gst_options: [0, 5, 12, 13.8, 18],
    allowed_margin_types: "both",
    min_margin: 0,
    max_margin: 10000000,
    min_margin_percentage: 0,
    max_margin_percentage: 100,
  },

  // Active Wizard Selections
  activeStep: 1, // 1 to 5, step 6 is estimation panel
  selectedIndustry: null,
  selectedProjectType: null,
  selectedProjectSubType: null,
  selectedSolution: null,
  quantity: 1,

  // Selected BOM items and config
  selectedBoms: [],
  marginType: "percentage", // 'percentage' | 'amount'
  marginValue: 10,
  selectedGstRate: 18,
  calculationResult: null,

  // Compare mode
  comparisonSolutions: [],
  comparisonResults: [],

  // Saved estimates
  savedEstimates: [],
  savedEstimatesPagination: { total: 0, page: 1, limit: 20, pages: 1 },
  currentEstimate: null,
  estimatesStats: {
    total_estimates: 0,
    active_saved: 0,
    quotes_generated: 0,
    total_estimated_value: 0,
    total_profit: 0,
    total_kw: 0,
  },

  // UI state
  loading: false,
  calcLoading: false,
  error: null,
  successMessage: null,
};

// ── Slice ────────────────────────────────────────────────────────────────────

const estimatorSlice = createSlice({
  name: "estimator",
  initialState,
  reducers: {
    setActiveStep(state, action) {
      state.activeStep = action.payload;
    },
    selectIndustry(state, action) {
      state.selectedIndustry = action.payload;
      state.selectedProjectType = null;
      state.selectedProjectSubType = null;
      state.selectedSolution = null;
      state.activeStep = 2;
    },
    selectProjectType(state, action) {
      state.selectedProjectType = action.payload;
      state.selectedProjectSubType = null;
      state.selectedSolution = null;
      state.activeStep = 3;
    },
    selectProjectSubType(state, action) {
      state.selectedProjectSubType = action.payload;
      state.selectedSolution = null;
      state.activeStep = 4;
    },
    selectSolution(state, action) {
      state.selectedSolution = action.payload;
      state.activeStep = 5;
    },
    setQuantity(state, action) {
      state.quantity = Math.max(1, parseInt(action.payload, 10) || 1);
    },
    toggleBomItem(state, action) {
      const bomItem = action.payload;
      const id = String(bomItem._id || bomItem.bom_id);
      const exists = state.selectedBoms.some((b) => String(b._id || b.bom_id) === id);
      if (exists) {
        state.selectedBoms = state.selectedBoms.filter((b) => String(b._id || b.bom_id) !== id);
      } else {
        state.selectedBoms.push(bomItem);
      }
    },
    setMarginType(state, action) {
      state.marginType = action.payload;
      const isPct = action.payload === "percentage";
      const max = isPct
        ? Number(state.gstSettings?.max_margin_percentage ?? 100)
        : Number(state.gstSettings?.max_margin ?? 10000000);

      if (state.marginValue > max) state.marginValue = max;
      if (state.marginValue < 0) state.marginValue = 0;
    },
    setMarginValue(state, action) {
      let val = Number(action.payload || 0);
      const isPct = state.marginType === "percentage";
      const max = isPct
        ? Number(state.gstSettings?.max_margin_percentage ?? 100)
        : Number(state.gstSettings?.max_margin ?? 10000000);

      if (val > max) val = max;
      if (val < 0) val = 0;
      state.marginValue = val;
    },
    setSelectedGstRate(state, action) {
      state.selectedGstRate = Number(action.payload);
    },
    addToComparison(state, action) {
      const solution = action.payload || state.selectedSolution;
      if (!solution) return;
      const id = String(solution._id);
      if (!state.comparisonSolutions.some((s) => String(s.kit?._id || s._id) === id)) {
        state.comparisonSolutions.push({
          kit: solution,
          quantity: state.quantity,
          bom_items: state.selectedBoms,
        });
      }
    },
    removeFromComparison(state, action) {
      const id = String(action.payload);
      state.comparisonSolutions = state.comparisonSolutions.filter(
        (s) => String(s.kit?._id || s._id) !== id
      );
    },
    clearComparison(state) {
      state.comparisonSolutions = [];
      state.comparisonResults = [];
    },
    resetWizard(state) {
      state.activeStep = 1;
      state.selectedIndustry = null;
      state.selectedProjectType = null;
      state.selectedProjectSubType = null;
      state.selectedSolution = null;
      state.quantity = 1;
      state.selectedBoms = [];
      state.calculationResult = null;
      state.comparisonSolutions = [];
      state.comparisonResults = [];
    },
    clearMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Eligible Industries
      .addCase(fetchEligibleIndustries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEligibleIndustries.fulfilled, (state, action) => {
        state.loading = false;
        state.industries = action.payload;
      })
      .addCase(fetchEligibleIndustries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Project Types
      .addCase(fetchProjectTypes.fulfilled, (state, action) => {
        state.projectTypes = action.payload;
      })

      // Project Sub-Types
      .addCase(fetchProjectSubTypes.fulfilled, (state, action) => {
        state.projectSubTypes = action.payload;
      })

      // Eligible Solutions
      .addCase(fetchEligibleSolutions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEligibleSolutions.fulfilled, (state, action) => {
        state.loading = false;
        state.solutions = action.payload;
      })
      .addCase(fetchEligibleSolutions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Eligible BOMs
      .addCase(fetchEligibleBoms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEligibleBoms.fulfilled, (state, action) => {
        state.loading = false;
        state.eligibleBoms = action.payload.data || [];
        // Auto-select mandatory items
        state.selectedBoms = (action.payload.data || []).filter((b) => b.is_mandatory);
      })
      .addCase(fetchEligibleBoms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // GST Settings
      .addCase(fetchGstSettings.fulfilled, (state, action) => {
        state.gstSettings = action.payload;
        if (action.payload.default_gst_rate !== undefined) {
          state.selectedGstRate = action.payload.default_gst_rate;
        }
        if (action.payload.allowed_margin_types === "percentage") {
          state.marginType = "percentage";
        } else if (action.payload.allowed_margin_types === "amount") {
          state.marginType = "amount";
        }

        // Clamp marginValue to Admin limits
        const isPct = state.marginType === "percentage";
        const max = isPct
          ? Number(action.payload.max_margin_percentage ?? 100)
          : Number(action.payload.max_margin ?? 10000000);

        if (state.marginValue > max) {
          state.marginValue = max;
        } else if (state.marginValue < 0) {
          state.marginValue = 0;
        }
      })

      // Calculate Margin
      .addCase(calculateMargin.pending, (state) => {
        state.calcLoading = true;
      })
      .addCase(calculateMargin.fulfilled, (state, action) => {
        state.calcLoading = false;
        state.calculationResult = action.payload;
      })
      .addCase(calculateMargin.rejected, (state, action) => {
        state.calcLoading = false;
        state.error = action.payload;
      })

      // Compare
      .addCase(compareSolutionsThunk.pending, (state) => {
        state.calcLoading = true;
      })
      .addCase(compareSolutionsThunk.fulfilled, (state, action) => {
        state.calcLoading = false;
        state.comparisonResults = action.payload;
      })
      .addCase(compareSolutionsThunk.rejected, (state, action) => {
        state.calcLoading = false;
        state.error = action.payload;
      })

      // Save Estimate
      .addCase(saveEstimateThunk.fulfilled, (state, action) => {
        state.successMessage = "Estimate saved successfully!";
        if (action.payload) {
          state.savedEstimates.unshift(action.payload);
        }
      })
      .addCase(saveEstimateThunk.rejected, (state, action) => {
        state.error = action.payload;
      })

      // List Estimates
      .addCase(fetchMyEstimates.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyEstimates.fulfilled, (state, action) => {
        state.loading = false;
        state.savedEstimates = action.payload.data || [];
        state.savedEstimatesPagination = action.payload.pagination || state.savedEstimatesPagination;
      })
      .addCase(fetchMyEstimates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Estimate Detail
      .addCase(fetchEstimateDetail.fulfilled, (state, action) => {
        state.currentEstimate = action.payload;
      })

      // Delete Estimate
      .addCase(deleteEstimateThunk.fulfilled, (state, action) => {
        state.savedEstimates = state.savedEstimates.filter((e) => e._id !== action.payload.id);
        state.successMessage = "Estimate deleted";
      })

      // Generate Quote
      .addCase(generateQuoteThunk.fulfilled, (state) => {
        state.successMessage = "Formal quote created successfully!";
      })

      // Stats
      .addCase(fetchEstimatesStats.fulfilled, (state, action) => {
        state.estimatesStats = action.payload || state.estimatesStats;
      });
  },
});

export const {
  setActiveStep,
  selectIndustry,
  selectProjectType,
  selectProjectSubType,
  selectSolution,
  setQuantity,
  toggleBomItem,
  setMarginType,
  setMarginValue,
  setSelectedGstRate,
  addToComparison,
  removeFromComparison,
  clearComparison,
  resetWizard,
  clearMessages,
} = estimatorSlice.actions;

export default estimatorSlice.reducer;
