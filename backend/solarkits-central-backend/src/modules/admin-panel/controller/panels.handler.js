const { CmsPanel, PanelSaaSProduct } = require('../models/user_db');

const get_panels = async (req, res) => {
    try {
        const panels = await CmsPanel.find({ deleted_at: null }).lean();
        const mappings = await PanelSaaSProduct.find().populate('saas_product_id').lean();

        const data = panels.map(p => {
            const products = mappings
                .filter(m => String(m.panel_id) === String(p._id) && m.saas_product_id)
                .map(m => ({
                    id: m.saas_product_id._id,
                    name: m.saas_product_id.name,
                    slug: m.saas_product_id.slug
                }));
            return {
                id: p._id,
                name: p.name,
                url_prefix: p.url_prefix,
                created_at: p.created_at,
                products
            };
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

module.exports = { get_panels }