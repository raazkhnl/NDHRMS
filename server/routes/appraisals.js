const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Appraisal = require('../models/Appraisal');
const Officer = require('../models/Officer');

const requireMinistryOrAdmin = requireRole('ministry-secretary', 'psc-admin', 'mofaga-admin');

// POST /api/appraisals — Secretary (or admin) enters annual rating
router.post('/', auth, requireMinistryOrAdmin, async (req, res) => {
  try {
    const { nidNumber, fiscalYear, rating, competency, integrity, initiative, punctuality, notes } = req.body;
    if (!nidNumber || !fiscalYear || !rating) {
      return res.status(400).json({ message: 'nidNumber, fiscalYear, rating are required' });
    }
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ message: 'rating must be 1..5' });

    const officer = await Officer.findOne({ nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    // Scope check for ministry secretaries
    if (
      req.user.roles.includes('ministry-secretary') &&
      !req.user.roles.includes('mofaga-admin') &&
      !req.user.roles.includes('psc-admin') &&
      officer.currentMinistry !== req.user.ministry
    ) {
      return res.status(403).json({ message: 'You can only rate officers in your own ministry' });
    }

    const existing = await Appraisal.findOne({ officerId: officer._id, fiscalYear });
    if (existing?.locked) {
      return res.status(409).json({ message: 'Appraisal is countersigned and locked — cannot modify' });
    }

    const doc = existing || new Appraisal({ officerId: officer._id, nidNumber: officer.nidNumber, fiscalYear });
    doc.rating = r;
    doc.competency = Number(competency) || r;
    doc.integrity = Number(integrity) || r;
    doc.initiative = Number(initiative) || r;
    doc.punctuality = Number(punctuality) || r;
    doc.notes = notes || '';
    doc.ratedBy = req.user.id;
    doc.ratedByName = req.user.fullName;
    await doc.save();

    return res.status(existing ? 200 : 201).json(doc);
  } catch (err) {
    console.error('appraisal error:', err);
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/appraisals/:id/countersign — next-level authority locks appraisal
router.post('/:id/countersign', auth, requireRole('mofaga-admin', 'psc-admin'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });
    if (appraisal.locked) return res.status(409).json({ message: 'Already locked' });
    appraisal.countersignedBy = req.user.id;
    appraisal.countersignedByName = req.user.fullName;
    appraisal.countersignedAt = new Date();
    appraisal.locked = true;
    await appraisal.save();
    return res.json(appraisal);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/appraisals/officer/:nidNumber — list for one officer
router.get('/officer/:nidNumber', auth, async (req, res) => {
  try {
    const isSelf = req.user.nidNumber === req.params.nidNumber;
    const isAdmin = (req.user.roles || []).some((r) =>
      ['mofaga-admin', 'psc-admin', 'ministry-secretary', 'ciaa-auditor', 'oag-auditor'].includes(r)
    );
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const list = await Appraisal.find({ nidNumber: req.params.nidNumber }).sort({ fiscalYear: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/appraisals — admin list with filters
router.get('/', auth, requireMinistryOrAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.fiscalYear) filter.fiscalYear = req.query.fiscalYear;
    if (req.query.locked !== undefined) filter.locked = req.query.locked === 'true';
    const list = await Appraisal.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/appraisals/anomalies — MoFAGA anti-gaming: flag suspiciously inflated ratings
// Spec: "Inflated performance ratings — Countersigned by next level up. Anomalous patterns
//        auto-flagged to MoFAGA."
// Flags: (a) individual appraisals rated 5 where officer's 3yr avg across other ministries
//            was significantly lower, (b) ministries whose mean rating exceeds overall mean
//            by >= 1.0 stdev.
router.get(
  '/anomalies',
  auth,
  requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const all = await Appraisal.find({ locked: true }).populate('officerId').lean();
      if (all.length === 0) return res.json({ individuals: [], ministries: [] });

      const overall = all.reduce((s, a) => s + a.rating, 0) / all.length;

      // Group by ministry of the officer at rating time
      const byMin = {};
      for (const a of all) {
        const m = a.officerId?.currentMinistry || 'Unknown';
        if (!byMin[m]) byMin[m] = [];
        byMin[m].push(a.rating);
      }
      const ministryStats = Object.entries(byMin).map(([min, ratings]) => {
        const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        return { ministry: min, mean, count: ratings.length };
      });
      const overallStdev = Math.sqrt(
        all.reduce((s, a) => s + (a.rating - overall) ** 2, 0) / all.length
      );

      const flaggedMinistries = ministryStats
        .filter((m) => m.count >= 2 && m.mean - overall >= overallStdev)
        .map((m) => ({
          ministry: m.ministry,
          meanRating: Number(m.mean.toFixed(2)),
          overallMean: Number(overall.toFixed(2)),
          deviation: Number((m.mean - overall).toFixed(2)),
          sampleCount: m.count
        }));

      // Individual flag: perfect 5-star ratings
      const perfects = all.filter((a) => a.rating === 5);
      const flaggedIndividuals = perfects.map((a) => ({
        appraisalId: a._id,
        nidNumber: a.nidNumber,
        fiscalYear: a.fiscalYear,
        ministry: a.officerId?.currentMinistry,
        ratedBy: a.ratedByName,
        countersignedBy: a.countersignedByName,
        rating: a.rating,
        note: 'Perfect score — manually review for supporting evidence'
      }));

      return res.json({
        individuals: flaggedIndividuals.slice(0, 20),
        ministries: flaggedMinistries,
        stats: { overallMean: Number(overall.toFixed(2)), overallStdev: Number(overallStdev.toFixed(2)) }
      });
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

module.exports = router;
