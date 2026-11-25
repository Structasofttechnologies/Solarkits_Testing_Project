/**
 * territoryData.js
 *
 * Configurable territory database and availability rules for Solarkits Franchise Network.
 * Supports: State -> District -> Pincode -> Availability Status Resolution.
 */

export const INDIAN_STATES_DISTRICTS = {
  "Maharashtra": [
    "Pune",
    "Mumbai City",
    "Mumbai Suburban",
    "Thane",
    "Nagpur",
    "Nashik",
    "Aurangabad (Chhatrapati Sambhaji Nagar)",
    "Kolhapur",
    "Solapur",
    "Satara",
    "Ahmednagar",
    "Amravati",
    "Jalgaon"
  ],
  "Gujarat": [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Gandhinagar",
    "Jamnagar",
    "Anand",
    "Mehsana",
    "Kutch",
    "Bharuch"
  ],
  "Rajasthan": [
    "Jaipur",
    "Jodhpur",
    "Udaipur",
    "Kota",
    "Bikaner",
    "Ajmer",
    "Alwar",
    "Bhilwara",
    "Sikar",
    "Pali"
  ],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur Nagar",
    "Varanasi",
    "Agra",
    "Prayagraj",
    "Noida (Gautam Buddha Nagar)",
    "Ghaziabad",
    "Meerut",
    "Bareilly",
    "Gorakhpur",
    "Aligarh"
  ],
  "Madhya Pradesh": [
    "Indore",
    "Bhopal",
    "Jabalpur",
    "Gwalior",
    "Ujjain",
    "Sagar",
    "Dewas",
    "Satna",
    "Ratlam"
  ],
  "Karnataka": [
    "Bengaluru Urban",
    "Bengaluru Rural",
    "Mysuru",
    "Hubballi-Dharwad",
    "Mangaluru (Dakshina Kannada)",
    "Belagavi",
    "Tumakuru",
    "Shivamogga",
    "Ballari"
  ],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tiruppur",
    "Erode",
    "Vellore",
    "Thoothukudi"
  ],
  "Telangana": [
    "Hyderabad",
    "Ranga Reddy",
    "Medchal-Malkajgiri",
    "Warangal",
    "Karimnagar",
    "Nizamabad",
    "Khammam"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada (NTR)",
    "Guntur",
    "Tirupati",
    "Nellore",
    "Kurnool",
    "Kakinada",
    "Rajahmundry"
  ],
  "Haryana": [
    "Gurugram",
    "Faridabad",
    "Panipat",
    "Ambala",
    "Karnal",
    "Hisar",
    "Rohtak",
    "Sonipat"
  ],
  "Punjab": [
    "Ludhiana",
    "Amritsar",
    "Jalandhar",
    "Patiala",
    "Bathinda",
    "Mohali (SAS Nagar)",
    "Hoshiarpur"
  ],
  "Kerala": [
    "Ernakulam (Kochi)",
    "Thiruvananthapuram",
    "Kozhikode",
    "Thrissur",
    "Kollam",
    "Kannur",
    "Palakkad",
    "Kottayam"
  ],
  "Bihar": [
    "Patna",
    "Gaya",
    "Bhagalpur",
    "Muzaffarpur",
    "Purnia",
    "Darbhanga",
    "Begusarai"
  ],
  "West Bengal": [
    "Kolkata",
    "North 24 Parganas",
    "South 24 Parganas",
    "Howrah",
    "Hooghly",
    "Paschim Medinipur",
    "Purba Bardhaman",
    "Siliguri (Darjeeling)"
  ],
  "Odisha": [
    "Bhubaneswar (Khurda)",
    "Cuttack",
    "Rourkela (Sundargarh)",
    "Berhampur (Ganjam)",
    "Sambalpur",
    "Balasore",
    "Puri"
  ]
};

