export const MAP_COLOR_PALETTES = [
  {
    id: 'vivid_states',
    name: 'Vivid Distinct States',
    colors: [
      '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1',
      '#14B8A6', '#EA580C', '#2563EB', '#84CC16', '#E11D48', '#06B6D4',
      '#7C3AED', '#D97706', '#059669', '#DB2777', '#4F46E5', '#0D9488'
    ]
  },
  {
    id: 'solar_earth',
    name: 'Solar & Earth Tones',
    colors: [
      '#D97706', '#0F766E', '#1D4ED8', '#B45309', '#047857', '#7C2D12',
      '#0369A1', '#A16207', '#15803D', '#BE123C', '#4338CA', '#0E7490',
      '#C2410C', '#065F46', '#1E40AF', '#9A3412', '#166534', '#9F1239'
    ]
  },
  {
    id: 'pastel_atlas',
    name: 'Executive Pastel Atlas',
    colors: [
      '#38BDF8', '#A78BFA', '#34D399', '#FBBF24', '#F472B6', '#818CF8',
      '#2DD4BF', '#FB923C', '#60A5FA', '#A3E635', '#FB7185', '#22D3EE',
      '#C084FC', '#FACC15', '#4ADE80', '#E879F9', '#93C5FD', '#5EEAD4'
    ]
  },
  {
    id: 'ocean_teal',
    name: 'Ocean & Indigo Spectrum',
    colors: [
      '#0284C7', '#0D9488', '#4F46E5', '#0369A1', '#059669', '#1E3A8A',
      '#0891B2', '#14B8A6', '#4338CA', '#2563EB', '#0F766E', '#6366F1',
      '#06B6D4', '#10B981', '#1D4ED8', '#0E7490', '#047857', '#3730A3'
    ]
  }
];

const STORAGE_PALETTE_KEY = 'solarkits_map_palette_id';
const STORAGE_CUSTOM_STATES_KEY = 'solarkits_map_custom_state_colors';

export const normalizeGeoKey = (val) =>
  String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\b(district|dist|state|region|cluster|division|india)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

export function loadSavedPaletteId() {
  try {
    const saved = localStorage.getItem(STORAGE_PALETTE_KEY);
    if (saved && MAP_COLOR_PALETTES.some((p) => p.id === saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 'vivid_states';
}

export function savePaletteId(id) {
  try {
    localStorage.setItem(STORAGE_PALETTE_KEY, id);
  } catch {
    // ignore
  }
}

export function loadSavedCustomStateColors() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_STATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveCustomStateColors(mapObj) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_STATES_KEY, JSON.stringify(mapObj || {}));
  } catch {
    // ignore
  }
}

/**
 * Deterministic distinct state color assignment:
 * - Each state gets a distinct color (consistent across every cluster & district in that state).
 * - User overrides in `customStateColors` take top priority.
 */
export function buildStateColorMap(stateNames = [], paletteId = 'vivid_states', customStateColors = {}) {
  const palette = MAP_COLOR_PALETTES.find((p) => p.id === paletteId) || MAP_COLOR_PALETTES[0];
  const uniqueSorted = Array.from(
    new Set((stateNames || []).map((s) => String(s || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const map = new Map();
  uniqueSorted.forEach((stName, idx) => {
    const norm = normalizeGeoKey(stName);
    const custom = customStateColors[stName] || customStateColors[norm];
    const assigned = custom || palette.colors[idx % palette.colors.length];
    map.set(norm, assigned);
    map.set(stName.toLowerCase(), assigned);
  });
  return map;
}

export function getStateFallbackColor(stateName, paletteId = 'vivid_states', customStateColors = {}) {
  const norm = normalizeGeoKey(stateName);
  if (!norm) return '#CBD5E1';
  const custom = customStateColors[stateName] || customStateColors[norm];
  if (custom) return custom;
  const palette = MAP_COLOR_PALETTES.find((p) => p.id === paletteId) || MAP_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < norm.length; i += 1) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  return palette.colors[hash % palette.colors.length];
}
