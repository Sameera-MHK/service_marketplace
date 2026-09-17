import mongoose from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/site.js';

const consultationOfferingSchema = new mongoose.Schema({
  workerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:           { type: String, required: true, trim: true },
  description:     { type: String, default: '', trim: true },
  durationMinutes: { type: Number, required: true, min: 5, max: 240 },
  price:           { type: Number, required: true, min: 0 },
  currency:        { type: String, default: DEFAULT_CURRENCY, uppercase: true, trim: true },
  isActive:        { type: Boolean, default: true },
  sortOrder:       { type: Number, default: 0 },
  createdAt:       { type: Date, default: Date.now },
  updatedAt:       { type: Date, default: Date.now },
});

consultationOfferingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('ConsultationOffering', consultationOfferingSchema);
