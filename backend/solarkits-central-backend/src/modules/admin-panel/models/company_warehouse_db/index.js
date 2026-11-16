const CompanyWarehouse = require('./company_warehouses.schema');
const ValidationSection = require('./ValidationSection.schema');
const ValidationField = require('./ValidationField.schema');
const FieldValidation = require('./FieldValidation.schema');
const FieldDependency = require('./FieldDependency.schema');
const FieldStatus = require('./FieldStatus.schema');
const WarehouseNotification = require('./WarehouseNotification.schema');
const WarehouseNotificationRule = require('./WarehouseNotificationRule.schema');
const WarehouseRole = require('./WarehouseRole.schema');
const WarehouseUser = require('./WarehouseUser.schema');
const CompanyWarehouseFieldData = require('./CompanyWarehouseFieldData.schema');
const PurchaseOrder = require('./PurchaseOrder.schema');
const ThirdPartyLogisticsVendor = require('./ThirdPartyLogisticsVendor.schema');
const WarehouseStockReconciliation = require('./WarehouseStockReconciliation.schema');

module.exports = {
  CompanyWarehouse,
  CompanyWarehouseValidationSection: ValidationSection,
  CompanyWarehouseValidationField: ValidationField,
  CompanyWarehouseFieldValidation: FieldValidation,
  CompanyWarehouseFieldDependency: FieldDependency,
  CompanyWarehouseFieldStatus: FieldStatus,
  WarehouseNotification,
  WarehouseNotificationRule,
  WarehouseRole,
  WarehouseUser,
  WarehouseStock: require('./WarehouseStock.schema'),
  CompanyWarehouseFieldData,
  PurchaseOrder,
  ThirdPartyLogisticsVendor,
  WarehouseStockReconciliation,
};
