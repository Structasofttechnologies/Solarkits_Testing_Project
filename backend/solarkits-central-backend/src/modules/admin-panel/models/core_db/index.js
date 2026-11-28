module.exports = {
  UnitGroup: require('./unit_groups.schema'),
  Unit: require('./units.schema'),
  ProductTemplate: require('./product_templates.schema'),
  ProductSubtype: require('./product_subtypes.schema'),
  SubtypeAttributeGroup: require('./subtype_attribute_groups.schema'),
  SubtypeAttribute: require('./subtype_attributes.schema'),
  AttributeOption: require('./attribute_options.schema'),
  Brand: require('./brands.schema'),
  BrandSubtypeMap: require('./brand_subtype_map.schema'),
  CompanyCustomersType: require('./company_customers_types.schema'),
  Product: require('./products.schema'),
  ProductAttributeValue: require('./product_attribute_values.schema'),
  ProductScopeMap: require('./product_scope_map.schema'),
  ProductSku: require('./product_skus.schema'),
  ProjectCategory: require('./project_categories.schema'),
  ProjectSubcategory: require('./project_subcategories.schema'),
  ProjectType: require('./project_types.schema'),
  ProjectSubcategoryType: require('./project_subcategory_types.schema'),
  ProjectRange: require('./project_range.schema'),
  SubtypeScopeMap: require('./subtype_scope_map.schema'),
  SolarKit: require('./solar_kits.schema'),
  WarehouseComboKit: require('./combo_kits.schema'),
  BrandTemplateMap: require('./brand_template_map.schema'),
  ProductSkuPrice: require('./product_sku_prices.schema'),
  PoSetting: require('./po_settings.schema'),
  CompanyMargin: require('./company_margin.schema'),
  BulkKitSetting: require('./bulk_kit_settings.schema'),
  WarehouseKitActivation: require('./warehouse_kit_activations.schema'),
  PurchaseOrder: require('./purchase_order.schema'),
  OrderSetting: require('./order_settings.schema'),
  BenchmarkPriceRequest: require('./BenchmarkPriceRequest.schema'),

  // Rule Engine Models
  ComponentConnection: require('./component_connections.schema'),
  CompatibilityRule: require('./compatibility_rules.schema'),
  RuleVersion: require('./rule_versions.schema'),
  FormulaDefinition: require('./formula_definitions.schema'),
  ConstraintDefinition: require('./constraint_definitions.schema'),
  BomRule: require('./bom_rules.schema'),
  OptimizationRule: require('./optimization_rules.schema'),
  ValidationLog: require('./validation_logs.schema'),
  SeederVersion: require('./seeder_versions.schema'),
  ComboKitVariant: require('./combo_kit_variants.schema'),

  // --- Phase 1: Reseller Management Masters ---
  IndustryType: require('./industry_types.schema'),
  ProjectTypeIndustryMap: require('./project_type_industry_maps.schema'),

  // --- Industry Content Management System ---
  IndustryContent: require('./industry_content.schema'),
  IndustryContentIndustryMap: require('./industry_content_industry_map.schema'),
  IndustryContentMedia: require('./industry_content_media.schema'),
  IndustryTheme: require('./industry_theme.schema'),
  UserIndustryMap: require('./user_industry_map.schema'),
  IndustryContentAnalytics: require('./industry_content_analytics.schema'),

  // --- Website Landing Page CMS ---
  WebsiteContent: require('./website_content.schema'),

  // --- State-wise Cluster & Warehouse Routing ---
  RegionalCluster: require('./regional_cluster.schema'),
  WarehouseClusterMapping: require('./warehouse_cluster_mapping.schema'),
  WarehouseKitCapability: require('./warehouse_kit_capability.schema'),

  // --- OEM Partner Product Assignment ---
  OemPartnerProduct: require('./oem_partner_products.schema'),
  WarehouseKitPartnerMapping: require('./warehouse_kit_partner_mapping.schema'),

  // --- Product & Combined Kit Datasheet Management ---
  DatasheetDesignSetting: require('./datasheet_design_settings.schema'),
};
