import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  consultationDefaultCommissionPercent: { type: Number, default: 15 },
  liveClassDefaultCommissionPercent:    { type: Number, default: 12 },
  shopDefaultCommissionPercent:         { type: Number, default: 15 },
  shopFreeSellingCount:                 { type: Number, default: 2  },
  consultationVolumeTiers: {
    enabled: { type: Boolean, default: true },
    tiers: {
      type: [{
        minSessions: Number,
        percent:     Number,
      }],
      default: [
        { minSessions: 0,  percent: 15 },
        { minSessions: 11, percent: 12 },
        { minSessions: 31, percent: 10 },
      ],
    },
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

platformSettingsSchema.statics.get = async function () {
  let doc = await this.findById('singleton');
  if (!doc) doc = await this.create({ _id: 'singleton' });
  return doc;
};

export default mongoose.model('PlatformSettings', platformSettingsSchema);
