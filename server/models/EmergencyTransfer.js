const mongoose = require('mongoose');

const EMERGENCY_TYPES = [
  'security-threat',      // officer at physical risk
  'serious-misconduct',   // suspected fraud/corruption
  'medical-evacuation',   // officer medical emergency
  'family-emergency',     // spouse critical illness etc.
  'policy-crisis',        // specialist needed urgently
  'other'
];

const emergencyTransferSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true }, // "EMRG-2082-001"
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  nidNumber: { type: String, required: true },
  employeeId: { type: String, required: true },
  officerName: { type: String, default: '' },

  type: { type: String, enum: EMERGENCY_TYPES, required: true },
  reason: { type: String, required: true },

  // From/to (required even for emergency)
  fromMinistry: { type: String, required: true },
  fromSection: { type: String, default: '' },
  toMinistry: { type: String, required: true },
  toSection: { type: String, default: '' },
  toTier: { type: String, default: 'A' },

  // Request chain
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  requestedByName: { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now },

  // Chief Secretary approval (gatekeeper)
  chiefSecretaryApprovalBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  chiefSecretaryApprovalName: { type: String, default: '' },
  chiefSecretaryApprovalAt: { type: Date, default: null },
  chiefSecretaryNotes: { type: String, default: '' },

  // Must publish within 24hr of approval per spec
  mustPublishBy: { type: Date, default: null },

  status: {
    type: String,
    enum: ['submitted', 'approved', 'rejected', 'published', 'applied', 'expired'],
    default: 'submitted'
  },

  publishedAt: { type: Date, default: null },
  dscSignature: { type: String, default: null },

  // Post-facto review — emergency transfers get flagged for watchdog
  flaggedForReview: { type: Boolean, default: true },
  reviewCompletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  reviewCompletedAt: { type: Date, default: null },
  reviewNotes: { type: String, default: '' }
}, { timestamps: true });

emergencyTransferSchema.index({ nidNumber: 1 });
emergencyTransferSchema.index({ status: 1, mustPublishBy: 1 });

module.exports = mongoose.model('EmergencyTransfer', emergencyTransferSchema);
module.exports.EMERGENCY_TYPES = EMERGENCY_TYPES;
