const KnowledgeCenterVideo = require('../models/india_solarshop_db/knowledge_center_videos.schema');

// Initial seed tutorials for EPC & Franchisee
const DEFAULT_TUTORIAL_VIDEOS = [
  {
    title: "How to Place EPC Solar Combo Kit Orders",
    description: "Complete walkthrough on selecting 1kW, 2kW, 3kW residential and 10kW commercial solar combo kits with wholesale pricing.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "combo_kits",
    category_name: "Pre-Configured Combo Kits",
    target_audience: "epc",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: ["HowToUse", "ComboKits", "EPCStore"],
    duration_label: "4:15 mins",
    display_order: 1,
    is_published: true
  },
  {
    title: "How to Set Up & Use 4-Digit Unique Security PIN",
    description: "Learn how to choose your globally unique 4-digit PIN for 1-click passwordless login to the SolarKits EPC Business Portal.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "how_to_use",
    category_name: "Portal Login & Security",
    target_audience: "all",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: ["SecurityPIN", "LoginGuide", "QuickAccess"],
    duration_label: "2:30 mins",
    display_order: 2,
    is_published: true
  },
  {
    title: "Franchisee PO Creation & District EPC Allocations",
    description: "Step-by-step video guide for Franchise Partners on creating Purchase Orders, token deposits, and allocating kits to onboarded EPC contractors.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "purchase_orders",
    category_name: "Purchase Orders & Allocations",
    target_audience: "franchisee",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: ["FranchiseePO", "Allocations", "KitQuota"],
    duration_label: "5:45 mins",
    display_order: 3,
    is_published: true
  },
  {
    title: "Checking Wholesale Wallet, Margin Settlement & Invoices",
    description: "How franchisee partners and EPC contractors can review their active ledger, commission payouts, and download GST tax invoices.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "wallet_commission",
    category_name: "Wallet & Commission",
    target_audience: "all",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: ["Wallet", "Margin", "GSTInvoice"],
    duration_label: "3:50 mins",
    display_order: 4,
    is_published: true
  },
  {
    title: "Live Order Delivery Tracking & Material Inward Scan",
    description: "Learn how to track real-time dispatch from the nearest regional warehouse hub and verify delivered solar panels, inverters, and BOS packages.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "deliveries",
    category_name: "Deliveries & Tracking",
    target_audience: "all",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: ["DeliveryTracking", "Warehouse", "InwardScan"],
    duration_label: "3:20 mins",
    display_order: 5,
    is_published: true
  }
];

// Auto-seed helper
const ensureSeedVideos = async () => {
  try {
    const count = await KnowledgeCenterVideo.countDocuments({ deleted_at: null });
    if (count === 0) {
      await KnowledgeCenterVideo.insertMany(DEFAULT_TUTORIAL_VIDEOS);
    }
  } catch (err) {
    console.warn("[KnowledgeCenter] Seed error:", err.message);
  }
};

/**
 * GET /admin-api/knowledge-center/list or /api/india/v1/knowledge-center/list
 */
