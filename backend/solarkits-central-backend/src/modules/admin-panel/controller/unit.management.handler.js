const { UnitGroup, Unit } = require("../models/core_db");

const successResponse = (message, data = null, errors = []) => ({
  status: "success",
  message,
  data,
  errors: errors.length ? errors : undefined,
});

const errorResponse = (res, statusCode, message, errors = []) =>
  res.status(statusCode).json({
    status: "error",
    message,
    data: null,
    errors: errors.length ? errors : undefined,
  });

// ================= UNIT GROUP =================
const get_unit_groups = async (req, res) => {
  try {
    const rows = await UnitGroup.find({ deleted_at: null }).sort({ _id: 1 });
    const data = rows.map(r => ({
        id: r._id,
        name: r.name,
        code: r.code,
        is_system: !!r.is_system,
        is_active: !!r.is_active,
        created_at: r.created_at
    }));
    return res.json(successResponse("Unit groups retrieved successfully", data));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const add_unit_group = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim() : null;

    if (!name) return errorResponse(res, 400, "Unit group name is required");

    await UnitGroup.create({
        name,
        code: code || null
    });

    return res.json(successResponse("Unit group created successfully"));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const update_unit_group = async (req, res) => {
  try {
    const groupId = req.params.id;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim() : null;

    if (!groupId) return errorResponse(res, 400, "Invalid unit group id");
    if (!name) return errorResponse(res, 400, "Unit group name is required");

    const group = await UnitGroup.findOne({ _id: groupId, deleted_at: null });
    if (!group) return errorResponse(res, 404, "Unit group not found");

    let updateData = {};
    if (group.is_system) {
        // Only allow toggling is_active for system groups
        updateData = { is_active: typeof req.body.is_active !== 'undefined' ? req.body.is_active : group.is_active };
    } else {
        updateData = { 
            name, 
            code: code || null,
            is_active: typeof req.body.is_active !== 'undefined' ? req.body.is_active : group.is_active 
        };
    }

    const result = await UnitGroup.updateOne({ _id: groupId }, { $set: updateData });
    if (result.matchedCount === 0) return errorResponse(res, 404, "Unit group not found");

    return res.json(successResponse("Unit group updated successfully", {
      id: groupId,
      name,
      code: code || null,
    }));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const delete_unit_group = async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!groupId) return errorResponse(res, 400, "Invalid unit group id");

    const group = await UnitGroup.findOne({ _id: groupId, deleted_at: null });
    if (!group) return errorResponse(res, 404, "Unit group not found");
    if (group.is_system) return errorResponse(res, 403, "System unit groups cannot be deleted");

    const result = await UnitGroup.updateOne(
        { _id: groupId, deleted_at: null },
        { $set: { deleted_at: new Date() } }
    );

    if (result.matchedCount === 0) return errorResponse(res, 404, "Unit group not found");

    return res.json(successResponse("Unit group deleted successfully"));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

// ================= UNITS =================
const get_units = async (req, res) => {
  try {
    const groupId = req.query.group_id;
    
    const filter = { deleted_at: null };
    if (groupId) filter.unit_group_id = groupId;

    const rows = await Unit.find(filter).populate('unit_group_id').sort({ _id: 1 });

    const data = rows.map(u => ({
        id: u._id,
        unit_group_id: u.unit_group_id?._id,
        name: u.name,
        symbol: u.symbol,
        conversion_factor: u.conversion_factor,
        is_base_unit: u.is_base_unit ? 1 : 0,
        is_system: !!u.is_system,
        is_active: !!u.is_active,
        created_at: u.created_at,
        unit_group_name: u.unit_group_id ? u.unit_group_id.name : "Unknown",
        unit_group_code: u.unit_group_id ? u.unit_group_id.code : null
    }));

    return res.json(successResponse("Units retrieved successfully", data));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const add_unit = async (req, res) => {
  try {
    const { unit_group_id } = req.body;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const symbol = typeof req.body.symbol === "string" ? req.body.symbol.trim() : "";
    const conversion_factor = Number(req.body.conversion_factor) || 1;
    const is_base_unit = Boolean(req.body.is_base_unit);

    if (!unit_group_id || !name || !symbol) return errorResponse(res, 400, "Missing fields");

    const group = await UnitGroup.findOne({ _id: unit_group_id, deleted_at: null });
    if (!group) return errorResponse(res, 400, "Invalid unit group ID");

    if (is_base_unit) {
      // Check if there is already a SYSTEM base unit in this group
      const systemBase = await Unit.findOne({ 
          unit_group_id: group._id, 
          is_base_unit: true, 
          is_system: true 
      });

      if (systemBase) {
          return errorResponse(res, 403, `This group is locked to system base unit: ${systemBase.name}. You cannot add another base unit.`);
      }

      await Unit.updateMany({ unit_group_id: group._id }, { $set: { is_base_unit: false } });
    }

    await Unit.create({
        unit_group_id: group._id,
        name,
        symbol,
        conversion_factor: is_base_unit ? 1 : conversion_factor,
        is_base_unit: !!is_base_unit,
        is_system: false // Manually added units are never system units
    });

    return res.json(successResponse("Unit created successfully"));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const update_unit = async (req, res) => {
  try {
    const unitId = req.params.id;
    const { unit_group_id } = req.body;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const symbol = typeof req.body.symbol === "string" ? req.body.symbol.trim() : "";
    const conversion_factor = Number(req.body.conversion_factor) || 1;
    const is_base_unit = Boolean(req.body.is_base_unit);

    if (!unitId || !unit_group_id || !name || !symbol) return errorResponse(res, 400, "Missing fields");

    const group = await UnitGroup.findOne({ _id: unit_group_id, deleted_at: null });
    if (!group) return errorResponse(res, 400, "Invalid unit group ID");

    if (is_base_unit) {
      await Unit.updateMany({ unit_group_id: group._id, _id: { $ne: unitId } }, { $set: { is_base_unit: false } });
    }

    const unit = await Unit.findOne({ _id: unitId, deleted_at: null });
    if (!unit) return errorResponse(res, 404, "Unit not found");

    let updateData = {};
    if (unit.is_system) {
        // STRICT LOCK: System units can ONLY have their 'is_active' status toggled.
        // Their name, symbol, conversion_factor, and base_unit status are immutable.
        updateData = { 
            is_active: typeof req.body.is_active !== 'undefined' ? req.body.is_active : unit.is_active 
        };
    } else {
        // If attempting to promote this unit to base unit
        if (is_base_unit) {
            // Check if there is already a SYSTEM base unit in this group.
            // If the group has a system base unit, we cannot change the base unit.
            const systemBase = await Unit.findOne({ 
                unit_group_id: group._id, 
                is_base_unit: true, 
                is_system: true,
                _id: { $ne: unitId }
            });
            
            if (systemBase) {
                return errorResponse(res, 403, `This group is locked to system base unit: ${systemBase.name}. You cannot promote another unit to base.`);
            }

            await Unit.updateMany({ unit_group_id: group._id, _id: { $ne: unitId } }, { $set: { is_base_unit: false } });
        } else {
            // If attempting to DEMOTE a base unit
            if (unit.is_base_unit) {
                return errorResponse(res, 400, "A group must have at least one base unit. Promote another unit to base instead of unsetting this one.");
            }
        }

        updateData = {
            unit_group_id: group._id,
            name,
            symbol,
            conversion_factor: is_base_unit ? 1 : conversion_factor, // Force factor 1 for base units
            is_base_unit: !!is_base_unit,
            is_active: typeof req.body.is_active !== 'undefined' ? req.body.is_active : unit.is_active
        };
    }

    const result = await Unit.updateOne({ _id: unitId }, { $set: updateData });

    if (result.matchedCount === 0) return errorResponse(res, 404, "Unit not found");

    return res.json(successResponse("Unit updated successfully", {
      id: unitId,
      unit_group_id,
      name,
      symbol,
      conversion_factor,
      is_base_unit: is_base_unit ? 1 : 0,
    }));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const delete_unit = async (req, res) => {
  try {
    const unitId = req.params.id;
    if (!unitId) return errorResponse(res, 400, "Invalid unit id");

    const unit = await Unit.findOne({ _id: unitId, deleted_at: null });
    if (!unit) return errorResponse(res, 404, "Unit not found");
    if (unit.is_system) return errorResponse(res, 403, "System units cannot be deleted");

    const result = await Unit.updateOne(
        { _id: unitId, deleted_at: null },
        { $set: { deleted_at: new Date() } }
    );

    if (result.matchedCount === 0) return errorResponse(res, 404, "Unit not found");

    return res.json(successResponse("Unit deleted successfully"));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

const get_power_units = async (req, res) => {
  try {
    const powerGroup = await UnitGroup.findOne({ name: "Power", deleted_at: null });
    if (!powerGroup) {
      return res.json(successResponse("No Power unit group found", []));
    }
    const rows = await Unit.find({ unit_group_id: powerGroup._id, deleted_at: null }).sort({ _id: 1 });
    const data = rows.map(r => ({
      id: r._id,
      name: r.name,
      symbol: r.symbol,
      is_base_unit: !!r.is_base_unit,
      conversion_factor: r.conversion_factor,
      is_system: !!r.is_system,
      is_active: !!r.is_active
    }));
    return res.json(successResponse("Power units retrieved successfully", data));
  } catch (error) {
    return errorResponse(res, 500, "Internal server error");
  }
};

module.exports = {
  get_unit_groups,
  add_unit_group,
  update_unit_group,
  delete_unit_group,
  get_units,
  add_unit,
  update_unit,
  delete_unit,
  get_power_units
};