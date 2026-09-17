import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true, maxlength: 100 },
    email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    topic:   {
      type: String,
      enum: ['general', 'subscription', 'dispute', 'partnership', 'other'],
      default: 'general',
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead:  { type: Boolean, default: false },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('ContactMessage', contactMessageSchema);
