import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  workerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount:    { type: Number, required: true, min: 0 },
  currency:  { type: String, required: true, uppercase: true },
  method:    { type: String, enum: ['bank', 'mobile_money', 'digital_wallet'], required: true },
  recipient: {
    bankName:      String,
    branch:        String,
    accountNumber: String,
    accountHolder: String,
    walletNumber:  String,
    walletHolder:  String,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },
  source:      { type: String, enum: ['consultation', 'live_class', 'shop'], default: 'consultation' },
  bookingIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationBooking' }],
  shopItemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem'    },
  shopReqId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ShopRequest' },
  requestedAt:    { type: Date, default: Date.now },
  processedAt:    Date,
  processedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transactionRef: String,
  adminNote:      String,
  rejectionReason: String,
});

payoutSchema.index({ workerId: 1, status: 1, requestedAt: -1 });

export default mongoose.model('Payout', payoutSchema);
