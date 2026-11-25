const check_protected = (Model) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) {
        // If no id parameter, check req.body for is_protected field to prevent creating protected records via API
        if (req.body && req.body.is_protected) {
          req.body.is_protected = false; // Force false on creation via API
        }
        return next();
      }

      // Check if the record is protected
      const doc = await Model.findById(id).lean();
      if (doc && doc.is_protected) {
        return res.status(403).json({
          status: "error",
          message: "Protected system records cannot be modified or deleted via API."
        });
      }

      // Prevent payload from setting is_protected to true if they are trying to bypass it
      if (req.body && req.body.is_protected !== undefined) {
        delete req.body.is_protected;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = check_protected;
