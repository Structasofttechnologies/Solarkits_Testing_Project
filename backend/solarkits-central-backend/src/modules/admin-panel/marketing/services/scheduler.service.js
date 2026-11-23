const cron = require('node-cron');
const { MarketingCampaign } = require('../models');
const campaignService = require('./campaign.service');

let isSchedulerRunning = false;

const initScheduler = () => {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  // Run every minute to check for scheduled campaigns
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const dueCampaigns = await MarketingCampaign.find({
        status: 'scheduled',
        start_date: { $lte: now }
      }).limit(5);

      for (const camp of dueCampaigns) {
        console.log(`⏰ [CRON SCHEDULER] Launching due campaign: "${camp.campaign_name}" (${camp.campaign_code})`);
        await campaignService.launchCampaign(camp._id).catch(err => {
          console.error(`Scheduler launch error for ${camp._id}:`, err.message);
        });
      }
    } catch (err) {
      console.error('Scheduler scan error:', err.message);
    }
  });

  console.log('✅ SolarKits Marketing Campaign Scheduler Initialized (node-cron active)');
};

module.exports = {
  initScheduler
};
