import mongoose from 'mongoose';

const featuredRequestSchema = new mongoose.Schema({
  workerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period:        { type: String, enum: ['1_week', '2_weeks', '1_month'], required: true },
  amount:        { type: Number, required: true },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cash'], required: true },
  paymentRef:    { type: String, trim: true, default: '' },
  notes:         { type: String, trim: true, default: '' },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectedReason:{ type: String, default: '' },
  requestedAt:   { type: Date, default: Date.now },
  reviewedAt:    { type: Date },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

featuredRequestSchema.index({ status: 1, requestedAt: -1 });
featuredRequestSchema.index({ workerId: 1, status: 1 });

export default mongoose.model('FeaturedRequest', featuredRequestSchema);
