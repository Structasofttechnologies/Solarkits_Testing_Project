const CompanyWarehouse = require('./company_warehouses.schema');
const ValidationSection = require('./ValidationSection.schema');
const ValidationField = require('./ValidationField.schema');
const FieldValidation = require('./FieldValidation.schema');
const FieldDependency = require('./FieldDependency.schema');
const FieldStatus = require('./FieldStatus.schema');
const WarehouseRole = require('./WarehouseRole.schema');
const WarehouseUser = require('./WarehouseUser.schema');
const CompanyWarehouseFieldData = require('./CompanyWarehouseFieldData.schema');
const WarehouseRoleWiseModule = require('./WarehouseRoleWiseModule.schema');
const WarehouseModule = require('./WarehouseModule.schema');
const WarehouseInward = require('./WarehouseInward.schema');
const WarehouseStock = require('./WarehouseStock.schema');
const PurchaseOrder = require('./PurchaseOrder.schema');
const PoRequest = require('./PoRequest.schema');
const DeliveryVehicle = require('./DeliveryVehicle.schema');
const DeliveryDriver = require('./DeliveryDriver.schema');
const DeliveryOrder = require('./DeliveryOrder.schema');

module.exports = {
  CompanyWarehouse,
  CompanyWarehouseValidationSection: ValidationSection,
  CompanyWarehouseValidationField: ValidationField,
  CompanyWarehouseFieldValidation: FieldValidation,
  CompanyWarehouseFieldDependency: FieldDependency,
  CompanyWarehouseFieldStatus: FieldStatus,
  WarehouseRole,
  WarehouseUser,
  CompanyWarehouseFieldData,
  WarehouseRoleWiseModule,
  WarehouseModule,
  WarehouseInward,
  WarehouseStock,
  PurchaseOrder,
  PoRequest,
  DeliveryVehicle,
  DeliveryDriver,
  DeliveryOrder,
};
