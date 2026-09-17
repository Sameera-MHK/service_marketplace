import mongoose from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/site.js';

const consultationBookingSchema = new mongoose.Schema({
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  offeringId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationOffering' },
  offering: {
    title:           String,
    durationMinutes: Number,
    price:           Number,
    currency:        String,
  },
  startsAt: { type: Date, required: true, index: true },
  endsAt:   { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'refunded'],
    default: 'pending_payment',
    index: true,
  },
  commissionPercent: { type: Number, required: true },
  commissionAmount:  { type: Number, required: true },
  proPayout:         { type: Number, required: true },
  clientPaid:        { type: Number, required: true },
  currency:          { type: String, default: DEFAULT_CURRENCY, uppercase: true },
  stripePaymentIntentId: String,
  stripeChargeId:        String,
  stripeTransferId:      String,
  stripeRefundId:        String,
  liveKitRoomName:     String,
  liveKitRecordingUrl: String,
  joinedAt: {
    client: Date,
    worker: Date,
  },
  clientNotes: { type: String, default: '' },
  workerNotes: { type: String, default: '' },
  smsReminderSent: { type: Boolean, default: false },
  cancelledAt:     Date,
  cancelledBy:     { type: String, enum: ['client', 'worker', 'admin'] },
  cancellationReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

consultationBookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

consultationBookingSchema.index({ workerId: 1, startsAt: 1 });
consultationBookingSchema.index({ clientId: 1, startsAt: -1 });
consultationBookingSchema.index({ status: 1, startsAt: 1 });

export default mongoose.model('ConsultationBooking', consultationBookingSchema);
