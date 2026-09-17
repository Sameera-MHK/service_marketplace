import mongoose from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/site.js';

/**
 * ShopSale — immutable record of every completed shop transaction.
 *
 * Serves two roles:
 *  1. Idempotency key for the Stripe webhook (paymentIntentId unique index).
 *  2. Earnings history for the worker dashboard.
 */
const shopSaleSchema = new mongoose.Schema({
  workerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  buyerId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopItemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem' },
  shopRequestId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ShopRequest' },

  /** Stripe PaymentIntent ID — unique sparse index for idempotency. */
  paymentIntentId: { type: String, unique: true, sparse: true },

  type:            { type: String, enum: ['direct', 'commission_request'], required: true },

  /** Denormalised title so the history stays readable even after item deletion. */
  itemTitle:       { type: String, default: '' },

  amount:           { type: Number, required: true },   // total charged to buyer
  workerEarning:    { type: Number, required: true },   // credited to worker
  platformEarning:  { type: Number, required: true },   // kept by platform
  commissionPercent:{ type: Number, required: true },
  isFreeCommission: { type: Boolean, default: false },

  currency:         { type: String, default: DEFAULT_CURRENCY, uppercase: true },
  soldAt:           { type: Date,   default: Date.now },
}, { timestamps: true });

shopSaleSchema.index({ workerId: 1, soldAt: -1 });

export default mongoose.model('ShopSale', shopSaleSchema);
