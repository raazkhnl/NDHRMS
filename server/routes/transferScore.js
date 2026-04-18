const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Officer = require('../models/Officer');
const Appraisal = require('../models/Appraisal');
const Exemption = require('../models/Exemption');
const TransferScore = require('../models/TransferScore');
const TransferQueue = require('../models/TransferQueue');
const { TIER_RULES } = require('../models/DistrictTier');

const requireMofaga = requireRole('mofaga-admin', 'psc-admin');

// ─────────────────────────────────────────────────────────────
// Weights per spec (Flowchart B1)
// ─────────────────────────────────────────────────────────────
const WEIGHTS = {
  tenure: 25,
  education: 20,
  experience: 20,
  hardshipEquity: 15,
  performance: 10,
  personalCircumstance: 10
};

// ─────────────────────────────────────────────────────────────
// Individual criterion scorers — each returns 0..100
// ─────────────────────────────────────────────────────────────

// 1. Tenure (25%): closer to max = higher score
function scoreTenure(officer) {
  const tier = officer.currentDistrictTier || 'A';
  const rule = TIER_RULES[tier];
  if (!rule) return { raw: 0, detail: 'Unknown tier' };
  const tenureDays = Math.floor(
    (Date.now() - new Date(officer.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ratio = Math.min(tenureDays / rule.maxDays, 1.0);
  const raw = Math.round(ratio * 100);
  return {
    raw,
    detail: `${Math.floor(tenureDays / 30)}mo of ${Math.round(rule.maxDays / 30)}mo max (${Math.round(ratio * 100)}%)`
  };
}

// 2. Education match (20%): scored against destination OR officer's own qualification level
// Without a specific destination (pre-window), we use a baseline: higher qualification = higher score
function scoreEducation(officer) {
  const levels = { 'SLC/SEE': 20, '+2/PCL': 40, 'Bachelor': 60, 'Master': 80, 'MPhil': 90, 'PhD': 100 };
  const raw = levels[officer.maximumQualification] || 0;
  return { raw, detail: `${officer.maximumQualification || '—'} (baseline match)` };
}

// 3. Years of experience (20%): total career time
function scoreExperience(officer) {
  const history = officer.postingHistory || [];
  if (history.length === 0) return { raw: 0, detail: 'No posting history' };
  const earliest = history.reduce((min, p) => {
    const s = new Date(p.startDate);
    return (!min || s < min) ? s : min;
  }, null);
  const years = earliest ? (Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;
  // 0yr → 0, 20yr → 100 (cap)
  const raw = Math.round(Math.min(years / 20, 1.0) * 100);
  return { raw, detail: `${years.toFixed(1)} years of service` };
}

// 4. Hardship rotation equity (15%): officers never posted in hardship → higher score
// (they should be rotated INTO hardship)
async function scoreHardshipEquity(officer) {
  const history = officer.postingHistory || [];
  const hardshipPostings = history.filter((p) => ['C', 'D'].includes(p.districtTier)).length;

  let raw;
  let detail;
  if (hardshipPostings === 0) {
    raw = 100;
    detail = 'No hardship postings yet — priority for rotation';
  } else if (hardshipPostings === 1) {
    raw = 60;
    detail = '1 hardship posting completed';
  } else {
    raw = 30;
    detail = `${hardshipPostings} hardship postings — already served`;
  }
  return { raw, detail };
}

// 5. Performance rating (10%): 3-year avg of annual appraisals (1..5 scaled to 0..100)
async function scorePerformance(officer) {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const appraisals = await Appraisal.find({
    officerId: officer._id,
    locked: true,
    createdAt: { $gte: threeYearsAgo }
  }).lean();

  if (appraisals.length === 0) {
    return { raw: 60, detail: 'No locked appraisals in last 3 years — default mid-range' };
  }

  const avg = appraisals.reduce((s, a) => s + a.rating, 0) / appraisals.length;
  const raw = Math.round(((avg - 1) / 4) * 100); // 1 → 0, 5 → 100
  return { raw, detail: `Avg rating ${avg.toFixed(2)}/5 over ${appraisals.length} appraisals` };
}

// 6. Personal circumstance (10%): verified exemption active?
async function scorePersonalCircumstance(officer) {
  const now = new Date();
  const active = await Exemption.findOne({
    officerId: officer._id,
    status: 'verified',
    validUntil: { $gte: now }
  }).lean();

  if (!active) {
    return { raw: 50, detail: 'No verified exemption on file' };
  }
  return {
    raw: 100,
    detail: `Verified ${active.type} exemption (valid until ${new Date(active.validUntil).toLocaleDateString()})`
  };
}

// ─────────────────────────────────────────────────────────────
// Compute score for one officer
// ─────────────────────────────────────────────────────────────
async function computeScore(officer) {
  const [tenure, education, experience, hardship, performance, circumstance] = await Promise.all([
    Promise.resolve(scoreTenure(officer)),
    Promise.resolve(scoreEducation(officer)),
    Promise.resolve(scoreExperience(officer)),
    scoreHardshipEquity(officer),
    scorePerformance(officer),
    scorePersonalCircumstance(officer)
  ]);

  const breakdown = [
    { criterion: 'Tenure at current posting', weight: WEIGHTS.tenure, rawScore: tenure.raw, weightedScore: (tenure.raw * WEIGHTS.tenure) / 100, detail: tenure.detail },
    { criterion: 'Education match',           weight: WEIGHTS.education, rawScore: education.raw, weightedScore: (education.raw * WEIGHTS.education) / 100, detail: education.detail },
    { criterion: 'Years of experience',       weight: WEIGHTS.experience, rawScore: experience.raw, weightedScore: (experience.raw * WEIGHTS.experience) / 100, detail: experience.detail },
    { criterion: 'Hardship rotation equity',  weight: WEIGHTS.hardshipEquity, rawScore: hardship.raw, weightedScore: (hardship.raw * WEIGHTS.hardshipEquity) / 100, detail: hardship.detail },
    { criterion: 'Performance rating (3yr avg)', weight: WEIGHTS.performance, rawScore: performance.raw, weightedScore: (performance.raw * WEIGHTS.performance) / 100, detail: performance.detail },
    { criterion: 'Personal circumstance',     weight: WEIGHTS.personalCircumstance, rawScore: circumstance.raw, weightedScore: (circumstance.raw * WEIGHTS.personalCircumstance) / 100, detail: circumstance.detail }
  ];

  const totalScore = breakdown.reduce((s, b) => s + b.weightedScore, 0);
  const rule = TIER_RULES[officer.currentDistrictTier || 'A'];
  const hardshipBonus = rule?.bonus || 0;
  const finalScore = totalScore + hardshipBonus;

  const tenureDays = Math.floor(
    (Date.now() - new Date(officer.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const earliest = (officer.postingHistory || []).reduce((min, p) => {
    const s = new Date(p.startDate);
    return (!min || s < min) ? s : min;
  }, null);
  const yearsOfService = earliest ? (Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365) : 0;

  return {
    breakdown,
    totalScore: Math.round(totalScore * 100) / 100,
    hardshipBonus,
    finalScore: Math.round(finalScore * 100) / 100,
    computedFor: {
      currentMinistry: officer.currentMinistry,
      currentSection: officer.currentSection,
      currentTier: officer.currentDistrictTier,
      tenureDays,
      yearsOfService: Math.round(yearsOfService * 100) / 100
    }
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/score/run — run scoring for all officers in the transfer queue
// ─────────────────────────────────────────────────────────────
router.post('/run', auth, requireMofaga, async (req, res) => {
  try {
    const queueEntries = await TransferQueue.find({ resolved: false });
    if (queueEntries.length === 0) {
      return res.status(400).json({ message: 'Transfer queue is empty. Run the tenure scan first.' });
    }

    const officerIds = queueEntries.map((q) => q.officerId);
    const officers = await Officer.find({ _id: { $in: officerIds } });

    const scored = [];
    for (const officer of officers) {
      const s = await computeScore(officer);
      const doc = {
        officerId: officer._id,
        nidNumber: officer.nidNumber,
        employeeId: officer.employeeId,
        officerName: officer.nameEnglish,
        ...s,
        computedAt: new Date(),
        computedBy: req.user.id,
        visibleToOfficer: true
      };
      scored.push(doc);
    }

    // Sort by finalScore desc to compute ranks. Tiebreaker: yearsOfService desc
    scored.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return b.computedFor.yearsOfService - a.computedFor.yearsOfService;
    });
    scored.forEach((s, i) => { s.rank = i + 1; });

    // Upsert each
    for (const s of scored) {
      await TransferScore.findOneAndUpdate(
        { officerId: s.officerId },
        { $set: s },
        { upsert: true, new: true }
      );
    }

    return res.json({
      success: true,
      count: scored.length,
      computedAt: new Date(),
      summary: {
        highest: scored[0] ? { name: scored[0].officerName, score: scored[0].finalScore } : null,
        lowest: scored.length ? { name: scored[scored.length-1].officerName, score: scored[scored.length-1].finalScore } : null,
        avg: scored.length ? (scored.reduce((a,b)=>a+b.finalScore, 0)/scored.length).toFixed(2) : 0
      }
    });
  } catch (err) {
    console.error('score run error:', err);
    return res.status(500).json({ message: 'Scoring failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/score/rankings — current ranked list (admin)
// ─────────────────────────────────────────────────────────────
router.get('/rankings', auth, requireMofaga, async (req, res) => {
  try {
    const scores = await TransferScore.find().sort({ rank: 1 }).lean();
    return res.json(scores);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/score/officer/:nidNumber — officer sees own breakdown
// ─────────────────────────────────────────────────────────────
router.get('/officer/:nidNumber', auth, async (req, res) => {
  try {
    const isSelf = req.user.nidNumber === req.params.nidNumber;
    const isAdmin = (req.user.roles || []).some((r) =>
      ['mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'].includes(r)
    );
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const officer = await Officer.findOne({ nidNumber: req.params.nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    const score = await TransferScore.findOne({ officerId: officer._id });
    return res.json({ officer: { nameEnglish: officer.nameEnglish, employeeId: officer.employeeId }, score });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/score/weights — spec of the 6-criterion weights
// ─────────────────────────────────────────────────────────────
router.get('/weights', (req, res) => {
  res.json(WEIGHTS);
});

module.exports = router;
module.exports.computeScore = computeScore;
