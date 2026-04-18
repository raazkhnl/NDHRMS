const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Priority = require('../models/Priority');
const Result = require('../models/Result');
const MinistrySection = require('../models/MinistrySection');
const PlacementOrder = require('../models/PlacementOrder');

// GET /api/priority/ministries — list ministries that have at least one locked section
// (candidate picks from this list). Public.
router.get('/ministries', async (req, res) => {
  try {
    const ministries = await MinistrySection.distinct('ministry', { locked: true });
    ministries.sort();
    return res.json(ministries);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list ministries', error: err.message });
  }
});

// GET /api/priority/mine — candidate views their priorities + any placement order
router.get('/mine', auth, async (req, res) => {
  try {
    const { nidNumber } = req.user;
    if (!nidNumber) return res.status(400).json({ message: 'Invalid session' });

    const priority = await Priority.findOne({ nidNumber });
    const placement = await PlacementOrder.findOne({ nidNumber })
      .populate('assignedSectionId')
      .populate('sourcePostId');

    // eligibility: must have a published pass result
    const passedResult = await Result.findOne({
      nidNumber,
      status: 'pass',
      published: true
    }).populate('postId');

    return res.json({
      eligible: !!passedResult,
      resultRank: passedResult?.rank || null,
      rollNumber: passedResult?.rollNumber || null,
      priority,
      placement
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch', error: err.message });
  }
});

// POST /api/priority/submit — candidate submits top 3 ministries
// Body: { priorities: [ministry1, ministry2, ministry3] }
router.post('/submit', auth, async (req, res) => {
  try {
    const { nidNumber } = req.user;
    const { priorities } = req.body;

    if (!Array.isArray(priorities) || priorities.length < 1 || priorities.length > 3) {
      return res.status(400).json({ message: 'Provide 1–3 ministry choices in priority order' });
    }
    const cleaned = priorities.map((p) => String(p).trim()).filter(Boolean);
    if (cleaned.length !== new Set(cleaned).size) {
      return res.status(400).json({ message: 'Priorities must be unique — do not repeat ministries' });
    }

    // Validate all ministries exist
    const validMinistries = await MinistrySection.distinct('ministry', { locked: true });
    const invalid = cleaned.filter((m) => !validMinistries.includes(m));
    if (invalid.length) {
      return res.status(400).json({ message: `Unknown ministry: ${invalid.join(', ')}` });
    }

    // Candidate must have a published pass result
    const passedResult = await Result.findOne({ nidNumber, status: 'pass', published: true });
    if (!passedResult) {
      return res.status(403).json({
        message: 'Only candidates with a published pass result can submit priorities'
      });
    }

    // Placement already issued → freeze
    const existingOrder = await PlacementOrder.findOne({ nidNumber, published: true });
    if (existingOrder) {
      return res.status(403).json({
        message: 'Placement already issued; priorities cannot be modified'
      });
    }

    let priority = await Priority.findOne({ nidNumber });
    if (priority?.locked) {
      return res.status(403).json({ message: 'Priorities are locked — placement algorithm has been run' });
    }

    if (!priority) {
      priority = new Priority({
        nidNumber,
        rollNumber: passedResult.rollNumber,
        priorities: cleaned,
        locked: false
      });
    } else {
      priority.rollNumber = passedResult.rollNumber;
      priority.priorities = cleaned;
      priority.submittedAt = new Date();
    }
    await priority.save();

    return res.json({ success: true, priority });
  } catch (err) {
    console.error('priority submit error:', err);
    return res.status(500).json({ message: 'Failed to submit', error: err.message });
  }
});

module.exports = router;
