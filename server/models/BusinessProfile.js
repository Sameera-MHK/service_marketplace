import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name:        { type: String, required: true, maxlength: 80 },
  description: { type: String, maxlength: 300 },
  priceMin:    { type: Number },
  priceMax:    { type: Number },
}, { _id: true });

const businessProfileSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, required: true, maxlength: 120 },
  businessType: {
    type: String,
    enum: ['salon', 'barbershop', 'repair_shop', 'catering', 'photography_studio',
           'cleaning_company', 'tutoring_centre', 'restaurant', 'agency', 'other'],
    default: 'other',
  },
  description:  { type: String, maxlength: 1000 },
  tagline:      { type: String, maxlength: 120 },
  district:     String,
  address:      String,
  phone:        String,
  whatsapp:     String,
  website:      String,
  openingHours: {
    mon: String, tue: String, wed: String, thu: String,
    fri: String, sat: String, sun: String,
  },
  coverPhoto:   String,
  photos:       [{ type: String }],
  services:     [serviceSchema],
  isVerified:      { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  isSuspended:     { type: Boolean, default: false },
  onboardingComplete: { type: Boolean, default: false },
  featuredUntil:   { type: Date, default: null },
  subscriptionPlan:   { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
  subscriptionExpiry: { type: Date },
  totalInquiries: { type: Number, default: 0 },
  averageRating:  { type: Number, default: 0 },
  totalReviews:   { type: Number, default: 0 },
  slug: { type: String, lowercase: true },
}, { timestamps: true });

businessProfileSchema.index({ district: 1, businessType: 1 });
businessProfileSchema.index({ featuredUntil: 1 });
businessProfileSchema.index({ slug: 1 }, { unique: true, sparse: true });

export default mongoose.model('BusinessProfile', businessProfileSchema);
