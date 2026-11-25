const { CmsDepartment, CmsPanel, CmsUser, Otp, DepartmentPanel } = require('../models/user_db');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { sendOTP } = require("../utils/nodemailer");
const { add_cms_user } = require('./cms.users.handler');

const get_departments = async (req, res) => {
    try {
        const { country_id } = req.query;
        let query = { deleted_at: null };
        if (country_id === 'global') {
            query.level = 'global';
        } else if (country_id) {
            query.$or = [
                { level: 'global' },
                { level: 'country', country_ids: country_id },
                { level: 'country', country_id: country_id }
            ];
        }

        const departments = await CmsDepartment.find(query)
            .sort({ created_at: -1 })
            .lean();

        const data = await Promise.all(departments.map(async d => {
            // Find panel mappings from pivot
            const pivotPanels = await DepartmentPanel.find({ department_id: d._id })
                .populate('panel_id')
                .lean();

            const mappedPanels = pivotPanels
                .filter(p => p.panel_id && !p.panel_id.deleted_at)
                .map(p => ({
                    id: p.panel_id._id,
                    name: p.panel_id.name
                }));

            // Resolve country names dynamically from country_ids (fallback to country_id)
            let countryNames = [];
            const countryIds = d.country_ids && d.country_ids.length > 0 
                ? d.country_ids 
                : (d.country_id ? [d.country_id] : []);

            if (countryIds.length > 0) {
                const geoDb = mongoose.connections.find(conn => conn.name === 'solarkits_geolocations' || conn.name?.includes('geolocations')) || mongoose.connection;
                if (geoDb) {
                    try {
                        const GeoCountry = geoDb.models['geolocation_level_0'] || geoDb.model('geolocation_level_0', new mongoose.Schema({ name: String }));
                        const docs = await GeoCountry.find({ _id: { $in: countryIds } }).lean();
                        countryNames = docs.map(c => c.name);
                    } catch (e) {
                        console.warn("Could not find geolocation_level_0 model", e.message);
                    }
                }
            }

            return {
                id: d._id,
                name: d.name,
                level: d.level || 'global',
                country_id: d.country_id || null,
                country_ids: countryIds,
                country_name: countryNames.join(', ') || null,
                is_system: d.is_system || false,
                is_protected: d.is_protected || false,
                created_at: d.created_at,
                panels: mappedPanels,
                panel_names: mappedPanels.map(p => p.name).join(', ') || 'None'
            };
        }));

        res.status(200).json({ status: 'success', message: 'Departments fetched successfully', data });
    } catch (error) {
        console.error("Error in get_departments:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
};

const create_department = async (req, res) => {
    try {
        const { name, level, country_id, country_ids, panels } = req.body;

        if (!name || !level || !panels || !Array.isArray(panels) || panels.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Name, level, and at least one panel are required' });
        }

        let country_ids_resolved = [];
        if (Array.isArray(country_ids)) {
            country_ids_resolved = country_ids;
        } else if (country_id) {
            country_ids_resolved = [country_id];
        }

        if (level === 'global') {
            if (name !== 'Super Admin' && name !== 'Developer') {
                return res.status(400).json({ status: 'error', message: 'Only Developer and Super Admin departments can be global' });
            }
            country_ids_resolved = [];
        } else if (level === 'country') {
            if (country_ids_resolved.length === 0) {
                return res.status(400).json({ status: 'error', message: 'At least one country is required for country level departments' });
            }
        }

        const existing_department = await CmsDepartment.findOne({ name, deleted_at: null }).lean();
        if (existing_department) {
            return res.status(409).json({ status: 'error', message: 'Department with this name already exists' });
        }

        // Validate all panel ids exist
        for (const pid of panels) {
            if (!mongoose.Types.ObjectId.isValid(pid)) {
                return res.status(400).json({ status: 'error', message: `Invalid Panel ID format: ${pid}` });
            }
            const panelExists = await CmsPanel.findById(pid).lean();
            if (!panelExists) {
                return res.status(404).json({ status: 'error', message: `Panel not found: ${pid}` });
            }
        }

        const dept = await CmsDepartment.create({
            name,
            level,
            country_ids: country_ids_resolved,
            is_system: false,
            is_protected: false
        });

        // Seed pivot connections
        for (const pid of panels) {
            await DepartmentPanel.create({
                department_id: dept._id,
                panel_id: pid
            });
        }

        res.status(201).json({ status: 'success', message: 'Department created successfully' });
    } catch (error) {
        console.error("Error in create_department:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
};

const send_otp_for_update_department = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: user_id } = req.user;

        const department = await CmsDepartment.findById(id).lean();
        if (!department) {
            return res.status(404).json({ status: 'error', message: 'Department not found' });
        }

        const user = await CmsUser.findById(user_id).lean();
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otp = await sendOTP(user.email, `Code for update department.`, `This OTP for update ${department.name}.`);
        const hashed_otp = await bcrypt.hash(otp.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id: user._id,
            otp: hashed_otp,
            purpose: 'update_department',
            expires_at,
            created_at: new Date()
        });

        return res.status(200).json({ status: "success", message: "OTP sent successfully." });

    } catch (error) {
        console.error("Error in send_otp_for_update_department:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
};

const update_department = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level, country_id, country_ids, panels, otp } = req.body;
        const { id: user_id } = req.user;

        if (!name || !level || !panels || !Array.isArray(panels) || panels.length === 0 || !otp) {
            return res.status(400).json({ status: 'error', message: 'Name, level, panels, and OTP are required' });
        }

        let country_ids_resolved = [];
        if (Array.isArray(country_ids)) {
            country_ids_resolved = country_ids;
        } else if (country_id) {
            country_ids_resolved = [country_id];
        }

        if (level === 'global') {
            if (name !== 'Super Admin' && name !== 'Developer') {
                return res.status(400).json({ status: 'error', message: 'Only Developer and Super Admin departments can be global' });
            }
            country_ids_resolved = [];
        } else if (level === 'country') {
            if (country_ids_resolved.length === 0) {
                return res.status(400).json({ status: 'error', message: 'At least one country is required for country level departments' });
            }
        }

        const otp_record = await Otp.findOne({
            user_id: user_id,
            purpose: 'update_department'
        }).sort({ created_at: -1 }).lean();

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

        const department = await CmsDepartment.findById(id).lean();
        if (!department) {
            return res.status(404).json({ status: 'error', message: 'Department not found' });
        }

        if (department.is_protected) {
            return res.status(403).json({ status: 'error', message: 'Protected system records cannot be modified.' });
        }

        const existing_department = await CmsDepartment.findOne({
            name,
            _id: { $ne: id },
            deleted_at: null
        }).lean();
        if (existing_department) {
            return res.status(409).json({ status: 'error', message: 'Another department with this name already exists' });
        }

        // Validate all panel ids exist
        for (const pid of panels) {
            if (!mongoose.Types.ObjectId.isValid(pid)) {
                return res.status(400).json({ status: 'error', message: `Invalid Panel ID format: ${pid}` });
            }
            const panelExists = await CmsPanel.findById(pid).lean();
            if (!panelExists) {
                return res.status(404).json({ status: 'error', message: `Panel not found: ${pid}` });
            }
        }

        await CmsDepartment.findByIdAndUpdate(id, {
            $set: {
                name,
                level,
                country_ids: country_ids_resolved
            }
        });

        // Update pivot connections
        await DepartmentPanel.deleteMany({ department_id: id });
        for (const pid of panels) {
            await DepartmentPanel.create({
                department_id: id,
                panel_id: pid
            });
        }

        res.status(200).json({ status: 'success', message: 'Department updated successfully' });

    } catch (error) {
        console.error("Error in update_department:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error', error: error.message });
    }
};

module.exports = {
    get_departments,
    create_department,
    update_department,
    send_otp_for_update_department,
    add_cms_user
};

module.exports = {
    get_departments,
    create_department,
    update_department,
    send_otp_for_update_department,
    add_cms_user
};