exports.list_videos = async (req, res) => {
  try {
    await ensureSeedVideos();

    const {
      audience,
      category,
      kit_type,
      state_name,
      district_name,
      search,
      is_published
    } = req.query;

    const query = { deleted_at: null };

    if (audience && audience !== 'all') {
      query.target_audience = { $in: [audience, 'all'] };
    }

    if (category && category !== 'all' && category !== 'All') {
      query.$or = [
        { category: category },
        { category_name: category },
        { category: new RegExp(`^${category}$`, 'i') },
        { category_name: new RegExp(`^${category}$`, 'i') }
      ];
    }

    if (kit_type && kit_type !== 'all' && kit_type !== 'All Kits') {
      query.$or = [{ kit_type: kit_type }, { kit_type: 'All Kits' }];
    }

    if (state_name && state_name !== 'all' && state_name !== 'All States') {
      query.$or = [{ state_name: state_name }, { state_name: 'All States' }];
    }

    if (district_name && district_name !== 'all' && district_name !== 'All Districts') {
      query.$or = [{ district_name: district_name }, { district_name: 'All Districts' }];
    }

    if (is_published !== undefined && is_published !== 'all') {
      query.is_published = is_published === 'true' || is_published === true;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { tags: { $in: [new RegExp(s, 'i')] } },
        { category_name: { $regex: s, $options: 'i' } }
      ];
    }

    const rawVideos = await KnowledgeCenterVideo.find(query).sort({ display_order: 1, created_at: -1 }).lean();

    // Normalize properties for all frontends (admin, epc store, reseller portal)
    const videos = rawVideos.map(v => ({
      ...v,
      id: v._id,
      headline: v.title,
      duration: v.duration_label || "3 mins",
      category_display: v.category_name || v.category || "General",
    }));

    // Dynamically compute all unique modules/categories for this audience
    const audienceQuery = { deleted_at: null };
    if (audience && audience !== 'all') {
      audienceQuery.target_audience = { $in: [audience, 'all'] };
    }
    const allAudienceDocs = await KnowledgeCenterVideo.find(audienceQuery, 'category category_name').lean();
    const categoriesSet = new Set(['All']);
    allAudienceDocs.forEach(d => {
      const label = d.category_name || d.category;
      if (label && label.trim()) {
        categoriesSet.add(label.trim());
      }
    });

    return res.json({
      success: true,
      status: 'success',
      data: videos,
      categories: Array.from(categoriesSet),
      count: videos.length
    });
  } catch (err) {
    console.error("list_videos error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch knowledge center videos", error: err.message });
  }
};

/**
 * POST /admin-api/knowledge-center/create
 */
exports.create_video = async (req, res) => {
  try {
    const {
      title,
      description,
      video_url,
      thumbnail_url,
      category,
      category_name,
      target_audience,
      kit_type,
      state_name,
      district_name,
      tags,
      duration_label,
      display_order,
      is_published
    } = req.body;

    if (!title || !video_url) {
      return res.status(400).json({ success: false, message: "Title and Video URL are required" });
    }

    const video = await KnowledgeCenterVideo.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      video_url: video_url.trim(),
      thumbnail_url: thumbnail_url ? thumbnail_url.trim() : "",
      category: category || "how_to_use",
      category_name: category_name || "How to Use / General",
      target_audience: target_audience || "all",
      kit_type: kit_type || "All Kits",
      state_name: state_name || "All States",
      district_name: district_name || "All Districts",
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()) : []),
      duration_label: duration_label || "3:00 mins",
      display_order: Number(display_order) || 0,
      is_published: is_published !== false,
      created_by: req.user?.name || "Admin"
    });

    return res.json({
      success: true,
      status: 'success',
      message: "Tutorial video added to Knowledge Center successfully!",
      data: video
    });
  } catch (err) {
    console.error("create_video error:", err);
    return res.status(500).json({ success: false, message: "Failed to add video", error: err.message });
  }
};

/**
 * PUT /admin-api/knowledge-center/:id
 */
exports.update_video = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    if (updateData.tags && !Array.isArray(updateData.tags)) {
      updateData.tags = String(updateData.tags).split(',').map(t => t.trim());
    }

    const updated = await KnowledgeCenterVideo.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    return res.json({
      success: true,
      status: 'success',
      message: "Knowledge center video updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("update_video error:", err);
    return res.status(500).json({ success: false, message: "Failed to update video", error: err.message });
  }
};

/**
 * DELETE /admin-api/knowledge-center/:id
 */
exports.delete_video = async (req, res) => {
  try {
    const { id } = req.params;
    await KnowledgeCenterVideo.findByIdAndUpdate(id, { $set: { deleted_at: new Date() } });
    return res.json({ success: true, status: 'success', message: "Video removed from Knowledge Center" });
  } catch (err) {
    console.error("delete_video error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete video", error: err.message });
  }
};
