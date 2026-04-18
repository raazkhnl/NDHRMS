const mongoose = require('mongoose');

const GRIEVANCE_TYPES = ['score-challenge', 'registration-issue', 'result-dispute', 'other'];
const GRIEVANCE_STATUS = ['submitted', 'under-review', 'resolved', 'rejected'];

const grievanceSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, trim: true },
  rollNumber: { type: String, trim: true, default: '' },
  candidateName: { type: String, default: '' },
  contactMobile: { type: String, default: '' },
  type: {
    type: String,
    enum: GRIEVANCE_TYPES,
    required: true
  },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: GRIEVANCE_STATUS,
    default: 'submitted'
  },
  submittedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  adminNotes: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null }
}, { timestamps: true });

grievanceSchema.index({ nidNumber: 1, submittedAt: -1 });
grievanceSchema.index({ status: 1, submittedAt: -1 });

module.exports = mongoose.model('Grievance', grievanceSchema);
module.exports.GRIEVANCE_TYPES = GRIEVANCE_TYPES;
module.exports.GRIEVANCE_STATUS = GRIEVANCE_STATUS;
