const mongoose = require('mongoose');

const breakdownSchema = new mongoose.Schema({
  criterion: { type: String, required: true },
  weight: { type: Number, required: true }, // 10, 15, 20, 25
  rawScore: { type: Number, required: true }, // 0..100 per criterion
  weightedScore: { type: Number, required: true }, // rawScore * weight / 100
  detail: { type: String, default: '' }
}, { _id: false });

const transferScoreSchema = new mongoose.Schema({
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true, unique: true },
  nidNumber: { type: String, required: true },
  employeeId: { type: String, required: true },
  officerName: { type: String, default: '' },

  // Per-criterion breakdown
  breakdown: [breakdownSchema],

  // Totals
  totalScore: { type: Number, required: true }, // 0..100
  hardshipBonus: { type: Number, default: 0 },
  finalScore: { type: Number, required: true }, // totalScore + hardshipBonus

  // Snapshot context for audit
  computedFor: {
    currentMinistry: { type: String, default: '' },
    currentSection: { type: String, default: '' },
    currentTier: { type: String, default: '' },
    tenureDays: { type: Number, default: 0 },
    yearsOfService: { type: Number, default: 0 }
  },

  // Ranking among peers in the scoring run
  rank: { type: Number, default: null },

  computedAt: { type: Date, default: Date.now },
  computedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },

  // Officer-visible: score breakdown always visible to the officer themselves
  // (per spec: "Each officer logs into HRMIS and sees their exact score per criterion")
  visibleToOfficer: { type: Boolean, default: true }
}, { timestamps: true });

transferScoreSchema.index({ finalScore: -1 });

module.exports = mongoose.model('TransferScore', transferScoreSchema);
