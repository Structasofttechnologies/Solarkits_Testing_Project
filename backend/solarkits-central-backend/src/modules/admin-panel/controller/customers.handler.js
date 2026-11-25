const { CompanyCustomersType } = require('../models/core_db');

const get_customers_types = async (req, res) => {
  try {
    const rows = await CompanyCustomersType.find({ deleted_at: null }).select('_id type_name');
    const data = rows.map(r => ({ id: r._id, type_name: r.type_name }));
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Failed to fetch customer types", error: err.message });
  }
};

module.exports = { get_customers_types }