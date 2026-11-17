/**
 * autoSeedEpcTypes.js
 *
 * Automatically seeds default EPC classification types if none exist.
 */

const { EpcType } = require('../modules/admin-panel/models/india_solarshop_db');

const DEFAULT_EPC_TYPES = [
  {
    name: 'Government Contractor',
    code: 'govt_contractor',
    description: 'EPC contractors executing state and central government solar tenders and municipal projects.',
    badge_color: 'purple',
    display_order: 1,
    is_active: true,
  },
  {
    name: 'Tender Bidder',
    code: 'tender_bidder',
    description: 'Contractors actively bidding on institutional, utility-scale, or PSU open solar tenders.',
    badge_color: 'blue',
    display_order: 2,
    is_active: true,
  },
  {
    name: 'New EPC',
    code: 'new_epc',
    description: 'Newly registered EPC installer entering the solar rooftop/commercial installation ecosystem.',
    badge_color: 'emerald',
    display_order: 3,
    is_active: true,
  },
  {
    name: 'Experienced EPC',
    code: 'experienced_epc',
    description: 'Established EPC contractor with proven track record and multiple MW rooftop completions.',
    badge_color: 'amber',
    display_order: 4,
    is_active: true,
  },
];

async function seedEpcTypesIfNeeded() {
  try {
    const count = await EpcType.countDocuments({ deleted_at: null });
    if (count === 0) {
      for (const t of DEFAULT_EPC_TYPES) {
        await EpcType.findOneAndUpdate(
          { code: t.code },
          { $setOnInsert: t },
          { upsert: true, new: true }
        );
      }
      console.log('✓ [autoSeedEpcTypes] Initialized default EPC Types successfully.');
    }
  } catch (err) {
    console.error('! [autoSeedEpcTypes] Error seeding EPC Types:', err.message);
  }
}

const mongoose = require('mongoose');

// Auto-run only once MongoDB is connected to avoid 10000ms buffering timeouts
const runSeeder = () => {
  seedEpcTypesIfNeeded().catch(() => {});
};

if (mongoose.connection.readyState === 1) {
  runSeeder();
} else {
  mongoose.connection.once('open', runSeeder);
}

module.exports = {
  seedEpcTypesIfNeeded,
  DEFAULT_EPC_TYPES,
};

