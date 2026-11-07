const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const EpcAccount = require('../../models/india_solarshop_db/epc_accounts.schema');
const EpcCompany = require('../../models/india_core_db/epc_companies.schema');
const EpcCompanyGst = require('../../models/india_core_db/epc_company_gst.schema');
const EpcOffice = require('../../models/india_solarshop_db/epc_offices.schema');
const GeoLevel1 = require('../../models/geolocation_db/geo_level_1.schema');
const GeoLevel2 = require('../../models/geolocation_db/geo_level_2.schema');
const EpcType = require('../../../admin-panel/models/india_solarshop_db/epc_types.schema');
const { validateGstStateMatch } = require('../../../../utils/gstStateCodes');

/**
 * Helper to resolve account & company from request
 */
async function resolveAccountAndCompany(req) {
  const account_id = req.user?.account_id || req.user?.id || req.user?._id;
  if (!account_id) throw new Error('Unauthorized');

  const account = await EpcAccount.findOne({ _id: account_id, deleted_at: null });
  if (!account) throw new Error('Account not found');

  let company = null;
  if (account.company_id) {
    company = await EpcCompany.findOne({ _id: account.company_id, deleted_at: null });
  }

  return { account, company };
}

// ─── GET /api/india/v1/shop/epc/profile ──────────────────────────────────────
const get_epc_profile = async (req, res) => {
  try {
    const { account, company } = await resolveAccountAndCompany(req);

    // 1. Fetch all GST records for this company
    let gstRecords = [];
    if (company?._id) {
      gstRecords = await EpcCompanyGst.find({
        company_id: company._id,
        deleted_at: null
      }).lean();
    }

    // Map onboarded states with names
    const onboardedStates = [];
    const stateIdsFound = new Set();

    for (const gst of gstRecords) {
      const stateDoc = await GeoLevel1.findById(gst.state_id).lean();
      stateIdsFound.add(gst.state_id.toString());
      onboardedStates.push({
        id: gst._id,
        state_id: gst.state_id.toString(),
        state_name: stateDoc ? stateDoc.name : 'Unknown State',
        gst_number: gst.gst_number,
        created_at: gst.created_at,
        is_verified: true,
      });
    }

    // Also include any states in company.working_states or account.states not in GST records
    const fallbackStateIds = [
      ...(company?.working_states || []),
      ...(account.states || [])
    ];

    for (const sId of fallbackStateIds) {
      const sIdStr = sId.toString();
      if (!stateIdsFound.has(sIdStr)) {
        stateIdsFound.add(sIdStr);
        const stateDoc = await GeoLevel1.findById(sId).lean();
        if (stateDoc) {
          onboardedStates.push({
            id: `temp_${sIdStr}`,
            state_id: sIdStr,
            state_name: stateDoc.name,
            gst_number: account.gstin || 'Pending GST Entry',
            created_at: stateDoc.created_at || new Date(),
            is_verified: Boolean(account.gstin),
          });
        }
      }
    }

    // 2. Fetch all offices
    const query = {
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    };

    const offices = await EpcOffice.find(query)
      .sort({ is_home_office: -1, created_at: -1 })
      .lean();

    // 3. Extract unique activated districts from offices & account
    const activatedDistrictsMap = new Map();
    for (const off of offices) {
      if (off.district_id && off.district_name) {
        activatedDistrictsMap.set(off.district_id.toString(), {
          district_id: off.district_id.toString(),
          district_name: off.district_name,
          state_id: off.state_id?.toString(),
          state_name: off.state_name
        });
      }
    }

    if (account.districts && account.districts.length > 0) {
      for (const dId of account.districts) {
        const dIdStr = dId.toString();
        if (!activatedDistrictsMap.has(dIdStr)) {
          const dDoc = await GeoLevel2.findById(dId).populate('level_1', 'name').lean();
          if (dDoc) {
            activatedDistrictsMap.set(dIdStr, {
              district_id: dIdStr,
              district_name: dDoc.name,
              state_id: dDoc.level_1?._id?.toString() || dDoc.level_1?.toString(),
              state_name: dDoc.level_1?.name || ''
            });
          }
        }
      }
    }

    // 4. Sub-users count
    const teamUsersCount = await EpcAccount.countDocuments({
      deleted_at: null,
      $or: [
        { parent_account_id: account._id },
        ...(company?._id ? [{ company_id: company._id, _id: { $ne: account._id } }] : [])
      ]
    });

    // 5. Resolve EPC Classification Type
    let epcTypeDoc = null;
    if (account.epc_type_id) {
      epcTypeDoc = await EpcType.findById(account.epc_type_id).lean();
    } else if (account.epc_type) {
      epcTypeDoc = await EpcType.findOne({
        $or: [
          { name: new RegExp(`^${account.epc_type.trim()}$`, 'i') },
          { code: account.epc_type.trim().toLowerCase() }
        ],
        deleted_at: null
      }).lean();
    }

    return res.status(200).json({
      success: true,
      account: {
        id: account._id,
        name: account.name,
        email: account.email,
        whatsapp: account.whatsapp,
        role: account.role || 'owner',
        status: account.status,
        company_id: account.company_id,
        onboarding_source: account.onboarding_source,
        epc_type: account.epc_type || epcTypeDoc?.name || 'Solar EPC Contractor',
        epc_type_id: account.epc_type_id || epcTypeDoc?._id || null,
        epc_type_details: epcTypeDoc ? {
          id: epcTypeDoc._id,
          name: epcTypeDoc.name,
          code: epcTypeDoc.code,
          badge_color: epcTypeDoc.badge_color || 'emerald',
          description: epcTypeDoc.description || '',
        } : null,
      },
      company: company ? {
        id: company._id,
        name: company.name,
        legal_name: company.legal_name,
        brand_name: company.brand_name,
        email: company.email,
      } : null,
      onboarded_states: onboardedStates,
      offices: offices.map(o => ({
        ...o,
        id: o._id.toString()
      })),
      activated_districts: Array.from(activatedDistrictsMap.values()),
      stats: {
        total_states: onboardedStates.length,
        total_offices: offices.length,
        total_home_offices: offices.filter(o => o.is_home_office).length,
        total_team_users: teamUsersCount,
      }
    });

  } catch (error) {
    console.error('get_epc_profile error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
};

// ─── POST /api/india/v1/shop/epc/gst/lookup ─────────────────────────────────
const lookup_gst_details = async (req, res) => {
  try {
    const { gst_number, state_id } = req.body;
    if (!gst_number) {
      return res.status(400).json({ success: false, message: 'GSTIN number is required' });
    }

    const cleanGst = gst_number.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      return res.status(400).json({ success: false, message: 'GSTIN must be exactly 15 characters' });
    }

    // If state_id provided, cross check state code
    if (state_id) {
      const stateDoc = await GeoLevel1.findById(state_id).lean();
      if (stateDoc) {
        const stateMatch = validateGstStateMatch(stateDoc.name, cleanGst);
        if (!stateMatch.isValid) {
          return res.status(400).json({
            success: false,
            message: stateMatch.message || `GSTIN state code mismatch for ${stateDoc.name}.`
          });
        }
      }
    }

    // Call verifyGstin from gst.adapter.js (reads QUICKEKYC_API_KEY, GST_API_KEY, etc.)
    const { verifyGstin } = require('../../../admin-panel/utils/gst.adapter');
    const result = await verifyGstin(cleanGst);

    if (!result || result.is_valid === false) {
      return res.status(400).json({
        success: false,
        message: result?.error_message || 'GSTIN verification failed or status is inactive in tax portal.'
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      gstin: cleanGst,
      legal_name: result.legal_name || result.business_name || 'REGISTERED EPC ENTITY',
      trade_name: result.trade_name || result.business_name || result.legal_name || 'SOLARKITS EPC PARTNER',
      address: result.address || result.principal_address || null,
      state_name: result.state_name || result.registration_state || null,
      district_name: result.district_name || result.district || null,
      pan_number: result.pan_number || cleanGst.substring(2, 12),
      status: result.business_status || result.gstin_status || 'Active'
    });

  } catch (error) {
    console.error('lookup_gst_details error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify GST'
    });
  }
};

// ─── POST /api/india/v1/shop/epc/onboard-state ──────────────────────────────
const onboard_state_gst = async (req, res) => {
  try {
    const { state_id, gst_number, legal_name, trade_name } = req.body;
    const { account } = await resolveAccountAndCompany(req);

    // Permission check: only admin / owner can onboard new states
    const isOwnerOrAdmin = !account.parent_account_id || account.role === 'admin' || account.role === 'owner';
    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the EPC Admin / Owner has permission to onboard new states.'
      });
    }

    if (!state_id || !gst_number) {
      return res.status(400).json({ success: false, message: 'State and GST number are required' });
    }

    const formattedGst = gst_number.trim().toUpperCase();
    if (formattedGst.length !== 15) {
      return res.status(400).json({ success: false, message: 'GSTIN must be 15 characters' });
    }

    const stateDoc = await GeoLevel1.findById(state_id);
    if (!stateDoc) {
      return res.status(404).json({ success: false, message: 'State not found' });
    }

    // ── REQUIREMENT 1: Cross-check first 2 digits of GST against selected State ──
    const stateMatch = validateGstStateMatch(stateDoc.name, formattedGst);
    if (!stateMatch.isValid) {
      return res.status(400).json({
        success: false,
        message: stateMatch.message || `GST number ${formattedGst} does not belong to ${stateDoc.name}.`
      });
    }

    // Check duplicate GST under a DIFFERENT company
    if (account.company_id) {
      const conflictGst = await EpcCompanyGst.findOne({
        gst_number: formattedGst,
        company_id: { $ne: account.company_id },
        deleted_at: null
      });
      if (conflictGst) {
        return res.status(409).json({
          success: false,
          message: `GST number ${formattedGst} is already registered under another entity.`
        });
      }
    }

    // If account doesn't have a company yet, create one
    let companyId = account.company_id;
    if (!companyId) {
      const company = await EpcCompany.create({
        name: trade_name || legal_name || account.name,
        legal_name: legal_name || account.name,
        brand_name: trade_name || null,
        email: account.email,
        source: 'verified',
        working_states: [state_id]
      });
      companyId = company._id;
      account.company_id = companyId;
    } else {
      // Add state to company working_states
      const company = await EpcCompany.findById(companyId);
      if (company) {
        if (!company.working_states.some(s => s.toString() === state_id.toString())) {
          company.working_states.push(state_id);
        }
        if (legal_name && !company.legal_name) company.legal_name = legal_name;
        if (trade_name && !company.brand_name) company.brand_name = trade_name;
        await company.save();
      }
    }

    // Ensure state is added to account states
    if (!account.states.some(s => s.toString() === state_id.toString())) {
      account.states.push(state_id);
    }
    await account.save();

    // Upsert GST record
    const gstRecord = await EpcCompanyGst.findOneAndUpdate(
      { company_id: companyId, state_id: state_id },
      { gst_number: formattedGst, deleted_at: null },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully onboarded in ${stateDoc.name} with GSTIN ${formattedGst}!`,
      data: {
        id: gstRecord._id,
        state_id: state_id,
        state_name: stateDoc.name,
        gst_number: formattedGst,
        is_verified: true,
        created_at: gstRecord.created_at
      }
    });

  } catch (error) {
    console.error('onboard_state_gst error:', error);
    return res.status(500).json({ success: false, message: error.message || 'State onboarding failed' });
  }
};

// ─── GET /api/india/v1/shop/epc/offices ─────────────────────────────────────
const get_epc_offices = async (req, res) => {
  try {
    const { account, company } = await resolveAccountAndCompany(req);
    const { state_id } = req.query;

    const query = {
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    };

    if (state_id) {
      query.state_id = state_id;
    }

    const offices = await EpcOffice.find(query)
      .sort({ is_home_office: -1, created_at: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      offices: offices.map(o => ({
        ...o,
        id: o._id.toString()
      }))
    });

  } catch (error) {
    console.error('get_epc_offices error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch offices' });
  }
};

// ─── POST /api/india/v1/shop/epc/offices ────────────────────────────────────
const add_epc_office = async (req, res) => {
  try {
    const { account, company } = await resolveAccountAndCompany(req);
    let {
      state_id,
      district_id,
      office_name,
      address,
      pincode,
      photo_url,
      is_home_office,
      contact_person,
      contact_phone
    } = req.body;

    if (!state_id || !district_id || !address || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'State, District, Address, and Pincode are required.'
      });
    }

    // Resolve state name & district name
    const [stateDoc, districtDoc] = await Promise.all([
      GeoLevel1.findById(state_id).lean(),
      GeoLevel2.findById(district_id).lean()
    ]);

    if (!stateDoc || !districtDoc) {
      return res.status(404).json({ success: false, message: 'Invalid state or district ID.' });
    }

    // If file was uploaded via multer
    if (req.file) {
      photo_url = `/uploads/epc_offices/${req.file.filename}`;
    } else if (req.files && req.files.length > 0) {
      photo_url = `/uploads/epc_offices/${req.files[0].filename}`;
    }

    // Parse boolean
    const wantHomeOffice = String(is_home_office) === 'true' || is_home_office === true;

    // Check existing offices in this state
    const existingOfficesInState = await EpcOffice.find({
      state_id,
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    });

    let markAsHomeOffice = wantHomeOffice;

    // Rule: If this is the FIRST office in this state, it automatically becomes the Home Office
    if (existingOfficesInState.length === 0) {
      markAsHomeOffice = true;
    }

    // Rule: Exactly ONE Home Office per state. If new one is Home Office, demote all other offices in this state
    if (markAsHomeOffice) {
      await EpcOffice.updateMany(
        {
          state_id,
          deleted_at: null,
          $or: [
            { account_id: account._id },
            ...(company?._id ? [{ company_id: company._id }] : [])
          ]
        },
        { $set: { is_home_office: false } }
      );
    }

    const newOffice = await EpcOffice.create({
      account_id: account._id,
      company_id: company?._id || null,
      state_id,
      district_id,
      state_name: stateDoc.name,
      district_name: districtDoc.name,
      office_name: office_name || `${districtDoc.name} ${markAsHomeOffice ? 'Home Office' : 'Branch Office'}`,
      address,
      pincode: pincode.trim(),
      photo_url: photo_url || null,
      is_home_office: markAsHomeOffice,
      contact_person: contact_person || account.name,
      contact_phone: contact_phone || account.whatsapp,
      is_active: true
    });

    // Also activate this district on account.districts if not already present
    if (!account.districts.some(d => d.toString() === district_id.toString())) {
      account.districts.push(district_id);
      await account.save();
    }

    return res.status(201).json({
      success: true,
      message: `Office for ${districtDoc.name} added successfully${markAsHomeOffice ? ' (Tagged as State Home Office)' : ''}!`,
      office: {
        ...newOffice.toObject(),
        id: newOffice._id.toString()
      }
    });

  } catch (error) {
    console.error('add_epc_office error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to add office' });
  }
};

// ─── PUT /api/india/v1/shop/epc/offices/:id ─────────────────────────────────
const update_epc_office = async (req, res) => {
  try {
    const { id } = req.params;
    const { account, company } = await resolveAccountAndCompany(req);
    const {
      office_name,
      address,
      pincode,
      photo_url,
      is_home_office,
      contact_person,
      contact_phone,
      is_active
    } = req.body;

    const office = await EpcOffice.findOne({
      _id: id,
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    });

    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }

    if (office_name !== undefined) office.office_name = office_name;
    if (address !== undefined) office.address = address;
    if (pincode !== undefined) office.pincode = pincode;
    if (photo_url !== undefined) office.photo_url = photo_url;
    if (contact_person !== undefined) office.contact_person = contact_person;
    if (contact_phone !== undefined) office.contact_phone = contact_phone;
    if (is_active !== undefined) office.is_active = is_active;

    // If file uploaded
    if (req.file) {
      office.photo_url = `/uploads/epc_offices/${req.file.filename}`;
    }

    if (is_home_office !== undefined) {
      const wantHomeOffice = String(is_home_office) === 'true' || is_home_office === true;
      if (wantHomeOffice) {
        // Demote all other offices in same state
        await EpcOffice.updateMany(
          {
            _id: { $ne: office._id },
            state_id: office.state_id,
            deleted_at: null,
            $or: [
              { account_id: account._id },
              ...(company?._id ? [{ company_id: company._id }] : [])
            ]
          },
          { $set: { is_home_office: false } }
        );
        office.is_home_office = true;
      } else {
        office.is_home_office = false;
      }
    }

    await office.save();

    return res.status(200).json({
      success: true,
      message: 'Office updated successfully',
      office: {
        ...office.toObject(),
        id: office._id.toString()
      }
    });

  } catch (error) {
    console.error('update_epc_office error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update office' });
  }
};

// ─── PATCH /api/india/v1/shop/epc/offices/:id/set-home ───────────────────────
const set_home_office = async (req, res) => {
  try {
    const { id } = req.params;
    const { account, company } = await resolveAccountAndCompany(req);

    const office = await EpcOffice.findOne({
      _id: id,
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    });

    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }

    // Demote any other home office in this state
    await EpcOffice.updateMany(
      {
        _id: { $ne: office._id },
        state_id: office.state_id,
        deleted_at: null,
        $or: [
          { account_id: account._id },
          ...(company?._id ? [{ company_id: company._id }] : [])
        ]
      },
      { $set: { is_home_office: false } }
    );

    office.is_home_office = true;
    await office.save();

    return res.status(200).json({
      success: true,
      message: `${office.office_name} (${office.district_name}) tagged as Primary Home Office for ${office.state_name}!`,
      office: {
        ...office.toObject(),
        id: office._id.toString()
      }
    });

  } catch (error) {
    console.error('set_home_office error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to set home office' });
  }
};

// ─── DELETE /api/india/v1/shop/epc/offices/:id ──────────────────────────────
const delete_epc_office = async (req, res) => {
  try {
    const { id } = req.params;
    const { account, company } = await resolveAccountAndCompany(req);

    const office = await EpcOffice.findOne({
      _id: id,
      deleted_at: null,
      $or: [
        { account_id: account._id },
        ...(company?._id ? [{ company_id: company._id }] : [])
      ]
    });

    if (!office) {
      return res.status(404).json({ success: false, message: 'Office not found' });
    }

    const wasHomeOffice = office.is_home_office;
    office.deleted_at = new Date();
    await office.save();

    // If it was the home office, designate another remaining office in that state as home office
    if (wasHomeOffice) {
      const nextOffice = await EpcOffice.findOne({
        state_id: office.state_id,
        deleted_at: null,
        $or: [
          { account_id: account._id },
          ...(company?._id ? [{ company_id: company._id }] : [])
        ]
      }).sort({ created_at: 1 });

      if (nextOffice) {
        nextOffice.is_home_office = true;
        await nextOffice.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Office deleted successfully'
    });

  } catch (error) {
    console.error('delete_epc_office error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete office' });
  }
};

// Helper to populate district names without cross-database populate errors
async function attachDistrictsToUsers(users) {
  const isArray = Array.isArray(users);
  const list = isArray ? users : [users];

  const allDistrictIds = new Set();
  list.forEach(u => {
    const arr = u.assigned_districts || u.districts || [];
    arr.forEach(d => {
      const idStr = (d?._id || d)?.toString();
      if (idStr && mongoose.Types.ObjectId.isValid(idStr)) allDistrictIds.add(idStr);
    });
  });

  const districtDocs = await GeoLevel2.find({ _id: { $in: Array.from(allDistrictIds) } }).select('_id name').lean();
  const districtMap = new Map(districtDocs.map(d => [d._id.toString(), d.name]));

  const formatted = list.map(u => {
    const rawDistricts = u.assigned_districts || u.districts || [];
    const effectiveRole = u.role || 'shopper';
    const effectivePermissions = u.permissions && u.permissions.length > 0
      ? u.permissions
      : (effectiveRole === 'admin' ? ['all'] : (effectiveRole === 'account' ? ['can_view_orders', 'can_checkout'] : ['can_view_catalog', 'can_add_to_cart']));

    return {
      id: (u._id || u.id).toString(),
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      role: effectiveRole,
      permissions: effectivePermissions,
      is_active: u.is_active !== false,
      assigned_districts: rawDistricts.map(d => {
        const dIdStr = (d?._id || d).toString();
        return {
          id: dIdStr,
          name: districtMap.get(dIdStr) || 'District'
        };
      }),
      created_at: u.created_at
    };
  });

  return isArray ? formatted : formatted[0];
}

// ─── GET /api/india/v1/shop/epc/users ───────────────────────────────────────
const get_epc_users = async (req, res) => {
  try {
    const { account, company } = await resolveAccountAndCompany(req);

    const query = {
      deleted_at: null,
      $or: [
        { parent_account_id: account._id },
        ...(company?._id ? [{ company_id: company._id, _id: { $ne: account._id } }] : [])
      ]
    };

    const subUsers = await EpcAccount.find(query)
      .sort({ created_at: -1 })
      .lean();

    const formattedUsers = await attachDistrictsToUsers(subUsers);

    return res.status(200).json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('get_epc_users error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch users' });
  }
};

// ─── POST /api/india/v1/shop/epc/users ──────────────────────────────────────
const create_epc_user = async (req, res) => {
  try {
    const { account, company } = await resolveAccountAndCompany(req);

    // ── SECURITY: Only EPC Admin / Owner can create sub-users ──
    const isOwnerOrAdmin = !account.parent_account_id || account.role === 'admin' || account.role === 'owner';
    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only the EPC Admin / Owner can create team members.'
      });
    }

    const { name, email, whatsapp, password, role, permissions, assigned_districts } = req.body;

    if (!name || !email || !password || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email, WhatsApp, and Password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await EpcAccount.findOne({ email: cleanEmail, deleted_at: null });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Determine target role: default to 'shopper'
    const cleanRole = (role && ['admin', 'account', 'shopper', 'staff', 'engineer', 'manager'].includes(role))
      ? role
      : 'shopper';

    // Determine permissions (eligibility)
    let effectivePermissions = Array.isArray(permissions) && permissions.length > 0 ? permissions : [];
    if (effectivePermissions.length === 0) {
      if (cleanRole === 'admin') effectivePermissions = ['all'];
      else if (cleanRole === 'account') effectivePermissions = ['can_view_orders', 'can_checkout', 'can_view_catalog'];
      else effectivePermissions = ['can_view_catalog', 'can_add_to_cart'];
    }

    const password_hash = await bcrypt.hash(password.trim(), 10);

    const newUser = await EpcAccount.create({
      name: name.trim(),
      email: cleanEmail,
      whatsapp: whatsapp.trim(),
      password_hash,
      role: cleanRole,
      permissions: effectivePermissions,
      parent_account_id: account._id,
      company_id: company?._id || account.company_id || null,
      assigned_districts: Array.isArray(assigned_districts) ? assigned_districts : [],
      states: account.states || [],
      districts: Array.isArray(assigned_districts) ? assigned_districts : (account.districts || []),
      is_email_verified: true,
      is_whatsapp_verified: true,
      status: 'approved',
      is_active: true
    });

    const formattedUser = await attachDistrictsToUsers(newUser.toObject());

    return res.status(201).json({
      success: true,
      message: `User ${name} created successfully!`,
      user: formattedUser
    });

  } catch (error) {
    console.error('create_epc_user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
};

// ─── PUT /api/india/v1/shop/epc/users/:id ───────────────────────────────────
const update_epc_user = async (req, res) => {
  try {
    const { id } = req.params;
    const { account, company } = await resolveAccountAndCompany(req);

    // ── SECURITY: Only EPC Admin / Owner can edit sub-users ──
    const isOwnerOrAdmin = !account.parent_account_id || account.role === 'admin' || account.role === 'owner';
    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only the EPC Admin / Owner can update team members.'
      });
    }

    const { name, whatsapp, password, role, permissions, assigned_districts, is_active } = req.body;

    const userToUpdate = await EpcAccount.findOne({
      _id: id,
      deleted_at: null,
      $or: [
        { parent_account_id: account._id },
        ...(company?._id ? [{ company_id: company._id, _id: { $ne: account._id } }] : [])
      ]
    });

    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) userToUpdate.name = name.trim();
    if (whatsapp !== undefined) userToUpdate.whatsapp = whatsapp.trim();
    if (role !== undefined) userToUpdate.role = role;
    if (Array.isArray(permissions)) userToUpdate.permissions = permissions;
    if (is_active !== undefined) userToUpdate.is_active = is_active;
    if (Array.isArray(assigned_districts)) {
      userToUpdate.assigned_districts = assigned_districts;
      userToUpdate.districts = assigned_districts;
    }
    if (password && password.trim().length >= 6) {
      userToUpdate.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    await userToUpdate.save();

    const formattedUser = await attachDistrictsToUsers(userToUpdate.toObject());

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: formattedUser
    });

  } catch (error) {
    console.error('update_epc_user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
};

// ─── DELETE /api/india/v1/shop/epc/users/:id ────────────────────────────────
const delete_epc_user = async (req, res) => {
  try {
    const { id } = req.params;
    const { account, company } = await resolveAccountAndCompany(req);

    // ── SECURITY: Only EPC Admin / Owner can delete sub-users ──
    const isOwnerOrAdmin = !account.parent_account_id || account.role === 'admin' || account.role === 'owner';
    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only the EPC Admin / Owner can remove team members.'
      });
    }

    const userToDelete = await EpcAccount.findOne({
      _id: id,
      deleted_at: null,
      $or: [
        { parent_account_id: account._id },
        ...(company?._id ? [{ company_id: company._id, _id: { $ne: account._id } }] : [])
      ]
    });

    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    userToDelete.deleted_at = new Date();
    await userToDelete.save();

    return res.status(200).json({
      success: true,
      message: 'User removed successfully'
    });

  } catch (error) {
    console.error('delete_epc_user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
};

module.exports = {
  get_epc_profile,
  onboard_state_gst,
  lookup_gst_details,
  get_epc_offices,
  add_epc_office,
  update_epc_office,
  set_home_office,
  delete_epc_office,
  get_epc_users,
  create_epc_user,
  update_epc_user,
  delete_epc_user
};
