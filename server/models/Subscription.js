import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, enum: ['worker', 'business'], default: 'worker' },
  plan: { type: String, enum: ['pro', 'elite'], required: true },
  status: { type: String, enum: ['pending', 'active', 'expired', 'rejected'], default: 'pending' },
  paymentMethod: { type: String, enum: ['bank_transfer', 'mobile_money', 'digital_wallet', 'online_banking'], required: true },
  paymentReference: { type: String, required: true },
  amountPaid: Number,
  activatedAt: Date,
  expiresAt: Date,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now },
});

subscriptionSchema.index({ workerId: 1, createdAt: -1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Subscription', subscriptionSchema);
