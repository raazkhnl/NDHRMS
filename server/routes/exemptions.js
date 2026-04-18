const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Exemption = require('../models/Exemption');
const Officer = require('../models/Officer');
const { EXEMPTION_TYPES } = require('../models/Exemption');

// POST /api/exemptions — officer submits their own (candidate auth — NID-based)
router.post('/', auth, async (req, res) => {
  try {
    const { nidNumber } = req.user;
    const { type, description, certificateRef, issuingAuthority } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'type and description are required' });
    }
    if (!EXEMPTION_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${EXEMPTION_TYPES.join(', ')}` });
    }

    const officer = await Officer.findOne({ nidNumber });
    if (!officer) return res.status(404).json({ message: 'You are not yet an HRMIS officer' });

    const exemption = await Exemption.create({
      officerId: officer._id,
      nidNumber,
      type,
      description: String(description).trim(),
      certificateRef: certificateRef || '',
      issuingAuthority: issuingAuthority || '',
      status: 'submitted'
    });
    return res.status(201).json(exemption);
  } catch (err) {
    console.error('exemption submit error:', err);
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/exemptions/mine — officer sees their own
router.get('/mine', auth, async (req, res) => {
  try {
    const list = await Exemption.find({ nidNumber: req.user.nidNumber }).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/exemptions — admin list (filters)
router.get(
  '/',
  auth,
  requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const list = await Exemption.find(filter).sort({ createdAt: -1 }).lean();
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

// PATCH /api/exemptions/:id — verify or reject (admin)
router.patch('/:id', auth, requireRole('mofaga-admin', 'psc-admin'), async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be verified or rejected' });
    }
    const exemption = await Exemption.findById(req.params.id);
    if (!exemption) return res.status(404).json({ message: 'Not found' });

    exemption.status = status;
    exemption.verificationNotes = verificationNotes || '';
    exemption.verifiedBy = req.user.id;
    exemption.verifiedByName = req.user.fullName;
    exemption.verifiedAt = new Date();
    await exemption.save();
    return res.json(exemption);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

module.exports = router;
