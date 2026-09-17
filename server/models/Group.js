import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  icon:        { type: String, default: '🔧' },
  tagline:     { type: String, default: '' },   // short line shown on landing page card
  description: { type: String, default: '' },   // longer text for group browse page
  coverImage:  { type: String, default: '' },
  order:       { type: Number, default: 0 },     // controls display order
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Group', groupSchema);
