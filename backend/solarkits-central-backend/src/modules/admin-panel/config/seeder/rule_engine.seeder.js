const {
  ProductTemplate,
  ProductSubtype,
  SubtypeAttribute,
  ComponentConnection,
  CompatibilityRule,
  RuleVersion,
  FormulaDefinition,
  ConstraintDefinition,
  BomRule,
  OptimizationRule,
  SeederVersion
} = require('../../models/core_db');

const CURRENT_RULE_ENGINE_VERSION = '1.0.7';

const seedRuleEngine = async () => {
  try {
    console.log('✓ Checking Master Data...\n');

    // Check templates
    const templatesToCheck = ['Solar Panel', 'Inverter', 'ACDB', 'DCDB', 'Battery', 'Clamp', 'Rail', 'Cable'];
    const loadedTemplates = {};
    for (const tName of templatesToCheck) {
      const exists = await ProductTemplate.findOne({ name: tName, deleted_at: null });
      if (!exists) {
        console.error(`✗ Product Template '${tName}' not found`);
        console.error('✗ Seeder Aborted');
        console.error('✗ Rule Engine Initialization Failed');
        throw new Error(`Missing Product Template: ${tName}`);
      }
      loadedTemplates[tName] = exists;
    }
    console.log('✓ Product Templates Found');

    // Check subtypes
    const subtypesToCheck = ['Mono PERC', 'Bifacial', 'String', 'Micro', 'Hybrid'];
    for (const sName of subtypesToCheck) {
      const exists = await ProductSubtype.findOne({ name: sName, deleted_at: null });
      if (!exists) {
        console.error(`✗ Product Subtype '${sName}' not found`);
        console.error('✗ Seeder Aborted');
        console.error('✗ Rule Engine Initialization Failed');
        throw new Error(`Missing Product Subtype: ${sName}`);
      }
    }
    console.log('✓ Product Subtypes Found');

    // Check attributes
    const attributesToCheck = [
      'Voc', 'Vmp', 'Pmax', 'Isc', 'Imp',
      'Max DC Input Voltage', 'AC Output Current', 'MPPT Count',
      'Minimum Input Watt', 'Maximum Input Watt', 'Start-up Voltage'
    ];
    const loadedAttributes = {};
    for (const aName of attributesToCheck) {
      const exists = await SubtypeAttribute.findOne({ name: aName, deleted_at: null });
      if (!exists) {
        console.error(`✗ Attribute '${aName}' not found`);
        console.error('✗ Seeder Aborted');
        console.error('✗ Rule Engine Initialization Failed');
        throw new Error(`Missing Attribute: ${aName}`);
      }
      loadedAttributes[aName] = exists;
    }
    console.log('✓ Attributes Found\n');
    console.log('Proceeding with Rule Engine Seeder...');

    const panelTemplate = loadedTemplates['Solar Panel'];
    const inverterTemplate = loadedTemplates['Inverter'];
    const acdbTemplate = loadedTemplates['ACDB'];
    const dcdbTemplate = loadedTemplates['DCDB'];
    const batteryTemplate = loadedTemplates['Battery'];
    const clampTemplate = loadedTemplates['Clamp'];
    const railTemplate = loadedTemplates['Rail'];

    const panelVocAttr = loadedAttributes['Voc'];
    const inverterMaxDcAttr = loadedAttributes['Max DC Input Voltage'];
    const panelVmpAttr = loadedAttributes['Vmp'];
    const inverterMinInputWAttr = loadedAttributes['Minimum Input Watt'];
    const inverterMaxInputWAttr = loadedAttributes['Maximum Input Watt'];
    const inverterStartUpVoltageAttr = loadedAttributes['Start-up Voltage'];

    // 3. Upsert Component Connections (Topology Rules)
    const connections = [
      {
        parentTemplateId: panelTemplate._id,
        childTemplateId: inverterTemplate._id,
        states: [
          { conditionExpression: "parent.subtype == 'Hybrid'", lifecycleState: "Required" },
          { conditionExpression: "parent.subtype == 'String'", lifecycleState: "Required" },
          { conditionExpression: "parent.subtype == 'Micro'", lifecycleState: "Required" }
        ]
      },
      {
        parentTemplateId: inverterTemplate._id,
        childTemplateId: acdbTemplate._id,
        states: [
          { conditionExpression: null, lifecycleState: "Required" }
        ]
      },
      {
        parentTemplateId: inverterTemplate._id,
        childTemplateId: batteryTemplate._id,
        states: [
          { conditionExpression: "parent.subtype == 'Hybrid'", lifecycleState: "Required" },
          { conditionExpression: "parent.subtype == 'String'", lifecycleState: "Optional" },
          { conditionExpression: "parent.subtype == 'Micro'", lifecycleState: "Excluded" }
        ]
      },
      {
        parentTemplateId: inverterTemplate._id,
        childTemplateId: dcdbTemplate._id,
        states: [
          { conditionExpression: "parent.subtype == 'String'", lifecycleState: "Required" },
          { conditionExpression: "parent.subtype == 'Hybrid'", lifecycleState: "Required" },
          { conditionExpression: "parent.subtype == 'Micro'", lifecycleState: "Excluded" }
        ]
      }
    ];

    console.log('🚀 Seeding Component Connections topology...');
    for (const conn of connections) {
      await ComponentConnection.findOneAndUpdate(
        { parentTemplateId: conn.parentTemplateId, childTemplateId: conn.childTemplateId },
        { $set: conn },
        { upsert: true, new: true }
      );
    }
    console.log('  ✓ Component Connections Seeded');

    // 4. Upsert Compatibility Rules & Rule Versions
    console.log('🚀 Seeding Compatibility Rules & Expressions...');
    const ruleSpecs = [
      {
        name: 'Voc Voltage Match',
        description: 'Verifies panel open circuit voltage Voc meets inverter limit.',
        expressions: panelVocAttr && inverterMaxDcAttr ? [
          {
            parentAttributeId: panelVocAttr._id,
            operator: 'LT',
            childAttributeId: inverterMaxDcAttr._id,
            severity: 'error',
            errorMessageTemplate: 'Panel open circuit voltage Voc ({{parentVal}}V) exceeds Inverter Max DC Input Voltage ({{childVal}}V).'
          }
        ] : []
      },
      {
        name: 'Operating Vmp Match',
        description: 'Verifies panel operational Vmp stays within active MPPT bounds.',
        expressions: panelVmpAttr && inverterStartUpVoltageAttr ? [
          {
            parentAttributeId: panelVmpAttr._id,
            operator: 'BETWEEN',
            childAttributeId: inverterStartUpVoltageAttr._id, // acts as lower bound
            severity: 'warning',
            errorMessageTemplate: 'Panel Vmp ({{parentVal}}V) is outside the inverter optimal MPPT range.'
          }
        ] : []
      }
    ];

    for (const r of ruleSpecs) {
      const rule = await CompatibilityRule.findOneAndUpdate(
        { name: r.name },
        { $set: { name: r.name, description: r.description } },
        { upsert: true, new: true }
      );

      if (r.expressions.length > 0) {
        await RuleVersion.findOneAndUpdate(
          { ruleId: rule._id, version: '1.0.0' },
          {
            $set: {
              ruleId: rule._id,
              version: '1.0.0',
              electricalStandard: 'IEC',
              effectiveDate: new Date(),
              status: 'active',
              expressions: r.expressions
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('  ✓ Compatibility Rules Seeded');

    // 5. Upsert Formula Definitions
    console.log('🚀 Seeding Formula Definitions...');
    const formulas = [
      {
        name: 'Micro-Inverter Quantity',
        expression: 'ceil(panel_count / input_ports)',
        outputType: 'integer',
        version: '1.0.0',
        description: 'Calculates the count of micro-inverters required based on panel qty and inverter ports.',
        variables: [
          { variableName: 'panel_count', sourceType: 'system_metric' },
          { variableName: 'input_ports', sourceType: 'sku_attribute' }
        ]
      },
      {
        name: 'End Clamps Quantity',
        expression: 'rail_rows * 4',
        outputType: 'integer',
        version: '1.0.0',
        description: 'Computes end structural clamps requirement.',
        variables: [
          { variableName: 'rail_rows', sourceType: 'user_input' }
        ]
      }
    ];

    for (const f of formulas) {
      await FormulaDefinition.findOneAndUpdate(
        { name: f.name, version: f.version },
        { $set: f },
        { upsert: true, new: true }
      );
    }
    console.log('  ✓ Formula Definitions Seeded');

    // 6. Upsert BOM Rules mapping
    console.log('🚀 Seeding BOM Rules mappings...');
    const clampFormula = await FormulaDefinition.findOne({ name: 'End Clamps Quantity' });
    if (clampTemplate && clampFormula) {
      await BomRule.findOneAndUpdate(
        { productTemplateId: clampTemplate._id },
        {
          $set: {
            productTemplateId: clampTemplate._id,
            formulaId: clampFormula._id,
            isActive: true
          }
        },
        { upsert: true, new: true }
      );
    }
    console.log('  ✓ BOM Rules Seeded');

    // 7. Upsert Optimization Rules
    console.log('🚀 Seeding Optimization Rules...');
    const optRules = [
      {
        goalType: 'lowest_cost',
        weightPercentage: 50.00,
        scoringFormula: '(1 / sku.price) * weight'
      },
      {
        goalType: 'highest_efficiency',
        weightPercentage: 50.00,
        scoringFormula: 'sku.efficiency * weight'
      }
    ];

    for (const opt of optRules) {
      await OptimizationRule.findOneAndUpdate(
        { goalType: opt.goalType },
        { $set: opt },
        { upsert: true, new: true }
      );
    }
    console.log('  ✓ Optimization Rules Seeded');

    // 7b. Upsert Constraint Definitions
    console.log('🚀 Seeding Constraint Definitions...');
    await ConstraintDefinition.findOneAndUpdate(
      { name: 'Max Panel Structural Weight' },
      {
        $set: {
          name: 'Max Panel Structural Weight',
          expression: 'panel_qty * panel_weight < max_roof_load',
          errorMessage: 'Total structural weight of solar panels exceeds the max roof load limits.'
        }
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Constraint Definitions Seeded');

    // 8. Write Seeder Version metadata to database
    await SeederVersion.findOneAndUpdate(
      { module: 'rule_engine' },
      {
        $set: {
          module: 'rule_engine',
          version: CURRENT_RULE_ENGINE_VERSION,
          seededAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    console.log('✓ Seeder Completed Successfully');
  } catch (error) {
    console.error('❌ Error seeding Rule Engine:', error);
    throw error;
  }
};

module.exports = { seedRuleEngine, CURRENT_RULE_ENGINE_VERSION };
