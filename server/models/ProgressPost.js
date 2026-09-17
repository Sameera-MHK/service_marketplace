import mongoose from 'mongoose';

const progressPostSchema = new mongoose.Schema(
  {
    posterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    posterRole: { type: String, enum: ['worker', 'business'], required: true },
    jobId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    category:   { type: String, required: true, maxlength: 60 },
    district:   { type: String, required: true, maxlength: 60 },
    photos:     {
      type: [{ type: String }],
      validate: [(v) => v.length >= 1 && v.length <= 4, 'photos must be 1–4'],
    },
    caption:    { type: String, default: '', maxlength: 200, trim: true },
    flagged:        { type: Boolean, default: false },
    flagReason:     String,
    removedByAdmin: { type: Boolean, default: false },
    removedReason:  String,
  },
  { timestamps: true }
);

progressPostSchema.index({ posterId: 1, createdAt: -1 });
progressPostSchema.index({ flagged: 1, removedByAdmin: 1, createdAt: -1 });
progressPostSchema.index({ posterId: 1, district: 1, createdAt: -1 });

export default mongoose.model('ProgressPost', progressPostSchema);
