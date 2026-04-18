const mongoose = require('mongoose');

const TIERS = ['A', 'B', 'C', 'D', 'Specialist'];

// Tenure windows (days) per tier — per spec:
// Kathmandu / urban:        min 2yr  max 3yr  auto-flag 30mo  (Tier A)
// Semi-urban / hill:        min 2yr  max 4yr  auto-flag 36mo  (Tier B)
// Remote district:          min 1yr  max 2yr  auto-flag 18mo  (Tier C)
// Extreme hardship:         min 1yr  max 2yr  auto-flag 18mo  (Tier D)
// Specialist technical:     min 3yr  max 5yr  auto-flag 48mo  (Specialist)
const TIER_RULES = {
  A:          { minDays: 2 * 365, maxDays: 3 * 365, autoFlagDays: 30 * 30, bonus: 0 },
  B:          { minDays: 2 * 365, maxDays: 4 * 365, autoFlagDays: 36 * 30, bonus: 5 },
  C:          { minDays: 1 * 365, maxDays: 2 * 365, autoFlagDays: 18 * 30, bonus: 15 },
  D:          { minDays: 1 * 365, maxDays: 2 * 365, autoFlagDays: 18 * 30, bonus: 25 },
  Specialist: { minDays: 3 * 365, maxDays: 5 * 365, autoFlagDays: 48 * 30, bonus: 0 }
};

const districtTierSchema = new mongoose.Schema({
  district: { type: String, required: true, unique: true, trim: true },
  province: { type: String, required: true },
  tier: { type: String, enum: TIERS, required: true },
  category: {
    type: String,
    enum: ['urban', 'semi-accessible', 'remote', 'extreme-hardship'],
    required: true
  },
  description: { type: String, default: '' } // "Road access, hospitals, banking" etc.
}, { timestamps: true });

module.exports = mongoose.model('DistrictTier', districtTierSchema);
module.exports.TIERS = TIERS;
module.exports.TIER_RULES = TIER_RULES;
