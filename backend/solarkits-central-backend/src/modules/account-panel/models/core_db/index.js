const Brand = require('./brands.schema');
const ProductTemplate = require('./product_templates.schema');
const ProductSubtype = require('./product_subtypes.schema');
const Product = require('./products.schema');
const ProductSku = require('./product_skus.schema');
const ProductSkuPrice = require('./product_sku_prices.schema');
const ProductAttributeValue = require('./product_attribute_values.schema');
const SubtypeAttribute = require('./subtype_attributes.schema');
const AttributeOption = require('./attribute_options.schema');
const Unit = require('./units.schema');
const ComboKit = require('./combo_kits.schema');
const SolarKit = require('./solar_kits.schema');
const WarehouseKitActivation = require('./warehouse_kit_activations.schema');
const ProjectCategory = require('./project_categories.schema');
const BenchmarkPriceRequest = require('./BenchmarkPriceRequest.schema');

module.exports = {
  Brand,
  ProductTemplate,
  ProductSubtype,
  Product,
  ProductSku,
  ProductSkuPrice,
  ProductAttributeValue,
  SubtypeAttribute,
  AttributeOption,
  Unit,
  ComboKit,
  SolarKit,
  WarehouseKitActivation,
  ProjectCategory,
  BenchmarkPriceRequest,
};

