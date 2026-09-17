import mongoose from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/site.js';
const { Schema } = mongoose;

// Sub-schema for enrolled student
const EnrollmentSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paymentIntentId: { type: String },
  enrolledAt:      { type: Date, default: Date.now },
  joinedAt:        { type: Date },
}, { _id: false });

const LiveClassSchema = new Schema({
  hostId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:              { type: String, required: true, trim: true, maxlength: 120 },
  description:        { type: String, trim: true, maxlength: 1000 },
  category:           { type: String },
  coverImage:         { type: String },
  scheduledAt:        { type: Date, required: true },
  durationMinutes:    { type: Number, required: true, default: 60 },
  pricePerSeat:       { type: Number, required: true, min: 0 },
  currency:           { type: String, default: DEFAULT_CURRENCY },
  maxSeats:           { type: Number, required: true, default: 5, min: 1, max: 50 },
  enrolledStudents:   [EnrollmentSchema],
  status:             { type: String, enum: ['draft', 'open', 'live', 'completed', 'cancelled'], default: 'draft' },
  liveKitRoomName:    { type: String },
  commissionPercent:  { type: Number },
  commissionAmount:   { type: Number },
  hostPayout:         { type: Number },
  totalRevenue:       { type: Number },
  cancelledAt:        { type: Date },
  cancellationReason: { type: String },
  completedAt:        { type: Date },
  reminderSent:       { type: Boolean, default: false },
}, { timestamps: true });

// Virtual: seats taken
LiveClassSchema.virtual('seatsEnrolled').get(function () {
  return this.enrolledStudents.length;
});

// Virtual: seats remaining
LiveClassSchema.virtual('seatsAvailable').get(function () {
  return Math.max(0, this.maxSeats - this.enrolledStudents.length);
});

LiveClassSchema.set('toJSON', { virtuals: true });

export default mongoose.model('LiveClass', LiveClassSchema);
