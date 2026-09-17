import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  photos: [String],
  location: {
    district: String,
    address: String,
  },
  scheduledDate: Date,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed'],
    default: 'pending',
  },
  agreedRate: Number,
  depositAmount: Number,
  remainingAmount: Number,
  depositPaid: { type: Boolean, default: false },
  finalPaid: { type: Boolean, default: false },
  completionPhotos: [String],
  clientRating: Number,
  clientReview: String,
  workerRating: Number,
  workerReview: String,
  disputeReason: String,
  disputeOutcome: {
    type: String,
    enum: ['pending', 'client_favour', 'worker_favour', 'mutual'],
  },
  flagged: { type: Boolean, default: false },
  flagReason: String,
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

jobSchema.index({ clientId: 1, createdAt: -1 });
jobSchema.index({ workerId: 1, createdAt: -1 });
jobSchema.index({ status: 1 });
jobSchema.index({ status: 1, workerId: 1 });
jobSchema.index({ flagged: 1, status: 1 });

export default mongoose.model('Job', jobSchema);
