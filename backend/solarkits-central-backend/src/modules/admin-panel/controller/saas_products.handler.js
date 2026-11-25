const { SaaSProduct, CountrySaaSProduct, CmsUser, Otp } = require('../models/user_db');
const { GeoLevel0 } = require('../models/geolocation_db');
const bcrypt = require('bcrypt');
const { sendOTP } = require('../utils/nodemailer');

let companyProductsCache = null;
let companyProductsCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const invalidateProductsCache = () => {
    companyProductsCache = null;
    companyProductsCacheTime = 0;
};

/**
 * Get all SaaS Products and active countries with mapping status
 */
const get_company_saas_products = async (req, res) => {
    try {
        const now = Date.now();
        if (companyProductsCache && (now - companyProductsCacheTime < CACHE_TTL_MS)) {
            return res.status(200).json(companyProductsCache);
        }

        const [products, countries, mappings] = await Promise.all([
            SaaSProduct.find({ is_deleted: false }).select('_id name slug description is_active').lean(),
            GeoLevel0.find({ 
                is_active: true, 
                $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
            }).select('_id name iso2 is_active').sort({ name: 1 }).lean(),
            CountrySaaSProduct.find().select('saas_product_id country_id is_active').lean()
        ]);

        const formattedProducts = products.map(prod => {
            const productMappings = mappings.filter(m => m.saas_product_id.toString() === prod._id.toString());
            
            const activeCountries = countries.map(country => {
                const mapping = productMappings.find(m => m.country_id.toString() === country._id.toString());
                return {
                    id: country._id.toString(),
                    name: country.name,
                    iso2: country.iso2,
                    is_active: mapping ? mapping.is_active : false
                };
            });

            return {
                id: prod._id.toString(),
                name: prod.name,
                slug: prod.slug,
                description: prod.description || '',
                is_active: prod.is_active,
                countries: activeCountries
            };
        });

        const responsePayload = {
            status: 'success',
            message: 'Company SaaS Products fetched successfully',
            data: {
                products: formattedProducts,
                availableCountries: countries.map(c => ({
                    id: c._id.toString(),
                    name: c.name,
                    iso2: c.iso2
                }))
            }
        };

        companyProductsCache = responsePayload;
        companyProductsCacheTime = Date.now();

        return res.status(200).json(responsePayload);
    } catch (error) {
        console.error('get_company_saas_products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

/**
 * Toggle SaaS Product activation for a specific country
 */
const send_deactivate_otp = async (req, res) => {
    try {
        const { saas_product_id, country_id } = req.body;
        const { id: user_id } = req.user;

        if (!saas_product_id || !country_id) {
            return res.status(400).json({
                status: 'error',
                message: 'saas_product_id and country_id are required'
            });
        }

        const product = await SaaSProduct.findOne({ _id: saas_product_id, is_deleted: false });
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'SaaS Product not found' });
        }

        const country = await GeoLevel0.findOne({ 
            _id: country_id, 
            is_active: true,
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
        });
        if (!country) {
            return res.status(404).json({ status: 'error', message: 'Active country not found' });
        }

        const user = await CmsUser.findOne({ _id: user_id, deleted_at: null });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const otp = await sendOTP(user.email, `Deactivation OTP for ${product.name}`, `This OTP is to confirm the deactivation of ${product.name} in ${country.name}.`);
        const hashed_otp = await bcrypt.hash(otp.otp, 10);
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);

        await Otp.create({
            user_id: user._id,
            otp: hashed_otp,
            purpose: 'deactivate_country_saas_product',
            expires_at,
            created_at: new Date()
        });

        return res.status(200).json({ status: 'success', message: 'OTP sent successfully.' });
    } catch (error) {
        console.error("Error in send_deactivate_otp:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * Toggle SaaS Product activation for a specific country
 */
const toggle_country_saas_product = async (req, res) => {
    try {
        const { saas_product_id, country_id, is_active, otp } = req.body;

        if (!saas_product_id || !country_id) {
            return res.status(400).json({
                status: 'error',
                message: 'saas_product_id and country_id are required'
            });
        }

        // Verify product exists
        const product = await SaaSProduct.findOne({ _id: saas_product_id, is_deleted: false });
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'SaaS Product not found'
            });
        }

        // Verify country exists and is active
        const country = await GeoLevel0.findOne({ 
            _id: country_id, 
            is_active: true,
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
        });
        if (!country) {
            return res.status(404).json({
                status: 'error',
                message: 'Active country not found'
            });
        }

        // Deactivation OTP verification
        if (is_active === false) {
            if (!otp) {
                return res.status(400).json({
                    status: 'error',
                    message: 'OTP is required for deactivation'
                });
            }

            const otp_record = await Otp.findOne({
                user_id: req.user.id,
                purpose: 'deactivate_country_saas_product'
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
        }

        let mapping = await CountrySaaSProduct.findOne({ saas_product_id, country_id });

        if (mapping) {
            mapping.is_active = is_active;
            await mapping.save();
        } else {
            mapping = await CountrySaaSProduct.create({
                saas_product_id,
                country_id,
                is_active: is_active ?? true,
                layout_config: {}
            });
        }

        invalidateProductsCache();

        res.status(200).json({
            status: 'success',
            message: `SaaS Product '${product.name}' ${is_active ? 'activated' : 'deactivated'} in '${country.name}'`,
            data: mapping
        });
    } catch (error) {
        console.error('toggle_country_saas_product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

module.exports = {
    get_company_saas_products,
    toggle_country_saas_product,
    send_deactivate_otp
};
