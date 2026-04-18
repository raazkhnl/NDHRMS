const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Officer = require('../models/Officer');

// ─────────────────────────────────────────────────────────────
// GET /api/officer/me — officer views their own profile (candidate auth)
// The candidate's NID is used to look up the Officer record.
// ─────────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const { nidNumber } = req.user;
    if (!nidNumber) return res.status(400).json({ message: 'Invalid session' });

    const officer = await Officer.findOne({ nidNumber });
    if (!officer) {
      return res.status(404).json({
        message: 'You are not registered as an officer yet',
        isOfficer: false
      });
    }

    // Compute tenure in days
    const tenureDays = Math.floor(
      (Date.now() - new Date(officer.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      isOfficer: true,
      officer,
      tenureDays,
      tenureYears: (tenureDays / 365).toFixed(2)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/officer/all — MoFAGA admin, PSC admin, ministry secretary list
// Query: ?ministry=xxx   ?status=active
// Ministry secretaries see only their own ministry.
// ─────────────────────────────────────────────────────────────
router.get(
  '/all',
  auth,
  requireRole('psc-admin', 'mofaga-admin', 'ministry-secretary', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const filter = {};
      if (req.user.roles.includes('ministry-secretary') && !req.user.roles.includes('mofaga-admin')) {
        filter.currentMinistry = req.user.ministry;
      } else if (req.query.ministry) {
        filter.currentMinistry = req.query.ministry;
      }
      if (req.query.status) filter.status = req.query.status;

      const officers = await Officer.find(filter).sort({ currentMinistry: 1, onboardedAt: -1 }).lean();
      return res.json(officers);
    } catch (err) {
      return res.status(500).json({ message: 'Failed to list officers', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/officer/:nidNumber — admin detail view
// ─────────────────────────────────────────────────────────────
router.get(
  '/:nidNumber',
  auth,
  requireRole('psc-admin', 'mofaga-admin', 'ministry-secretary', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const officer = await Officer.findOne({ nidNumber: req.params.nidNumber.trim() });
      if (!officer) return res.status(404).json({ message: 'Officer not found' });

      // Scope check for ministry secretaries
      if (
        req.user.roles.includes('ministry-secretary') &&
        !req.user.roles.includes('mofaga-admin') &&
        officer.currentMinistry !== req.user.ministry
      ) {
        return res.status(403).json({ message: 'Not in your ministry' });
      }

      return res.json(officer);
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/officer/stats/summary — system-wide stats (MoFAGA dashboard)
// ─────────────────────────────────────────────────────────────
router.get(
  '/stats/summary',
  auth,
  requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const [total, active, byMinistry, byTier] = await Promise.all([
        Officer.countDocuments({}),
        Officer.countDocuments({ status: 'active' }),
        Officer.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$currentMinistry', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Officer.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$currentDistrictTier', count: { $sum: 1 } } }
        ])
      ]);

      return res.json({
        total,
        active,
        byMinistry: byMinistry.map((x) => ({ ministry: x._id, count: x.count })),
        byTier: byTier.map((x) => ({ tier: x._id, count: x.count }))
      });
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

module.exports = router;
