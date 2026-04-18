const mongoose = require('mongoose');

const postingHistorySchema = new mongoose.Schema({
  ministry: { type: String, required: true },
  sectionName: { type: String, default: '' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MinistrySection', default: null },
  postName: { type: String, default: '' }, // e.g. "Section Officer"
  districtTier: { type: String, enum: ['A', 'B', 'C', 'D', 'Specialist'], default: 'A' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null }, // null = current posting
  placementOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementOrder', default: null },
  transferOrderId: { type: mongoose.Schema.Types.ObjectId, default: null } // Phase 8
}, { _id: true });

const officerSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, unique: true, trim: true },
  employeeId: { type: String, required: true, unique: true, trim: true }, // "HRMIS-2082-000001"

  // Identity snapshot
  nameEnglish: { type: String, required: true },
  nameNepali: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },

  // Qualifications snapshot (from ExamRegister)
  maximumQualification: { type: String, default: '' },
  university: { type: String, default: '' },
  faculty: { type: String, default: '' },
  stream: { type: String, default: '' },

  // Source (from PSC placement)
  rollNumber: { type: String, default: '' },
  psResultRank: { type: Number, default: null },

  // Current state
  currentMinistry: { type: String, default: '' },
  currentSection: { type: String, default: '' },
  currentSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MinistrySection', default: null },
  currentDistrictTier: { type: String, enum: ['A', 'B', 'C', 'D', 'Specialist'], default: 'A' },
  tenureStartDate: { type: Date, required: true },

  // Status
  status: {
    type: String,
    enum: ['active', 'on-leave', 'transferred', 'retired', 'dismissed'],
    default: 'active'
  },
  onboardedAt: { type: Date, default: Date.now },

  // History
  postingHistory: [postingHistorySchema]
}, { timestamps: true });

officerSchema.index({ currentMinistry: 1, status: 1 });

module.exports = mongoose.model('Officer', officerSchema);
