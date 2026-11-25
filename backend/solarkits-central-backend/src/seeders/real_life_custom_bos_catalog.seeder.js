/**
 * ============================================================
 *  REAL-LIFE CUSTOM BOS CATALOG SEEDER
 * ============================================================
 *  Seeds full real-life industrial Custom Balance of System (BOS)
 *  component catalog into MongoDB (`custom_bos_catalog` collection
 *  in `india_solarshop_db`).
 * 
 *  Includes all fields from the admin modal:
 *  - group (Category)
 *  - name (Component / Material Name)
 *  - unitPrice (Unit Price in ₹)
 *  - unit (Unit Type: Piece, Meter, Pack, Set)
 *  - defaultQty (Admin Default Qty for 5 kW)
 *  - recommendedPerKw (Qty per 1 kW Scaling Rate)
 *  - availableStock (Available Stock)
 *  - specs (Length / Specs Details)
 *  - packInfo (Admin Package Recommendation Note)
 *  - imageUrl (Image / Photo URL)
 * ============================================================
 *  Run command: node src/seeders/real_life_custom_bos_catalog.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect database
require('../keys/config/databases');
const CustomBosCatalog = require('../modules/solarshop-india/models/india_solarshop_db/custom_bos_catalog.schema');

const CATALOG_DATA = [
  {
    group: "Protection & AC/DC Enclosures",
    icon: "🛡️",
    items: [
      {
        id: "bos_item_dc_cable_4sqmm",
        name: "4.0 sq mm Twin Core UV Solar DC Cable",
        unitPrice: 500,
        unit: "Piece",
        icon: "⚡",
        imageUrl: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        availableStock: 50,
        specs: "Standard Specs",
        defaultQty: 50,
        recommendedPerKw: 10,
        packInfo: "50 Meters (Recommended for 5 kW System)"
      },
      {
        id: "bos_item_dcdb_1000v_2in2out",
        name: "1000V 2 In 2 Out IP65 DC Distribution Box (DCDB)",
        unitPrice: 3500,
        unit: "Piece",
        icon: "🛡️",
        imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        availableStock: 150,
        specs: "1000V 16A DC MCB + 600V Type II DC SPD + Fuse Holders",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 Unit (Recommended for 5 kW 2-String Solar Systems)"
      },
      {
        id: "bos_item_acdb_1ph_32a",
        name: "Single Phase 32A AC Distribution Box (ACDB)",
        unitPrice: 2800,
        unit: "Piece",
        icon: "⚡",
        imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        availableStock: 200,
        specs: "32A C-Curve AC MCB + 275V Type II AC SPD + Rotary Switch",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 Unit (Recommended for 3 kW - 5 kW Single Phase Systems)"
      },
      {
        id: "bos_item_acdb_3ph_63a",
        name: "Three Phase 63A LT AC Distribution Box (Commercial)",
        unitPrice: 8500,
        unit: "Piece",
        icon: "⚡",
        imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        availableStock: 80,
        specs: "63A 4P MCCB + Type 2 AC SPD + Energy Meter CT Provisions",
        defaultQty: 1,
        recommendedPerKw: 0.02,
        packInfo: "1 Unit (Recommended for 10 kW - 50 kW Commercial Solar Systems)"
      }
    ]
  },
  {
    group: "DC/AC Cabling & Wire Management",
    icon: "🔌",
    items: [
      {
        id: "bos_item_dc_cable_6sqmm",
        name: "6.0 sq mm Single Core Solar DC Cable (Red & Black Roll)",
        unitPrice: 75,
        unit: "Meter",
        icon: "🔌",
        imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        availableStock: 2000,
        specs: "EN 50618 Flame Retardant Tinned Copper 1500V DC Cable",
        defaultQty: 100,
        recommendedPerKw: 20,
        packInfo: "100 Meters Roll (Recommended for 5 kW - 10 kW Arrays)"
      },
      {
        id: "bos_item_ac_armoured_cable",
        name: "4.0 sq mm 4 Core Heavy Duty Armoured AC Cable",
        unitPrice: 180,
        unit: "Meter",
        icon: "🔌",
        imageUrl: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        availableStock: 1000,
        specs: "1100V Heavy Duty XLPE Armoured Copper Mains Cable",
        defaultQty: 30,
        recommendedPerKw: 6,
        packInfo: "30 Meters (Recommended for Inverter to Main LT Panel Run)"
      },
      {
        id: "bos_item_uv_cable_ties",
        name: "UV Stabilized Nylon Cable Ties (300mm x 4.8mm - Pack of 100)",
        unitPrice: 250,
        unit: "Pack",
        icon: "📎",
        imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        availableStock: 500,
        specs: "Polyamide 6.6 Heavy Duty Black UV Resistant Ties",
        defaultQty: 2,
        recommendedPerKw: 0.4,
        packInfo: "2 Packs (200 Ties - Recommended for Securing Cables on Rail Structure)"
      },
      {
        id: "bos_item_hdpe_conduit_pipe",
        name: "HDPE Flexible Conduit Pipe 25mm (Fire Retardant)",
        unitPrice: 35,
        unit: "Meter",
        icon: "🛠️",
        imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        availableStock: 1500,
        specs: "Double Wall Corrugated Outdoor Cable Conduit Protection Pipe",
        defaultQty: 40,
        recommendedPerKw: 8,
        packInfo: "40 Meters (Recommended for Outdoor Cable Protection Routing)"
      }
    ]
  },
  {
    group: "Earthing & Lightning Protection",
    icon: "⚓",
    items: [
      {
        id: "bos_item_earthing_rod_copper",
        name: "Maintenance-Free Copper Bonded Earthing Electrode (17.2mm x 3Mtr)",
        unitPrice: 3200,
        unit: "Set",
        icon: "⚓",
        imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        availableStock: 250,
        specs: "250 Micron Copper Coating Rod + 25kg Backfill Compound (BFC)",
        defaultQty: 3,
        recommendedPerKw: 0.6,
        packInfo: "3 Pit Sets (Dedicated Earth Pits for AC, DC, and LA System)"
      },
      {
        id: "bos_item_lightning_arrester_ese",
        name: "ESE Early Streamer Emission Lightning Arrester (107m Radius)",
        unitPrice: 6500,
        unit: "Set",
        icon: "⚡",
        imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        availableStock: 90,
        specs: "Class A ESE Air Terminal + 2-Meter FRP Insulating Mast & Clamps",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 System Set (Provides 100-Meter Protection Radius over Solar Roof)"
      },
      {
        id: "bos_item_copper_strip_25x3",
        name: "Pure Copper Earthing Strip 25mm x 3mm",
        unitPrice: 220,
        unit: "Meter",
        icon: "⚡",
        imageUrl: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1558441719-234757452558?w=400&auto=format&fit=crop&q=80",
        availableStock: 800,
        specs: "99.9% Electrolytic Tough Pitch High Conductivity Copper Strip",
        defaultQty: 25,
        recommendedPerKw: 5,
        packInfo: "25 Meters (Recommended for Main Grid Down Conductors)"
      }
    ]
  },
  {
    group: "Solar Mounting Structure Accessories",
    icon: "🏗️",
    items: [
      {
        id: "bos_item_hdg_structure_5kw",
        name: "Hot Dip Galvanized High Rise RCC Roof Mounting Structure (5kW Kit)",
        unitPrice: 14500,
        unit: "Set",
        icon: "🏗️",
        imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80",
        availableStock: 120,
        specs: "80 Micron HDG 2.0mm Column Channels (Wind Speed Rating 170 km/h)",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 Complete Kit (15° - 25° Optimal Tilt Angle for Indian Latitudes)"
      },
      {
        id: "bos_item_anodized_clamp_set",
        name: "Aluminum Anodized Mid & End Clamp Fastener Set (Pack of 20)",
        unitPrice: 850,
        unit: "Pack",
        icon: "⚙️",
        imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
        availableStock: 600,
        specs: "AL6063-T5 Anodized Aluminum with SS304 Bolts & EPDM Rubber Pads",
        defaultQty: 2,
        recommendedPerKw: 0.4,
        packInfo: "2 Packs (40 Clamps Total for Securing 10 Solar Modules)"
      }
    ]
  },
  {
    group: "Monitoring & Metering",
    icon: "📊",
    items: [
      {
        id: "bos_item_net_meter_3ph",
        name: "Bi-Directional Net Meter 3-Phase 10-60A (Class 1.0 Solar Net Meter)",
        unitPrice: 6800,
        unit: "Piece",
        icon: "📊",
        imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80",
        availableStock: 110,
        specs: "DLMS Compliant Smart Net Meter with Optical & RS485 Comm Ports",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 Meter Unit (DISCOM Approved for Net-Metering Grid Export)"
      },
      {
        id: "bos_item_wifi_data_logger",
        name: "Smart Solar Plant IoT Wi-Fi Data Logger Stick",
        unitPrice: 2400,
        unit: "Piece",
        icon: "📶",
        imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&auto=format&fit=crop&q=80",
        availableStock: 300,
        specs: "Plug-and-Play RS485 Wi-Fi Dongle for Real-Time App & Web Monitoring",
        defaultQty: 1,
        recommendedPerKw: 0.2,
        packInfo: "1 Stick Unit (Includes 5-Year Cloud Data Monitoring License)"
      }
    ]
  }
];

async function seedCustomBosCatalog() {
  try {
    console.log("🚀 Starting Real-Life Custom BOS Catalog Seeder...");

    // Clear existing collection
    await CustomBosCatalog.deleteMany({});
    console.log("🧹 Cleared existing custom_bos_catalog collection.");

    // Insert new curated catalog dataset
    const inserted = await CustomBosCatalog.insertMany(CATALOG_DATA);
    console.log(`✅ Successfully seeded ${inserted.length} Custom BOS Catalog groups into database!`);

    let totalItems = 0;
    inserted.forEach((groupDoc) => {
      console.log(`   📌 Group: "${groupDoc.group}" (${groupDoc.items.length} items)`);
      totalItems += groupDoc.items.length;
    });

    console.log(`\n🎉 Total ${totalItems} real-life Custom BOS Components active in database!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Custom BOS Catalog:", error);
    process.exit(1);
  }
}

seedCustomBosCatalog();
