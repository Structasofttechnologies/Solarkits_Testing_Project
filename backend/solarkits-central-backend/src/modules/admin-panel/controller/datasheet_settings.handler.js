const { DatasheetDesignSetting } = require('../models/core_db');

const DEFAULT_SETTINGS = {
  table_header_bg: '#1E3A8A',
  table_header_text: '#FFFFFF',
  table_bg: '#FFFFFF',
  alternate_row_bg: '#F8FAFC',
  text_color: '#1E293B',
  border_color: '#E2E8F0',
  border_thickness: '1px',
  border_radius: '12px',
  font_family: 'Inter',
  font_size: '13px',
  heading_size: '15px',
  cell_padding: 'normal',
  table_width: '100%',
  section_header_bg: '#F1F5F9',
  section_heading_style: 'accent-bar',
  column_headings: {
    component: 'Component Category',
    specification: 'Technical Specification',
    value: 'Value / Details'
  },
  column_visibility: {
    component: true,
    specification: true,
    value: true
  },
  column_order: ['component', 'specification', 'value'],
  component_section_order: ['Solar Panel', 'Solar Inverter', 'BOS Kit'],
  show_section_title: true,
  show_product_name: true,
  show_brand_name: true,
  show_download_button: true,
  is_active: true
};

const get_or_create_settings = async () => {
  let settings = await DatasheetDesignSetting.findOne({ is_active: true }).sort({ updated_at: -1 });
  if (!settings) {
    settings = await DatasheetDesignSetting.create(DEFAULT_SETTINGS);
  }
  return settings;
};

const get_datasheet_settings = async (req, res) => {
  try {
    const settings = await get_or_create_settings();
    return res.status(200).json({
      status: 'success',
      data: settings
    });
  } catch (error) {
    console.error('Error fetching datasheet settings:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const update_datasheet_settings = async (req, res) => {
  try {
    const payload = req.body || {};
    let settings = await DatasheetDesignSetting.findOne({ is_active: true }).sort({ updated_at: -1 });

    const updateFields = {
      ...payload,
      updated_at: new Date()
    };

    if (settings) {
      settings = await DatasheetDesignSetting.findByIdAndUpdate(settings._id, { $set: updateFields }, { new: true });
    } else {
      settings = await DatasheetDesignSetting.create({ ...DEFAULT_SETTINGS, ...updateFields });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Datasheet table design settings saved successfully!',
      data: settings
    });
  } catch (error) {
    console.error('Error updating datasheet settings:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update settings' });
  }
};

const reset_datasheet_settings = async (req, res) => {
  try {
    let settings = await DatasheetDesignSetting.findOne({ is_active: true }).sort({ updated_at: -1 });
    if (settings) {
      settings = await DatasheetDesignSetting.findByIdAndUpdate(settings._id, { $set: { ...DEFAULT_SETTINGS, updated_at: new Date() } }, { new: true });
    } else {
      settings = await DatasheetDesignSetting.create(DEFAULT_SETTINGS);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Datasheet table design settings reset to defaults!',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting datasheet settings:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to reset settings' });
  }
};

module.exports = {
  DEFAULT_SETTINGS,
  get_or_create_settings,
  get_datasheet_settings,
  update_datasheet_settings,
  reset_datasheet_settings
};
