/**
 * ============================================================
 *  INDIAN MANUFACTURING BRANDS SEEDER
 *  Seeds top Indian Solar, Renewable, EV & Manufacturing Brands
 * ============================================================
 *  Run: node src/seeders/manufacturing_brands.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Connect single database
require('../keys/config/databases');
const { Brand } = require('../modules/admin-panel/models/core_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// ─── Top Indian Manufacturing Brands Dataset ─────────────────
const INDIAN_BRANDS = [
  {
    brand_name: "Tata Power Solar",
    company_name: "Tata Power Solar Systems Limited",
    states: ["Maharashtra", "Karnataka", "Gujarat"],
    districts: ["Mumbai", "Bengaluru Urban", "Ahmedabad"]
  },
  {
    brand_name: "Waaree Energies",
    company_name: "Waaree Energies Limited",
    states: ["Gujarat", "Maharashtra"],
    districts: ["Surat", "Valsad", "Mumbai"]
  },
  {
    brand_name: "Adani Solar",
    company_name: "Mundra Solar PV Limited",
    states: ["Gujarat"],
    districts: ["Kutch", "Kachchh", "Ahmedabad"]
  },
  {
    brand_name: "Vikram Solar",
    company_name: "Vikram Solar Limited",
    states: ["West Bengal", "Tamil Nadu"],
    districts: ["Kolkata", "Kanchipuram"]
  },
  {
    brand_name: "Goldi Solar",
    company_name: "Goldi Solar Private Limited",
    states: ["Gujarat"],
    districts: ["Surat", "Navsari"]
  },
  {
    brand_name: "Premier Energies",
    company_name: "Premier Energies Limited",
    states: ["Telangana"],
    districts: ["Hyderabad"]
  },
  {
    brand_name: "RenewSys India",
    company_name: "RenewSys India Private Limited",
    states: ["Maharashtra", "Karnataka", "Telangana"],
    districts: ["Mumbai", "Bengaluru Urban", "Hyderabad"]
  },
  {
    brand_name: "Servotech Power Systems",
    company_name: "Servotech Power Systems Limited",
    states: ["Delhi", "Uttar Pradesh"],
    districts: ["New Delhi", "Gautam Buddha Nagar"]
  },
  {
    brand_name: "Havells Solar",
    company_name: "Havells India Limited",
    states: ["Uttar Pradesh", "Delhi", "Rajasthan"],
    districts: ["Gautam Buddha Nagar", "New Delhi", "Alwar"]
  },
  {
    brand_name: "Loom Solar",
    company_name: "Loom Solar Private Limited",
    states: ["Haryana"],
    districts: ["Faridabad", "Gurugram"]
  },
  {
    brand_name: "Microtek",
    company_name: "Microtek International Private Limited",
    states: ["Delhi", "Himachal Pradesh"],
    districts: ["New Delhi", "Solan"]
  },
  {
    brand_name: "Luminous Power Technologies",
    company_name: "Luminous Power Technologies Private Limited",
    states: ["Haryana", "Himachal Pradesh"],
    districts: ["Gurugram", "Solan"]
  },
  {
    brand_name: "Exide Solar",
    company_name: "Exide Industries Limited",
    states: ["West Bengal", "Maharashtra", "Tamil Nadu"],
    districts: ["Kolkata", "Pune", "Chennai"]
  },
  {
    brand_name: "Su-Kam Power Systems",
    company_name: "Su-Kam Power Systems Limited",
    states: ["Haryana", "Himachal Pradesh"],
    districts: ["Gurugram", "Solan"]
  },
  {
    brand_name: "Polycab Solar",
    company_name: "Polycab India Limited",
    states: ["Maharashtra", "Gujarat"],
    districts: ["Mumbai", "Panchmahal", "Panch Mahals"]
  },
  {
    brand_name: "V-Guard Solar",
    company_name: "V-Guard Industries Limited",
    states: ["Kerala", "Tamil Nadu"],
    districts: ["Ernakulam", "Coimbatore"]
  },
  {
    brand_name: "Rayzon Solar",
    company_name: "Rayzon Solar Private Limited",
    states: ["Gujarat"],
    districts: ["Surat"]
  },
  {
    brand_name: "Emmvee Solar",
    company_name: "Emmvee Solar Systems Private Limited",
    states: ["Karnataka"],
    districts: ["Bengaluru Urban"]
  },
  {
    brand_name: "Gautam Solar",
    company_name: "Gautam Solar Private Limited",
    states: ["Delhi", "Uttarakhand"],
    districts: ["New Delhi", "Haridwar"]
  },
  {
    brand_name: "Jakson Solar",
    company_name: "Jakson Engineers Limited",
    states: ["Uttar Pradesh", "Delhi"],
    districts: ["Gautam Buddha Nagar", "New Delhi"]
  },
  {
    brand_name: "Inox Wind",
    company_name: "Inox Wind Limited",
    states: ["Uttar Pradesh", "Gujarat", "Haryana"],
    districts: ["Gautam Buddha Nagar", "Ahmedabad", "Panchkula"]
  },
  {
    brand_name: "Suzlon Energy",
    company_name: "Suzlon Energy Limited",
    states: ["Maharashtra", "Gujarat"],
    districts: ["Pune", "Rajkot"]
  },
  {
    brand_name: "Anchor Solar",
    company_name: "Panasonic Life Solutions India Private Limited",
    states: ["Maharashtra", "Gujarat"],
    districts: ["Thane", "Kheda"]
  },
  {
    brand_name: "Solex Energy",
    company_name: "Solex Energy Limited",
    states: ["Gujarat"],
    districts: ["Surat", "Anand"]
  },
  {
    brand_name: "Insolation Energy (INA Solar)",
    company_name: "Insolation Energy Limited",
    states: ["Rajasthan"],
    districts: ["Jaipur"]
  },
  {
    brand_name: "Kirloskar Solar",
    company_name: "Kirloskar Solar Technologies Private Limited",
    states: ["Maharashtra"],
    districts: ["Pune"]
  },
  {
    brand_name: "Pixel Solar",
    company_name: "Pixel Solar Energy Private Limited",
    states: ["Gujarat"],
    districts: ["Surat"]
  },
  {
    brand_name: "Satvik Solar",
    company_name: "Satvik Green Energy Private Limited",
    states: ["Haryana"],
    districts: ["Ambala"]
  },
  {
    brand_name: "Mahindra Susten",
    company_name: "Mahindra Susten Private Limited",
    states: ["Maharashtra"],
    districts: ["Mumbai"]
  },
  {
    brand_name: "Usha Solar",
    company_name: "Usha Shriram Enterprises Private Limited",
    states: ["Delhi"],
    districts: ["New Delhi"]
  },
  {
    brand_name: "Tata Motors",
    company_name: "Tata Motors Limited",
    states: ["Maharashtra", "Gujarat"],
    districts: ["Mumbai", "Pune", "Ahmedabad"]
  },
  {
    brand_name: "Mahindra Electric",
    company_name: "Mahindra & Mahindra Limited",
    states: ["Maharashtra", "Tamil Nadu"],
    districts: ["Mumbai", "Pune", "Chennai"]
  }
];

const PALETTES = [
  ['#0f172a', '#2563eb', '#38bdf8'],
  ['#18181b', '#0284c7', '#38bdf8'],
  ['#1e1b4b', '#4f46e5', '#818cf8'],
  ['#064e3b', '#059669', '#34d399'],
  ['#451a03', '#d97706', '#fbbf24'],
  ['#701a75', '#c026d3', '#e879f9'],
  ['#0f766e', '#0d9488', '#2dd4bf'],
];

// Generate modern SVG badge data URI
function generateLogoBadgeSvg(brandName) {
  const words = brandName.split(' ');
  const initials = words.map(n => n[0]).join('').substring(0, 3).toUpperCase();

  let hash = 0;
  for (let i = 0; i < brandName.length; i++) hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  const palette = PALETTES[Math.abs(hash) % PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette[0]}" />
        <stop offset="100%" stop-color="${palette[1]}" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette[2]}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${palette[1]}" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" rx="48" fill="url(#bgGrad)"/>
    <circle cx="200" cy="200" r="140" fill="url(#glowGrad)"/>
    <path d="M 140 100 L 260 100 L 220 200 L 270 200 L 140 300 L 170 220 L 120 220 Z" fill="${palette[2]}" opacity="0.18"/>
    <text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="'Outfit', 'Inter', system-ui, sans-serif" font-size="96" font-weight="900" letter-spacing="2">${initials}</text>
    <text x="50%" y="76%" dominant-baseline="middle" text-anchor="middle" fill="${palette[2]}" font-family="'Inter', system-ui, sans-serif" font-size="22" font-weight="700" letter-spacing="3">${brandName.substring(0, 18).toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Upload SVG badge to Cloudinary or return SVG data URI directly
async function processLogo(brandName) {
  const svgBadge = generateLogoBadgeSvg(brandName);
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await cloudinary.uploader.upload(svgBadge, {
        folder: 'solarkits/solarkits-admin-panel-backend/public/uploads/brands',
        public_id: `brand_${brandName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      });
      if (result && result.secure_url) {
        return result.secure_url;
      }
    } catch (e) {
      console.log(` ℹ️  Cloudinary direct badge fallback for ${brandName}: ${e.message}`);
    }
  }
  return svgBadge;
}

// ─── Main Seeder Function ──────────────────────────────────────
async function seedManufacturingBrands() {
  try {
    console.log("🚀 Initializing Indian Manufacturing Brands Seeder...\n");

    // Wait for connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => mongoose.connection.once('open', resolve));
    }

    // 1. Get Country India
    const country = await GeoLevel0.findOne({ iso2: 'IN' });
    if (!country) {
      console.error("❌ Country 'India' not found in database! Please run location seeder first.");
      process.exit(1);
    }
    console.log(`📌 Found Country: ${country.name} (ID: ${country._id})`);

    // 2. Load all States and Districts for India
    const states = await GeoLevel1.find({ level_0: country._id });
    const stateMap = new Map();
    states.forEach(s => {
      stateMap.set(s.name.toLowerCase().trim(), s._id);
    });

    const stateIds = states.map(s => s._id);
    const districts = await GeoLevel2.find({ level_1: { $in: stateIds } });
    const districtMap = new Map();
    const districtNameOnlyMap = new Map();

    districts.forEach(d => {
      districtMap.set(`${d.level_1.toString()}_${d.name.toLowerCase().trim()}`, d._id);
      districtNameOnlyMap.set(d.name.toLowerCase().trim(), d._id);
    });

    console.log(` Total States loaded: ${states.length}`);
    console.log(` Total Districts loaded: ${districts.length}\n`);

    let addedCount = 0;
    let updatedCount = 0;

    for (const bData of INDIAN_BRANDS) {
      // Find matching state IDs
      const state_ids = (bData.states || [])
        .map(sName => stateMap.get(sName.toLowerCase().trim()))
        .filter(Boolean);

      // Find matching district IDs
      const district_ids = [];
      for (const dName of (bData.districts || [])) {
        const cleanName = dName.toLowerCase().trim();
        let foundId = null;
        for (const sId of state_ids) {
          if (districtMap.has(`${sId.toString()}_${cleanName}`)) {
            foundId = districtMap.get(`${sId.toString()}_${cleanName}`);
            break;
          }
        }
        if (!foundId && districtNameOnlyMap.has(cleanName)) {
          foundId = districtNameOnlyMap.get(cleanName);
        }
        if (foundId) {
          district_ids.push(foundId);
        }
      }

      // Process Logo
      const logoPath = await processLogo(bData.brand_name);

      const brandDocData = {
        brand_name: bData.brand_name.trim(),
        company_name: bData.company_name.trim(),
        logo: logoPath,
        country_ids: [country._id],
        state_ids,
        district_ids,
        deleted_at: null
      };

      const existingBrand = await Brand.findOne({
        brand_name: { $regex: new RegExp(`^${bData.brand_name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
      });

      if (existingBrand) {
        await Brand.updateOne({ _id: existingBrand._id }, { $set: brandDocData });
        console.log(` ✅ Updated brand: ${bData.brand_name}`);
        updatedCount++;
      } else {
        await Brand.create(brandDocData);
        console.log(` ➕ Added brand: ${bData.brand_name}`);
        addedCount++;
      }
    }

    console.log("\n==================================================");
    console.log(`🎉 Seeding Complete! Total: ${INDIAN_BRANDS.length} Brands`);
    console.log(`   ➕ Added: ${addedCount}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log("==================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error in manufacturing brands seeder:", error);
    process.exit(1);
  }
}

seedManufacturingBrands();
