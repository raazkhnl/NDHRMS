const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');

// GET /api/results/by-nid/:nidNumber (protected)
// IMPORTANT: declare before the /:rollNumber route to avoid collision
router.get('/by-nid/:nidNumber', auth, async (req, res) => {
  try {
    const results = await Result.find({ nidNumber: req.params.nidNumber.trim() })
      .populate('postId')
      .sort({ publishedAt: -1 });
    return res.json(results);
  } catch (err) {
    console.error('results by nid error:', err);
    return res.status(500).json({ message: 'Failed to fetch results', error: err.message });
  }
});

// GET /api/results/:rollNumber (public)
router.get('/:rollNumber', async (req, res) => {
  try {
    const result = await Result.findOne({ rollNumber: req.params.rollNumber.trim() })
      .populate('postId');
    if (!result) {
      return res.status(404).json({ message: 'Result not published yet' });
    }
    return res.json(result);
  } catch (err) {
    console.error('result lookup error:', err);
    return res.status(500).json({ message: 'Failed to fetch result', error: err.message });
  }
});

module.exports = router;
