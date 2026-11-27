const mongoose = require('mongoose');
const { EpcAccount, EpcSignupRequest, EPCLead } = require("../../../models/india_solarshop_db");
const { EpcCompany } = require("../../../models/india_core_db");
const { GeoLevel0, GeoLevel1 } = require("../../../models/geolocation_db");
const { delete_uploaded_files } = require("../../../utils/upload.files");
const { promoteMatchingSegmentLeads } = require("../../../marketing/services/segmentPromotion.service");

const get_epc_requests = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = "", state = "", status = "pending", epc_type = "" } = req.query;
        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const skip = (page - 1) * limit;

        let filter = { deleted_at: null };
        if (status && status !== "all") filter.status = status;
        if (search && search.trim()) {
            const s = search.trim();
            filter.$or = [
                { company_name: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } },
                { whatsapp: { $regex: s, $options: 'i' } }
            ];
        }
        if (state && state !== "all") filter.state_id = state;
        if (epc_type && epc_type !== "all") filter.epc_type = new RegExp('^' + epc_type.trim() + '$', 'i');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        // 🚀 Parallel optimized query execution with MongoDB index utilization
        const [total, requests, epcTypeAgg, todayCount, weekCount] = await Promise.all([
            EpcSignupRequest.countDocuments(filter),
            EpcSignupRequest.find(filter)
                .populate({
                    path: 'account_id',
                    select: 'name email whatsapp registered_whatsapp is_registered_same_as_whatsapp gstin onboarding_source epc_type epc_type_id'
                })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EpcSignupRequest.aggregate([
                { $match: { deleted_at: null } },
                { $group: { _id: { $ifNull: ["$epc_type", "New EPC"] }, count: { $sum: 1 } } }
            ]),
            EpcSignupRequest.countDocuments({ deleted_at: null, created_at: { $gte: today } }),
            EpcSignupRequest.countDocuments({ deleted_at: null, created_at: { $gte: weekStart } })
        ]);

        // 🚀 Targeted Geographic batch lookup: fetch ONLY referenced states and districts on the page
        const stateIds = [...new Set(requests.map(r => r.state_id?.toString()).filter(Boolean))];
        const districtIds = [...new Set(requests.map(r => r.district_id?.toString()).filter(Boolean))];
        const { GeoLevel2 } = require("../../../models/geolocation_db");

        const [states, districts] = await Promise.all([
            stateIds.length > 0 ? GeoLevel1.find({ _id: { $in: stateIds } }).select('_id name').lean() : [],
            districtIds.length > 0 ? GeoLevel2.find({ _id: { $in: districtIds } }).select('_id name').lean() : []
        ]);

        const stateMap = new Map(states.map(s => [s._id.toString(), s.name]));
        const districtMap = new Map(districts.map(d => [d._id.toString(), d.name]));

        const data = requests.map(r => ({
            ...r,
            id: r._id,
            account_name: r.account_id?.name,
            registered_whatsapp: r.account_id?.registered_whatsapp,
            is_registered_same_as_whatsapp: r.account_id?.is_registered_same_as_whatsapp,
            state_name: r.state_name || (r.state_id ? stateMap.get(r.state_id.toString()) : null),
            district_name: r.district_name || (r.district_id ? districtMap.get(r.district_id.toString()) : null),
            gst_number: r.gstin || r.account_id?.gstin,
            onboarding_source: r.onboarding_source || r.account_id?.onboarding_source || 'direct',
            bde_name: r.bde_name || null,
            onboarded_by_bde_id: r.onboarded_by_bde_id || null,
            assigned_reseller_id: r.assigned_reseller_id || null,
            assigned_reseller_name: r.assigned_reseller_name || null,
            is_direct_store_epc: r.is_direct_store_epc || false,
            auto_assigned: r.auto_assigned || false,
            epc_type: r.epc_type || r.account_id?.epc_type || 'New EPC',
            epc_type_id: r.epc_type_id || r.account_id?.epc_type_id || null
        }));

        const byEpcType = {};
        epcTypeAgg.forEach(item => { if (item._id) byEpcType[item._id] = item.count; });

        const summary = {
            total_requests: total,
            by_epc_type: byEpcType,
            today_requests: todayCount,
            this_week_requests: weekCount,
            this_week_reqests: weekCount // Fallback for frontend typo
        };

        return res.json({
            status: "success",
            message: "EPC requests fetched successfully",
            data,
            summary,
            pagination: { total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("get_epc_requests error:", error.message);
        return res.status(500).json({ status: "error", message: "Failed to fetch requests" });
    }
};

const update_epc_request_status = async (req, res) => {
    try {
        const { request_id, action, status } = req.body;
        const resolvedAction = action || (status === 'approved' ? 'approve' : (status === 'rejected' ? 'reject' : status));
        if (!request_id || !resolvedAction) {
            if (req.files) delete_uploaded_files(req.files);
            return res.status(400).json({ status: "error", message: "request_id and action are required" });
        }

        const request = await EpcSignupRequest.findOne({ _id: request_id });
        if (!request) {
            if (req.files) delete_uploaded_files(req.files);
            return res.status(404).json({ status: "error", message: "Request not found" });
        }

        const referenceImage = req.files?.[0]?.path;
        // Require reference image only for self-service signups if desired, but make it optional for BDE verified onboarding
        if (resolvedAction === "approve" && !referenceImage && request.onboarding_source !== 'bde' && !request.reference_image) {
            return res.status(400).json({ status: "error", message: "Reference image is required for approval" });
        }

        if (resolvedAction === "approve") {
            // ⚡ Find or Create the EPC Company in core DB
            let epcCompany = await EpcCompany.findOne({ email: request.email, deleted_at: null });
            if (!epcCompany) {
                epcCompany = await EpcCompany.create({
                    name: request.company_name,
                    email: request.email,
                    source: "verified",
                    working_states: request.state_id ? [request.state_id] : []
                });
            }

            // ⚡ Build Account Update Object
            const accountUpdate = {
                status: 'approved',
                company_id: epcCompany._id
            };

            // If an operational franchisee was assigned (via BDE district auto-match or selection)
            if (request.assigned_reseller_id) {
                accountUpdate.primary_reseller_id = request.assigned_reseller_id;
                accountUpdate.onboarded_by_reseller_id = request.assigned_reseller_id;
                accountUpdate.reseller_assigned_date = new Date();

                // Activate or create EpcResellerRelationship
                const { EpcResellerRelationship } = require("../../../models/india_solarshop_db");
                await EpcResellerRelationship.findOneAndUpdate(
                    { epc_id: request.account_id, reseller_id: request.assigned_reseller_id },
                    {
                        epc_id: request.account_id,
                        reseller_id: request.assigned_reseller_id,
                        effective_from: new Date(),
                        status: 'active',
                        assigned_by_bde_id: request.onboarded_by_bde_id || null,
                        assigned_by_bde_name: request.bde_name || null,
                        transfer_reason: `Admin Approved BDE Assignment to District Franchisee`
                    },
                    { upsert: true }
                );
            } else {
                // Direct Solar Store EPC (No franchise available in district)
                accountUpdate.primary_reseller_id = null;
            }

            // ⚡ Update EPC Account status to approved
            await EpcAccount.updateOne({ _id: request.account_id }, { $set: accountUpdate });

            const reviewerId = (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id))
                ? req.user.id
                : null;

            // ⚡ Mark request as approved
            await EpcSignupRequest.updateOne({ _id: request_id }, {
                $set: {
                    status: 'approved',
                    reference_image: referenceImage || request.reference_image || null,
                    reviewed_by: reviewerId,
                    reviewed_at: new Date()
                }
            });

            // ⚡ Sync linked EPCLead if exists
            const approvalLeadStatus = accountUpdate.primary_reseller_id ? 'Assigned to Franchisee' : 'Onboarded';
            await EPCLead.updateOne(
                {
                    deleted_at: null,
                    $or: [
                        { onboarded_epc_account_id: request.account_id },
                        ...(request.gstin ? [{ gst_number: request.gstin }] : []),
                    ],
                },
                {
                    $set: {
                        lead_status: approvalLeadStatus,
                        assigned_franchisee_id: accountUpdate.primary_reseller_id || undefined,
                    },
                    $push: {
                        history: {
                            activity_type: 'status_change',
                            notes: `EPC Account approved by Admin`,
                            actor_id: reviewerId,
                            actor_name: req.user?.full_name || 'Admin',
                            new_status: approvalLeadStatus,
                        },
                    },
                }
            );

            try {
                const approvedAccount = await EpcAccount.findById(request.account_id);
                const verifiedGstin = request.gstin || approvedAccount?.gstin || '';
                if (verifiedGstin || approvedAccount?.is_gstin_active) {
                    await promoteMatchingSegmentLeads({
                        email: approvedAccount?.email || request.email,
                        phone: approvedAccount?.whatsapp || request.whatsapp,
                        gstin: verifiedGstin,
                        epcAccount: approvedAccount,
                        legalName: request.company_name,
                        tradeName: request.company_name,
                        stateId: request.state_id,
                        districtId: request.district_id,
                        verificationStatus: 'verified_admin'
                    });
                }
            } catch (promoErr) {
                console.warn('[update_epc_request_status] Segment promotion notice:', promoErr.message);
            }
        } else if (resolvedAction === "reject") {
            if (req.files) delete_uploaded_files(req.files);
            await EpcAccount.updateOne({ _id: request.account_id }, { $set: { status: 'rejected' } });
            await EpcSignupRequest.updateOne({ _id: request_id }, { $set: { status: 'rejected' } });

            // ⚡ Sync linked EPCLead to Closed if exists
            await EPCLead.updateOne(
                {
                    deleted_at: null,
                    $or: [
                        { onboarded_epc_account_id: request.account_id },
                        ...(request.gstin ? [{ gst_number: request.gstin }] : []),
                    ],
                },
                {
                    $set: { lead_status: 'Closed' },
                    $push: {
                        history: {
                            activity_type: 'status_change',
                            notes: `EPC Registration rejected by Admin`,
                            actor_id: req.user?.id || null,
                            actor_name: req.user?.full_name || 'Admin',
                            new_status: 'Closed',
                        },
                    },
                }
            );
        } else {
            if (req.files) delete_uploaded_files(req.files);
            return res.status(400).json({ status: "error", message: "Invalid action" });
        }

        return res.json({ status: "success", message: `Request ${resolvedAction}d successfully` });
    } catch (error) {
        if (req.files) delete_uploaded_files(req.files);
        console.error("❌ update_epc_request_status Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to update request",
            error: error.message
        });
    }
};

module.exports = { get_epc_requests, update_epc_request_status };