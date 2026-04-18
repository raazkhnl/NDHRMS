const mongoose = require('mongoose');

const appraisalSchema = new mongoose.Schema({
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  nidNumber: { type: String, required: true, trim: true },
  fiscalYear: { type: String, required: true }, // "2081/82"

  // Rating on a 1-5 scale
  rating: { type: Number, required: true, min: 1, max: 5 },

  // Breakdown
  competency: { type: Number, min: 1, max: 5, default: 3 },
  integrity: { type: Number, min: 1, max: 5, default: 3 },
  initiative: { type: Number, min: 1, max: 5, default: 3 },
  punctuality: { type: Number, min: 1, max: 5, default: 3 },

  // Who entered and countersigned (Secretary of own ministry + next-level authority)
  ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  ratedByName: { type: String, default: '' },
  countersignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  countersignedByName: { type: String, default: '' },
  locked: { type: Boolean, default: false }, // once countersigned, immutable

  notes: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  countersignedAt: { type: Date, default: null }
}, { timestamps: true });

appraisalSchema.index({ officerId: 1, fiscalYear: 1 }, { unique: true });

module.exports = mongoose.model('Appraisal', appraisalSchema);
