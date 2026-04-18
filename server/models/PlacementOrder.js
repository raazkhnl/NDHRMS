const mongoose = require('mongoose');

const MATCH_TYPES = ['exact', 'stream', 'general', 'fallback', 'unplaced'];

const placementOrderSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, unique: true, trim: true },
  candidateName: { type: String, default: '' },
  resultRank: { type: Number, required: true }, // merit rank at time of placement
  resultScore: { type: Number, default: 0 },

  // Source post (what they originally applied for)
  sourcePostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },

  // Assignment
  assignedMinistry: { type: String, default: '' },
  assignedSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MinistrySection', default: null },
  assignedSectionName: { type: String, default: '' },

  // Match details per Flowchart A3
  matchType: { type: String, enum: MATCH_TYPES, required: true },
  matchScore: { type: Number, default: 0 }, // 0-3
  priorityUsed: { type: Number, default: null }, // 1 / 2 / 3 / null (for fallback/unplaced)

  // Education snapshot at placement time (for audit)
  candidateQualification: { type: String, default: '' },
  candidateFaculty: { type: String, default: '' },
  candidateStream: { type: String, default: '' },

  // Order details
  orderNumber: { type: String, required: true, unique: true },
  placementDate: { type: Date, default: Date.now },
  dscSignature: { type: String, default: null }, // SHA-256 simulated DSC

  // Publishing
  published: { type: Boolean, default: false },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  publishedAt: { type: Date, default: null }
}, { timestamps: true });

placementOrderSchema.index({ nidNumber: 1 });
placementOrderSchema.index({ assignedMinistry: 1, assignedSectionId: 1 });

module.exports = mongoose.model('PlacementOrder', placementOrderSchema);
module.exports.MATCH_TYPES = MATCH_TYPES;
