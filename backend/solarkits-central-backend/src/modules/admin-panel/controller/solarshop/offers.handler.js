const { OfferMaster } = require('../../models/india_solarshop_db');

const get_offers = async (req, res) => {
  try {
    const { cluster_id } = req.query;
    const filter = { deleted_at: null };
    if (cluster_id) {
      filter.cluster_id = cluster_id;
    }
    const offers = await OfferMaster.find(filter).sort({ priority: 1, created_at: -1 });
    return res.status(200).json({ status: 'success', data: offers });
  } catch (error) {
    console.error("get_offers error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const create_offer = async (req, res) => {
  try {
    const offerData = req.body;
    // Basic validation
    if (!offerData.offer_name || !offerData.offer_type || !offerData.discount_value || !offerData.start_date || !offerData.end_date) {
      return res.status(400).json({ status: 'error', message: 'Name, type, discount value, start date, and end date are required.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(offerData.start_date) < today) {
      return res.status(400).json({ status: 'error', message: 'Start date must be today or a future date.' });
    }
    if (new Date(offerData.end_date) <= new Date(offerData.start_date)) {
      return res.status(400).json({ status: 'error', message: 'End date must be after the start date.' });
    }
    
    const newOffer = await OfferMaster.create(offerData);
    return res.status(201).json({ status: 'success', data: newOffer });
  } catch (error) {
    console.error("create_offer error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const update_offer = async (req, res) => {
  try {
    const { id } = req.params;
    const offerData = req.body;

    if (offerData.start_date || offerData.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = offerData.start_date ? new Date(offerData.start_date) : null;
      const end = offerData.end_date ? new Date(offerData.end_date) : null;

      if (start && start < today) {
        return res.status(400).json({ status: 'error', message: 'Start date must be today or a future date.' });
      }
      if (start && end && end <= start) {
        return res.status(400).json({ status: 'error', message: 'End date must be after the start date.' });
      }
    }
    
    const updatedOffer = await OfferMaster.findByIdAndUpdate(id, offerData, { new: true });
    if (!updatedOffer) {
      return res.status(404).json({ status: 'error', message: 'Offer not found.' });
    }
    return res.status(200).json({ status: 'success', data: updatedOffer });
  } catch (error) {
    console.error("update_offer error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const delete_offer = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOffer = await OfferMaster.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });
    if (!deletedOffer) {
      return res.status(404).json({ status: 'error', message: 'Offer not found.' });
    }
    return res.status(200).json({ status: 'success', message: 'Offer deleted successfully.' });
  } catch (error) {
    console.error("delete_offer error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  get_offers,
  create_offer,
  update_offer,
  delete_offer
};
