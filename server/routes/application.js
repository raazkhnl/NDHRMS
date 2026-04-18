const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const Application = require('../models/Application');
const Post = require('../models/Post');
const NID = require('../models/NID');

// POST /api/application/submit (protected)
router.post('/submit', auth, async (req, res) => {
  try {
    const { nidNumber, postId, paymentMethod, amount } = req.body;

    if (!nidNumber || !postId || !paymentMethod) {
      return res.status(400).json({
        message: 'nidNumber, postId and paymentMethod are required'
      });
    }

    const existing = await Application.findOne({ nidNumber, postId });
    if (existing) {
      return res.status(400).json({
        message: 'You have already applied for this post',
        rollNumber: existing.rollNumber
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const nid = await NID.findOne({ nidNumber });
    if (!nid) {
      return res.status(404).json({ message: 'NID not found' });
    }

    // Generate unique 6-digit roll number
    let rollNumber;
    let tries = 0;
    while (tries < 10) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      rollNumber = `PSC-2026-${rand}`;
      const collision = await Application.findOne({ rollNumber });
      if (!collision) break;
      tries++;
    }

    const application = await Application.create({
      nidNumber,
      postId: post._id,
      rollNumber,
      paymentMethod,
      paymentStatus: 'success',
      amount: amount || post.examFee,
      examDate: post.examDate,
      examCenter: post.examCenter,
      status: 'registered'
    });

    // Simulated SMS
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📱 SMS to ${nid.mobileNumber}:`);
    console.log(`   Dear ${nid.nameEnglish}, your application for`);
    console.log(`   ${post.postNameEnglish} is confirmed.`);
    console.log(`   Roll Number: ${rollNumber}`);
    console.log(`   Exam Date: ${post.examDate}`);
    console.log(`   Center: ${post.examCenter}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    return res.json({
      success: true,
      rollNumber: application.rollNumber,
      examDate: post.examDate,
      examCenter: post.examCenter,
      candidateName: nid.nameEnglish,
      mobileNumber: nid.mobileNumber,
      postName: post.postNameEnglish,
      paymentStatus: 'success',
      amount: application.amount
    });
  } catch (err) {
    console.error('application submit error:', err);
    return res.status(500).json({ message: 'Failed to submit application', error: err.message });
  }
});

// GET /api/application/my-applications?nidNumber=xxx (protected)
router.get('/my-applications', auth, async (req, res) => {
  try {
    const { nidNumber } = req.query;
    if (!nidNumber) {
      return res.status(400).json({ message: 'nidNumber query parameter is required' });
    }

    const applications = await Application.find({ nidNumber })
      .populate('postId')
      .sort({ applicationDate: -1 });

    return res.json(applications);
  } catch (err) {
    console.error('my-applications error:', err);
    return res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
});

module.exports = router;
