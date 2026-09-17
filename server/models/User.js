import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, default: null },
  phone: { type: String, sparse: true },
  whatsappNumber: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'worker', 'business', 'admin'], required: true },
  idNumber: String,
  idVerified: { type: Boolean, default: false },
  idPhotoFront: String,
  idPhotoBack: String,
  idSubmitted: { type: Boolean, default: false },
  profilePhoto: String,
  location: {
    district: String,
    province: String,
  },
  socialLinks: {
    facebook:  String,
    instagram: String,
    youtube:   String,
    tiktok:    String,
    linkedin:  String,
    whatsapp:  String,
    website:   String,
  },
  resetPasswordToken:  { type: String, default: null },
  resetPasswordExpiry: { type: Date,   default: null },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
