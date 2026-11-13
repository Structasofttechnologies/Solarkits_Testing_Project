/**
 * website.epc.lead.handler.js
 *
 * Controller for:
 * 1. Public submission of Bulk Solar Kit inquiries by EPCs from the website banner
 * 2. Admin dashboard listing with state-wise, BDE-wise and status filters
 * 3. Multi-lead selection and bulk assignment to BDEs
 * 4. Status tracking and audit
 */

const mongoose = require('mongoose');
const { WebsiteEpcLead, BDEProfile, BDENotification, BDETerritoryAssignment, EpcAccount } = require('../models/india_solarshop_db');
const bcrypt = require('bcrypt');
const { sendAdminNotification } = require('../services/admin.notification.service');
const { GeoLevel1 } = require('../models/geolocation_db');

// Helper to generate unique Lead ID
const generateLeadId = async () => {
  const year = new Date().getFullYear();
  const prefix = `WEB-${year}-`;
  try {
    const count = await WebsiteEpcLead.countDocuments({
      lead_id: { $regex: `^${prefix}` }
    });
    const sequence = String(count + 1).padStart(4, '0');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${prefix}${sequence}${randomSuffix}`;
  } catch (e) {
    return `${prefix}${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
  }
};

/**
 * 1. PUBLIC: Submit Bulk Solar Kit Inquiry from Website Banner
 * POST /api/india/v1/website-leads/submit
 */
exports.submit_website_lead = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      state_name,
      state_id,
      district_name,
      pincode,
      estimated_quantity,
      query_message,
      project_type,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your name or company name.' });
    }

    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }
    const finalPhone = cleanPhone.slice(-10);

    if (!state_name || !state_name.trim()) {
      return res.status(400).json({ success: false, message: 'Please select your state.' });
    }

    // Auto-resolve state_id if not sent
    let resolvedStateId = state_id && mongoose.Types.ObjectId.isValid(state_id) ? state_id : null;
    if (!resolvedStateId && GeoLevel1) {
      try {
        const foundState = await GeoLevel1.findOne({
          name: { $regex: new RegExp(`^${state_name.trim()}$`, 'i') },
          deleted_at: null,
        }).select('_id');
        if (foundState) resolvedStateId = foundState._id;
      } catch (e) {}
    }

    const leadId = await generateLeadId();
    const trimmedName = name.trim();

    const newLead = await WebsiteEpcLead.create({
      lead_id: leadId,
      name: trimmedName,
      company_name: trimmedName,
      contact_person: trimmedName,
      phone: finalPhone,
      mobile_number: finalPhone,
      email: email && email.trim() ? email.trim().toLowerCase() : `${finalPhone}@lead.solarkits.in`,
      state_id: resolvedStateId,
      state_name: state_name.trim(),
      district_name: district_name ? district_name.trim() : null,
      pincode: pincode ? pincode.trim() : null,
      project_type: project_type || 'Bulk Solar Combo Kits',
      estimated_quantity: estimated_quantity || 'Bulk Order (5+ Kits)',
      query_message: query_message ? query_message.trim() : null,
      status: 'new',
      lead_status: 'New',
      lead_source: 'portal',
      source: 'solar-store-bulk-banner',
    });

    // Real-time notification to Admin bell icon
    try {
      await sendAdminNotification({
        title: 'New Website EPC Lead Received',
        message: `${newLead.name} (${newLead.state_name}${newLead.district_name ? ', ' + newLead.district_name : ''}) submitted a new bulk inquiry for ${newLead.estimated_quantity}.`,
        category: 'epc',
        priority: 'high',
        action_url: '/admin-panel/solar-shop/india/approve-new-epc',
        metadata: {
          lead_id: newLead.lead_id,
          phone: newLead.phone,
          state: newLead.state_name,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to send admin notification for new EPC lead:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your bulk solar kit inquiry has been received. Our regional BDE will contact you shortly.',
      data: {
        lead_id: newLead.lead_id,
        name: newLead.name,
        phone: newLead.phone,
        state_name: newLead.state_name,
        created_at: newLead.created_at,
      },
    });
  } catch (error) {
    console.error('Error submitting website EPC lead:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit inquiry. Please try again or call our hotline.',
      error: error.message,
    });
  }
};

