const mongoose = require('mongoose');

const APPEAL_TYPES = ['score-challenge', 'exemption-claim', 'posting-request', 'other'];
const APPEAL_STATUSES = ['submitted', 'under-review', 'upheld', 'rejected', 'withdrawn'];

const appealSchema = new mongoose.Schema({
  transferOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransferOrder', required: true },
  windowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransferWindow', required: true },
  nidNumber: { type: String, required: true },
  officerName: { type: String, default: '' },

  type: { type: String, enum: APPEAL_TYPES, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },

  status: { type: String, enum: APPEAL_STATUSES, default: 'submitted' },

  // Review (Review Committee)
  reviewDecision: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  reviewedByName: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },

  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

appealSchema.index({ windowId: 1, status: 1 });
appealSchema.index({ nidNumber: 1 });

module.exports = mongoose.model('Appeal', appealSchema);
module.exports.APPEAL_TYPES = APPEAL_TYPES;
module.exports.APPEAL_STATUSES = APPEAL_STATUSES;
