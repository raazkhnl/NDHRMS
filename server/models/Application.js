const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, trim: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  rollNumber: { type: String, required: true, unique: true },
  paymentMethod: { type: String, default: '' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  amount: { type: Number, default: 0 },
  applicationDate: { type: Date, default: Date.now },
  examDate: { type: String, default: '' },
  examCenter: { type: String, default: '' },
  status: {
    type: String,
    enum: ['registered', 'appeared', 'result_published'],
    default: 'registered'
  }
}, { timestamps: true });

applicationSchema.index({ nidNumber: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