/**
 * 2. PUBLIC / ADMIN: Get Active States (from Setup Location)
 * GET /api/india/v1/website-leads/active-states
 */
exports.get_active_states = async (req, res) => {
  try {
    let states = [];
    if (GeoLevel1) {
      states = await GeoLevel1.find({
        is_active: { $ne: false },
        deleted_at: null,
      })
        .select('_id name state_code')
        .sort({ name: 1 })
        .lean();
    }

    // Fallback if none found
    if (!states || states.length === 0) {
      const fallback = [
        'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
        'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
        'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha',
        'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
        'Uttarakhand', 'West Bengal'
      ];
      states = fallback.map(name => ({ name, state_code: name.slice(0, 2).toUpperCase() }));
    }

    return res.json({
      success: true,
      states,
    });
  } catch (error) {
    console.error('Error fetching active states for leads:', error);
    return res.status(500).json({ success: false, message: 'Failed to load states' });
  }
};

/**
 * 3. ADMIN: Get Live BDE List for Assignment Dropdown
 * GET /admin-api/website-leads/bdes
 */
exports.get_active_bdes = async (req, res) => {
  try {
    const bdes = await BDEProfile.find({
      status: { $ne: 'inactive' },
      deleted_at: null,
    })
      .select('_id bde_id full_name mobile_number email state_name')
      .sort({ full_name: 1 })
      .lean();

    return res.json({
      success: true,
      bdes,
    });
  } catch (error) {
    console.error('Error fetching BDEs:', error);
    return res.status(500).json({ success: false, message: 'Failed to load BDEs' });
  }
};

/**
 * 4. ADMIN: List Website EPC Leads with Filters & Stats
 * GET /admin-api/website-leads/list
 */
