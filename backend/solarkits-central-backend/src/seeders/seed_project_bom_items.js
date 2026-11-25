/**
 * seed_project_bom_items.js
 *
 * Seeds production-grade Project BOM items into MongoDB `project_bom_items` collection.
 * Includes fixed, per_kw, per_kit, and quantity_based rate items, with mandatory
 * and optional items, descriptions, and GST rates.
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
require('../keys/config/databases');

const { ProjectBomItem } = require('../modules/admin-panel/models/india_solarshop_db');

const BOM_ITEMS = [
  {
    code: 'BOM-CIVIL-MMS',
    name: 'Civil Foundation & Module Mounting Structure (MMS)',
    description: 'High-grade hot-dip galvanized (HDG 80 micron) rooftop mounting structure with wind resistance up to 150 km/h, civil foundation footing, and chemical anchor fasteners.',
    rate_type: 'per_kw',
    admin_rate: 1800,
    unit: 'kW',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 1,
  },
  {
    code: 'BOM-DC-CABLE',
    name: 'Solar DC Cabling & UV-Resistant Conduit Network',
    description: 'TUV-certified 4 sq.mm / 6 sq.mm cross-linked polyolefin (XLPO) dual-layer insulated electron beam cross-linked DC solar cables, heavy-duty UV conduits, and IP68 cable glands.',
    rate_type: 'per_kw',
    admin_rate: 950,
    unit: 'kW',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 2,
  },
  {
    code: 'BOM-AC-CABLE',
    name: 'AC Grid Interconnect Cabling & Armored Mains Cable',
    description: 'Multi-core copper/aluminum armored AC cable (IS 7098 Part 1) connecting inverter AC output to main distribution panel board, cable trays, and cable lugs.',
    rate_type: 'per_kw',
    admin_rate: 1100,
    unit: 'kW',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 3,
  },
  {
    code: 'BOM-EARTH-DUAL',
    name: 'Dedicated Chemical Earthing System (Dual Pit)',
    description: '2.0m copper-bonded chemical earthing electrodes with low-resistivity carbon-mineral backfill compound (BFC) for independent inverter DC and AC ground fault protection (tested below 2 ohms).',
    rate_type: 'quantity_based',
    admin_rate: 3200,
    unit: 'Pits',
    default_quantity: 2,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 4,
  },
  {
    code: 'BOM-LIGHTNING-LA',
    name: 'Class 1 Lightning Protection System (LA Kit)',
    description: 'Solid copper multi-point lightning terminal with 3m GI mounting mast, high-voltage insulated down-conductor, and independent earthing pit connection.',
    rate_type: 'fixed',
    admin_rate: 4800,
    unit: 'Set',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 5,
  },
  {
    code: 'BOM-DISCOM-NETMETER',
    name: 'Net Metering, Testing & Discom Liaisoning Fee',
    description: 'Discom online registration, feasibility report submission, CEIG electrical inspection documentation, bidirectional net meter meter-testing lab charges, and synchronization certificate.',
    rate_type: 'fixed',
    admin_rate: 7500,
    unit: 'Project',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 6,
  },
  {
    code: 'BOM-INSTALL-LABOR',
    name: 'Site Installation, Electrical Commissioning & Testing Labor',
    description: 'Skilled certified solar technicians for structural mounting, panel stringing, inverter electrical terminations, polarity & open-circuit voltage testing, and grid synchronization.',
    rate_type: 'per_kw',
    admin_rate: 2200,
    unit: 'kW',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 7,
  },
  {
    code: 'BOM-LOGISTICS',
    name: 'Transit Insurance & Site Logistics Delivery',
    description: 'Door-step hydraulic tailgate delivery from warehouse to project site, comprehensive in-transit cargo insurance, and on-site material unboxing inspection.',
    rate_type: 'per_kit',
    admin_rate: 3500,
    unit: 'Kit',
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 8,
  },
  {
    code: 'BOM-ZERO-EXPORT',
    name: 'Zero Export Device (Smart Energy Meter / Limiter)',
    description: 'Bi-directional RS485 digital power meter with split-core CTs to dynamically throttle solar inverter output for diesel generator synchronization or strict zero grid injection compliance.',
    rate_type: 'fixed',
    admin_rate: 9500,
    unit: 'Unit',
    default_quantity: 1,
    is_mandatory: false,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 9,
  },
  {
    code: 'BOM-OM-5YR',
    name: 'Comprehensive 5-Year Preventive O&M Contract',
    description: 'Bi-annual preventive maintenance visits, thermal imaging string scans, torque tightening check, and rapid on-site breakdown response within 48 hours.',
    rate_type: 'per_kw',
    admin_rate: 1500,
    unit: 'kW',
    default_quantity: 1,
    is_mandatory: false,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    is_active: true,
    display_order: 10,
  },
];

async function seed() {
  try {
    console.log('🔌 Waiting for MongoDB connection...');
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }
    console.log('✅ Connected to MongoDB!');

    console.log(`📦 Upserting ${BOM_ITEMS.length} Project BOM Items...`);
    for (const item of BOM_ITEMS) {
      const existing = await ProjectBomItem.findOneAndUpdate(
        { code: item.code },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Seeded BOM Item: [${existing.code}] ${existing.name} (${existing.rate_type} @ ₹${existing.admin_rate}/${existing.unit})`);
    }

    const total = await ProjectBomItem.countDocuments({ deleted_at: null });
    console.log(`\n🎉 Successfully seeded! Total active Project BOM items in database: ${total}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seed();
