const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const db = mongoose.connection.db;

  // 1. Remove previous test soft-deleted provider if any
  await db.collection('delivery_service_providers').deleteMany({
    $or: [
      { provider_code: 'TSP-001', deleted_at: { $ne: null } },
      { provider_code: { $in: ['TSP-001', 'TSP-002', 'TSP-003', 'TSP-004', 'TSP-005', 'TSP-006', 'TSP-007', 'TSP-008', 'TSP-009', 'TSP-010', 'TSP-011'] } }
    ]
  });

  // 2. Fetch states & districts for active coverage
  const states = await db.collection('geolocation_level_1').find({}).toArray();
  const stateMap = {};
  for (const s of states) {
    stateMap[s.name] = s;
  }

  async function getCoverage(stateNames) {
    const active_states = [];
    const active_districts = [];

    for (const name of stateNames) {
      const s = stateMap[name];
      if (s) {
        active_states.push({
          state_id: s._id,
          state_name: s.name,
        });
        const dists = await db.collection('geolocation_level_2').find({
          $or: [{ level_1: s._id }, { level_1: s._id.toString() }, { level_1: new mongoose.Types.ObjectId(s._id) }]
        }).limit(6).toArray();

        for (const d of dists) {
          active_districts.push({
            district_id: d._id,
            district_name: d.name,
            state_id: s._id,
          });
        }
      }
    }
    return { active_states, active_districts };
  }

  const providersData = [
    {
      provider_code: 'TSP-001',
      name: 'VRL Logistics Ltd.',
      owner_name: 'Vijay Sankeshwar',
      mobile_number: '9845012345',
      customer_service_number: '1800-599-7800',
      email: 'customercare@vrllogistics.com',
      gst_number: '29AAACV2456M1Z8',
      registered_address: 'Giriraj Annexe, Circuit House Road, Hubballi, Karnataka - 580029',
      status: 'Active',
      states: ['Karnataka', 'Maharashtra', 'Gujarat', 'Tamil Nadu'],
    },
    {
      provider_code: 'TSP-002',
      name: 'SafeX Transporters & Freight Solutions',
      owner_name: 'Rajesh Patil',
      mobile_number: '9876543210',
      customer_service_number: '1800-220-4567',
      email: 'dispatch@safextransporters.in',
      gst_number: '27AABCV1234F1Z5',
      registered_address: 'Plot No. 42, Sector 19C, APMC Market, Vashi, Navi Mumbai, Maharashtra - 400703',
      status: 'Active',
      states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh'],
    },
    {
      provider_code: 'TSP-003',
      name: 'TCI Freight (Transport Corporation of India)',
      owner_name: 'Vineet Agarwal',
      mobile_number: '9810145678',
      customer_service_number: '1800-180-0824',
      email: 'solarfreight@tcil.com',
      gst_number: '06AAACT0530A1ZV',
      registered_address: 'TCI House, 69 Institutional Area, Sector 32, Gurugram, Haryana - 122001',
      status: 'Active',
      states: ['Haryana', 'Delhi', 'Rajasthan', 'Uttar Pradesh'],
    },
    {
      provider_code: 'TSP-004',
      name: 'Blue Dart Surface Express',
      owner_name: 'Balfour Manuel',
      mobile_number: '9820054321',
      customer_service_number: '1860-233-1234',
      email: 'customersupport@bluedartsurface.in',
      gst_number: '27AAACB3166Q1ZE',
      registered_address: 'Blue Dart Centre, Sahar Airport Road, Andheri East, Mumbai, Maharashtra - 400099',
      status: 'Active',
      states: ['Maharashtra', 'Karnataka', 'Gujarat', 'Delhi'],
    },
    {
      provider_code: 'TSP-005',
      name: 'Gati KWE Express Logistics',
      owner_name: 'Pirojshaw Sarkari',
      mobile_number: '9989012340',
      customer_service_number: '1800-180-4284',
      email: 'business@gatikwe.com',
      gst_number: '36AAACG1794Q1Z2',
      registered_address: 'Western Aqua, 3rd Floor, Whitefields, Kondapur, Hyderabad, Telangana - 500084',
      status: 'Active',
      states: ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu'],
    },
    {
      provider_code: 'TSP-006',
      name: 'Delhivery Surface Cargo Logistics',
      owner_name: 'Sahil Barua',
      mobile_number: '9711098765',
      customer_service_number: '1800-103-6354',
      email: 'commercial@delhivery.com',
      gst_number: '06AAACD2472F1ZF',
      registered_address: 'Plot 5, Sector 44, Institutional Area, Gurugram, Haryana - 122003',
      status: 'Active',
      states: ['Haryana', 'Delhi', 'Uttar Pradesh', 'Rajasthan'],
    },
    {
      provider_code: 'TSP-007',
      name: 'Rivigo Freight & Fleet Solutions',
      owner_name: 'Deepak Garg',
      mobile_number: '9818876543',
      customer_service_number: '1800-121-8200',
      email: 'operations@rivigofreight.com',
      gst_number: '06AACCR3905D1ZG',
      registered_address: 'Tower C, 7th Floor, DLF Cyber City, Phase 2, Gurugram, Haryana - 122002',
      status: 'Active',
      states: ['Haryana', 'Rajasthan', 'Gujarat', 'Maharashtra'],
    },
    {
      provider_code: 'TSP-008',
      name: 'DTDC Heavy Surface Cargo',
      owner_name: 'Subhasish Chakraborty',
      mobile_number: '9844098765',
      customer_service_number: '1800-258-3832',
      email: 'heavycargo@dtdc.com',
      gst_number: '29AAACD4217H1ZT',
      registered_address: 'DTDC House, No. 3 Victoria Road, Bengaluru, Karnataka - 560047',
      status: 'Active',
      states: ['Karnataka', 'Tamil Nadu', 'Telangana', 'Maharashtra'],
    },
    {
      provider_code: 'TSP-009',
      name: 'Spoton Logistics (XpressBees Express)',
      owner_name: 'Abhik Mitra',
      mobile_number: '9900012345',
      customer_service_number: '1800-200-1414',
      email: 'dispatch@spotonexpress.com',
      gst_number: '29AADCS1290C1ZO',
      registered_address: 'Thanisandra Main Road, Nagawara, Bengaluru, Karnataka - 560045',
      status: 'Active',
      states: ['Karnataka', 'Gujarat', 'Maharashtra', 'Rajasthan'],
    },
    {
      provider_code: 'TSP-010',
      name: 'Allcargo Supply Chain Logistics',
      owner_name: 'Shashi Kiran Shetty',
      mobile_number: '9820123456',
      customer_service_number: '1800-266-9900',
      email: 'solarprojects@allcargologistics.com',
      gst_number: '27AAACA9296C1ZI',
      registered_address: 'Avashya House, CST Road, Kalina, Santacruz East, Mumbai, Maharashtra - 400098',
      status: 'Active',
      states: ['Maharashtra', 'Gujarat', 'Delhi', 'Karnataka'],
    },
  ];

  const insertedProviders = [];
  for (const item of providersData) {
    const { active_states, active_districts } = await getCoverage(item.states);
    const doc = {
      provider_code: item.provider_code,
      name: item.name,
      owner_name: item.owner_name,
      mobile_number: item.mobile_number,
      customer_service_number: item.customer_service_number,
      email: item.email,
      gst_number: item.gst_number,
      registered_address: item.registered_address,
      active_states,
      active_districts,
      status: item.status,
      is_active: true,
      created_by: null,
      updated_by: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const res = await db.collection('delivery_service_providers').insertOne(doc);
    insertedProviders.push({ ...doc, _id: res.insertedId });
    console.log(`✅ Onboarded: ${doc.provider_code} - ${doc.name}`);
  }

  // 3. Onboard 10 realistic Fleet Vehicles (1 per provider)
  const vehicleMasters = await db.collection('delivery_vehicle_masters').find({ is_active: true }).toArray();
  if (vehicleMasters.length > 0) {
    console.log('\n--- Onboarding Fleet Vehicles ---');
    // Clear old test fleet if any
    await db.collection('delivery_vehicle_fleets').deleteMany({});

    const fleetConfigs = [
      { reg: 'KA-25-EA-4102', driver: 'Ramesh Gowda', phone: '9845112233', lic: 'KA2520180012345', masterIdx: 1 }, // Ace Gold
      { reg: 'MH-43-BP-8812', driver: 'Dnyaneshwar Shinde', phone: '9822334455', lic: 'MH4320190056789', masterIdx: 2 }, // Bolero Pickup
      { reg: 'HR-55-AU-3129', driver: 'Sukhvinder Singh', phone: '9811445566', lic: 'HR5520170098765', masterIdx: 3 }, // Dost+
      { reg: 'MH-04-KF-7721', driver: 'Sanjay Jadhav', phone: '9833556677', lic: 'MH0420200034567', masterIdx: 4 }, // Tata 407
      { reg: 'TS-09-UB-1904', driver: 'K. Venkateshwar Rao', phone: '9944667788', lic: 'TS0920160087654', masterIdx: 5 }, // Eicher 2049
      { reg: 'HR-26-DK-9043', driver: 'Manoj Kumar Sharma', phone: '9877889900', lic: 'HR2620210045678', masterIdx: 2 }, // Bolero Pickup
      { reg: 'DL-1L-AA-5619', driver: 'Jagdish Yadav', phone: '9899001122', lic: 'DL0120150023456', masterIdx: 4 }, // Tata 407
      { reg: 'KA-01-MJ-6482', driver: 'Prakash Narayana', phone: '9844113355', lic: 'KA0120190078901', masterIdx: 6 }, // Tata 1109
      { reg: 'KA-04-NB-2309', driver: 'Manjunath Swamy', phone: '9900224466', lic: 'KA0420180034567', masterIdx: 3 }, // Dost+
      { reg: 'MH-01-CR-9954', driver: 'Mahesh Sawant', phone: '9820335577', lic: 'MH0120200012345', masterIdx: 7 }, // Tata 1613
    ];

    for (let i = 0; i < insertedProviders.length; i++) {
      const p = insertedProviders[i];
      const cfg = fleetConfigs[i];
      const vMaster = vehicleMasters[cfg.masterIdx % vehicleMasters.length];

      const fleetDoc = {
        service_provider_id: p._id,
        vehicle_master_id: vMaster._id,
        registration_number: cfg.reg,
        load_capacity_kg: vMaster.max_load_kg,
        length_ft: vMaster.length_ft,
        width_ft: vMaster.width_ft,
        height_ft: vMaster.height_ft,
        max_distance_km: vMaster.max_delivery_distance_km,
        current_status: 'Available',
        assigned_driver: {
          name: cfg.driver,
          mobile: cfg.phone,
          license_number: cfg.lic,
        },
        is_active: true,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.collection('delivery_vehicle_fleets').insertOne(fleetDoc);
      console.log(`🚛 Vehicle ${cfg.reg} (${vMaster.name}) assigned to ${p.name}`);
    }
  }

  console.log('\n🎉 Successfully onboarded 10 Service Providers and 10 Fleet Vehicles!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
