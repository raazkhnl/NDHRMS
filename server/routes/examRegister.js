const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ExamRegister = require('../models/ExamRegister');

// GET /api/exam-register/:registrationNumber (protected)
router.get('/:registrationNumber', auth, async (req, res) => {
  try {
    const record = await ExamRegister.findOne({
      registrationNumber: req.params.registrationNumber.trim()
    });
    if (!record) {
      return res.status(404).json({ message: 'Registration number not found' });
    }
    return res.json(record);
  } catch (err) {
    console.error('exam-register lookup error:', err);
    return res.status(500).json({ message: 'Failed to fetch record', error: err.message });
  }
});

module.exports = router;
