const mongoose = require('mongoose');

const EXEMPTION_TYPES = [
  'medical',             // officer has medical condition
  'disability',          // disability certificate
  'sole-caregiver',      // elderly parents / dependents
  'spouse-remote-post',  // spouse posted in remote district
  'child-education'      // special education needs
];

const EXEMPTION_STATUS = ['submitted', 'verified', 'rejected', 'expired'];

const exemptionSchema = new mongoose.Schema({
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  nidNumber: { type: String, required: true, trim: true },

  type: { type: String, enum: EXEMPTION_TYPES, required: true },
  description: { type: String, required: true },

  // Certificate reference (simulated)
  certificateRef: { type: String, default: '' }, // e.g. "HEALTH-REG-2082-00123"
  issuingAuthority: { type: String, default: '' }, // e.g. "Bir Hospital"

  status: { type: String, enum: EXEMPTION_STATUS, default: 'submitted' },

  // Verification (MoFAGA or CIAA review)
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  verifiedByName: { type: String, default: '' },
  verificationNotes: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },

  // Annual renewal per anti-gaming spec
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date }, // 1 year from validFrom by default
  renewalRequired: { type: Boolean, default: true }
}, { timestamps: true });

exemptionSchema.pre('save', function(next) {
  if (!this.validUntil) {
    const d = new Date(this.validFrom || Date.now());
    d.setFullYear(d.getFullYear() + 1);
    this.validUntil = d;
  }
  next();
});

exemptionSchema.index({ nidNumber: 1, type: 1 });
exemptionSchema.index({ status: 1, validUntil: 1 });

module.exports = mongoose.model('Exemption', exemptionSchema);
module.exports.EXEMPTION_TYPES = EXEMPTION_TYPES;
module.exports.EXEMPTION_STATUS = EXEMPTION_STATUS;
