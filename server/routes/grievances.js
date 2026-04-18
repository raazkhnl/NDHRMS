const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Grievance = require('../models/Grievance');
const NID = require('../models/NID');

const GRIEVANCE_TYPES = ['score-challenge', 'registration-issue', 'result-dispute', 'other'];
const GRIEVANCE_STATUS = ['submitted', 'under-review', 'resolved', 'rejected'];

// ─────────────────────────────────────────────────────────────
// POST /api/grievances — public submission
// Body: { nidNumber, rollNumber?, type, subject, description, contactMobile? }
// No auth — any citizen can submit. Sanity-check NID exists.
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nidNumber, rollNumber, type, subject, description, contactMobile } = req.body;

    if (!nidNumber || !type || !subject || !description) {
      return res.status(400).json({ message: 'nidNumber, type, subject and description are required' });
    }
    if (!GRIEVANCE_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${GRIEVANCE_TYPES.join(', ')}` });
    }
    if (String(description).trim().length < 30) {
      return res.status(400).json({ message: 'Description must be at least 30 characters' });
    }

    const nid = await NID.findOne({ nidNumber: String(nidNumber).trim() });
    if (!nid) {
      return res.status(404).json({ message: 'NID not found — cannot submit grievance' });
    }

    const grievance = await Grievance.create({
      nidNumber: nid.nidNumber,
      rollNumber: (rollNumber || '').trim(),
      candidateName: nid.nameEnglish,
      contactMobile: (contactMobile || nid.mobileNumber || '').trim(),
      type,
      subject: String(subject).trim(),
      description: String(description).trim(),
      status: 'submitted'
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📨 GRIEVANCE received from ${nid.nameEnglish} (NID ${nid.nidNumber})`);
    console.log(`   Type: ${type}  |  Subject: ${subject}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    return res.status(201).json({
      success: true,
      grievanceId: grievance._id,
      message: 'Grievance submitted. Review typically completes within 7 working days.'
    });
  } catch (err) {
    console.error('grievance submit error:', err);
    return res.status(500).json({ message: 'Failed to submit grievance', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grievances/mine/:nidNumber — citizen views own grievances
// (no auth — NID-scoped)
// ─────────────────────────────────────────────────────────────
router.get('/mine/:nidNumber', async (req, res) => {
  try {
    const list = await Grievance.find({ nidNumber: req.params.nidNumber.trim() })
      .sort({ submittedAt: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grievances — admin list (with optional ?status filter)
// ─────────────────────────────────────────────────────────────
router.get('/', auth, requireRole('psc-admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const list = await Grievance.find(filter).sort({ submittedAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch grievances', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/grievances/:id — admin resolves
// Body: { status, adminNotes }
// ─────────────────────────────────────────────────────────────
router.patch('/:id', auth, requireRole('psc-admin'), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (status && !GRIEVANCE_STATUS.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${GRIEVANCE_STATUS.join(', ')}` });
    }

    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    if (status) grievance.status = status;
    if (adminNotes !== undefined) grievance.adminNotes = adminNotes;
    grievance.reviewedBy = req.user.id;
    if (status === 'resolved' || status === 'rejected') {
      grievance.resolvedAt = new Date();
    }

    await grievance.save();
    return res.json(grievance);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update', error: err.message });
  }
});

module.exports = router;
