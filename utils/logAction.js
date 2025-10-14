const AuditLog = require("../models/admin/AuditLog");

/**
 * Save an audit log entry
 * 
 * @param {Object} params
 * @param {ObjectId} params.actorId - ID of Admin/Teacher
 * @param {String} params.actorType - 'Admin' | 'Teacher'
 * @param {String} params.action - Action type (e.g., 'approve_teacher')
 * @param {String} params.targetType - Target model (e.g., 'Teacher','Batch')
 * @param {ObjectId} params.targetId - Target document id
 * @param {Object} params.before - Snapshot before action
 * @param {Object} params.after - Snapshot after action
 * @param {String} params.status - 'success' | 'failed'
 * @param {String} params.ip - Request IP
 * @param {String} params.userAgent - Request User Agent
 * @param {Object} params.meta - Extra info (optional)
 */
async function logAction({
  actorId,
  actorType,
  action,
  targetType,
  targetId,
  before,
  after,
  status = "success",
  ip,
  userAgent,
  meta = {}
}) {
  try {
    await AuditLog.create({
      actorId,
      actorType,
      action,
      targetType,
      targetId,
      before,
      after,
      status,
      ip,
      userAgent,
      meta
    });
  } catch (err) {
    console.error("Failed to save audit log:", err.message);
  }
}

module.exports = logAction;
