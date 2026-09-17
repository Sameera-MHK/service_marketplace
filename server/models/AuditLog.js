import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: [
        'worker_suspended',
        'worker_reinstated',
        'worker_flag_cleared',
        'worker_featured',
        'worker_unfeatured',
        'nic_verified',
        'dispute_resolved',
        'subscription_activated',
        'subscription_rejected',
        'bio_approved',
        'bio_rejected',
        'photo_approved',
        'photo_rejected',
        'category_created',
        'category_updated',
        'category_deleted',
        'category_cover_updated',
        'consultation_settings_updated',
        'commission_override_set',
        'commission_override_removed',
        'payout_processed',
        'payout_rejected',
        'featured_request_approved',
        'featured_request_rejected',
        'business_verified',
        'business_unverified',
        'business_suspended',
        'business_reinstated',
        'business_featured',
        'business_unfeatured',
      ],
    },
    targetType: { type: String, enum: ['worker', 'job', 'subscription', 'category', 'payout', 'settings', 'business'], required: true },
    targetId:   { type: String },
    targetName: { type: String },
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip:        { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ adminId:  1, createdAt: -1 });
auditLogSchema.index({ action:   1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('AuditLog records are immutable');
});

export default mongoose.model('AuditLog', auditLogSchema);
