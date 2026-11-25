const isValidGstRate = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0;
};

const buildMarginGstConfig = (marginDoc) => {
  const gstRate = Number(marginDoc?.gst_rate);
  return {
    isConfigured: isValidGstRate(gstRate),
    gst_rate: Number.isFinite(gstRate) ? gstRate : null,
  };
};

module.exports = {
  isValidGstRate,
  buildMarginGstConfig,
};
