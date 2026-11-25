const { SaaSProduct } = require('../models/user_db');

const get_dashboard_types = async (req, res) => {
    try {
        const types = await SaaSProduct.find({ is_deleted: false })
            .sort({ name: 1 })
            .lean();

        const data = types.map(t => ({
            ...t,
            id: t._id
        }));

        res.status(200).json({ status: 'success', message: 'SaaS Products fetched successfully', data });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

module.exports = { get_dashboard_types };