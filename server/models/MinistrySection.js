const mongoose = require('mongoose');

const QUALIFICATION_LEVELS = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];

const ministrySectionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true, trim: true },
  ministry: { type: String, required: true, trim: true },
  vacantPositions: { type: Number, required: true, min: 0 },
  educationRequirements: {
    degreeLevel: {
      type: String,
      enum: QUALIFICATION_LEVELS,
      required: true
    },
    preferredStream: { type: String, default: '' },
    preferredSpecialization: { type: String, default: '' }
  },
  sector: {
    type: String,
    enum: ['general-admin', 'engineering', 'health', 'education', 'finance', 'judicial', 'foreign-affairs'],
    default: 'general-admin'
  },
  locked: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  approvedAt: { type: Date, default: null },
  dscSignature: { type: String, default: null }, // simulated DSC hash
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

// Helpful compound index
ministrySectionSchema.index({ ministry: 1, sectionName: 1 }, { unique: true });

module.exports = mongoose.model('MinistrySection', ministrySectionSchema);
module.exports.QUALIFICATION_LEVELS = QUALIFICATION_LEVELS;
