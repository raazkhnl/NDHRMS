const mongoose = require('mongoose');

const ALERT_TYPES = [
  'override-threshold',   // 3+ overrides in one window
  'appeal-surge',         // > N appeals in a window
  'chain-tampered',       // audit chain verification failed
  'exemption-pattern',    // suspicious exemption clustering
  'manual-flag'
];

const ciaaAlertSchema = new mongoose.Schema({
  type: { type: String, enum: ALERT_TYPES, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },

  // Trigger context
  windowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransferWindow', default: null },
  windowName: { type: String, default: '' },
  triggerCount: { type: Number, default: 0 }, // e.g. number of overrides
  threshold: { type: Number, default: 0 },    // what threshold was crossed

  title: { type: String, required: true },
  description: { type: String, required: true },
  evidence: { type: mongoose.Schema.Types.Mixed, default: {} },

  status: {
    type: String,
    enum: ['open', 'acknowledged', 'investigating', 'closed'],
    default: 'open'
  },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  acknowledgedByName: { type: String, default: '' },
  acknowledgedAt: { type: Date, default: null },
  resolutionNotes: { type: String, default: '' }
}, { timestamps: true });

ciaaAlertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CiaaAlert', ciaaAlertSchema);
module.exports.ALERT_TYPES = ALERT_TYPES;
