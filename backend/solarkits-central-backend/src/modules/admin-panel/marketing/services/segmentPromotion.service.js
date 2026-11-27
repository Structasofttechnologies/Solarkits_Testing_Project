const mongoose = require('mongoose');
const { MarketingSegment, MarketingSegmentContact } = require('../models');
const { EpcAccount } = require('../../models/india_solarshop_db');
const { EpcCompany, EpcCompanyGst } = require('../../models/india_core_db');
const { GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');
const { getStateNameFromGstCode } = require('../../../../utils/gstStateCodes');

const normalizeEmail = (value) => {
  const clean = String(value || '').trim().toLowerCase();
  return clean && clean.includes('@') ? clean : '';
};

const normalizePhone10 = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Recalculates active and promoted counters on MarketingSegment records from MongoDB.
 * @param {Array<string|mongoose.Types.ObjectId>} segmentIds
 */
const recalculateSegmentStats = async (segmentIds = []) => {
  const uniqueIds = [...new Set((segmentIds || []).filter(Boolean).map(String))];
  if (uniqueIds.length === 0) return;

  await Promise.all(
    uniqueIds.map(async (segId) => {
      if (!mongoose.Types.ObjectId.isValid(segId)) return;
      const objId = new mongoose.Types.ObjectId(segId);
      const activeMatch = {
        segment_id: objId,
        deleted_at: null,
        promotion_status: { $ne: 'promoted_to_verified_epc' }
      };

      const [contactCount, emailCount, phoneCount, promotedCount] = await Promise.all([
        MarketingSegmentContact.countDocuments(activeMatch),
        MarketingSegmentContact.countDocuments({ ...activeMatch, email: { $nin: ['', null] } }),
        MarketingSegmentContact.countDocuments({ ...activeMatch, phone_normalized: { $nin: ['', null] } }),
        MarketingSegmentContact.countDocuments({
          segment_id: objId,
          is_admin_deleted: { $ne: true },
          promotion_status: 'promoted_to_verified_epc'
        })
      ]);

      await MarketingSegment.updateOne(
        { _id: objId },
        {
          $set: {
            contact_count: contactCount,
            email_count: emailCount,
            phone_count: phoneCount,
            promoted_count: promotedCount
          }
        }
      );
    })
  );
};

/**
 * Resolves GeoLevel1 / GeoLevel2 IDs and canonical names for EPC verification records.
 */
const resolveGeoReferences = async ({ stateId, districtId, stateName, districtName, gstin, epcAccount }) => {
  let resolvedStateId = stateId || epcAccount?.states?.[0] || null;
  let resolvedStateName = stateName || epcAccount?.state_name || '';
  let resolvedDistrictId = districtId || epcAccount?.districts?.[0] || null;
  let resolvedDistrictName = districtName || epcAccount?.district_name || '';

  if (!resolvedStateName && gstin && gstin.length >= 2) {
    resolvedStateName = getStateNameFromGstCode(gstin.slice(0, 2)) || '';
  }

  if (resolvedStateId && mongoose.Types.ObjectId.isValid(resolvedStateId)) {
    const stateDoc = await GeoLevel1.findById(resolvedStateId).select('name').lean();
    if (stateDoc?.name) resolvedStateName = resolvedStateName || stateDoc.name;
  } else if (resolvedStateName) {
    const stateDoc = await GeoLevel1.findOne({
      name: new RegExp(`^${escapeRegex(resolvedStateName.trim())}$`, 'i'),
      deleted_at: null
    }).select('_id name').lean();
    if (stateDoc) {
      resolvedStateId = stateDoc._id;
      resolvedStateName = stateDoc.name;
    }
  }

  if (!resolvedStateId) {
    const fallbackState = await GeoLevel1.findOne({ is_active: true, deleted_at: null }).select('_id name').lean();
    if (fallbackState) {
      resolvedStateId = fallbackState._id;
      resolvedStateName = resolvedStateName || fallbackState.name;
    }
  }

  if (resolvedDistrictId && mongoose.Types.ObjectId.isValid(resolvedDistrictId)) {
    const distDoc = await GeoLevel2.findById(resolvedDistrictId).select('name').lean();
    if (distDoc?.name) resolvedDistrictName = resolvedDistrictName || distDoc.name;
  } else if (resolvedDistrictName) {
    const distFilter = {
      name: new RegExp(`^${escapeRegex(resolvedDistrictName.trim())}$`, 'i'),
      deleted_at: null
    };
    if (resolvedStateId) distFilter.level_1 = resolvedStateId;
    const distDoc = await GeoLevel2.findOne(distFilter).select('_id name').lean();
    if (distDoc) {
      resolvedDistrictId = distDoc._id;
      resolvedDistrictName = distDoc.name;
    }
  }

  return { resolvedStateId, resolvedStateName, resolvedDistrictId, resolvedDistrictName };
};

/**
 * Ensures EpcCompany, EpcCompanyGst, and EpcAccount records are complete and GST-verified.
 */
const ensureVerifiedEpcRecords = async ({
  email = '',
  phone = '',
  gstin = '',
  epcAccount = null,
  legalName = '',
  tradeName = '',
  contactName = '',
  stateId = null,
  districtId = null,
  stateName = '',
  districtName = '',
  verificationStatus = null
}) => {
  const cleanGst = gstin ? String(gstin).trim().toUpperCase() : '';
  const cleanEmail = normalizeEmail(email || epcAccount?.email);
  const cleanPhone10 = normalizePhone10(phone || epcAccount?.whatsapp);

  let accountDoc = epcAccount || null;
  if (!accountDoc && (cleanEmail || cleanPhone10 || cleanGst)) {
    const orClauses = [];
    if (cleanEmail) orClauses.push({ email: cleanEmail });
    if (cleanPhone10) orClauses.push({ whatsapp: cleanPhone10 });
    if (cleanGst) orClauses.push({ gstin: cleanGst });
    if (orClauses.length > 0) {
      accountDoc = await EpcAccount.findOne({ $or: orClauses, deleted_at: null });
    }
  }

  const finalGst = cleanGst || (accountDoc?.gstin ? String(accountDoc.gstin).trim().toUpperCase() : '');
  const geo = await resolveGeoReferences({
    stateId,
    districtId,
    stateName,
    districtName,
    gstin: finalGst,
    epcAccount: accountDoc
  });

  // Resolve or create EpcCompany (source: 'verified')
  let companyDoc = null;
  const existingGstRecord = finalGst
    ? await EpcCompanyGst.findOne({ gst_number: finalGst, deleted_at: null }).lean()
    : null;

  const candidateCompanyId = accountDoc?.company_id || existingGstRecord?.company_id || null;
  if (candidateCompanyId) {
    companyDoc = await EpcCompany.findById(candidateCompanyId);
  }
  const companyEmail = cleanEmail || normalizeEmail(accountDoc?.email) || (cleanPhone10 ? `${cleanPhone10}@epc.solarkits.in` : `verified_${Date.now()}@epc.solarkits.in`);
  if (!companyDoc && companyEmail) {
    companyDoc = await EpcCompany.findOne({ email: companyEmail, deleted_at: null });
  }

  if (!companyDoc && (finalGst || accountDoc)) {
    companyDoc = await EpcCompany.create({
      name: tradeName || legalName || accountDoc?.gstin_trade_name || accountDoc?.name || contactName || 'Verified Solar EPC',
      legal_name: legalName || accountDoc?.gstin_legal_name || accountDoc?.name || contactName || null,
      brand_name: tradeName || accountDoc?.gstin_trade_name || null,
      email: companyEmail,
      source: 'verified',
      working_states: geo.resolvedStateId ? [geo.resolvedStateId] : []
    });
  } else if (companyDoc) {
    let dirtyCompany = false;
    if (companyDoc.source !== 'verified') {
      companyDoc.source = 'verified';
      dirtyCompany = true;
    }
    if (legalName && !companyDoc.legal_name) {
      companyDoc.legal_name = legalName;
      dirtyCompany = true;
    }
    if (tradeName && !companyDoc.brand_name) {
      companyDoc.brand_name = tradeName;
      dirtyCompany = true;
    }
    if (geo.resolvedStateId && !(companyDoc.working_states || []).some((s) => String(s) === String(geo.resolvedStateId))) {
      companyDoc.working_states.push(geo.resolvedStateId);
      dirtyCompany = true;
    }
    if (dirtyCompany) await companyDoc.save();
  }

  const companyId = companyDoc?._id || candidateCompanyId || null;

  // Ensure EpcCompanyGst record when GSTIN and companyId exist
  if (finalGst && companyId && geo.resolvedStateId && !existingGstRecord) {
    try {
      await EpcCompanyGst.findOneAndUpdate(
        { company_id: companyId, state_id: geo.resolvedStateId },
        { gst_number: finalGst, deleted_at: null },
        { upsert: true, new: true }
      );
    } catch (gstErr) {
      if (gstErr.code !== 11000) {
        console.warn('[segmentPromotion] EpcCompanyGst upsert warning:', gstErr.message);
      }
    }
  }

  // Ensure EpcAccount carries verified flags, company link, and geo fallback
  if (accountDoc) {
    const resolvedVerStatus = verificationStatus
      || (['verified_automatic', 'verified_admin'].includes(accountDoc.gst_verification_status)
        ? accountDoc.gst_verification_status
        : (accountDoc.onboarding_source === 'database' ? 'verified_automatic' : 'verified_admin'));

    const updateSet = {
      is_gstin_active: true,
      gst_verification_status: resolvedVerStatus
    };
    if (finalGst && !accountDoc.gstin) updateSet.gstin = finalGst;
    if (!accountDoc.gstin_verified_at) updateSet.gstin_verified_at = new Date();
    if (companyId && !accountDoc.company_id) updateSet.company_id = companyId;
    if (accountDoc.status === 'pending') updateSet.status = 'approved';
    if (legalName && !accountDoc.gstin_legal_name) updateSet.gstin_legal_name = legalName;
    if (tradeName && !accountDoc.gstin_trade_name) updateSet.gstin_trade_name = tradeName;
    if (geo.resolvedStateName && !accountDoc.state_name) updateSet.state_name = geo.resolvedStateName;
    if (geo.resolvedDistrictName && !accountDoc.district_name) updateSet.district_name = geo.resolvedDistrictName;

    const addToSet = {};
    if (geo.resolvedStateId && !(accountDoc.states || []).some((s) => String(s) === String(geo.resolvedStateId))) {
      addToSet.states = geo.resolvedStateId;
    }
    if (geo.resolvedDistrictId && !(accountDoc.districts || []).some((d) => String(d) === String(geo.resolvedDistrictId))) {
      addToSet.districts = geo.resolvedDistrictId;
    }

    const updateOps = { $set: updateSet };
    if (Object.keys(addToSet).length > 0) updateOps.$addToSet = addToSet;

    await EpcAccount.updateOne({ _id: accountDoc._id }, updateOps);
  }

  return {
    epcId: accountDoc?._id || null,
    companyId,
    gstin: finalGst || null
  };
};

/**
 * Promotes matching Segment Group contacts into the Verified EPC database upon GSTIN verification
 * and removes them from active MarketingSegmentContact records.
 */
const promoteMatchingSegmentLeads = async ({
  email = '',
  phone = '',
  gstin = '',
  epcAccount = null,
  legalName = '',
  tradeName = '',
  stateId = null,
  districtId = null,
  stateName = '',
  districtName = '',
  verificationStatus = null
} = {}) => {
  const cleanEmail = normalizeEmail(email || epcAccount?.email);
  const cleanPhone10 = normalizePhone10(phone || epcAccount?.whatsapp);
  const cleanGst = gstin ? String(gstin).trim().toUpperCase() : (epcAccount?.gstin || '');

  const orClauses = [];
  if (cleanEmail) orClauses.push({ email: cleanEmail });
  if (cleanPhone10) {
    orClauses.push({ phone_normalized: cleanPhone10 });
    orClauses.push({ phone: cleanPhone10 });
  }

  let matchedContacts = [];
  if (orClauses.length > 0) {
    matchedContacts = await MarketingSegmentContact.find({
      deleted_at: null,
      promotion_status: { $ne: 'promoted_to_verified_epc' },
      $or: orClauses
    }).lean();
  }

  const firstContact = matchedContacts[0] || {};
  const verified = await ensureVerifiedEpcRecords({
    email: cleanEmail,
    phone: cleanPhone10,
    gstin: cleanGst,
    epcAccount,
    legalName,
    tradeName,
    contactName: firstContact.name || '',
    stateId,
    districtId,
    stateName: stateName || firstContact.state || firstContact.dynamic_fields?.state || '',
    districtName: districtName || firstContact.district || firstContact.dynamic_fields?.district || '',
    verificationStatus
  });

  if (matchedContacts.length === 0) {
    return { promoted: 0, affected_segments: 0, epc_id: verified.epcId };
  }

  const now = new Date();
  const matchedIds = matchedContacts.map((c) => c._id);
  const affectedSegmentIds = [...new Set(matchedContacts.map((c) => String(c.segment_id)))];

  await MarketingSegmentContact.updateMany(
    { _id: { $in: matchedIds } },
    {
      $set: {
        deleted_at: now,
        is_admin_deleted: false,
        promotion_status: 'promoted_to_verified_epc',
        promoted_epc_id: verified.epcId,
        promoted_gstin: verified.gstin,
        promoted_at: now
      }
    }
  );

  await recalculateSegmentStats(affectedSegmentIds);

  return {
    promoted: matchedContacts.length,
    affected_segments: affectedSegmentIds.length,
    epc_id: verified.epcId
  };
};

/**
 * Reconciles active Segment Group contacts against all GST-verified EPCs in MongoDB.
 * Removes already-verified contacts from segment lists and syncs Verified EPC records.
 */
const reconcileSegmentLeadsWithVerifiedEpcs = async (segmentIds = null) => {
  const contactQuery = {
    deleted_at: null,
    promotion_status: { $ne: 'promoted_to_verified_epc' }
  };

  if (Array.isArray(segmentIds) && segmentIds.length > 0) {
    const validIds = segmentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validIds.length === 0) return { reconciled: 0, affected_segments: 0 };
    contactQuery.segment_id = { $in: validIds };
  } else if (segmentIds && mongoose.Types.ObjectId.isValid(segmentIds)) {
    contactQuery.segment_id = new mongoose.Types.ObjectId(segmentIds);
  }

  const activeContacts = await MarketingSegmentContact.find(contactQuery)
    .select('_id segment_id name email phone phone_normalized state district dynamic_fields')
    .lean();

  if (activeContacts.length === 0) {
    return { reconciled: 0, affected_segments: 0 };
  }

  // Load verified EPC accounts & verified company GST records in parallel
  const [verifiedAccounts, activeCompanyGsts] = await Promise.all([
    EpcAccount.find({
      deleted_at: null,
      $or: [
        { is_gstin_active: true },
        { gst_verification_status: { $in: ['verified_automatic', 'verified_admin'] } }
      ]
    })
      .select('_id name email whatsapp company_id gstin gst_verification_status is_gstin_active onboarding_source states districts state_name district_name gstin_legal_name gstin_trade_name gstin_verified_at status')
      .lean(),
    EpcCompanyGst.find({ deleted_at: null })
      .select('company_id state_id gst_number')
      .lean()
  ]);

  const verifiedByEmail = new Map();
  const verifiedByPhone = new Map();

  for (const acc of verifiedAccounts) {
    const e = normalizeEmail(acc.email);
    const p = normalizePhone10(acc.whatsapp);
    const info = { epcAccount: acc, gstin: acc.gstin || '', companyId: acc.company_id || null };
    if (e) verifiedByEmail.set(e, info);
    if (p) verifiedByPhone.set(p, info);
  }

  if (activeCompanyGsts.length > 0) {
    const companyIds = [...new Set(activeCompanyGsts.map((g) => g.company_id).filter(Boolean))];
    const companies = await EpcCompany.find({ _id: { $in: companyIds }, deleted_at: null })
      .select('_id email name legal_name brand_name')
      .lean();
    const companyMap = new Map(companies.map((c) => [String(c._id), c]));

    for (const gstRow of activeCompanyGsts) {
      const comp = companyMap.get(String(gstRow.company_id));
      const cEmail = normalizeEmail(comp?.email);
      if (cEmail && !verifiedByEmail.has(cEmail)) {
        verifiedByEmail.set(cEmail, {
          epcAccount: null,
          gstin: gstRow.gst_number || '',
          companyId: gstRow.company_id,
          legalName: comp?.legal_name || comp?.name || '',
          tradeName: comp?.brand_name || comp?.name || '',
          stateId: gstRow.state_id || null
        });
      }
    }
  }

  if (verifiedByEmail.size === 0 && verifiedByPhone.size === 0) {
    return { reconciled: 0, affected_segments: 0 };
  }

  const now = new Date();
  const bulkOps = [];
  const affectedSegments = new Set();

  for (const contact of activeContacts) {
    const cEmail = normalizeEmail(contact.email);
    const cPhone = normalizePhone10(contact.phone_normalized || contact.phone);
    const match = (cEmail && verifiedByEmail.get(cEmail)) || (cPhone && verifiedByPhone.get(cPhone)) || null;
    if (!match) continue;

    const ensured = await ensureVerifiedEpcRecords({
      email: cEmail,
      phone: cPhone,
      gstin: match.gstin,
      epcAccount: match.epcAccount,
      legalName: match.legalName || '',
      tradeName: match.tradeName || '',
      contactName: contact.name || '',
      stateId: match.stateId || null,
      stateName: contact.state || contact.dynamic_fields?.state || '',
      districtName: contact.district || contact.dynamic_fields?.district || ''
    });

    bulkOps.push({
      updateOne: {
        filter: { _id: contact._id },
        update: {
          $set: {
            deleted_at: now,
            is_admin_deleted: false,
            promotion_status: 'promoted_to_verified_epc',
            promoted_epc_id: ensured.epcId,
            promoted_gstin: ensured.gstin,
            promoted_at: now
          }
        }
      }
    });
    affectedSegments.add(String(contact.segment_id));
  }

  if (bulkOps.length > 0) {
    await MarketingSegmentContact.bulkWrite(bulkOps);
    await recalculateSegmentStats([...affectedSegments]);
  }

  return {
    reconciled: bulkOps.length,
    affected_segments: affectedSegments.size
  };
};

module.exports = {
  normalizeEmail,
  normalizePhone10,
  recalculateSegmentStats,
  promoteMatchingSegmentLeads,
  reconcileSegmentLeadsWithVerifiedEpcs
};
