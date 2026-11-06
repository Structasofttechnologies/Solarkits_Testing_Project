import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import axiosInstance from "@/utils/axiosInstance";
import { clearUser } from "./auth.slice";

// ─────────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────────

export const fetchCart = createAsyncThunk(
  "solar/fetchCart",
  async (_, { getState, dispatch, rejectWithValue }) => {
    const { isAuthenticated } = getState().auth_slice;
    if (!isAuthenticated) return { cart: [] };
    try {
      const response = await axiosInstance.get("/india/v1/shop/cart");
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(clearUser());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

export const syncCartWithBackend = createAsyncThunk(
  "solar/syncCartWithBackend",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { slice } = getState();
      const { cart } = slice;
      const { isAuthenticated } = getState().auth_slice;
      if (!isAuthenticated) return;
      const response = await axiosInstance.post("/india/v1/shop/cart", { cart });
      
      // Background activity tracking for EPC analytics
      if (cart && cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        if (lastItem) {
          axiosInstance.post("/india/v1/shop/cart/track-activity", {
            product_id: lastItem.id || lastItem.listing_id || null,
            kit_id: lastItem.kit_id || lastItem.id || null,
            capacity: lastItem.capacityKW ? `${lastItem.capacityKW} kW` : (lastItem.capacity || null),
            item_name: lastItem.kitName || lastItem.title || 'Solar Kit',
            action_type: 'success',
            is_success: true,
            source_page: 'store_cart',
            idempotency_key: `sync_${lastItem.cartItemId || lastItem.id}_${cart.length}`
          }).catch(() => {});
        }
      }

      // Fetch latest live stock so quantity updates are instantly reflected
      const districtId = slice.selectedDistrict?.id;
      if (districtId) {
        dispatch(fetchLiveInventory({ districtId }));
      } else {
        dispatch(fetchLiveInventory({}));
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(clearUser());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to sync cart');
    }
  }
);

export const logCartActivity = createAsyncThunk(
  "solar/logCartActivity",
  async (activityData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/india/v1/shop/cart/track-activity", activityData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to log cart activity');
    }
  }
);

export const getAvailableKitData = createAsyncThunk(
  "solar/getAvailableKitData",
  async (params) => {
    const { districtId } = params || {};
    const url = districtId 
      ? `/india/v1/shop/combo-kits?district_id=${districtId}`
      : `/india/v1/shop/combo-kits`;
    const response = await axiosInstance.get(url);
    return response.data.data;
  }
);

// Bulk kits thunk (completely separate for Bulk Buy page)
export const getBulkKitBuyData = createAsyncThunk(
  "solar/getBulkKitBuyData",
  async (params) => {
    const { districtId } = params || {};
    const url = districtId 
      ? `/india/v1/shop/combo-kits?district_id=${districtId}`
      : `/india/v1/shop/combo-kits`;
    const response = await axiosInstance.get(url);
    return response.data.data;
  }
);

export const fetchLiveInventory = createAsyncThunk(
  "solar/fetchLiveInventory",
  async (params, { rejectWithValue }) => {
    try {
      const { districtId } = params || {};
      const url = districtId
        ? `/india/v1/shop/inventory-status?district_id=${districtId}`
        : `/india/v1/shop/inventory-status`;
      const response = await axiosInstance.get(url);
      return response.data.stock || {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const fetchShopHierarchy = createAsyncThunk(
  "solar/fetchShopHierarchy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/india/v1/shop/hierarchy`);
      return response.data?.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch shop hierarchy');
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────
export const getKitTierPrice = (kitOrProduct, qty) => {
  const q = Number(qty);
  if (!kitOrProduct || !q || q <= 0) return null;

  const looseList = Array.isArray(kitOrProduct.loose_order_pricing) ? kitOrProduct.loose_order_pricing : [];
  const poList = Array.isArray(kitOrProduct.po_order_pricing) ? kitOrProduct.po_order_pricing : [];

  const matchedLoose = looseList.find((t) => Number(t.quantity) === q && Number(t.price_per_kit) > 0);
  if (matchedLoose) {
    return Number(matchedLoose.price_per_kit);
  }

  const matchedPo = poList.find((t) => Number(t.quantity) === q && Number(t.price_per_kit) > 0);
  if (matchedPo) {
    return Number(matchedPo.price_per_kit);
  }

  return null;
};

const generateCartItemId = (kitId, variantIndex, districtId) => {
  return districtId ? `${kitId}-${variantIndex}-${districtId}` : `${kitId}-${variantIndex}`;
};

// ─────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────
const slice = createSlice({
  name: "slice",
  initialState: {
    shopHierarchy: [],
    availableKits: [],
    bulkKits: [],
    cart: [],
    bulkCart: [],
    // Live inventory: { [kitId]: availableStock }
    liveStock: {},
    // Reservation expiry time (ISO string or null)
    cartExpiryTime: null,
    // District ID that was active when cart items were added
    cartDistrictId: null,
    showAuthDialog: false,
    // location change warning: pending district change info
    pendingLocationChange: null, // { selectedState, selectedDistrict }
    alert: { status: "", message: "", undoItem: null },
    status: 'idle',
    error: null,
    // Timestamp (ms) of the last successful cart SAVE to backend.
    // Used by fetchCart to decide whether to trust local or backend state.
    lastSyncedAt: 0,
    selectedState: (() => {
      try {
        return JSON.parse(localStorage.getItem("selectedState")) || null;
      } catch (e) {
        return null;
      }
    })(),
    selectedDistrict: (() => {
      try {
        return JSON.parse(localStorage.getItem("selectedDistrict")) || null;
      } catch (e) {
        return null;
      }
    })(),
    selectedPincode: (() => {
      try {
        return localStorage.getItem("selectedPincode") || null;
      } catch (e) {
        return null;
      }
    })(),
  },
  reducers: {
    // ── Regular Cart ────────────────────────────────────────────
    addToCart: (state, action) => {
      const payload = action.payload;

      // Handle direct catalogue items (e.g. EPC product catalogue)
      if (payload && (payload.is_catalogue_item || payload.listing_id || payload.item_type === 'product')) {
        const cartItemId = payload.listing_id || payload.id || `item_${Date.now()}`;
        const exists = state.cart.find((c) => c.cartItemId === cartItemId || c.id === (payload.id || payload.listing_id));

        const price = parseFloat(payload.selling_price_inr || payload.ourPrice || payload.price || payload.discounted_price || payload.mrp || 0);
        const marketPrice = parseFloat(payload.marketPrice || payload.mrp || (price > 0 ? Math.round(price * 1.15) : price));
        const img = payload.image_url || payload.image || payload.product_image || payload.kitImage || payload.panelImage || "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
        const cap = payload.capacityKW || payload.capacity_kw || (payload.wattage ? (payload.wattage >= 100 ? payload.wattage / 1000 : payload.wattage) : 0.55);
        const desc = payload.description || payload.summary || `${payload.title || payload.name || "Solar Module"} with standard manufacturer warranty and Tier-1 efficiency.`;

        const directGstRate = Number(payload.gst_rate_pct || payload.gst_rate || payload.gstRate || 18);
        const itemTaxable = payload.price_before_tax_inr || (price > 0 ? Math.round(price / (1 + (directGstRate / 100))) : 0);
        const itemTax = payload.taxes_and_charges_inr || Math.max(0, price - itemTaxable);

        if (exists) {
          exists.qty += (payload.qty || 1);
        } else {
          state.cart.push({
            id: payload.id || payload.listing_id,
            cartItemId,
            title: payload.title || payload.name || "Solar Module",
            kitName: payload.title || payload.name || "Solar Module",
            description: desc,
            selling_price_inr: price,
            price_before_tax_inr: itemTaxable,
            taxes_and_charges_inr: itemTax,
            ourPrice: price,
            marketPrice: marketPrice,
            gstRate: directGstRate,
            gstIncluded: itemTax,
            kitImage: img,
            image_url: img,
            capacityKW: cap,
            wattage: payload.wattage || (cap ? cap * 1000 : 550),
            is_catalogue_item: true,
            is_custom: true,
            qty: payload.qty || 1,
            availableStock: payload.stock_quantity || 99,
            productTier: payload.sku_code || payload.productTier || 'Tier-1 High Efficiency',
            tierColor: '#0575B8',
            tierBenefits: ['Verified Tier-1 Product', 'Direct Factory Warranty', 'Free Shipping Included'],
            generationEstimateKWhPerYear: Math.round(cap * 4 * 365),
            variants: [
              {
                productTier: payload.sku_code || payload.productTier || 'Standard Tier-1',
                ourPrice: price,
                marketPrice: marketPrice,
                gstRate: directGstRate,
                gstIncluded: itemTax,
                capacityKW: cap,
                availableStock: payload.stock_quantity || 99,
                inStock: true,
                image: img,
              }
            ]
          });
        }
        state.alert = {
          status: "success",
          message: `${payload.title || payload.name || "Product"} added to cart.`,
          undoItem: null,
        };
        return;
      }

      let kit;
      let variantIndex = 0;
      let requestedQty = 1;
      let replaceQty = false;

      if (typeof payload === 'number' || typeof payload === 'string') {
        kit = state.availableKits.find((i) => String(i.id) === String(payload));
        variantIndex = 0;
      } else {
        kit = state.availableKits.find((i) => String(i.id) === String(payload?.id));
        variantIndex = payload.variantIndex || 0;
        requestedQty = (typeof payload.qty === 'number' && payload.qty > 0) ? payload.qty : 1;
        replaceQty = payload.replace === true;
      }

      if (kit) {
        const currentVariant = kit.variants?.[variantIndex];
        if (!currentVariant) return;

        // Use live stock if available, otherwise fall back to variant's availableStock
        const liveAvailable = state.liveStock[kit.id] !== undefined
          ? state.liveStock[kit.id]
          : (currentVariant.availableStock ?? 999);

        const districtId = state.selectedDistrict?.id || state.selectedDistrict?._id || null;
        const districtName = state.selectedDistrict?.name || null;

        const isTrialKit = Boolean(payload?.is_trial_kit);
        const deliveryCost = Number(payload?.delivery_cost || 0);
        const deliveryPincode = payload?.delivery_pincode || null;
        const deliveryDistrict = payload?.delivery_district || districtName;
        const deliveryState = payload?.delivery_state || null;
        const deliveryEstimatedDays = payload?.delivery_estimated_days || null;

        const cartItemId = isTrialKit
          ? `${kit.id}-${variantIndex}-trial-${deliveryPincode || 'pincode'}`
          : generateCartItemId(kit.id, variantIndex, districtId);

        const exists = state.cart.find((c) => c.cartItemId === cartItemId);

        const effectiveGstRate = Number(currentVariant.gstRate ?? kit.gstRate ?? kit.pricing?.gstRate ?? 13.8);

        const rawLooseQtys = Array.isArray(kit.looseOrderQuantities || kit.loose_order_quantities)
          ? (kit.looseOrderQuantities || kit.loose_order_quantities).map(Number).filter(n => !isNaN(n) && n > 0)
          : [];
        const rawPoQtys = Array.isArray(kit.orderQuantities || kit.order_quantities)
          ? (kit.orderQuantities || kit.order_quantities).map(Number).filter(n => !isNaN(n) && n > 0)
          : [];

        const pricingLooseQtys = (kit.loose_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
        const pricingPoQtys = (kit.po_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);

        const looseOrderQuantities = [...new Set([...rawLooseQtys, ...pricingLooseQtys])].sort((a, b) => a - b);
        const orderQuantities = [...new Set([...rawPoQtys, ...pricingPoQtys, ...rawLooseQtys, ...pricingLooseQtys])].sort((a, b) => a - b);

        const tierPrice = Number(payload?.price_per_kit || getKitTierPrice(kit, requestedQty));
        const effectiveOurPrice = tierPrice > 0 ? tierPrice : currentVariant.ourPrice;

        const cartItem = {
          ...kit,
          ...currentVariant,
          id: kit.id,
          cartItemId,
          variantIndex,
          qty: requestedQty,
          is_trial_kit: isTrialKit,
          trial_kit_quantity: isTrialKit ? (payload?.trial_kit_quantity || requestedQty) : null,
          delivery_cost: deliveryCost,
          delivery_pincode: deliveryPincode,
          warehouse_name: payload?.warehouse_name || null,
          fulfillment_source: payload?.fulfillment_source || null,
          delivery_district: deliveryDistrict,
          delivery_state: deliveryState,
          delivery_estimated_days: deliveryEstimatedDays,
          loose_order_quantities: looseOrderQuantities,
          looseOrderQuantities: looseOrderQuantities,
          orderQuantities,
          order_quantities: orderQuantities,
          loose_order_pricing: kit.loose_order_pricing || [],
          po_order_pricing: kit.po_order_pricing || [],
          productTier: currentVariant.productTier,
          tierBenefits: currentVariant.tierBenefits,
          marketPrice: currentVariant.marketPrice,
          ourPrice: effectiveOurPrice,
          selling_price_inr: effectiveOurPrice,
          price_before_tax_inr: Math.round(effectiveOurPrice / (1 + (effectiveGstRate / 100))),
          taxes_and_charges_inr: Math.max(0, effectiveOurPrice - Math.round(effectiveOurPrice / (1 + (effectiveGstRate / 100)))),
          gstRate: effectiveGstRate,
          gstIncluded: Math.max(0, effectiveOurPrice - Math.round(effectiveOurPrice / (1 + (effectiveGstRate / 100)))),
          includedDeliveryCharge: currentVariant.includedDeliveryCharge,
          inStock: currentVariant.inStock,
          availableStock: liveAvailable,
          districtId,
          districtName
        };

        const currentCartQtySum = state.cart
          .filter(item => item.id === kit.id && item.districtId === districtId)
          .reduce((sum, item) => sum + item.qty, 0);

        // Bulk/wholesale kits with orderQuantities are made-to-order;
        // skip stock validation so 200/500/1000+ qty orders can be added.
        const isBulkOrderQty = orderQuantities.length > 0;

        if (exists) {
          if (replaceQty) {
            exists.qty = requestedQty;
          } else {
            if (isBulkOrderQty || currentCartQtySum + requestedQty <= liveAvailable) {
              exists.qty += requestedQty;
            }
          }
          // Re-evaluate tier pricing for the updated quantity
          const updatedTierPrice = Number(payload?.price_per_kit || getKitTierPrice(exists, exists.qty));
          if (updatedTierPrice > 0) {
            exists.ourPrice = updatedTierPrice;
            exists.selling_price_inr = updatedTierPrice;
            const gstR = Number(exists.gstRate || effectiveGstRate);
            exists.price_before_tax_inr = Math.round(updatedTierPrice / (1 + (gstR / 100)));
            exists.taxes_and_charges_inr = Math.max(0, updatedTierPrice - exists.price_before_tax_inr);
            exists.gstIncluded = exists.taxes_and_charges_inr;
          }
        } else {
          if (isBulkOrderQty || (requestedQty <= liveAvailable && liveAvailable > 0)) {
            state.cart.push(cartItem);
            // Record the district when first item was added
            if (state.cart.length === 1) {
              state.cartDistrictId = districtId;
            }
          }
        }

        state.alert = {
          status: "success",
          message: isTrialKit
            ? `${requestedQty} Trial Kits for ${kit.kitName} added to cart (PIN ${deliveryPincode || 'Specified'}).`
            : `${kit.kitName} (${currentVariant.productTier}) added to cart.`,
          undoItem: null,
        };
      }
    },

    removeFromCart: (state, action) => {
      const cartItemId = action.payload;
      const item = state.cart.find((c) => c.cartItemId === cartItemId);

      if (item) {
        state.cart = state.cart.filter((c) => c.cartItemId !== cartItemId);
        if (state.cart.length === 0) {
          state.cartDistrictId = null;
        }
        state.alert = {
          status: "warning",
          message: `${item.kitName} (${item.productTier}) removed from cart.`,
          undoItem: { ...item, source: "cart" },
        };
      }
    },

    increaseQty: (state, action) => {
      const cartItemId = action.payload;
      const product = state.cart.find((c) => c.cartItemId === cartItemId);
      if (product) {
        const liveAvailable = state.liveStock[product.id] !== undefined
          ? state.liveStock[product.id]
          : (product.availableStock ?? 999);
        const orderQtys = product.orderQuantities || product.order_quantities || [];
        if (Array.isArray(orderQtys) && orderQtys.length > 0) {
          const nextQty = orderQtys.find(q => q > product.qty);
          if (nextQty && nextQty <= liveAvailable) {
            product.qty = nextQty;
          }
        } else {
          const currentCartQtySum = state.cart
            .filter(item => item.id === product.id)
            .reduce((sum, item) => sum + item.qty, 0);
          if (currentCartQtySum < liveAvailable) {
            product.qty += 1;
          }
        }

        // Update tier price for the new quantity
        const updatedTierPrice = getKitTierPrice(product, product.qty);
        if (updatedTierPrice > 0) {
          product.ourPrice = updatedTierPrice;
          product.selling_price_inr = updatedTierPrice;
          const gstR = Number(product.gstRate || 13.8);
          product.price_before_tax_inr = Math.round(updatedTierPrice / (1 + (gstR / 100)));
          product.taxes_and_charges_inr = Math.max(0, updatedTierPrice - product.price_before_tax_inr);
          product.gstIncluded = product.taxes_and_charges_inr;
        }
      }
    },

    decreaseQty: (state, action) => {
      const cartItemId = action.payload;
      const product = state.cart.find((c) => c.cartItemId === cartItemId);
      if (product) {
        const orderQtys = product.orderQuantities || product.order_quantities || [];
        if (Array.isArray(orderQtys) && orderQtys.length > 0) {
          const prevQty = [...orderQtys].reverse().find(q => q < product.qty);
          if (prevQty) {
            product.qty = prevQty;
          }
        } else {
          if (product.qty > 1) product.qty -= 1;
        }

        // Update tier price for the new quantity
        const updatedTierPrice = getKitTierPrice(product, product.qty);
        if (updatedTierPrice > 0) {
          product.ourPrice = updatedTierPrice;
          product.selling_price_inr = updatedTierPrice;
          const gstR = Number(product.gstRate || 13.8);
          product.price_before_tax_inr = Math.round(updatedTierPrice / (1 + (gstR / 100)));
          product.taxes_and_charges_inr = Math.max(0, updatedTierPrice - product.price_before_tax_inr);
          product.gstIncluded = product.taxes_and_charges_inr;
        }
      }
    },

    // ── Bulk Cart (local-only, disconnected from live inventory) ─────────────
    addToBulkCart: (state, action) => {
      const payload = action.payload;
      let kit;
      let variantIndex = 0;
      let requestedQty = 1;
      let replaceQty = false;

      if (typeof payload === 'number' || typeof payload === 'string') {
        kit = state.bulkKits.find((i) => i.id === Number(payload));
        variantIndex = 0;
      } else {
        kit = state.bulkKits.find((i) => i.id === payload.id);
        variantIndex = payload.variantIndex || 0;
        requestedQty = (typeof payload.qty === 'number' && payload.qty > 0) ? payload.qty : 1;
        replaceQty = payload.replace === true;
      }
      if (kit) {
        const currentVariant = kit.variants?.[variantIndex];
        if (!currentVariant) return;
        const cartItemId = generateCartItemId(kit.id, variantIndex);
        const exists = state.bulkCart.find((c) => c.cartItemId === cartItemId);
        const bulkCartItem = {
          ...kit, ...currentVariant, id: kit.id, cartItemId, variantIndex, qty: requestedQty,
          productTier: currentVariant.productTier, tierBenefits: currentVariant.tierBenefits,
          marketPrice: currentVariant.marketPrice, ourPrice: currentVariant.ourPrice,
          includedDeliveryCharge: currentVariant.includedDeliveryCharge,
          inStock: currentVariant.inStock, availableStock: currentVariant.availableStock,
          bulkPack: kit.bulkPack,
        };
        if (exists) {
          if (replaceQty) {
            // Directly set the qty (used when switching between order quantity tiers)
            exists.qty = requestedQty;
          } else {
            let maxAllowedPacks = 10;
            if (exists.bulkPack?.tiers?.length > 0) {
              maxAllowedPacks = Math.max(...exists.bulkPack.tiers.map(t => t.quantity));
            }
            if (exists.qty < maxAllowedPacks) exists.qty += 1;
          }
        } else {
          state.bulkCart.push(bulkCartItem);
        }
        state.alert = { status: "success", message: `${kit.kitName} (${currentVariant.productTier}) added to bulk cart.`, undoItem: null };
      }
    },

    removeFromBulkCart: (state, action) => {
      const cartItemId = action.payload;
      const item = state.bulkCart.find((c) => c.cartItemId === cartItemId);
      if (item) {
        state.bulkCart = state.bulkCart.filter((c) => c.cartItemId !== cartItemId);
        state.alert = { status: "warning", message: `${item.kitName} (${item.productTier}) removed from bulk cart.`, undoItem: { ...item, source: "bulkCart" } };
      }
    },

    increaseBulkQty: (state, action) => {
      const cartItemId = action.payload;
      const product = state.bulkCart.find((c) => c.cartItemId === cartItemId);
      if (product) {
        let maxAllowedPacks = 10;
        if (product.bulkPack?.tiers?.length > 0) {
          maxAllowedPacks = Math.max(...product.bulkPack.tiers.map(t => t.quantity));
        }
        if (product.qty < maxAllowedPacks) product.qty += 1;
      }
    },

    decreaseBulkQty: (state, action) => {
      const cartItemId = action.payload;
      const product = state.bulkCart.find((c) => c.cartItemId === cartItemId);
      if (product && product.qty > 1) product.qty -= 1;
    },

    updateBulkCartVariant: (state, action) => {
      const { oldCartItemId, newVariantIndex } = action.payload;
      const oldItem = state.bulkCart.find(c => c.cartItemId === oldCartItemId);
      if (oldItem) {
        const kit = state.bulkKits.find(k => k.id === oldItem.id);
        if (kit && kit.variants?.[newVariantIndex]) {
          const newVariant = kit.variants[newVariantIndex];
          const newCartItemId = generateCartItemId(oldItem.id, newVariantIndex);
          const existingItem = state.bulkCart.find(c => c.cartItemId === newCartItemId);
          if (existingItem) {
            existingItem.qty += oldItem.qty;
            state.bulkCart = state.bulkCart.filter(c => c.cartItemId !== oldCartItemId);
          } else {
            oldItem.cartItemId = newCartItemId;
            oldItem.variantIndex = newVariantIndex;
            oldItem.productTier = newVariant.productTier;
            oldItem.tierBenefits = newVariant.tierBenefits;
            oldItem.marketPrice = newVariant.marketPrice;
            oldItem.ourPrice = newVariant.ourPrice;
            oldItem.includedDeliveryCharge = newVariant.includedDeliveryCharge;
            oldItem.inStock = newVariant.inStock;
          }
        }
      }
    },

    clearBulkCart: (state) => { state.bulkCart = []; },

    // ── Shared Actions ──────────────────────────────────────────
    undoRemove: (state) => {
      if (state.alert.undoItem) {
        const { source, ...item } = state.alert.undoItem;
        if (source === "cart") {
          const exists = state.cart.find(c => c.cartItemId === item.cartItemId);
          if (!exists) state.cart.push(item);
        } else if (source === "bulkCart") {
          const exists = state.bulkCart.find(c => c.cartItemId === item.cartItemId);
          if (!exists) state.bulkCart.push(item);
        }
        state.alert = {
          status: "success",
          message: `${item.kitName} (${item.productTier}) restored.`,
          undoItem: null,
        };
      }
    },

    clearAlert: (state) => {
      state.alert = { status: "", message: "", undoItem: null };
    },

    updateCartVariant: (state, action) => {
      const { oldCartItemId, newVariantIndex } = action.payload;
      const oldItem = state.cart.find(c => c.cartItemId === oldCartItemId);

      if (oldItem) {
        const kit = state.availableKits.find(k => k.id === oldItem.id);
        if (kit && kit.variants?.[newVariantIndex]) {
          const newVariant = kit.variants[newVariantIndex];
          const newCartItemId = generateCartItemId(oldItem.id, newVariantIndex, oldItem.districtId);

          const existingItem = state.cart.find(c => c.cartItemId === newCartItemId);

          if (existingItem) {
            existingItem.qty += oldItem.qty;
            state.cart = state.cart.filter(c => c.cartItemId !== oldCartItemId);
          } else {
            oldItem.cartItemId = newCartItemId;
            oldItem.variantIndex = newVariantIndex;
            oldItem.productTier = newVariant.productTier;
            oldItem.tierBenefits = newVariant.tierBenefits;
            oldItem.marketPrice = newVariant.marketPrice;
            oldItem.ourPrice = newVariant.ourPrice;
            oldItem.includedDeliveryCharge = newVariant.includedDeliveryCharge;
            oldItem.inStock = newVariant.inStock;
          }
        }
      }
    },

    addCustomKitToCart: (state, action) => {
      const customKit = action.payload;
      state.cart.push(customKit);
      state.alert = {
        status: "success",
        message: `${customKit.kitName} added to cart.`,
        undoItem: null,
      };
    },

    clearCart: (state) => {
      state.cart = [];
      state.cartDistrictId = null;
      state.cartExpiryTime = null;
    },

    setShowAuthDialog: (state, action) => {
      state.showAuthDialog = action.payload;
    },

    // ── Location management ──────────────────────────────────────
    setPendingLocationChange: (state, action) => {
      state.pendingLocationChange = action.payload; // { selectedState, selectedDistrict }
    },

    clearPendingLocationChange: (state) => {
      state.pendingLocationChange = null;
    },

    commitLocationChange: (state, action) => {
      const { clearCartOnChange } = action.payload;
      if (state.pendingLocationChange) {
        const { selectedState, selectedDistrict } = state.pendingLocationChange;
        state.selectedState = selectedState;
        state.selectedDistrict = selectedDistrict;
        if (selectedState) {
          localStorage.setItem("selectedState", JSON.stringify(selectedState));
        } else {
          localStorage.removeItem("selectedState");
        }
        if (selectedDistrict) {
          localStorage.setItem("selectedDistrict", JSON.stringify(selectedDistrict));
        } else {
          localStorage.removeItem("selectedDistrict");
        }
        state.pendingLocationChange = null;
        if (clearCartOnChange) {
          state.cart = [];
          state.cartDistrictId = null;
        }
        state.liveStock = {};
      }
    },

    setSelectedLocation: (state, action) => {
      const { selectedState, selectedDistrict, selectedPincode } = action.payload;
      state.selectedState = selectedState;
      state.selectedDistrict = selectedDistrict;
      if (selectedPincode !== undefined) {
        state.selectedPincode = selectedPincode;
        if (selectedPincode) {
          localStorage.setItem("selectedPincode", selectedPincode);
        } else {
          localStorage.removeItem("selectedPincode");
        }
      }
      if (selectedState) {
        localStorage.setItem("selectedState", JSON.stringify(selectedState));
      } else {
        localStorage.removeItem("selectedState");
      }
      if (selectedDistrict) {
        localStorage.setItem("selectedDistrict", JSON.stringify(selectedDistrict));
      } else {
        localStorage.removeItem("selectedDistrict");
      }
    },

    setAlert: (state, action) => {
      state.alert = action.payload;
    },

    setLiveStock: (state, action) => {
      state.liveStock = action.payload || {};
      
      const kitsInCart = [...new Set(state.cart.map(item => item.id))];
      kitsInCart.forEach(kitId => {
        const liveAvailable = state.liveStock[kitId];
        if (liveAvailable !== undefined) {
          const items = state.cart.filter(item => item.id === kitId);
          items.forEach(item => {
            item.availableStock = liveAvailable;
            item.inStock = liveAvailable > 0;
          });
          
          let totalQty = items.reduce((sum, item) => sum + item.qty, 0);
          if (totalQty > liveAvailable) {
            let excess = totalQty - liveAvailable;
            for (let i = items.length - 1; i >= 0; i--) {
              if (excess <= 0) break;
              const item = items[i];
              if (item.qty > excess) {
                item.qty -= excess;
                excess = 0;
              } else {
                excess -= item.qty;
                item.qty = 0;
              }
            }
            state.cart = state.cart.filter(item => item.qty > 0);
            if (state.cart.length === 0) {
              state.cartDistrictId = null;
            }
          }
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAvailableKitData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getAvailableKitData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.availableKits = action.payload;
        if (action.payload && Array.isArray(action.payload)) {
          action.payload.forEach(kit => {
            if (kit.limitedStock?.quantityLeft !== undefined) {
              state.liveStock[kit.id] = kit.limitedStock.quantityLeft;
            }
          });
        }
      })
      .addCase(getAvailableKitData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchShopHierarchy.fulfilled, (state, action) => {
        state.shopHierarchy = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        const backendCart = action.payload.cart || [];
        const backendExpiry = action.payload.expiry_time || null;

        if (backendCart.length > 0) {
          // If backend returns items, merge them with local cart (preserving locally added items)
          const localIds = new Set(state.cart.map(c => c.cartItemId));
          backendCart.forEach(backendItem => {
            if (!localIds.has(backendItem.cartItemId)) {
              state.cart.push(backendItem);
            }
          });
        } else if (state.cart.length === 0) {
          // Only clear cart if local cart was already empty
          state.cart = [];
        }
        // If state.cart has items locally and backend returned [], keep local items!

        state.cartExpiryTime = backendExpiry;
        if (!state.cart.length) state.cartExpiryTime = null;
      })
      .addCase(syncCartWithBackend.fulfilled, (state, action) => {
        // Record when we last successfully saved — used by fetchCart merge
        state.lastSyncedAt = Date.now();
        if (action.payload?.expiry_time !== undefined) {
          state.cartExpiryTime = action.payload.expiry_time || null;
        }
        if (!state.cart.length) state.cartExpiryTime = null;
      })
      .addCase(getBulkKitBuyData.fulfilled, (state, action) => {
        state.bulkKits = action.payload || [];
      })
      .addCase(fetchLiveInventory.fulfilled, (state, action) => {
        state.liveStock = action.payload || {};
        
        const kitsInCart = [...new Set(state.cart.map(item => item.id))];
        kitsInCart.forEach(kitId => {
          const liveAvailable = state.liveStock[kitId];
          if (liveAvailable !== undefined) {
            const items = state.cart.filter(item => item.id === kitId);
            items.forEach(item => {
              item.availableStock = liveAvailable;
              item.inStock = liveAvailable > 0;
            });
            
            let totalQty = items.reduce((sum, item) => sum + item.qty, 0);
            if (totalQty > liveAvailable) {
              let excess = totalQty - liveAvailable;
              for (let i = items.length - 1; i >= 0; i--) {
                if (excess <= 0) break;
                const item = items[i];
                if (item.qty > excess) {
                  item.qty -= excess;
                  excess = 0;
                } else {
                  excess -= item.qty;
                  item.qty = 0;
                }
              }
              state.cart = state.cart.filter(item => item.qty > 0);
              if (state.cart.length === 0) {
                state.cartDistrictId = null;
              }
            }
          }
        });
      });
  },
});

// ─────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────
export const selectCartItems = (state) => state.slice.cart;
export const selectCartTotal = (state) => {
  return state.slice.cart.reduce((sum, item) => sum + (item.qty * item.ourPrice) + (Number(item.delivery_cost) || 0), 0);
};
export const selectCartDeliveryTotal = (state) => {
  return state.slice.cart.reduce((sum, item) => sum + (Number(item.delivery_cost) || 0), 0);
};
export const selectCartTotalItems = (state) => {
  return state.slice.cart.reduce((sum, item) => sum + item.qty, 0);
};
export const selectCartSavings = (state) => {
  return state.slice.cart.reduce((sum, item) => {
    return sum + (item.qty * (item.marketPrice - item.ourPrice));
  }, 0);
};
export const selectLiveStock = (state) => state.slice.liveStock;
export const selectCartExpiryTime = (state) => state.slice.cartExpiryTime;

export const {
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
  undoRemove,
  clearAlert,
  updateCartVariant,
  addToBulkCart,
  removeFromBulkCart,
  increaseBulkQty,
  decreaseBulkQty,
  updateBulkCartVariant,
  clearBulkCart,
  setSelectedLocation,
  setPendingLocationChange,
  clearPendingLocationChange,
  commitLocationChange,
  addCustomKitToCart,
  clearCart,
  setShowAuthDialog,
  setAlert,
  setLiveStock,
} = slice.actions;

export default slice.reducer;