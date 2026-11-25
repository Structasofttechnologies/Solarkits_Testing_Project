/**
 * seed_delivery_routes.js
 * One-time seed: Gujarat & Maharashtra Delivery Route & Consolidation Settings
 * Run from: backend/solarkits-central-backend/
 *   node seed_delivery_routes.js
 */

require('dotenv').config();
const dns = require('dns');
// Same DNS fix the app uses to avoid querySrv ECONNREFUSED
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing'); process.exit(1); }

async function run() {
  console.log('\n🚀 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  // Single unified DB — all collections are on the same connection (mongoose default)
  const db = mongoose;

  // ── Inline schemas — single unified DB (all on mongoose default connection) ────
  const S = mongoose.Schema;
  const getModel = (name, schema) =>
    mongoose.models[name] || mongoose.model(name, schema);

  const GeoLevel1 = getModel('geo_l1_seed', new S(
    { name: String, is_active: Boolean, deleted_at: Date },
    { collection: 'geolocation_level_1' }
  ));
  const GeoLevel2 = getModel('geo_l2_seed', new S(
    { name: String, level_1: S.Types.ObjectId, is_active: Boolean, deleted_at: Date },
    { collection: 'geolocation_level_2' }
  ));
  const Warehouse = getModel('warehouse_seed', new S(
    { warehouse_code: String, address: String, level_1: S.Types.ObjectId, deleted_at: Date },
    { collection: 'company_warehouses' }
  ));
  const RouteSetting = getModel('route_setting_seed', new S({
    route_name: String,
    origin_warehouse_id: S.Types.ObjectId,
    state_id: S.Types.ObjectId,
    primary_district_id: S.Types.ObjectId,
    nearby_district_ids: [S.Types.ObjectId],
    pincode_groups: [{ pincode: String, label: String }],
    max_route_distance_km: Number,
    max_route_deviation_km: Number,
    max_waiting_period_hours: Number,
    min_vehicle_utilization_pct: Number,
    max_delivery_stops: Number,
    combined_delivery_enabled: Boolean,
    cost_allocation_default: String,
    is_active: Boolean,
    deleted_at: Date,
  }, { collection: 'delivery_route_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }));

  // ── Lookup States ────────────────────────────────────────────────────────
  const gujarat = await GeoLevel1.findOne({ name: /gujarat/i }).lean();
  const maharashtra = await GeoLevel1.findOne({ name: /maharashtra/i }).lean();

  if (!gujarat) { console.error('❌ Gujarat not found in geo DB'); process.exit(1); }
  if (!maharashtra) { console.error('❌ Maharashtra not found in geo DB'); process.exit(1); }
  console.log(`✅ Gujarat     → ${gujarat._id}`);
  console.log(`✅ Maharashtra → ${maharashtra._id}`);

  // ── Fetch Districts ──────────────────────────────────────────────────────
  const gjDists = await GeoLevel2.find({ level_1: gujarat._id }).lean();
  const mhDists = await GeoLevel2.find({ level_1: maharashtra._id }).lean();
  console.log(`\n📍 Gujarat Districts   : ${gjDists.length}`);
  gjDists.forEach(d => console.log(`   ${d.name} → ${d._id}`));
  console.log(`\n📍 Maharashtra Districts: ${mhDists.length}`);
  mhDists.forEach(d => console.log(`   ${d.name} → ${d._id}`));

  // helpers
  const gd = (n) => gjDists.find(d => d.name.toLowerCase().includes(n.toLowerCase()))?._id || null;
  const mh = (n) => mhDists.find(d => d.name.toLowerCase().includes(n.toLowerCase()))?._id || null;

  // ── Lookup Warehouses ────────────────────────────────────────────────────
  const warehouses = await Warehouse.find({ deleted_at: null }).lean();
  console.log(`\n🏭 Warehouses: ${warehouses.length}`);
  warehouses.forEach(w => console.log(`   ${w.warehouse_code} | ${w.address}`));

  const pickWH = (...keywords) =>
    warehouses.find(w => keywords.some(k =>
      (w.address || '').toLowerCase().includes(k) ||
      (w.warehouse_code || '').toLowerCase().includes(k)
    )) || warehouses[0];

  const whGJ = pickWH('gujarat', 'ahmedabad', 'surat', 'gj');
  const whMH = pickWH('maharashtra', 'pune', 'mumbai', 'nagpur', 'mh');

  console.log(`\n   GJ WH → ${whGJ?.warehouse_code} (${whGJ?._id})`);
  console.log(`   MH WH → ${whMH?.warehouse_code} (${whMH?._id})`);
  if (!whGJ || !whMH) { console.error('❌ No warehouses found'); process.exit(1); }

  // ── Route Definitions ─────────────────────────────────────────────────────
  const routes = [
    // ── GUJARAT ──────────────────────────────────────────────────────────
    {
      route_name: 'GJ-Route-01 | Ahmedabad Central Cluster',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Ahmedabad'),
      nearby_district_ids: [gd('Gandhinagar'), gd('Anand'), gd('Kheda')].filter(Boolean),
      pincode_groups: [
        { pincode: '380001', label: 'Ahmedabad City Centre' },
        { pincode: '380006', label: 'Paldi' },
        { pincode: '380009', label: 'Navrangpura' },
        { pincode: '380015', label: 'Satellite' },
        { pincode: '382010', label: 'Gandhinagar Sector 11' },
        { pincode: '388001', label: 'Anand City' },
        { pincode: '387001', label: 'Nadiad (Kheda)' },
      ],
      max_route_distance_km: 120,
      max_route_deviation_km: 30,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 70,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'GJ-Route-02 | Surat & South Gujarat Cluster',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Surat'),
      nearby_district_ids: [gd('Navsari'), gd('Tapi'), gd('Bharuch'), gd('Dang')].filter(Boolean),
      pincode_groups: [
        { pincode: '395001', label: 'Surat Ring Road' },
        { pincode: '395002', label: 'Udhna Surat' },
        { pincode: '395003', label: 'Katargam' },
        { pincode: '395010', label: 'Vesu Surat' },
        { pincode: '396445', label: 'Navsari City' },
        { pincode: '394110', label: 'Vyara (Tapi)' },
        { pincode: '392001', label: 'Bharuch City' },
      ],
      max_route_distance_km: 150,
      max_route_deviation_km: 35,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 65,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },
    {
      route_name: 'GJ-Route-03 | Vadodara & Central Gujarat',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Vadodara'),
      nearby_district_ids: [gd('Anand'), gd('Panchmahal'), gd('Dahod'), gd('Chhota Udaipur')].filter(Boolean),
      pincode_groups: [
        { pincode: '390001', label: 'Vadodara City' },
        { pincode: '390007', label: 'Alkapuri' },
        { pincode: '390021', label: 'Waghodia Road' },
        { pincode: '388001', label: 'Anand City' },
        { pincode: '389001', label: 'Godhra (Panchmahal)' },
        { pincode: '389380', label: 'Dahod City' },
      ],
      max_route_distance_km: 140,
      max_route_deviation_km: 30,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 70,
      max_delivery_stops: 4,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'GJ-Route-04 | Rajkot & Saurashtra Cluster',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Rajkot'),
      nearby_district_ids: [gd('Morbi'), gd('Surendranagar'), gd('Jamnagar'), gd('Porbandar')].filter(Boolean),
      pincode_groups: [
        { pincode: '360001', label: 'Rajkot City Centre' },
        { pincode: '360002', label: 'Kalavad Rd Rajkot' },
        { pincode: '363001', label: 'Surendranagar' },
        { pincode: '361001', label: 'Jamnagar City' },
        { pincode: '363642', label: 'Morbi City' },
        { pincode: '360575', label: 'Porbandar' },
      ],
      max_route_distance_km: 200,
      max_route_deviation_km: 50,
      max_waiting_period_hours: 72,
      min_vehicle_utilization_pct: 65,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },
    {
      route_name: 'GJ-Route-05 | North Gujarat Cluster',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Mehsana'),
      nearby_district_ids: [gd('Patan'), gd('Banaskantha'), gd('Sabarkantha')].filter(Boolean),
      pincode_groups: [
        { pincode: '384001', label: 'Mehsana City' },
        { pincode: '384265', label: 'Patan City' },
        { pincode: '385001', label: 'Palanpur (Banaskantha)' },
        { pincode: '383001', label: 'Himmatnagar (Sabarkantha)' },
        { pincode: '384430', label: 'Unjha' },
      ],
      max_route_distance_km: 180,
      max_route_deviation_km: 40,
      max_waiting_period_hours: 72,
      min_vehicle_utilization_pct: 60,
      max_delivery_stops: 4,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'GJ-Route-06 | Kutch & Far West Gujarat',
      origin_warehouse_id: whGJ._id,
      state_id: gujarat._id,
      primary_district_id: gd('Kutch'),
      nearby_district_ids: [gd('Devbhumi Dwarka'), gd('Jamnagar')].filter(Boolean),
      pincode_groups: [
        { pincode: '370001', label: 'Bhuj (Kutch HQ)' },
        { pincode: '370110', label: 'Anjar (Kutch)' },
        { pincode: '370165', label: 'Gandhidham' },
        { pincode: '370040', label: 'Bhachau' },
        { pincode: '370105', label: 'Mandvi Kutch' },
      ],
      max_route_distance_km: 300,
      max_route_deviation_km: 60,
      max_waiting_period_hours: 96,
      min_vehicle_utilization_pct: 55,
      max_delivery_stops: 3,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },

    // ── MAHARASHTRA ──────────────────────────────────────────────────────
    {
      route_name: 'MH-Route-01 | Pune City & Western Maharashtra',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Pune'),
      nearby_district_ids: [mh('Satara'), mh('Solapur'), mh('Kolhapur'), mh('Sangli')].filter(Boolean),
      pincode_groups: [
        { pincode: '411001', label: 'Pune Camp / Shivajinagar' },
        { pincode: '411014', label: 'Aundh Pune' },
        { pincode: '411028', label: 'Pimpri' },
        { pincode: '411033', label: 'Kothrud' },
        { pincode: '411041', label: 'Hadapsar' },
        { pincode: '412001', label: 'Saswad' },
        { pincode: '415001', label: 'Satara City' },
        { pincode: '413001', label: 'Solapur City' },
      ],
      max_route_distance_km: 220,
      max_route_deviation_km: 40,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 70,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'MH-Route-02 | Mumbai Metropolitan Region',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Mumbai') || mh('Mumbai Suburban'),
      nearby_district_ids: [mh('Thane'), mh('Raigad'), mh('Palghar')].filter(Boolean),
      pincode_groups: [
        { pincode: '400001', label: 'Mumbai Fort' },
        { pincode: '400050', label: 'Bandra West' },
        { pincode: '400076', label: 'Andheri West' },
        { pincode: '400080', label: 'Kurla West' },
        { pincode: '400614', label: 'Navi Mumbai Vashi' },
        { pincode: '401105', label: 'Thane City' },
        { pincode: '401303', label: 'Vasai (Palghar)' },
        { pincode: '410101', label: 'Khopoli (Raigad)' },
      ],
      max_route_distance_km: 130,
      max_route_deviation_km: 30,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 70,
      max_delivery_stops: 4,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'MH-Route-03 | Nashik & North Maharashtra Cluster',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Nashik'),
      nearby_district_ids: [mh('Ahmednagar'), mh('Dhule'), mh('Nandurbar')].filter(Boolean),
      pincode_groups: [
        { pincode: '422001', label: 'Nashik City' },
        { pincode: '422002', label: 'Nashik Road' },
        { pincode: '422005', label: 'Panchvati Nashik' },
        { pincode: '414001', label: 'Ahmednagar City' },
        { pincode: '424001', label: 'Dhule City' },
        { pincode: '425412', label: 'Nandurbar' },
      ],
      max_route_distance_km: 200,
      max_route_deviation_km: 40,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 65,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },
    {
      route_name: 'MH-Route-04 | Aurangabad (Sambhajinagar) & Marathwada',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Chhatrapati Sambhajinagar') || mh('Aurangabad'),
      nearby_district_ids: [mh('Jalna'), mh('Beed'), mh('Latur'), mh('Dharashiv')].filter(Boolean),
      pincode_groups: [
        { pincode: '431001', label: 'Aurangabad / Sambhajinagar City' },
        { pincode: '431003', label: 'CIDCO Sambhajinagar' },
        { pincode: '431203', label: 'Jalna City' },
        { pincode: '431122', label: 'Beed City' },
        { pincode: '413512', label: 'Latur City' },
        { pincode: '413501', label: 'Osmanabad (Dharashiv)' },
      ],
      max_route_distance_km: 260,
      max_route_deviation_km: 50,
      max_waiting_period_hours: 72,
      min_vehicle_utilization_pct: 60,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },
    {
      route_name: 'MH-Route-05 | Nagpur & East Vidarbha Cluster',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Nagpur'),
      nearby_district_ids: [mh('Wardha'), mh('Bhandara'), mh('Gondia'), mh('Chandrapur')].filter(Boolean),
      pincode_groups: [
        { pincode: '440001', label: 'Nagpur City Centre' },
        { pincode: '440010', label: 'Dharampeth Nagpur' },
        { pincode: '440012', label: 'Sadar Nagpur' },
        { pincode: '440025', label: 'Besa Nagpur' },
        { pincode: '442001', label: 'Wardha City' },
        { pincode: '441904', label: 'Bhandara City' },
        { pincode: '441601', label: 'Gondia City' },
        { pincode: '442401', label: 'Chandrapur City' },
      ],
      max_route_distance_km: 220,
      max_route_deviation_km: 50,
      max_waiting_period_hours: 72,
      min_vehicle_utilization_pct: 65,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
    {
      route_name: 'MH-Route-06 | Amravati & West Vidarbha',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Amravati'),
      nearby_district_ids: [mh('Yavatmal'), mh('Buldhana'), mh('Akola'), mh('Washim')].filter(Boolean),
      pincode_groups: [
        { pincode: '444601', label: 'Amravati City' },
        { pincode: '444602', label: 'Badnera Amravati' },
        { pincode: '445001', label: 'Yavatmal City' },
        { pincode: '443001', label: 'Buldhana City' },
        { pincode: '444001', label: 'Akola City' },
        { pincode: '444505', label: 'Washim City' },
      ],
      max_route_distance_km: 220,
      max_route_deviation_km: 45,
      max_waiting_period_hours: 72,
      min_vehicle_utilization_pct: 60,
      max_delivery_stops: 4,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_weight_kg',
    },
    {
      route_name: 'MH-Route-07 | Kolhapur & South Maharashtra',
      origin_warehouse_id: whMH._id,
      state_id: maharashtra._id,
      primary_district_id: mh('Kolhapur'),
      nearby_district_ids: [mh('Sangli'), mh('Satara'), mh('Ratnagiri'), mh('Sindhudurg')].filter(Boolean),
      pincode_groups: [
        { pincode: '416001', label: 'Kolhapur City' },
        { pincode: '416004', label: 'Shivaji Peth Kolhapur' },
        { pincode: '416416', label: 'Sangli City' },
        { pincode: '415001', label: 'Satara City' },
        { pincode: '415612', label: 'Ratnagiri City' },
        { pincode: '416812', label: 'Sindhudurg (Oros)' },
      ],
      max_route_distance_km: 200,
      max_route_deviation_km: 40,
      max_waiting_period_hours: 48,
      min_vehicle_utilization_pct: 65,
      max_delivery_stops: 5,
      combined_delivery_enabled: true,
      cost_allocation_default: 'by_kit_qty',
    },
  ];

  // ── Insert ───────────────────────────────────────────────────────────────
  console.log(`\n📝 Inserting ${routes.length} routes (6 GJ + 7 MH)...\n`);
  let inserted = 0, skipped = 0, failed = 0;

  for (const route of routes) {
    if (!route.primary_district_id) {
      console.warn(`  ⚠️  SKIP (district not found): ${route.route_name}`);
      failed++;
      continue;
    }
    const exists = await RouteSetting.findOne({ route_name: route.route_name, deleted_at: null });
    if (exists) {
      console.log(`  ⏭️  EXISTS : ${route.route_name}`);
      skipped++;
      continue;
    }
    try {
      await RouteSetting.create({ ...route, is_active: true });
      console.log(`  ✅ INSERTED: ${route.route_name}`);
      inserted++;
    } catch (e) {
      console.error(`  ❌ ERROR  : ${route.route_name} — ${e.message}`);
      failed++;
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  ✅ Inserted : ${inserted}`);
  console.log(`  ⏭️  Skipped  : ${skipped} (already existed)`);
  console.log(`  ❌ Failed   : ${failed} (district name mismatch)`);
  console.log('══════════════════════════════════════════════════');
  if (failed > 0) {
    console.log('\n💡 Check district names printed above vs your geo DB and fix in script.');
  }
  console.log('\n🎉 Open Route & Consolidation Settings to verify!\n');
  process.exit(0);
}

run().catch(err => { console.error('\n❌', err.message); process.exit(1); });
