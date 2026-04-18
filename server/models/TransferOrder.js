const mongoose = require('mongoose');

const transferOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true }, // "TRF-2082-W1-0001"
  windowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransferWindow', required: true },
  windowName: { type: String, required: true },

  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  nidNumber: { type: String, required: true },
  employeeId: { type: String, required: true },
  officerName: { type: String, default: '' },

  // From
  fromMinistry: { type: String, required: true },
  fromSection: { type: String, default: '' },
  fromTier: { type: String, default: 'A' },

  // To (draft recommendation, may be overridden)
  toMinistry: { type: String, required: true },
  toSection: { type: String, default: '' },
  toTier: { type: String, default: 'A' },

  // Score at time of order
  finalScore: { type: Number, required: true },
  rank: { type: Number, default: null },

  // Override tracking (Phase 9)
  overridden: { type: Boolean, default: false },
  overrideJustification: { type: String, default: '' },
  overrideSecretaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  overrideSecretaryName: { type: String, default: '' },
  overrideCountersignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  overrideCountersignedByName: { type: String, default: '' },
  overrideCountersignedAt: { type: Date, default: null },

  // Original system recommendation (for audit when override present)
  systemRecommendedMinistry: { type: String, default: '' },
  systemRecommendedSection: { type: String, default: '' },

  // Digital signatures
  dscSignature: { type: String, default: null }, // SHA-256 of order payload
  issuedAt: { type: Date, default: null },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },

  // Status through the window lifecycle
  status: {
    type: String,
    enum: ['draft', 'appealed', 'final', 'issued', 'reported', 'withdrawn'],
    default: 'draft'
  },

  // Officer response (Phase 8 appeals)
  appealFiled: { type: Boolean, default: false },

  // No-gap rule
  predecessorConfirmed: { type: Boolean, default: false }
}, { timestamps: true });

transferOrderSchema.index({ windowId: 1, status: 1 });
transferOrderSchema.index({ nidNumber: 1 });

module.exports = mongoose.model('TransferOrder', transferOrderSchema);
