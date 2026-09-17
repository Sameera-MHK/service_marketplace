import AuditLog from '../models/AuditLog.js';

async function log({ adminId, adminEmail, action, targetType, targetId, targetName, detail = {} }, req = null) {
  try {
    const ip        = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    await AuditLog.create({
      adminId,
      adminEmail,
      action,
      targetType,
      targetId:   targetId   ? String(targetId)   : undefined,
      targetName: targetName || undefined,
      detail,
      ip:        ip.split(',')[0].trim(),
      userAgent: userAgent.substring(0, 300),
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

export { log };
