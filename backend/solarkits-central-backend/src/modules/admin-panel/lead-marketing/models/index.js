const LeadMaster = require('./LeadMaster.schema');
const segAndSettings = require('./LeadSegmentAndSettings.schema');
const campAndAnalytics = require('./LeadCampaignAndAnalytics.schema');

module.exports = {
  LeadMaster,
  ...segAndSettings,
  ...campAndAnalytics
};
