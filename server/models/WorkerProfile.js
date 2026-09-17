import mongoose from 'mongoose';
import { TIMEZONE } from '../config/site.js';

const workerProfileSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  workerName: { type: String, default: '' },
  category:   { type: String, required: true },
  subscriptionPlan: { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
  subscriptionExpiry: Date,
  leadsThisMonth: { type: Number, default: 0 },
  leadsResetDate: { type: Date, default: Date.now },
  bio: String,
  pendingBio: String,
  bioStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
  experienceYears: Number,
  languages: [String],
  dayRateMin: Number,
  dayRateMax: Number,
  portfolioPhotos: [String],
  pendingPortfolioPhotos: [{
    url:        { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  certifications: [
    {
      name: String,
      issuedBy: String,
      verifiedAt: Date,
    },
  ],
  skillScore: { type: Number, default: 50 },
  scoreBand: {
    type: String,
    enum: ['elite', 'trusted', 'rising', 'probation', 'suspended'],
    default: 'rising',
  },
  scoreBreakdown: {
    completionScore: { type: Number, default: 50 },
    ratingScore: { type: Number, default: 50 },
    responsivenessScore: { type: Number, default: 50 },
    disputeScore: { type: Number, default: 100 },
    trustScore: { type: Number, default: 0 },
  },
  totalJobsCompleted: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  rawRatingSum: { type: Number, default: 0 },
  avgResponseTimeMinutes: { type: Number, default: 60 },
  disputeCount: { type: Number, default: 0 },
  serviceDistricts: [String],
  availableDays: [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  acceptingWork: { type: Boolean, default: true },
  coverPhoto: String,
  tradeCertificationPhoto: String,
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: String,
  tradeCertification: { type: Boolean, default: false },
  referredByHighScoreWorker: { type: Boolean, default: false },
  fraudFlag: { type: Boolean, default: false },
  flagged: { type: Boolean, default: false },
  flagReasons: [
    {
      type: { type: String, enum: ['auto_suspended', 'nic_pending', 'high_cancellation', 'fraud', 'abuse_report'] },
      reason: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  onboardingComplete: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  // Admin-granted per-worker feature access (overrides category-level flags)
  features: {
    consultations: { type: Boolean, default: false },
    liveClasses:   { type: Boolean, default: false },
    shop:          { type: Boolean, default: false },
  },
  consultationsEnabled: { type: Boolean, default: false },
  consultationSchedule: {
    timezone:       { type: String, default: TIMEZONE },
    weeklySlots: [{
      dayOfWeek: { type: Number, min: 0, max: 6 },
      startTime: String,
      endTime:   String,
    }],
    blockedDates:    [Date],
    bufferMinutes:   { type: Number, default: 15 },
    advanceNoticeHours: { type: Number, default: 4 },
    bookingWindowDays:  { type: Number, default: 30 },
  },
  commissionOverride: {
    percent:   Number,
    expiresAt: Date,
    note:      String,
    setBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt:     Date,
  },
  liveClassCommissionOverride: {
    percent:   Number,
    expiresAt: Date,
    note:      String,
    setBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt:     Date,
  },
  shopCommissionOverride: {
    percent:   Number,
    expiresAt: Date,
    note:      String,
    setBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt:     Date,
  },
  payoutDetails: {
    method: { type: String, enum: ['bank', 'mobile_money', 'digital_wallet', null], default: null },
    bankName:        String,
    branch:          String,
    accountNumber:   String,
    accountHolder:   String,
    walletNumber:    String,
    walletHolder:    String,
    updatedAt:       Date,
  },
  availableBalances: { type: Map, of: Number, default: () => new Map() },
  pendingBalances:   { type: Map, of: Number, default: () => new Map() },
  // Note: live class balance is computed dynamically from completed LiveClass records
  // (GET /live-classes/me/balance) — no stored field needed.
  featuredUntil: { type: Date, default: null },
  slug: { type: String, lowercase: true },
});

workerProfileSchema.index(
  { workerName: 'text', bio: 'text', category: 'text' },
  { weights: { workerName: 10, bio: 5, category: 3 }, name: 'worker_text_search' }
);
workerProfileSchema.index({ category: 1, skillScore: -1 });
workerProfileSchema.index({ 'serviceDistricts': 1, skillScore: -1 });
workerProfileSchema.index({ subscriptionPlan: 1, subscriptionExpiry: 1 });
workerProfileSchema.index({ flagged: 1 });
workerProfileSchema.index({ isSuspended: 1 });
workerProfileSchema.index({ scoreBand: 1, skillScore: -1 });
workerProfileSchema.index({ featuredUntil: 1 });
workerProfileSchema.index({ slug: 1 }, { unique: true, sparse: true });

export default mongoose.model('WorkerProfile', workerProfileSchema);
