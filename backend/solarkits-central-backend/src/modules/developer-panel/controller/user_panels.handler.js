const mongoose = require('mongoose');
const { CmsPanel, Otp, CmsUser } = require('../models/user_db');
const bcrypt = require('bcrypt');
const { sendOTP } = require("../utils/nodemailer");

const get_panels = async (req, res) => {
    try {
        const panels = await CmsPanel.find()
            .sort({ created_at: -1 })
            .lean();
        
        const { PanelSaaSProduct } = require('../models/user_db');
        const mappings = await PanelSaaSProduct.find().populate('saas_product_id').lean();
        
        const data = panels.map(p => {
            const panelProds = mappings
                .filter(m => String(m.panel_id) === String(p._id) && m.saas_product_id)
                .map(m => ({
                    id: m.saas_product_id._id,
                    name: m.saas_product_id.name,
                    slug: m.saas_product_id.slug
                }));
            return {
                ...p,
                id: p._id,
                products: panelProds
            };
        });

        res.status(200).json({ status: 'success', message: 'Panels fetched successfully', data });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const create_panel = async (req, res) => {
    try {
        const { name, url_prefix, is_active, saas_product_ids } = req.body;

        if (!name || !url_prefix) {
            return res.status(400).json({ status: 'error', message: 'Name and URL prefix are required' });
        }

        const existing = await CmsPanel.findOne({ $or: [{ name }, { url_prefix }] });
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Panel with this name or URL prefix already exists' });
        }

        const newPanel = await CmsPanel.create({
            name,
            url_prefix,
            is_active
        });

        if (saas_product_ids && Array.isArray(saas_product_ids)) {
            const { PanelSaaSProduct } = require('../models/user_db');
            for (const prodId of saas_product_ids) {
                if (mongoose.Types.ObjectId.isValid(prodId)) {
                    await PanelSaaSProduct.create({
                        panel_id: newPanel._id,
                        saas_product_id: prodId
                    });
                }
            }
        }

        res.status(201).json({ status: 'success', message: 'Panel created successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const send_otp_for_update_panel = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: user_id } = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid Panel ID format' });
        }

        const panel = await CmsPanel.findById(id);
        if (!panel) {
            return res.status(404).json({ status: 'error', message: 'Panel not found' });
        }

        const user = await CmsUser.findById(user_id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otpData = await sendOTP(user.email, `Code for update panel.`, `This OTP for update ${panel.name}.`);
        const hashed_otp = await bcrypt.hash(otpData.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id,
            otp: hashed_otp,
            purpose: 'update_panel',
            expires_at
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });

    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
}

const update_panel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url_prefix, is_active, saas_product_ids, otp } = req.body;
        const { id: user_id } = req.user;

        if (!name || !url_prefix || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Name, URL prefix and otp are required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid Panel ID format' });
        }

        const otp_record = await Otp.findOne({ user_id, purpose: 'update_panel' }).sort({ created_at: -1 });
        if (!otp_record) {
            return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
        }

        if (new Date(otp_record.expires_at) < new Date()) {
            return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
        }

        const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
        if (!is_otp_valid) {
            return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
        }

        const panel = await CmsPanel.findById(id);
        if (!panel) {
            return res.status(404).json({ status: 'error', message: 'Panel not found' });
        }

        const existing = await CmsPanel.findOne({ 
            $or: [{ name }, { url_prefix }], 
            _id: { $ne: id } 
        });
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Another panel with this name or URL prefix already exists' });
        }

        await CmsPanel.findByIdAndUpdate(id, {
            name,
            url_prefix,
            is_active
        });

        if (saas_product_ids && Array.isArray(saas_product_ids)) {
            const { PanelSaaSProduct } = require('../models/user_db');
            await PanelSaaSProduct.deleteMany({ panel_id: id });
            for (const prodId of saas_product_ids) {
                if (mongoose.Types.ObjectId.isValid(prodId)) {
                    await PanelSaaSProduct.create({
                        panel_id: id,
                        saas_product_id: prodId
                    });
                }
            }
        }

        res.status(200).json({ status: 'success', message: 'Panel updated successfully' });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal Server Error',
            error: error.message
        });
    }
}

module.exports = {
    get_panels,
    create_panel,
    update_panel,
    send_otp_for_update_panel,
};