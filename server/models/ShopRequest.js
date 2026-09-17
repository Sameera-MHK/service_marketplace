import mongoose from 'mongoose';

const shopRequestSchema = new mongoose.Schema({
  workerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // What the client wants
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  budgetMin:   { type: Number, default: null },
  budgetMax:   { type: Number, default: null },
  deadline:    { type: Date,   default: null },
  attachments: [{ type: String }], // reference image URLs

  // Worker's response
  status: {
    type: String,
    enum: ['pending', 'quoted', 'accepted', 'paid', 'in_progress', 'completed', 'declined', 'cancelled'],
    default: 'pending',
  },
  quotedPrice: { type: Number, default: null },
  quotedNote:  { type: String, default: '' },
  quotedAt:    { type: Date,   default: null },

  declineReason: { type: String, default: '' },

  // Stripe
  paymentIntentId: { type: String, default: null },
  clientSecret:    { type: String, default: null },

  // Commission split (recorded when paid)
  commissionPercent:  { type: Number, default: null },
  workerEarning:      { type: Number, default: null },
  platformEarning:    { type: Number, default: null },
  isFreeCommission:   { type: Boolean, default: false },

  // Completion
  completedAt: { type: Date, default: null },
}, { timestamps: true });

shopRequestSchema.index({ workerId: 1, status: 1 });
shopRequestSchema.index({ clientId: 1, status: 1 });

export default mongoose.model('ShopRequest', shopRequestSchema);
