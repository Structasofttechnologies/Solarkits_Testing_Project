const webTelemetryService = require('../services/webTelemetry.service');

/**
 * POST /api/india/v1/telemetry/visit (and aliases)
 * Public fire-and-forget endpoint to capture website pageviews, heartbeats, exits, and form submissions.
 */
exports.track_website_visit = async (req, res) => {
  try {
    const result = await webTelemetryService.recordVisitEvent(req.body, req);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Non-critical telemetry must not disrupt customer storefront browsing
    console.warn('[WebTelemetry] track_website_visit warning:', error.message);
    return res.status(200).json({
      success: true,
      data: { recorded: false },
    });
  }
};
