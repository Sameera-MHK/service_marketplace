import mongoose from 'mongoose';

const workerOfferSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerProfile',
    required: true,
  },
  title:        { type: String, required: true, maxlength: 80 },
  description:  { type: String, maxlength: 500 },
  priceMin:     { type: Number, required: true },
  priceMax:     { type: Number },
  deliveryDays: { type: Number },
  photos:       [{ type: String }],
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

workerOfferSchema.index({ workerId: 1, isActive: 1 });

export default mongoose.model('WorkerOffer', workerOfferSchema);
