import mongoose from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/site.js';

const shopItemSchema = new mongoose.Schema({
  workerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, required: true, trim: true },
  description:{ type: String, default: '' },
  price:      { type: Number, required: true, min: 0 },
  currency:   { type: String, default: DEFAULT_CURRENCY },
  images:     [{ type: String }],          // Cloudinary URLs
  stock:      { type: Number, default: null }, // null = unlimited / made-to-order
  tags:       [{ type: String }],
  status:     { type: String, enum: ['active', 'sold_out', 'hidden'], default: 'active' },
  soldCount:  { type: Number, default: 0 },
  deliveryInfo: { type: String, default: '' }, // e.g. "Ships in 5-7 days" / "Digital"
  acceptsRequests: { type: Boolean, default: true }, // worker accepts custom requests
  // Commission snapshot (set when last sold)
  lastCommissionPercent: { type: Number, default: null },
  lastWorkerEarning:     { type: Number, default: null },
  lastPlatformEarning:   { type: Number, default: null },
}, { timestamps: true });

shopItemSchema.index({ workerId: 1, status: 1 });
shopItemSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ShopItem', shopItemSchema);
