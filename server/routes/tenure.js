const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Officer = require('../models/Officer');
const DistrictTier = require('../models/DistrictTier');
const TransferQueue = require('../models/TransferQueue');
const { TIER_RULES } = require('../models/DistrictTier');

const requireMofaga = requireRole('mofaga-admin', 'psc-admin');

// ─────────────────────────────────────────────────────────────
// GET /api/tenure/districts — list district tier classifications
// ─────────────────────────────────────────────────────────────
router.get('/districts', async (req, res) => {
  try {
    const districts = await DistrictTier.find().sort({ province: 1, district: 1 }).lean();
    return res.json(districts);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenure/rules — tenure rules per tier
// ─────────────────────────────────────────────────────────────
router.get('/rules', (req, res) => {
  const rows = Object.entries(TIER_RULES).map(([tier, r]) => ({
    tier,
    minDays: r.minDays,
    minMonths: Math.round(r.minDays / 30),
    maxDays: r.maxDays,
    maxMonths: Math.round(r.maxDays / 30),
    autoFlagMonths: Math.round(r.autoFlagDays / 30),
    hardshipBonus: r.bonus
  }));
  return res.json(rows);
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenure/scan — simulated daily scan
//
// For every active officer:
//   - compute tenureDays = today - tenureStartDate
//   - lookup tier rules
//   - if tenureDays >= autoFlagDays → enter/update queue
//   - if tenureDays >= maxDays → escalate reason to "exceeded-max"
//   - if tenureDays < minDays → skip (not eligible)
//
// Preserves existing queue entries that haven't been resolved.
// ─────────────────────────────────────────────────────────────
router.post('/scan', auth, requireMofaga, async (req, res) => {
  try {
    const officers = await Officer.find({ status: 'active' }).lean();
    const now = Date.now();

    let newEntries = 0;
    let updatedEntries = 0;
    let skipped = 0;

    for (const o of officers) {
      const tier = o.currentDistrictTier || 'A';
      const rule = TIER_RULES[tier];
      if (!rule) continue;

      const tenureDays = Math.floor(
        (now - new Date(o.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Skip officers who haven't reached the auto-flag threshold
      if (tenureDays < rule.autoFlagDays) {
        // Remove any stale queue entry for this officer if somehow present
        await TransferQueue.deleteOne({ officerId: o._id, resolved: false });
        skipped += 1;
        continue;
      }

      // Escalation logic per anti-gaming spec:
      //   tenureDays < maxDays     → approaching-max (warning)
      //   tenureDays >= maxDays    → exceeded-max — MANDATORY transfer required
      //                              at this point informal tenure extension is not allowed;
      //                              only Chief Secretary counter-sign with public justification.
      const reason =
        tenureDays >= rule.maxDays
          ? 'exceeded-max'
          : tenureDays >= rule.minDays
          ? 'approaching-max'
          : 'min-reached';

      // Priority boost for mandatory cases — exceeded-max goes to top of queue
      const tenurePercent = Math.round((tenureDays / rule.maxDays) * 100);

      const update = {
        nidNumber: o.nidNumber,
        employeeId: o.employeeId,
        officerName: o.nameEnglish,
        currentMinistry: o.currentMinistry,
        currentSection: o.currentSection,
        currentTier: tier,
        tenureDays,
        maxTenureDays: rule.maxDays,
        tenurePercent,
        reason,
        flaggedAt: new Date()
      };

      const existing = await TransferQueue.findOne({ officerId: o._id });
      if (existing) {
        Object.assign(existing, update);
        existing.resolved = false;
        await existing.save();
        updatedEntries += 1;
      } else {
        await TransferQueue.create({ officerId: o._id, ...update });
        newEntries += 1;
      }
    }

    return res.json({
      success: true,
      totalOfficersScanned: officers.length,
      newEntries,
      updatedEntries,
      skipped,
      scannedAt: new Date()
    });
  } catch (err) {
    console.error('tenure scan error:', err);
    return res.status(500).json({ message: 'Scan failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenure/queue — current transfer queue
// Query: ?ministry=xxx   ?reason=exceeded-max   ?resolved=false
// ─────────────────────────────────────────────────────────────
router.get('/queue', auth, requireMofaga, async (req, res) => {
  try {
    const filter = {};
    if (req.query.ministry) filter.currentMinistry = req.query.ministry;
    if (req.query.reason) filter.reason = req.query.reason;
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';

    const entries = await TransferQueue.find(filter).sort({ tenurePercent: -1 }).lean();
    return res.json(entries);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenure/queue/stats
// ─────────────────────────────────────────────────────────────
router.get('/queue/stats', auth, requireMofaga, async (req, res) => {
  try {
    const [total, exceeded, approaching, byTier, byMinistry] = await Promise.all([
      TransferQueue.countDocuments({ resolved: false }),
      TransferQueue.countDocuments({ resolved: false, reason: 'exceeded-max' }),
      TransferQueue.countDocuments({ resolved: false, reason: 'approaching-max' }),
      TransferQueue.aggregate([
        { $match: { resolved: false } },
        { $group: { _id: '$currentTier', count: { $sum: 1 } } }
      ]),
      TransferQueue.aggregate([
        { $match: { resolved: false } },
        { $group: { _id: '$currentMinistry', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return res.json({
      total, exceeded, approaching,
      byTier: byTier.map((x) => ({ tier: x._id, count: x.count })),
      byMinistry: byMinistry.map((x) => ({ ministry: x._id, count: x.count }))
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenure/officer/:nidNumber — officer views own tenure status
// ─────────────────────────────────────────────────────────────
router.get('/officer/:nidNumber', auth, async (req, res) => {
  try {
    // Candidate/officer accessing own, or admin accessing any
    const isSelf = req.user.nidNumber === req.params.nidNumber;
    const isAdmin = (req.user.roles || []).some((r) =>
      ['mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor', 'ministry-secretary'].includes(r)
    );
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const officer = await Officer.findOne({ nidNumber: req.params.nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    const tier = officer.currentDistrictTier || 'A';
    const rule = TIER_RULES[tier];
    const tenureDays = Math.floor(
      (Date.now() - new Date(officer.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const queueEntry = await TransferQueue.findOne({
      nidNumber: officer.nidNumber,
      resolved: false
    }).lean();

    return res.json({
      officer: {
        nidNumber: officer.nidNumber,
        employeeId: officer.employeeId,
        nameEnglish: officer.nameEnglish,
        currentMinistry: officer.currentMinistry,
        currentSection: officer.currentSection,
        currentTier: tier,
        tenureStartDate: officer.tenureStartDate
      },
      tenure: {
        days: tenureDays,
        months: Math.floor(tenureDays / 30),
        years: (tenureDays / 365).toFixed(2),
        percentOfMax: Math.round((tenureDays / rule.maxDays) * 100)
      },
      rule: {
        tier,
        minDays: rule.minDays,
        maxDays: rule.maxDays,
        autoFlagDays: rule.autoFlagDays,
        hardshipBonus: rule.bonus
      },
      queueEntry,
      flagged: !!queueEntry
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/tenure/officer/:nidNumber/tier  (admin)
// Update an officer's district tier — e.g. when they move districts.
// ─────────────────────────────────────────────────────────────
router.patch('/officer/:nidNumber/tier', auth, requireMofaga, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!TIER_RULES[tier]) {
      return res.status(400).json({ message: `Invalid tier. Must be one of: ${Object.keys(TIER_RULES).join(', ')}` });
    }
    const officer = await Officer.findOne({ nidNumber: req.params.nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });
    officer.currentDistrictTier = tier;
    await officer.save();
    return res.json({ success: true, officer });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

module.exports = router;