exports.list_website_leads = async (req, res) => {
  try {
    const {
      search,
      state_name,
      status,
      bde_id,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { deleted_at: null };

    // Search filter
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { lead_id: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } },
        { company_name: { $regex: s, $options: 'i' } },
        { contact_person: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { mobile_number: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { state_name: { $regex: s, $options: 'i' } },
        { pincode: { $regex: s, $options: 'i' } },
      ];
    }

    // State filter
    if (state_name && state_name !== 'all' && state_name.trim()) {
      query.state_name = state_name.trim();
    }

    // Status filter
    if (status && status !== 'all' && status.trim()) {
      if (status === 'unassigned') {
        query.$and = (query.$and || []).concat([
          { $or: [{ status: 'new' }, { status: null }, { assigned_bde_id: null }] }
        ]);
      } else if (status === 'assigned') {
        query.assigned_bde_id = { $ne: null };
      } else {
        query.$or = [{ status: status.trim() }, { lead_status: { $regex: new RegExp(`^${status.trim()}$`, 'i') } }];
      }
    }

    // BDE filter
    if (bde_id && bde_id !== 'all' && bde_id.trim()) {
      if (bde_id === 'unassigned') {
        query.assigned_bde_id = null;
      } else if (mongoose.Types.ObjectId.isValid(bde_id)) {
        query.$or = [{ assigned_bde_id: bde_id }, { current_bde_id: bde_id }];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch leads
    const [rawLeads, totalCount] = await Promise.all([
      WebsiteEpcLead.find(query)
        .populate('assigned_bde_id', 'full_name bde_id mobile_number email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WebsiteEpcLead.countDocuments(query),
    ]);

    const leads = rawLeads.map(l => ({
      ...l,
      name: l.name || l.contact_person || l.company_name || 'EPC Contractor',
      phone: l.phone || l.mobile_number || 'N/A',
      status: l.status || (l.assigned_bde_id ? 'assigned' : 'new'),
    }));

    // Aggregate statistics across all active leads
    const [totalAll, unassignedCount, assignedCount, onboardedCount] = await Promise.all([
      WebsiteEpcLead.countDocuments({ deleted_at: null }),
      WebsiteEpcLead.countDocuments({
        deleted_at: null,
        $or: [
          { assigned_bde_id: null, current_bde_id: null },
          { status: 'new' },
        ],
      }),
      WebsiteEpcLead.countDocuments({
        deleted_at: null,
        $or: [{ assigned_bde_id: { $ne: null } }, { current_bde_id: { $ne: null } }],
      }),
      WebsiteEpcLead.countDocuments({
        deleted_at: null,
        $or: [
          { status: { $in: ['onboarded', 'converted'] } },
          { lead_status: { $in: ['Onboarded', 'Assigned to Franchisee', 'Converted'] } },
        ],
      }),
    ]);

    // Distinct states in leads for quick filter dropdown
    const availableStates = await WebsiteEpcLead.distinct('state_name', { deleted_at: null });

    // Active BDEs for assignment dropdown with active territory assignments
    const rawBdes = await BDEProfile.find({
      status: { $ne: 'inactive' },
      deleted_at: null,
    })
      .select('_id bde_id full_name mobile_number email')
      .sort({ full_name: 1 })
      .lean();

    const bdeIds = rawBdes.map((b) => b._id);
    const territories = await BDETerritoryAssignment.find({
      bde_id: { $in: bdeIds },
      status: 'active',
    }).lean();

    const territoryMap = new Map();
    territories.forEach((t) => {
      const bId = t.bde_id.toString();
      if (!territoryMap.has(bId)) territoryMap.set(bId, []);
      territoryMap.get(bId).push({
        state_id: t.state_id,
        state_name: t.state_name,
        district_names: t.district_names || [],
      });
    });

    const availableBdes = rawBdes.map((b) => {
      const bTerritories = territoryMap.get(b._id.toString()) || [];
      const stateNames = [...new Set(bTerritories.map((t) => t.state_name).filter(Boolean))];
      const districtNames = [...new Set(bTerritories.flatMap((t) => t.district_names || []).filter(Boolean))];
      return {
        ...b,
        territories: bTerritories,
        state_names: stateNames,
        district_names: districtNames,
        display_label: `${b.full_name} (${b.bde_id}) - ${stateNames.length > 0 ? stateNames.join(', ') : 'No Territory Assigned'}`,
      };
    });

    return res.json({
      success: true,
      leads,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
      stats: {
        total_leads: totalAll,
        unassigned_count: unassignedCount,
        assigned_count: assignedCount,
        onboarded_count: onboardedCount,
        converted_count: onboardedCount,
      },
      available_states: availableStates.sort(),
      available_bdes: availableBdes,
    });
  } catch (error) {
    console.error('Error listing website EPC leads:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leads', error: error.message });
  }
};

/**
 * 5. ADMIN: Multi-Select Bulk Assign Leads to a BDE
 * POST /admin-api/website-leads/bulk-assign
 */
exports.bulk_assign_leads = async (req, res) => {
  try {
    const { lead_ids, bde_id } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one lead to assign.' });
    }

    if (!bde_id || !mongoose.Types.ObjectId.isValid(bde_id)) {
      return res.status(400).json({ success: false, message: 'Please select a valid BDE.' });
    }

    const bde = await BDEProfile.findById(bde_id).select('_id bde_id full_name mobile_number email');
    if (!bde) {
      return res.status(404).json({ success: false, message: 'Selected BDE not found in system.' });
    }

    const assignedBy = req.user?.full_name || req.user?.name || 'Admin';
    const now = new Date();

    // Map lead_ids to either ObjectIds or lead_id strings
    const idFilters = lead_ids.map(id => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        return { _id: id };
      }
      return { lead_id: id };
    });

    // Verify BDE active territory matches the leads' states
    const bdeTerritories = await BDETerritoryAssignment.find({
      bde_id: bde._id,
      status: 'active',
    }).lean();
    const bdeStates = [...new Set(bdeTerritories.map((t) => t.state_name?.trim().toLowerCase()).filter(Boolean))];

    if (bdeStates.length > 0 && !req.body.override_territory) {
      const leadsToAssign = await WebsiteEpcLead.find({ $or: idFilters, deleted_at: null }).lean();
      const mismatchedLeads = leadsToAssign.filter((l) => {
        const leadState = (l.state_name || l.state || '').trim().toLowerCase();
        return leadState && !bdeStates.includes(leadState);
      });

      if (mismatchedLeads.length > 0) {
        const mismatchNames = [...new Set(mismatchedLeads.map((l) => l.state_name || l.state))];
        return res.status(400).json({
          success: false,
          message: `Territory Mismatch: BDE ${bde.full_name} is assigned to ${bdeStates.map(s => s.toUpperCase()).join(', ')}, but ${mismatchedLeads.length} selected lead(s) are from ${mismatchNames.join(', ')}. Please select a BDE covering that state.`,
        });
      }
    }

    const result = await WebsiteEpcLead.updateMany(
      { $or: idFilters, deleted_at: null },
      {
        $set: {
          assigned_bde_id: bde._id,
          current_bde_id: bde._id,
          assigned_bde_name: bde.full_name,
          assigned_bde_phone: bde.mobile_number,
          assigned_at: now,
          assigned_by: assignedBy,
          status: 'assigned',
          lead_status: 'New',
          lead_source: 'head_office_assigned',
        },
      }
    );

    // Real-time notification to Admin bell icon
    try {
      await sendAdminNotification({
        title: 'EPC Leads Assigned to BDE',
        message: `${result.modifiedCount} EPC lead(s) assigned to BDE ${bde.full_name}.`,
        category: 'bde',
        priority: 'normal',
        action_url: '/admin-panel/solar-shop/india/approve-new-epc',
        metadata: {
          bde_id: bde._id,
          count: result.modifiedCount,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to send admin notification for bulk assignment:', notifErr.message);
    }

    // Real-time notification to BDE portal bell icon
    try {
      if (BDENotification) {
        await BDENotification.create({
          bde_id: bde._id,
          title: 'New EPC Leads Assigned',
          message: `Head Office assigned ${result.modifiedCount} new EPC contractor lead(s) to you. Please follow up.`,
          type: 'epc_lead',
          link: '/epc-leads',
          action_label: 'View EPC Leads',
          entity_type: 'website_epc_leads',
        });
      }
    } catch (bdeNotifErr) {
      console.warn('Failed to send BDE notification:', bdeNotifErr.message);
    }

    return res.json({
      success: true,
      message: `Successfully assigned ${result.modifiedCount} lead(s) to BDE ${bde.full_name}.`,
      modified_count: result.modifiedCount,
      assigned_bde: {
        _id: bde._id,
        bde_id: bde.bde_id,
        full_name: bde.full_name,
      },
    });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign leads', error: error.message });
  }
};

/**
 * 6. ADMIN: Update Single Lead Status or Remarks
 * PATCH /admin-api/website-leads/:id
 */
exports.update_lead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, assigned_bde_id } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { lead_id: id };
    const lead = await WebsiteEpcLead.findOne(query);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (status) {
      lead.status = (status === 'approved' || status === 'converted') ? 'converted' : status;
      if (status === 'approved' || status === 'converted') {
        lead.lead_status = 'Converted';
        try {
          const cleanPhone = String(lead.phone || '').replace(/\D/g, '').slice(-10);
          const epcEmail = (lead.email && lead.email.trim() && !lead.email.includes('@lead.solarkits.in'))
            ? lead.email.trim().toLowerCase()
            : `${cleanPhone}@epc.solarkits.in`;

          if (EpcAccount) {
            let existingAccount = await EpcAccount.findOne({
              $or: [
                { email: epcEmail },
                { whatsapp: cleanPhone }
              ],
              deleted_at: null
            });

            if (!existingAccount) {
              const defaultPassword = cleanPhone.slice(-4) || '1234';
              const passwordHash = await bcrypt.hash(defaultPassword, 10);
              await EpcAccount.create({
                name: lead.name,
                email: epcEmail,
                whatsapp: cleanPhone,
                password_hash: passwordHash,
                status: 'approved',
                onboarding_source: 'lead',
                state_name: lead.state_name,
                district_name: lead.district_name,
                pincode: lead.pincode,
                is_whatsapp_verified: true,
                is_email_verified: Boolean(lead.email && !lead.email.includes('@lead.solarkits.in'))
              });
              console.log(`Auto-created approved EpcAccount for lead: ${lead.name} (${epcEmail})`);
            } else {
              existingAccount.status = 'approved';
              await existingAccount.save();
              console.log(`Updated existing EpcAccount status to approved for lead: ${lead.name}`);
            }
          }
        } catch (accErr) {
          console.warn('Auto-create EpcAccount error on lead approval:', accErr.message);
        }
      }
    }
    if (remarks !== undefined) lead.remarks = remarks;

    if (assigned_bde_id) {
      if (mongoose.Types.ObjectId.isValid(assigned_bde_id)) {
        const bde = await BDEProfile.findById(assigned_bde_id);
        if (bde) {
          // Check state territory match
          const leadState = (lead.state_name || lead.state || '').trim().toLowerCase();
          if (leadState && !req.body.override_territory) {
            const bdeTerritories = await BDETerritoryAssignment.find({
              bde_id: bde._id,
              status: 'active',
            }).lean();
            const bdeStates = [...new Set(bdeTerritories.map((t) => t.state_name?.trim().toLowerCase()).filter(Boolean))];
            if (bdeStates.length > 0 && !bdeStates.includes(leadState)) {
              return res.status(400).json({
                success: false,
                message: `Territory Mismatch: BDE ${bde.full_name} is assigned to ${bdeStates.map(s => s.toUpperCase()).join(', ')}, but this lead is from ${lead.state_name || lead.state}. Please choose a BDE covering ${lead.state_name || lead.state}.`,
              });
            }
          }

          lead.assigned_bde_id = bde._id;
          lead.assigned_bde_name = bde.full_name;
          lead.assigned_bde_phone = bde.mobile_number;
          lead.assigned_at = new Date();
          lead.assigned_by = req.user?.full_name || 'Admin';
          if (lead.status === 'new') lead.status = 'assigned';
        }
      } else if (assigned_bde_id === 'unassign') {
        lead.assigned_bde_id = null;
        lead.assigned_bde_name = null;
        lead.assigned_bde_phone = null;
        lead.assigned_at = null;
        lead.status = 'new';
      }
    }

    await lead.save();

    if (assigned_bde_id && assigned_bde_id !== 'unassign' && lead.assigned_bde_id) {
      try {
        if (BDENotification) {
          await BDENotification.create({
            bde_id: lead.assigned_bde_id,
            title: 'New EPC Lead Assigned',
            message: `Head Office assigned lead ${lead.lead_id} (${lead.name}, ${lead.state_name}) to you.`,
            type: 'epc_lead',
            link: '/epc-leads',
            action_label: 'View Lead',
            entity_type: 'website_epc_leads',
            entity_id: lead.lead_id,
          });
        }
        await sendAdminNotification({
          title: 'EPC Lead Assigned to BDE',
          message: `Lead ${lead.lead_id} assigned to BDE ${lead.assigned_bde_name || 'BDE'}.`,
          category: 'bde',
          priority: 'normal',
          action_url: '/admin-panel/solar-shop/india/approve-new-epc',
          metadata: { lead_id: lead.lead_id },
        });
      } catch (bdeErr) {
        console.warn('Failed to create notification for single lead assignment:', bdeErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Lead updated successfully.',
      lead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lead', error: error.message });
  }
};

