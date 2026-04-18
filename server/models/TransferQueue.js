const mongoose = require('mongoose');

const transferQueueSchema = new mongoose.Schema({
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  nidNumber: { type: String, required: true },
  employeeId: { type: String, required: true },
  officerName: { type: String, default: '' },
  currentMinistry: { type: String, default: '' },
  currentSection: { type: String, default: '' },
  currentTier: { type: String, enum: ['A', 'B', 'C', 'D', 'Specialist'], default: 'A' },
  tenureDays: { type: Number, required: true },
  maxTenureDays: { type: Number, required: true },
  tenurePercent: { type: Number, required: true }, // 0..100+
  flaggedAt: { type: Date, default: Date.now },
  reason: {
    type: String,
    enum: ['approaching-max', 'exceeded-max', 'min-reached'],
    default: 'approaching-max'
  },
  windowAssigned: { type: String, default: '' }, // set in Phase 8
  resolved: { type: Boolean, default: false }
}, { timestamps: true });

transferQueueSchema.index({ officerId: 1 }, { unique: true });
transferQueueSchema.index({ resolved: 1, tenurePercent: -1 });

module.exports = mongoose.model('TransferQueue', transferQueueSchema);
