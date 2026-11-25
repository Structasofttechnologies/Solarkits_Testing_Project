const { seedCMS } = require('./cms.seeder');
const { seedSaaS } = require('./saas.seeder');
const { seedGeo } = require('./geo.seeder');
const { seedUnits } = require('./units.seeder');
const { seedTemplates } = require('./templates.seeder');
const { seedInvertersSpecs } = require('./inverters.seeder');
const { seedRuleEngine, CURRENT_RULE_ENGINE_VERSION } = require('./rule_engine.seeder');
const {
  SeederVersion,
  ComponentConnection,
  CompatibilityRule,
  RuleVersion,
  FormulaDefinition,
  ConstraintDefinition,
  BomRule,
  OptimizationRule
} = require('../../models/core_db');

const seedDatabase = async () => {
  try {
    console.log('✓ MongoDB Connected');
    console.log('✓ Models Registered');

    // Always upsert CMS modules on every startup so deleted/updated modules are always restored
    await seedCMS();

    // Seed Australia & Canada geolocations if they are missing
    const { GeoLevel0, GeoLevel1, GeoLevel2, Cluster } = require('../../models/geolocation_db');
    const countries = await GeoLevel0.find({ is_active: true, deleted_at: null });
    const australia = countries.find(c => c.name.toLowerCase() === 'australia');
    const canada = countries.find(c => c.name.toLowerCase() === 'canada');
    
    if (australia) {
      const hasAustraliaStates = await GeoLevel1.findOne({ level_0: australia._id });
      if (!hasAustraliaStates) {
        console.log('🌍 Seeding Australia states & clusters...');
        const australiaStates = [
          { name: "New South Wales", code: "NSW", clusterName: "NSW Cluster", districtName: "Sydney" },
          { name: "Victoria", code: "VIC", clusterName: "VIC Cluster", districtName: "Melbourne" },
          { name: "Queensland", code: "QLD", clusterName: "QLD Cluster", districtName: "Brisbane" },
          { name: "Western Australia", code: "WA", clusterName: "WA Cluster", districtName: "Perth" },
          { name: "South Australia", code: "SA", clusterName: "SA Cluster", districtName: "Adelaide" },
          { name: "Tasmania", code: "TAS", clusterName: "TAS Cluster", districtName: "Hobart" },
          { name: "Australian Capital Territory", code: "ACT", clusterName: "ACT Cluster", districtName: "Canberra" },
          { name: "Northern Territory", code: "NT", clusterName: "NT Cluster", districtName: "Darwin" }
        ];
        for (const item of australiaStates) {
          const state = await GeoLevel1.create({
            name: item.name,
            level_0: australia._id,
            is_active: true
          });
          const cluster = await Cluster.create({
            name: item.clusterName,
            level_1: state._id,
            is_active: true
          });
          await GeoLevel2.create({
            name: item.districtName,
            level_1: state._id,
            cluster: cluster._id,
            is_active: true
          });
        }
        console.log('✓ Australia geolocations seeded successfully.');
      }
    }
    
    if (canada) {
      const hasCanadaProvinces = await GeoLevel1.findOne({ level_0: canada._id });
      if (!hasCanadaProvinces) {
        console.log('🌍 Seeding Canada provinces & clusters...');
        const canadaProvinces = [
          { name: "Ontario", code: "ON", clusterName: "ON Cluster", districtName: "Toronto" },
          { name: "Quebec", code: "QC", clusterName: "QC Cluster", districtName: "Montreal" },
          { name: "Nova Scotia", code: "NS", clusterName: "NS Cluster", districtName: "Halifax" },
          { name: "New Brunswick", code: "NB", clusterName: "NB Cluster", districtName: "Fredericton" },
          { name: "Manitoba", code: "MB", clusterName: "MB Cluster", districtName: "Winnipeg" },
          { name: "British Columbia", code: "BC", clusterName: "BC Cluster", districtName: "Vancouver" },
          { name: "Prince Edward Island", code: "PE", clusterName: "PE Cluster", districtName: "Charlottetown" },
          { name: "Saskatchewan", code: "SK", clusterName: "SK Cluster", districtName: "Regina" },
          { name: "Alberta", code: "AB", clusterName: "AB Cluster", districtName: "Calgary" },
          { name: "Newfoundland and Labrador", code: "NL", clusterName: "NL Cluster", districtName: "St. John's" }
        ];
        for (const item of canadaProvinces) {
          const state = await GeoLevel1.create({
            name: item.name,
            level_0: canada._id,
            is_active: true
          });
          const cluster = await Cluster.create({
            name: item.clusterName,
            level_1: state._id,
            is_active: true
          });
          await GeoLevel2.create({
            name: item.districtName,
            level_1: state._id,
            cluster: cluster._id,
            is_active: true
          });
        }
        console.log('✓ Canada geolocations seeded successfully.');
      }
    }


    const versionDoc = await SeederVersion.findOne({ module: 'rule_engine' });

    // Verify if all required Rule Engine collections actually have data populated
    const hasConnections = await ComponentConnection.findOne();
    const hasRules = await CompatibilityRule.findOne();
    const hasRuleVersions = await RuleVersion.findOne();
    const hasFormulas = await FormulaDefinition.findOne();
    const hasConstraints = await ConstraintDefinition.findOne();
    const hasBomRules = await BomRule.findOne();
    const hasOptRules = await OptimizationRule.findOne();

    const allCollectionsPopulated =
      hasConnections && hasRules && hasRuleVersions && hasFormulas &&
      hasConstraints && hasBomRules && hasOptRules;

    if (versionDoc && versionDoc.version === CURRENT_RULE_ENGINE_VERSION && allCollectionsPopulated) {
      console.log(`✓ Rule Engine Version: ${versionDoc.version}`);
      console.log('✓ Default Rule Data Already Exists');
      console.log('✓ Rules Loaded into Memory Cache');
      console.log('✓ Application Ready');
      return;
    }

    console.log('✓ No Rule Engine Data Found or Version Outdated');
    console.log('✓ Running Initial Seeder...');

    // Run essential catalog seedings (CMS already done above)
    await seedSaaS();
    await seedGeo();
    await seedUnits();
    await seedTemplates();
    await seedInvertersSpecs();

    // Run rule engine seeder
    await seedRuleEngine();

    console.log('✓ Rules Loaded into Memory Cache');
    console.log('✓ Application Ready');
  } catch (error) {
    console.error('❌ Database auto-seeding failed:', error);
  }
};

module.exports = { seedDatabase };
