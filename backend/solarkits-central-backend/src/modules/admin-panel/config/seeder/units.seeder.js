const { UnitGroup, Unit } = require('../../models/core_db');

const seedUnits = async () => {
  console.log('📐 Seeding System Unit Groups and Units...');

  // Convention: conversion_factor = how many BASE UNITS does 1 of this unit equal
  const unitData = [
    {
      name: "Power",
      purpose: "product_attribute",   // used as attribute unit (capacity)
      units: [
        { name: "Watt", symbol: "W", is_base_unit: true, conversion_factor: 1 },
        { name: "Kilowatt", symbol: "kW", is_base_unit: false, conversion_factor: 1000 },
        { name: "Megawatt", symbol: "MW", is_base_unit: false, conversion_factor: 1000000 }
      ]
    },
    {
      name: "Voltage",
      purpose: "product_attribute",
      units: [
        { name: "Volt", symbol: "V", is_base_unit: true, conversion_factor: 1 },
        { name: "Kilovolt", symbol: "kV", is_base_unit: false, conversion_factor: 1000 }
      ]
    },
    {
      name: "Current",
      purpose: "product_attribute",
      units: [
        { name: "Ampere", symbol: "A", is_base_unit: true, conversion_factor: 1 },
        { name: "Milliampere", symbol: "mA", is_base_unit: false, conversion_factor: 0.001 }
      ]
    },
    {
      name: "Energy",
      purpose: "product_attribute",
      units: [
        { name: "Watt-hour", symbol: "Wh", is_base_unit: true, conversion_factor: 1 },
        { name: "Kilowatt-hour", symbol: "kWh", is_base_unit: false, conversion_factor: 1000 },
        { name: "Ampere-hour", symbol: "Ah", is_base_unit: false, conversion_factor: 3600 }
      ]
    },
    {
      name: "Mass",
      purpose: "product_attribute",
      units: [
        { name: "Kilogram", symbol: "kg", is_base_unit: true, conversion_factor: 1 },
        { name: "Gram", symbol: "g", is_base_unit: false, conversion_factor: 0.001 }
      ]
    },
    {
      name: "Length",
      purpose: "product_attribute",   // used for dimensions/size attributes
      units: [
        { name: "Millimeter", symbol: "mm", is_base_unit: true, conversion_factor: 1 },
        { name: "Centimeter", symbol: "cm", is_base_unit: false, conversion_factor: 10 },
        { name: "Meter", symbol: "m", is_base_unit: false, conversion_factor: 1000 },
        { name: "Foot", symbol: "ft", is_base_unit: false, conversion_factor: 304.8 },
        { name: "Inch", symbol: "in", is_base_unit: false, conversion_factor: 25.4 }
      ]
    },
    {
      name: "Dimensions",
      purpose: "product_attribute",   // used for physical dimensions, sizes, cross sections and area
      units: [
        { name: "Square Meter", symbol: "m²", is_base_unit: true, conversion_factor: 1 },
        { name: "Square Foot", symbol: "sq.ft", is_base_unit: false, conversion_factor: 0.0929 },
        { name: "Square Millimeter", symbol: "mm²", is_base_unit: false, conversion_factor: 0.000001 },
        { name: "Millimeter", symbol: "mm", is_base_unit: false, conversion_factor: 1 },
        { name: "Meter", symbol: "m", is_base_unit: false, conversion_factor: 1000 }
      ]
    },
    {
      name: "Angle",
      purpose: "product_attribute",   // used for panel tilt / mounting angle
      units: [
        { name: "Degree", symbol: "°", is_base_unit: true, conversion_factor: 1 }
      ]
    },
    {
      name: "Temperature",
      purpose: "product_attribute",
      units: [
        { name: "Celsius", symbol: "°C", is_base_unit: true, conversion_factor: 1 },
        { name: "Fahrenheit", symbol: "°F", is_base_unit: false, conversion_factor: 1 },
        { name: "Kelvin", symbol: "K", is_base_unit: false, conversion_factor: 1 }
      ]
    },
    {
      name: "Performance",
      purpose: "product_attribute",   // efficiency, power factor
      units: [
        { name: "Percentage", symbol: "%", is_base_unit: true, conversion_factor: 1 }
      ]
    },
    // ── Quantity / Counting ──────────────────────────────────────────────────
    // Used for product quantity tracking (how many of this product type in an order)
    {
      name: "Count",
      purpose: "quantity",           // drives qty_unit_id on subtypes
      units: [
        { name: "Piece", symbol: "nos", is_base_unit: true, conversion_factor: 1 },
        { name: "Set", symbol: "set", is_base_unit: false, conversion_factor: 1 }
      ]
    }
  ];

  for (const group of unitData) {
    let ug = await UnitGroup.findOne({ name: group.name });
    if (!ug) {
      ug = await UnitGroup.create({ name: group.name, is_system: true });
      console.log(`  ✓ System Unit Group '${group.name}' seeded.`);
    } else {
      if (!ug.is_system) {
        await UnitGroup.updateOne({ _id: ug._id }, { $set: { is_system: true } });
        console.log(`  ✓ Unit Group '${group.name}' updated with is_system: true.`);
      }
    }

    for (const u of group.units) {
      let unitDoc = await Unit.findOne({ name: u.name, unit_group_id: ug._id });
      if (!unitDoc) {
        await Unit.create({
          ...u,
          unit_group_id: ug._id,
          is_system: true
        });
        console.log(`    ✓ System Unit '${u.name}' (${u.symbol}) seeded.`);
      } else {
        if (!unitDoc.is_system) {
          await Unit.updateOne({ _id: unitDoc._id }, { $set: { is_system: true } });
          console.log(`    ✓ Unit '${u.name}' updated with is_system: true.`);
        }
      }
    }
  }

  console.log('✅ Unit Groups and Units Seeding completed.');
};

module.exports = { seedUnits };