// Known territory assignments status mapping
// Statuses: 'AVAILABLE' | 'LIMITED' | 'ALLOCATED'
export const TERRITORY_STATUS_MAP = {
  // Pune & West Maharashtra
  "411001": { status: "LIMITED", hub: "Western Regional Hub (Pune)", activeDealers: 4, quotaRemaining: 1 },
  "411045": { status: "AVAILABLE", hub: "Western Regional Hub (Pune)", activeDealers: 1, quotaRemaining: 3 },
  "411057": { status: "AVAILABLE", hub: "Western Regional Hub (Pune)", activeDealers: 0, quotaRemaining: 4 },
  "400001": { status: "ALLOCATED", hub: "Bhiwandi Central Hub", activeDealers: 6, quotaRemaining: 0 },
  "400050": { status: "LIMITED", hub: "Bhiwandi Central Hub", activeDealers: 3, quotaRemaining: 1 },
  "422001": { status: "AVAILABLE", hub: "Nashik Hub", activeDealers: 1, quotaRemaining: 3 },
  
  // Gujarat
  "380001": { status: "ALLOCATED", hub: "Ahmedabad North Hub", activeDealers: 5, quotaRemaining: 0 },
  "380015": { status: "LIMITED", hub: "Ahmedabad West Hub", activeDealers: 3, quotaRemaining: 1 },
  "395001": { status: "AVAILABLE", hub: "Surat Regional Hub", activeDealers: 2, quotaRemaining: 3 },
  "390001": { status: "AVAILABLE", hub: "Vadodara Hub", activeDealers: 1, quotaRemaining: 4 },
  
  // Rajasthan
  "302001": { status: "LIMITED", hub: "Jaipur Central Hub", activeDealers: 3, quotaRemaining: 1 },
  "302020": { status: "AVAILABLE", hub: "Jaipur South Hub", activeDealers: 1, quotaRemaining: 3 },
  "342001": { status: "AVAILABLE", hub: "Jodhpur Desert Hub", activeDealers: 1, quotaRemaining: 4 },
  
  // NCR & UP
  "110001": { status: "ALLOCATED", hub: "Delhi NCR Mega Hub", activeDealers: 8, quotaRemaining: 0 },
  "201301": { status: "LIMITED", hub: "Noida Regional Hub", activeDealers: 3, quotaRemaining: 1 },
  "226001": { status: "AVAILABLE", hub: "Lucknow Central Hub", activeDealers: 2, quotaRemaining: 3 },
  "208001": { status: "AVAILABLE", hub: "Kanpur Hub", activeDealers: 1, quotaRemaining: 4 },
  
  // South India
  "560001": { status: "ALLOCATED", hub: "Bengaluru South Hub", activeDealers: 6, quotaRemaining: 0 },
  "560066": { status: "LIMITED", hub: "Bengaluru East Hub", activeDealers: 3, quotaRemaining: 1 },
  "500001": { status: "LIMITED", hub: "Hyderabad Central Hub", activeDealers: 4, quotaRemaining: 1 },
  "600001": { status: "ALLOCATED", hub: "Chennai Port Hub", activeDealers: 5, quotaRemaining: 0 },
  "641001": { status: "AVAILABLE", hub: "Coimbatore Industrial Hub", activeDealers: 1, quotaRemaining: 4 }
};

/**
 * Resolves territory status based on State, District, and Pincode
 */
export function checkTerritoryAvailability(state, district, pincode) {
  const cleanPin = pincode ? pincode.trim() : "";
  
  if (cleanPin && TERRITORY_STATUS_MAP[cleanPin]) {
    return {
      pincode: cleanPin,
      state: state || "Detected State",
      district: district || "Detected District",
      ...TERRITORY_STATUS_MAP[cleanPin]
    };
  }

  // Fallback hash logic for dynamic Indian pincodes so every valid pincode gets a realistic status
  let hash = 0;
  const inputStr = `${state || ""}_${district || ""}_${cleanPin}`;
  for (let i = 0; i < inputStr.length; i++) {
    hash = (hash << 5) - hash + inputStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  if (absHash % 7 === 0) {
    return {
      pincode: cleanPin || "District Standard",
      state: state || "Selected State",
      district: district || "Selected District",
      status: "ALLOCATED",
      hub: `${district || state} Regional Warehouse Hub`,
      activeDealers: 4,
      quotaRemaining: 0,
      notes: "This territory is currently assigned to authorized partners."
    };
  } else if (absHash % 3 === 0) {
    return {
      pincode: cleanPin || "District Standard",
      state: state || "Selected State",
      district: district || "Selected District",
      status: "LIMITED",
      hub: `${district || state} Regional Hub`,
      activeDealers: 2,
      quotaRemaining: 1,
      notes: "This territory has limited availability or is currently being evaluated."
    };
  } else {
    return {
      pincode: cleanPin || "District Standard",
      state: state || "Selected State",
      district: district || "Selected District",
      status: "AVAILABLE",
      hub: `${district || state} Primary Hub`,
      activeDealers: 0,
      quotaRemaining: 3,
      notes: "Franchise opportunity is available in your area with exclusive territory rights."
    };
  }
}
