const logAction = require("../utils/logAction");

/**
 * Middleware for auto audit logging
 * 
 * This will log each request automatically
 */
const auditLogger = (actionName) => {
  return async (req, res, next) => {
    // save old send method
    const oldSend = res.json;

    res.json = async function (data) {
      try {
        await logAction({
          actorId: req.user?._id || null,       // jo bhi user login hai
          actorType: req.user?.role || "Guest", // Admin | Teacher | Guest
          action: actionName || req.method + " " + req.originalUrl,
          targetType: "API",
          targetId: null,
          before: null,
          after: data,
          status: (res.statusCode >= 200 && res.statusCode < 400) ? "success" : "failed",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          meta: {
            body: req.body,
            params: req.params,
            query: req.query
          }
        });
      } catch (err) {
        console.error("Audit log middleware error:", err.message);
      }

      return oldSend.call(this, data);
    };

    next();
  };
};

module.exports = auditLogger;
