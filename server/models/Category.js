import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  icon: { type: String, default: '🔧' },
  coverImage: { type: String, default: '' },
  group: { type: String, default: 'home_construction', trim: true },
  isActive: { type: Boolean, default: true },
  consultationsEligible:  { type: Boolean, default: false },
  liveClassesEligible:    { type: Boolean, default: false },
  shopEligible:           { type: Boolean, default: false },
  defaultCommissionPercent: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Category', categorySchema);
