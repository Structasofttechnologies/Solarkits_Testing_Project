/**
 * gstStateCodes.js
 *
 * Official Indian GST State Code mapping and validation utilities.
 * First 2 digits of GSTIN represent the State Code (01 to 38).
 */

const GST_STATE_CODE_MAP = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

// Aliases for matching state names
const STATE_NAME_ALIASES = {
  "jammu and kashmir": ["01"],
  "jammu & kashmir": ["01"],
  "himachal pradesh": ["02"],
  "punjab": ["03"],
  "chandigarh": ["04"],
  "uttarakhand": ["05"],
  "uttaranchal": ["05"],
  "haryana": ["06"],
  "delhi": ["07"],
  "nct of delhi": ["07"],
  "rajasthan": ["08"],
  "uttar pradesh": ["09"],
  "up": ["09"],
  "bihar": ["10"],
  "sikkim": ["11"],
  "arunachal pradesh": ["12"],
  "nagaland": ["13"],
  "manipur": ["14"],
  "mizoram": ["15"],
  "tripura": ["16"],
  "meghalaya": ["17"],
  "assam": ["18"],
  "west bengal": ["19"],
  "bengal": ["19"],
  "jharkhand": ["20"],
  "odisha": ["21"],
  "orissa": ["21"],
  "chhattisgarh": ["22"],
  "chhatisgarh": ["22"],
  "madhya pradesh": ["23"],
  "mp": ["23"],
  "gujarat": ["24"],
  "daman and diu": ["25", "26"],
  "daman & diu": ["25", "26"],
  "dadra and nagar haveli": ["26"],
  "dadra & nagar haveli": ["26"],
  "dadra and nagar haveli and daman and diu": ["26", "25"],
  "maharashtra": ["27"],
  "andhra pradesh": ["28", "37"],
  "andhra": ["28", "37"],
  "karnataka": ["29"],
  "goa": ["30"],
  "lakshadweep": ["31"],
  "kerala": ["32"],
  "tamil nadu": ["33"],
  "tamilnadu": ["33"],
  "puducherry": ["34"],
  "pondicherry": ["34"],
  "andaman and nicobar islands": ["35"],
  "andaman & nicobar": ["35"],
  "telangana": ["36"],
  "ladakh": ["38"],
};

/**
 * Normalizes a state string for lookup
 */
function normalizeStateName(stateName) {
  if (!stateName || typeof stateName !== "string") return "";
  return stateName
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Get valid GST 2-digit state codes for a given state name
 */
function getGstStateCodesForState(stateName) {
  const norm = normalizeStateName(stateName);
  if (!norm) return [];

  if (STATE_NAME_ALIASES[norm]) {
    return STATE_NAME_ALIASES[norm];
  }

  // Partial match fallback
  for (const [alias, codes] of Object.entries(STATE_NAME_ALIASES)) {
    if (norm.includes(alias) || alias.includes(norm)) {
      return codes;
    }
  }

  return [];
}

/**
 * Get State name from 2-digit GST code
 */
function getStateNameFromGstCode(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().padStart(2, "0");
  return GST_STATE_CODE_MAP[cleanCode] || null;
}

/**
 * Validates whether the first 2 digits of the GSTIN match the selected state.
 *
 * @param {string} stateName - E.g. "Gujarat"
 * @param {string} gstin - E.g. "24AAAFB1234A1Z5"
 * @returns {object} { isValid: boolean, gstPrefix: string, expectedCodes: string[], message: string }
 */
function validateGstStateMatch(stateName, gstin) {
  if (!stateName) {
    return {
      isValid: false,
      message: "Please select a state first.",
    };
  }

  const cleanGst = (gstin || "").trim().toUpperCase();
  if (cleanGst.length < 2) {
    return {
      isValid: false,
      message: "Please enter a valid GST number.",
    };
  }

  const gstPrefix = cleanGst.substring(0, 2);
  const expectedCodes = getGstStateCodesForState(stateName);
  const actualStateName = getStateNameFromGstCode(gstPrefix);

  if (expectedCodes.length === 0) {
    // If state is not in list, fallback to passing
    return {
      isValid: true,
      gstPrefix,
      expectedCodes: [],
      actualStateName,
      message: null,
    };
  }

  const matches = expectedCodes.includes(gstPrefix);

  if (!matches) {
    const expectedStr = expectedCodes.join(" or ");
    const actualStr = actualStateName ? ` (${actualStateName})` : "";
    return {
      isValid: false,
      gstPrefix,
      expectedCodes,
      actualStateName,
      message: `GSTIN code "${gstPrefix}"${actualStr} does not match selected state "${stateName}" (Expected code: ${expectedStr}).`,
    };
  }

  return {
    isValid: true,
    gstPrefix,
    expectedCodes,
    actualStateName: actualStateName || stateName,
    message: `State code "${gstPrefix}" matches ${stateName}.`,
  };
}

module.exports = {
  GST_STATE_CODE_MAP,
  STATE_NAME_ALIASES,
  getGstStateCodesForState,
  getStateNameFromGstCode,
  validateGstStateMatch,
};
