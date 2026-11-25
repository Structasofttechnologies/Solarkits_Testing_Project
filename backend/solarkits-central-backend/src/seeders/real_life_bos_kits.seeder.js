/**
 * ============================================================
 *  REAL-LIFE SOLAR BOS KITS & PRODUCT CATALOG SEEDER
 * ============================================================
 *  Seeds:
 *  1. Pre-Configured Balance of System (BOS) Kits (`bos_kits` collection)
 *  2. Customizable BOS Component Groups (`custom_bos_catalog` collection)
 *  3. Distinct Base Equipment & Components in `products` (Panels, Inverters, Batteries, Cables)
 *     (WITHOUT duplicate BOS kits)
 * ============================================================
 *  Run command: node src/seeders/real_life_bos_kits.seeder.js
 * ============================================================
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

// Connect databases
require('../keys/config/databases');
const BosKit = require('../modules/solarshop-india/models/india_solarshop_db/bos_kits.schema');
const CustomBosCatalog = require('../modules/solarshop-india/models/india_solarshop_db/custom_bos_catalog.schema');
const { Product, Brand } = require('../modules/admin-panel/models/core_db');

const REAL_LIFE_BOS_KITS = [
  {
    name: "1 kW - 3 kW Single Phase Residential BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Single Phase",
    systemType: "On-Grid & Hybrid",
    projectRange: "1kw-3kw",
    comboKitType: "Standard Residential",
    ourPrice: 8500,
    marketPrice: 12500,
    inStock: true,
    availableStock: 45,
    warranty: "5 Years Replacement",
    badge: "Certified BOS Kit",
    imageUrl: "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 42,
    components: [
      "1-In-1-Out 1000V DCDB Box (16A Fuse + Type II SPD)",
      "Single Phase 32A ACDB Enclosure with Rotary Isolator",
      "4.0 sq mm TUV Solar DC Cable (30 Meters Red/Black)",
      "MC4 Solar Connectors (4 Pairs IP68 1500V)",
      "14.2mm x 3m Copper Bonded Earthing Rod with 10kg BFC",
      "Pure Copper Earthing Strip 25x3mm (15 Meters)",
      "Mini Rail Aluminum MMS Fastener Pack"
    ],
    specifications: {
      "Enclosure Rating": "IP65 Weatherproof UV Stabilized",
      "Operating Voltage": "1000V DC / 240V AC",
      "Surge Protection": "Type II 40kA DC / 275V AC SPD",
      "Certification": "BIS & MNRE Approved",
      "Standards Compliance": "IEC 61439 / EN 50618 / IS 3043"
    }
  },
  {
    name: "3 kW - 5 kW Heavy Duty Dual-String Residential BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Single Phase",
    systemType: "On-Grid & Hybrid",
    projectRange: "3kw-5kw",
    comboKitType: "Pre-Wired Plug & Play",
    ourPrice: 18500,
    marketPrice: 25000,
    inStock: true,
    availableStock: 38,
    warranty: "5 Years Replacement",
    badge: "Best Seller",
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 89,
    components: [
      "2-In-2-Out 1000V DCDB Box (Dual MPPT Protection with 600V SPD)",
      "32A Single Phase ACDB with Rotary Isolator & Type II AC SPD",
      "4.0 sq mm UV Solar DC Cable (60 Meters Red & Black)",
      "MC4 Connectors (8 Pairs IP68 1500V Rated)",
      "17.2mm x 3m Copper Bonded Chemical Earthing Rods (2 Sets + 25kg BFC)",
      "ESE Lightning Arrester Kit with 2-Meter FRP Mast",
      "Hot Dip Galvanized RCC Roof Mounting Structure Fastener Kit"
    ],
    specifications: {
      "Enclosure Rating": "IP65 Polycarbonate UV Stabilized Enclosure",
      "SPD Rating": "Type II 40kA 1000V DC / 275V AC",
      "Earthing Resistance": "< 2 Ohms with Backfill Compound",
      "Standards Compliance": "IS 3043 / IEC 62305 / IEC 61439"
    }
  },
  {
    name: "5 kW - 10 kW Three Phase Commercial BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Three Phase",
    systemType: "Commercial 3-Phase",
    projectRange: "10kw-25kw",
    comboKitType: "Heavy Duty Industrial",
    ourPrice: 38500,
    marketPrice: 52000,
    inStock: true,
    availableStock: 25,
    warranty: "5 Years Replacement",
    badge: "Commercial Grade",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 64,
    components: [
      "4-In-4-Out 1000V DCDB Enclosure with 32A DC Fuses & 1000V SPDs",
      "63A 4-Pole Three Phase ACDB with Surge Suppressor & Rotary Switch",
      "6.0 sq mm Single Core TUV Solar DC Cable (120 Meters)",
      "MC4 Multi-Contact Connectors (16 Pairs 1500V)",
      "3x Maintenance-Free Earthing Pits (Electrode + 25kg BFC Compound)",
      "Early Streamer Emission (ESE) LA Terminal (107m Protection Radius)",
      "4-Core 4.0 sq mm Heavy Duty Armoured AC Cable (30 Meters)"
    ],
    specifications: {
      "Enclosure Rating": "IP65 Powder Coated CRCA Sheet / Polycarbonate",
      "DC Operating Voltage": "1000V DC Max",
      "AC Voltage": "415V 3-Phase + Neutral (50Hz)",
      "Certification": "CPRI Tested & MNRE Compliant"
    }
  },
  {
    name: "10 kW - 25 kW C&I Industrial Turnkey BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Three Phase",
    systemType: "Commercial 3-Phase",
    projectRange: "10kw-25kw",
    comboKitType: "Heavy Duty Industrial",
    ourPrice: 78000,
    marketPrice: 98000,
    inStock: true,
    availableStock: 18,
    warranty: "5 Years Replacement",
    badge: "Industrial Grade",
    imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 37,
    components: [
      "8-In-8-Out DC Combiner Box with Monitoring Shunts",
      "100A MCCB AC Distribution LT Panel with Digital Energy Meter",
      "6.0 sq mm & 10.0 sq mm Solar DC Cable Drums (200 Meters)",
      "4x Chemical Earthing Electrodes with Test Link Chamber",
      "ESE Lightning Protection Air Terminal with Strike Counter",
      "HDPE Double Wall Corrugated Conduits (80m) & UV Cable Trays"
    ],
    specifications: {
      "Short Circuit Withstand": "25kA for 1 sec",
      "Busbar Material": "Electrolytic Grade ETP Copper Tinned",
      "Isolation Switch": "Motorized / Manual DC Load Break Switch",
      "Standards Compliance": "IEC 61439-1&2 / IS 8623"
    }
  },
  {
    name: "25 kW - 100 kW Mega Power Plant Turnkey BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Three Phase",
    systemType: "Commercial 3-Phase",
    projectRange: "25kw-100kw",
    comboKitType: "High Wind Rated",
    ourPrice: 165000,
    marketPrice: 210000,
    inStock: true,
    availableStock: 12,
    warranty: "5 Years Replacement",
    badge: "Utility Master",
    imageUrl: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=80",
    rating: 5.0,
    reviewsCount: 22,
    components: [
      "16-In-16-Out Intelligent Smart Combiner Box (String Monitoring)",
      "250A Industrial LT Distribution Panel with Multi-Function Meter",
      "16.0 sq mm Solar DC Cables & Heavy Duty AC Armoured Cables",
      "6x Dedicated Copper Bonded Earth Pits with Heavy Duty Inspection Covers",
      "Dual ESE Lightning Protection Network with Copper Down Conductors",
      "Industrial Bi-Directional TOD Net Meter with DLMS Optical Comm"
    ],
    specifications: {
      "String Monitoring": "Modbus RS485 Real-time Current/Voltage",
      "Enclosure Type": "IP66 Fibreglass Reinforced Polyester (FRP)",
      "Surge Capacity": "Type 1+2 50kA DC / AC SPDs",
      "Warranty": "5 Years Factory Replacement Warranty"
    }
  },
  {
    name: "Solar Water Pump (3HP - 7.5HP) VFD & BOS Kit",
    category: "Agriculture & Solar Pumps",
    subCategory: "Three Phase",
    systemType: "Solar Water Pump",
    projectRange: "3kw-5kw",
    comboKitType: "Standard Residential",
    ourPrice: 24500,
    marketPrice: 32000,
    inStock: true,
    availableStock: 30,
    warranty: "3 Years Replacement",
    badge: "PM-KUSUM Approved",
    imageUrl: "https://images.unsplash.com/photo-1548611716-ad022c4f6990?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1548611716-ad022c4f6990?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviewsCount: 53,
    components: [
      "IP65 Solar Pump VFD Controller Enclosure (3HP-7.5HP)",
      "DC Rotary Isolator 1000V 32A with Lockout Tagout",
      "Dry Run Sensor & Tank Overflow Float Switch Kit",
      "6.0 sq mm Flexible Submersible Flat Cable (50 Meters)",
      "Dedicated Motor Surge Suppressor (SPD) & Lightning Protection Unit"
    ],
    specifications: {
      "Pump Compatibility": "3HP to 7.5HP AC Submersible/Surface Pump",
      "Input Voltage Range": "350V - 750V DC MPPT Range",
      "Protection Suite": "Overvoltage, Undervoltage, Dry-Run, Phase Reversal"
    }
  },
  {
    name: "Microinverter Quad-Array Turnkey BOS Kit",
    category: "Complete BOS Combos",
    subCategory: "Single Phase",
    systemType: "On-Grid & Hybrid",
    projectRange: "1kw-3kw",
    comboKitType: "Pre-Wired Plug & Play",
    ourPrice: 14500,
    marketPrice: 19500,
    inStock: true,
    availableStock: 25,
    warranty: "5 Years Replacement",
    badge: "Plug & Play",
    imageUrl: "https://images.unsplash.com/photo-1558441719-f266205886d3?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1558441719-f266205886d3?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 31,
    components: [
      "Microinverter AC Bus Trunk Cable (4 Drop Ports)",
      "End Cap & Waterproof Trunk Branch Connectors (IP68)",
      "Microinverter AC Disconnect Box with 25A RCBO",
      "Wi-Fi / Zigbee Smart Energy Gateway for Module-Level Monitoring",
      "Universal Module Frame Rail Mount Brackets (Set of 8)"
    ],
    specifications: {
      "Output Voltage": "230V AC Single Phase",
      "Protection": "Integrated 30mA RCD + 275V Type II SPD",
      "Cable Rating": "UV Resistant TUV Certified AC Trunk"
    }
  },
  {
    name: "Off-Grid & Hybrid Battery Disconnect BOS Kit",
    category: "Protection & AC/DC Boxes",
    subCategory: "Heavy Duty",
    systemType: "On-Grid & Hybrid",
    projectRange: "3kw-5kw",
    comboKitType: "Heavy Duty Industrial",
    ourPrice: 12800,
    marketPrice: 17500,
    inStock: true,
    availableStock: 40,
    warranty: "5 Years Replacement",
    badge: "Essential Protection",
    imageUrl: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviewsCount: 45,
    components: [
      "250A NH00 High-Speed DC Battery Fuse Switch Disconnector",
      "35.0 sq mm Ultra-Flexible Copper Battery Interconnect Cables (2m Pair)",
      "Heavy Duty LFP / Lead-Acid Battery Terminal Shrouds & Lugs",
      "Class II DC Surge Protection Module 48V-100V DC"
    ],
    specifications: {
      "Continuous Current Rating": "250A DC Max",
      "Interrupting Capacity": "100kA at 80V DC",
      "Cable Insulation": "Double Insulated EPDM Flexible Copper"
    }
  }
];

const REAL_LIFE_CUSTOM_CATALOG = [
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
    group: "Cables & Wiring Accessories",
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
        id: "bos_item_mc4_connectors_pack",
        name: "IP68 1500V MC4 Solar Connectors (Pack of 10 Pairs)",
        unitPrice: 650,
        unit: "Pack",
        icon: "🔌",
        imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
        availableStock: 800,
        specs: "TUV Certified 1500V DC Copper Silver Plated Pin Connectors",
        defaultQty: 2,
        recommendedPerKw: 0.4,
        packInfo: "2 Packs (20 Pairs for String Termination)"
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
    group: "Earthing & Protection Systems",
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
    group: "Mounting Structure Hardware",
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
      },
      {
        id: "bos_item_short_rail_tinshed",
        name: "Tin Shed Trapezoidal Mini Rail Mount Kit with EPDM Gasket (Set of 10)",
        unitPrice: 1200,
        unit: "Set",
        icon: "🏗️",
        imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80",
        image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80",
        availableStock: 450,
        specs: "High Grade Aluminum 150mm Mini Rail with Self-Drilling Screws",
        defaultQty: 2,
        recommendedPerKw: 0.4,
        packInfo: "2 Sets (20 Mini Rails for Metal Roof Sheet Installation)"
      }
    ]
  }
];

// Standalone real-world solar hardware products (Panels, Inverters, Batteries, Cables)
const STANDALONE_PRODUCTS = [
  {
    name: "Tata Power Solar 540W Mono PERC Module",
    sku_code: "TPS-MP-540W",
    category: "panels",
    description: "Tata Power Solar 540W high-efficiency Mono PERC solar module with 144 half-cut cells and multi-busbar technology.",
    image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 1120000,
    mrp: 13500,
    stock_quantity: 120,
    specifications: {
      "Wattage": "540W",
      "Cell Type": "Mono PERC 144 Half-Cut",
      "Module Efficiency": "21.3%",
      "Dimensions": "2278 x 1134 x 35 mm",
      "Warranty": "25 Years Performance Warranty"
    },
    features: ["BIS Certified", "ALMM Listed Tier 1", "Anti-PID Technology", "IP68 Junction Box"]
  },
  {
    name: "Waaree Energies 550W Bifacial TOPCon Module",
    sku_code: "WAR-BIF-550W",
    category: "panels",
    description: "Waaree Energies 550W dual-glass bifacial N-type TOPCon solar panel with up to 25% rear side power gain.",
    image: "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 1260000,
    mrp: 15200,
    stock_quantity: 200,
    specifications: {
      "Wattage": "550W",
      "Cell Type": "N-Type TOPCon Dual Glass",
      "Module Efficiency": "22.5%",
      "Bifacial Gain": "Up to 25%",
      "Warranty": "30 Years Performance Warranty"
    },
    features: ["Dual Glass Framed", "High Wind & Snow Load", "ALMM Listed", "0 to +5W Positive Tolerance"]
  },
  {
    name: "Adani Solar 580W TOPCon High Efficiency Module",
    sku_code: "AD-TOP-580W",
    category: "panels",
    description: "Adani Solar 580W ultra-high power N-Type TOPCon module for commercial rooftop and utility installations.",
    image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 1390000,
    mrp: 16800,
    stock_quantity: 150,
    specifications: {
      "Wattage": "580W",
      "Technology": "N-Type TOPCon 144 Cells",
      "Module Efficiency": "22.8%",
      "Temperature Coefficient": "-0.30%/°C",
      "Warranty": "25 Years Linear Power Warranty"
    },
    features: ["BIS & IEC 61215 Approved", "High Temperature Resistance", "Tier 1 Indian Manufacturer"]
  },
  {
    name: "Havells 3kW Single Phase String Inverter",
    sku_code: "HAV-STR-3KW",
    category: "inverters",
    description: "Havells Enviro 3kW Single-Phase Dual MPPT On-Grid Solar Inverter with integrated Wi-Fi cloud data logger.",
    image: "https://images.unsplash.com/photo-1548611716-ad022c4f6990?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 2850000,
    mrp: 34000,
    stock_quantity: 60,
    specifications: {
      "Capacity": "3kW",
      "Grid Phase": "Single Phase (230V AC)",
      "MPPT Trackers": "Dual MPPT",
      "Max Efficiency": "97.8%",
      "Warranty": "10 Years Replacement Warranty"
    },
    features: ["IP65 Weatherproof", "Real-Time Mobile App Monitoring", "Built-in DC Disconnect Switch"]
  },
  {
    name: "Havells 5kW Single Phase Dual-MPPT Inverter",
    sku_code: "HAV-STR-5KW",
    category: "inverters",
    description: "Havells Enviro 5kW On-Grid Inverter featuring dual independent MPPT trackers and natural convection cooling.",
    image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 3950000,
    mrp: 48000,
    stock_quantity: 75,
    specifications: {
      "Capacity": "5kW",
      "Grid Phase": "Single Phase (230V AC)",
      "Max DC Voltage": "600V DC",
      "Max Efficiency": "98.2%",
      "Warranty": "10 Years Replacement Warranty"
    },
    features: ["Zero Export Capability", "Smart I-V Curve Diagnostics", "Compact & Lightweight Design"]
  },
  {
    name: "Growatt 10kW Three Phase Hybrid Storage Inverter",
    sku_code: "GRO-HYB-10KW",
    category: "inverters",
    description: "Growatt SPH 10kW 3-Phase Hybrid Inverter with battery storage integration and seamless <10ms UPS switching.",
    image: "https://images.unsplash.com/photo-1558441719-f266205886d3?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 6900000,
    mrp: 85000,
    stock_quantity: 35,
    specifications: {
      "Capacity": "10kW",
      "Grid Phase": "Three Phase (415V AC)",
      "Battery Chemistry": "LiFePO4 (LFP) / Lead-Carbon",
      "UPS Switching Time": "< 10ms",
      "Warranty": "10 Years Replacement Warranty"
    },
    features: ["Dual MPPT Trackers", "VPP & Microgrid Ready", "Integrated Smart Meter Interface"]
  },
  {
    name: "Exide 10.24kWh Wall-Mount LFP Battery Pack",
    sku_code: "EXI-LFP-10KW",
    category: "batteries",
    description: "Exide PowerPro 10.24kWh 51.2V 200Ah Wall-Mount Lithium Iron Phosphate (LiFePO4) solar storage battery pack.",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&auto=format&fit=crop&q=80",
    base_price_paise: 13500000,
    mrp: 165000,
    stock_quantity: 25,
    specifications: {
      "Capacity": "10.24kWh (51.2V 200Ah)",
      "Battery Chemistry": "LiFePO4 (LFP)",
      "Cycle Life": "6000+ Cycles @ 80% DoD",
      "Continuous Discharge": "100A",
      "Warranty": "10 Years Replacement Warranty"
    },
    features: ["Built-in Smart BMS with CAN/RS485", "Modular Scalable up to 15 Units in Parallel", "Over-charge & Thermal Protection"]
  }
];

async function seedRealLifeBosData() {
  try {
    console.log("🚀 Starting Comprehensive Clean Real-Life BOS Kits & Hardware Seeder...");

    // 1. Seed Pre-configured BOS Kits
    await BosKit.deleteMany({});
    const insertedKits = await BosKit.insertMany(REAL_LIFE_BOS_KITS);
    console.log(`✅ Successfully seeded ${insertedKits.length} Real-Life Pre-Configured BOS Kits into 'bos_kits'!`);
    insertedKits.forEach(k => {
      console.log(`   📦 [${k.category}] ${k.name} -> Our Price: ₹${k.ourPrice.toLocaleString('en-IN')} | MRP: ₹${k.marketPrice.toLocaleString('en-IN')}`);
    });

    // 2. Seed Custom BOS Catalog
    await CustomBosCatalog.deleteMany({});
    const insertedCatalog = await CustomBosCatalog.insertMany(REAL_LIFE_CUSTOM_CATALOG);
    console.log(`\n✅ Successfully seeded ${insertedCatalog.length} Custom BOS Catalog groups into 'custom_bos_catalog'!`);

    // 3. Clear all old duplicate BOS kit entries from `products` collection in core_db
    console.log("\n🧹 Cleaning old duplicate BOS items from Core DB 'products' collection...");
    await Product.deleteMany({});

    // 4. Seed authentic standalone Panels, Inverters, and Batteries
    console.log("📦 Seeding authentic standalone Panels, Inverters & Storage into 'products' collection...");
    for (const p of STANDALONE_PRODUCTS) {
      await Product.create({
        name: p.name,
        sku_code: p.sku_code,
        category: p.category,
        description: p.description,
        features: p.features,
        image: p.image,
        base_price_paise: p.base_price_paise,
        min_margin_paise: Math.round(p.base_price_paise * 0.08),
        max_margin_paise: Math.round(p.base_price_paise * 0.30),
        tax_rate_pct: 18,
        stock_quantity: p.stock_quantity,
        specifications: p.specifications,
        is_active: true,
        status: 'active'
      });
      console.log(`   ⚡ Created Core Equipment: "${p.name}" (SKU: ${p.sku_code})`);
    }

    console.log("\n🎉 Full Real-Life BOS Kits & Standalone Products cleanly seeded without duplicates!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error in seedRealLifeBosData:", error);
    process.exit(1);
  }
}

seedRealLifeBosData();
