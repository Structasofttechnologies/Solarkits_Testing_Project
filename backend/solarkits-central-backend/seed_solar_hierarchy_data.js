'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
  Unit,
  UnitGroup,
} = require('./src/modules/admin-panel/models/core_db');

async function seedSolarHierarchy() {
  console.log('====================================================');
  console.log('⚡ SEEDING REAL-LIFE SOLAR INDUSTRY HIERARCHY DATA');
  console.log('====================================================\n');

  // 1. Ensure Power Unit Group and Units exist (kW, MW, HP, W)
  let powerGroup = await UnitGroup.findOne({ name: 'Power', deleted_at: null });
  if (!powerGroup) {
    powerGroup = await UnitGroup.create({ name: 'Power', is_system: true, is_active: true });
  }

  let kwUnit = await Unit.findOne({ symbol: 'kW', deleted_at: null });
  if (!kwUnit) {
    kwUnit = await Unit.create({
      name: 'Kilowatt',
      symbol: 'kW',
      unit_group_id: powerGroup._id,
      conversion_factor: 1000,
      is_base_unit: true,
      is_system: true,
    });
  }

  let mwUnit = await Unit.findOne({ symbol: 'MW', deleted_at: null });
  if (!mwUnit) {
    mwUnit = await Unit.create({
      name: 'Megawatt',
      symbol: 'MW',
      unit_group_id: powerGroup._id,
      conversion_factor: 1000000,
      is_system: true,
    });
  }

  let hpUnit = await Unit.findOne({ symbol: 'HP', deleted_at: null });
  if (!hpUnit) {
    hpUnit = await Unit.create({
      name: 'Horsepower',
      symbol: 'HP',
      unit_group_id: powerGroup._id,
      conversion_factor: 745.7,
      is_system: true,
    });
  }

  let wUnit = await Unit.findOne({ symbol: 'W', deleted_at: null });
  if (!wUnit) {
    wUnit = await Unit.create({
      name: 'Watt',
      symbol: 'W',
      unit_group_id: powerGroup._id,
      conversion_factor: 1,
      is_system: true,
    });
  }

  console.log(`✅ Units ready: kW (${kwUnit._id}), MW (${mwUnit._id}), HP (${hpUnit._id}), W (${wUnit._id})`);

  // 2. Fetch / Ensure Industry Types
  const industriesDef = [
    {
      name: 'Residential Solar',
      slug: 'residential-solar',
      code: 'IND_RES',
      description: 'Rooftop on-grid, hybrid, and standalone solar solutions for individual homes, villas, and residential societies.',
      sort_order: 1,
    },
    {
      name: 'Commercial & Industrial (C&I)',
      slug: 'commercial-industrial',
      code: 'IND_CI',
      description: 'Solar solutions for factories, warehouses, commercial complexes, malls, institutions, and hospitals.',
      sort_order: 2,
    },
    {
      name: 'Agriculture & Solar Pumps',
      slug: 'agriculture-solar-pumps',
      code: 'IND_AGRI',
      description: 'Solar water pumps (PM-KUSUM), agricultural irrigation, feeder solarization, and agro-processing plants.',
      sort_order: 3,
    },
    {
      name: 'Utility Scale & Ground Mount',
      slug: 'utility-scale-ground-mount',
      code: 'IND_UTIL',
      description: 'Megawatt-scale ground mount solar farms, single-axis tracker arrays, floating solar, and grid-scale BESS.',
      sort_order: 4,
    },
  ];

  const industryMap = {};
  for (const def of industriesDef) {
    let ind = await IndustryType.findOne({ slug: def.slug, deleted_at: null });
    if (!ind) {
      ind = await IndustryType.create(def);
    } else {
      ind.name = def.name;
      ind.description = def.description;
      ind.sort_order = def.sort_order;
      await ind.save();
    }
    industryMap[def.slug] = ind;
    console.log(`Industry: [${ind._id}] ${ind.name}`);
  }

  // 3. Clear existing old hierarchy to ensure clean, consistent real-life data
  console.log('\nCleaning up old hierarchy links...');
  await ProjectRange.deleteMany({});
  await ProjectSubcategoryType.deleteMany({});
  await ProjectSubcategory.deleteMany({});
  await ProjectCategory.deleteMany({});
  await ProjectType.deleteMany({});

  // 4. Real-life Hierarchy Definitions
  const hierarchyData = [
    // ════════════════════════════════════════════════════════════════════════
    // 1. RESIDENTIAL SOLAR
    // ════════════════════════════════════════════════════════════════════════
    {
      industry_slug: 'residential-solar',
      categories: [
        {
          name: 'Rooftop Grid-Tied & Hybrid Systems',
          sort_order: 1,
          subcategories: [
            {
              name: 'Single Phase Residential (1-Phase LT)',
              color: '#185ADB',
              types: [
                {
                  name: 'On-Grid (Net Metering)',
                  ranges: [
                    { min: 1, max: 3, unit: kwUnit },
                    { min: 3, max: 5, unit: kwUnit },
                    { min: 5, max: 10, unit: kwUnit },
                  ],
                },
                {
                  name: 'Hybrid (Battery Backup ESS)',
                  ranges: [
                    { min: 3, max: 5, unit: kwUnit },
                    { min: 5, max: 10, unit: kwUnit },
                  ],
                },
                {
                  name: 'Off-Grid Standalone System',
                  ranges: [
                    { min: 1, max: 3, unit: kwUnit },
                    { min: 3, max: 5, unit: kwUnit },
                  ],
                },
              ],
            },
            {
              name: 'Three Phase Villa & Large Homes (3-Phase LT)',
              color: '#059669',
              types: [
                {
                  name: 'On-Grid (Net Metering High Capacity)',
                  ranges: [
                    { min: 5, max: 10, unit: kwUnit },
                    { min: 10, max: 15, unit: kwUnit },
                    { min: 15, max: 25, unit: kwUnit },
                  ],
                },
                {
                  name: 'Hybrid (High Voltage Commercial/Villa ESS)',
                  ranges: [
                    { min: 10, max: 15, unit: kwUnit },
                    { min: 15, max: 25, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Solar Housing Society & Balcony Microinverters',
          sort_order: 2,
          subcategories: [
            {
              name: 'Balcony & Plug-and-Play Solar',
              color: '#D97706',
              types: [
                {
                  name: 'Microinverter Grid-Connected',
                  ranges: [
                    { min: 0.5, max: 1, unit: kwUnit },
                    { min: 1, max: 2, unit: kwUnit },
                  ],
                },
              ],
            },
            {
              name: 'Gated Community Common Metering',
              color: '#7C3AED',
              types: [
                {
                  name: 'Common Area Net Metering System',
                  ranges: [
                    { min: 15, max: 30, unit: kwUnit },
                    { min: 30, max: 50, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // 2. COMMERCIAL & INDUSTRIAL (C&I)
    // ════════════════════════════════════════════════════════════════════════
    {
      industry_slug: 'commercial-industrial',
      categories: [
        {
          name: 'Factory & Warehouse Metal Shed Solar',
          sort_order: 1,
          subcategories: [
            {
              name: 'Industrial Tin Shed (Trapezoidal / Klip-Lok Profile)',
              color: '#2563EB',
              types: [
                {
                  name: 'Three-Phase String Inverter System (HT/LT)',
                  ranges: [
                    { min: 25, max: 50, unit: kwUnit },
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 250, unit: kwUnit },
                    { min: 250, max: 500, unit: kwUnit },
                    { min: 500, max: 1000, unit: kwUnit },
                  ],
                },
                {
                  name: 'Zero Export / DG Synchronization System',
                  ranges: [
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 250, unit: kwUnit },
                    { min: 250, max: 500, unit: kwUnit },
                  ],
                },
              ],
            },
            {
              name: 'Commercial RCC Flat Roof (Malls & Tech Parks)',
              color: '#0891B2',
              types: [
                {
                  name: 'Ballasted / Non-Penetrative Grid-Tied System',
                  ranges: [
                    { min: 25, max: 50, unit: kwUnit },
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 300, unit: kwUnit },
                  ],
                },
                {
                  name: 'Elevated HDGI Superstructure',
                  ranges: [
                    { min: 25, max: 50, unit: kwUnit },
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 250, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Solar Carports & EV Charging Hubs',
          sort_order: 2,
          subcategories: [
            {
              name: 'Commercial Solar Carport Canopy',
              color: '#0D9488',
              types: [
                {
                  name: 'Grid-Tied Solar Carport with EV Charger Integration',
                  ranges: [
                    { min: 20, max: 50, unit: kwUnit },
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 250, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Institutional & Campus Solar (Hospitals & Universities)',
          sort_order: 3,
          subcategories: [
            {
              name: 'Educational & Hospital Campus Solar',
              color: '#4F46E5',
              types: [
                {
                  name: 'On-Grid Solar Net Metering (CAPEX / RESCO)',
                  ranges: [
                    { min: 20, max: 50, unit: kwUnit },
                    { min: 50, max: 100, unit: kwUnit },
                    { min: 100, max: 250, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // 3. AGRICULTURE & SOLAR PUMPS
    // ════════════════════════════════════════════════════════════════════════
    {
      industry_slug: 'agriculture-solar-pumps',
      categories: [
        {
          name: 'PM-KUSUM Solar Water Pumping Systems',
          sort_order: 1,
          subcategories: [
            {
              name: 'AC Solar Submersible Borewell Pumps',
              color: '#16A34A',
              types: [
                {
                  name: 'Solar VFD Pump Drive Controller (Direct Drive)',
                  ranges: [
                    { min: 3, max: 5, unit: hpUnit },
                    { min: 5, max: 7.5, unit: hpUnit },
                    { min: 7.5, max: 10, unit: hpUnit },
                  ],
                },
              ],
            },
            {
              name: 'DC Solar Brushless High-Head Pumps',
              color: '#65A30D',
              types: [
                {
                  name: 'MPPT Solar Pump Controller (Standalone DC)',
                  ranges: [
                    { min: 2, max: 3, unit: hpUnit },
                    { min: 3, max: 5, unit: hpUnit },
                  ],
                },
              ],
            },
            {
              name: 'Solar Surface Irrigation Monoblock Pumps',
              color: '#84CC16',
              types: [
                {
                  name: 'Automatic Solar Surface Lift Irrigation',
                  ranges: [
                    { min: 3, max: 5, unit: hpUnit },
                    { min: 5, max: 10, unit: hpUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Agrivoltaics & Solar Agro-Processing (PM-KUSUM A & C)',
          sort_order: 2,
          subcategories: [
            {
              name: 'Agri-Feeder Solarization (Grid-Connected Feeder Plants)',
              color: '#059669',
              types: [
                {
                  name: 'Feeder Level Solar Power Plant',
                  ranges: [
                    { min: 500, max: 1000, unit: kwUnit },
                    { min: 1, max: 2, unit: mwUnit },
                  ],
                },
              ],
            },
            {
              name: 'Solar Powered Cold Storage & Agro Mills',
              color: '#0D9488',
              types: [
                {
                  name: 'Hybrid Solar Cold Storage with Thermal/Battery Backup',
                  ranges: [
                    { min: 15, max: 30, unit: kwUnit },
                    { min: 30, max: 60, unit: kwUnit },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // 4. UTILITY SCALE & GROUND MOUNT
    // ════════════════════════════════════════════════════════════════════════
    {
      industry_slug: 'utility-scale-ground-mount',
      categories: [
        {
          name: 'Megawatt Ground-Mounted Solar Parks',
          sort_order: 1,
          subcategories: [
            {
              name: 'Fixed Tilt Ground Mount (Galvanized Piled Foundation)',
              color: '#DC2626',
              types: [
                {
                  name: 'Central Inverter / 1500V DC String Inverter Array',
                  ranges: [
                    { min: 1, max: 5, unit: mwUnit },
                    { min: 5, max: 10, unit: mwUnit },
                    { min: 10, max: 50, unit: mwUnit },
                    { min: 50, max: 100, unit: mwUnit },
                  ],
                },
              ],
            },
            {
              name: 'Single-Axis Smart Tracker Solar Mount',
              color: '#EA580C',
              types: [
                {
                  name: '1500V Bifacial Solar Array with Astronomical Tracking',
                  ranges: [
                    { min: 5, max: 20, unit: mwUnit },
                    { min: 20, max: 50, unit: mwUnit },
                    { min: 50, max: 100, unit: mwUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Floating Solar Photovoltaics (FPV)',
          sort_order: 2,
          subcategories: [
            {
              name: 'Water Reservoir & Dam Floating Solar',
              color: '#0284C7',
              types: [
                {
                  name: 'High-Density Polyethylene (HDPE) Floating Array',
                  ranges: [
                    { min: 1, max: 5, unit: mwUnit },
                    { min: 5, max: 20, unit: mwUnit },
                    { min: 20, max: 50, unit: mwUnit },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Utility Scale Battery Energy Storage Systems (BESS)',
          sort_order: 3,
          subcategories: [
            {
              name: 'Containerized Grid-Scale BESS',
              color: '#9333EA',
              types: [
                {
                  name: 'LFP Grid Frequency Regulation & Peak Shaving BESS',
                  ranges: [
                    { min: 1, max: 5, unit: mwUnit },
                    { min: 5, max: 20, unit: mwUnit },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  // Helper map for unique ProjectType by name
  const projectTypeCache = {};

  for (const block of hierarchyData) {
    const industryDoc = industryMap[block.industry_slug];
    if (!industryDoc) continue;

    console.log(`\n📂 Seeding Category Tree for: ${industryDoc.name}...`);

    for (const catDef of block.categories) {
      const categoryDoc = await ProjectCategory.create({
        name: catDef.name,
        industry_type_id: industryDoc._id,
        sort_order: catDef.sort_order || 0,
        display_visibility: true,
        is_active: true,
      });
      console.log(`  ├─ Category: ${categoryDoc.name}`);

      for (const subDef of catDef.subcategories) {
        const subcategoryDoc = await ProjectSubcategory.create({
          name: subDef.name,
          category: categoryDoc._id,
          color: subDef.color,
          is_active: true,
        });
        console.log(`  │   ├─ Subcategory: ${subcategoryDoc.name}`);

        for (const typeDef of subDef.types) {
          let typeDoc = projectTypeCache[typeDef.name];
          if (!typeDoc) {
            typeDoc = await ProjectType.findOne({ name: typeDef.name, deleted_at: null });
            if (!typeDoc) {
              typeDoc = await ProjectType.create({ name: typeDef.name, is_active: true });
            }
            projectTypeCache[typeDef.name] = typeDoc;
          }

          // Map Subcategory to Type
          const subTypeMap = await ProjectSubcategoryType.create({
            subcategory: subcategoryDoc._id,
            type: typeDoc._id,
          });
          console.log(`  │   │   ├─ Type: ${typeDoc.name}`);

          for (const rangeDef of typeDef.ranges) {
            const rangeDoc = await ProjectRange.create({
              subcategory_type: subTypeMap._id,
              min_value: rangeDef.min,
              max_value: rangeDef.max,
              unit_id: rangeDef.unit._id,
              is_active: true,
            });
            console.log(`  │   │   │   └─ Range: ${rangeDef.min} - ${rangeDef.max} ${rangeDef.unit.symbol}`);
          }
        }
      }
    }
  }

  console.log('\n====================================================');
  console.log('🎉 ALL SOLAR HIERARCHY REAL-LIFE DATA SEEDED SUCCESSFULLY!');
  console.log('====================================================');

  process.exit(0);
}

seedSolarHierarchy().catch((err) => {
  console.error('Error seeding solar hierarchy:', err);
  process.exit(1);
});
