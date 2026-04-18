const express = require('express');
const router = express.Router();

const Result = require('../models/Result');
const Post = require('../models/Post');
const NID = require('../models/NID');

// ─────────────────────────────────────────────────────────────
// GET /api/merit-list?postId=xxx&status=pass
// Public merit list — only published results.
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = { published: true };
    if (req.query.postId) filter.postId = req.query.postId;
    if (req.query.status) filter.status = req.query.status;

    const results = await Result.find(filter)
      .populate('postId')
      .sort({ rank: 1 })
      .limit(500);

    // Anonymize slightly — return masked NID (first 2 + last 2 digits)
    const nidSet = [...new Set(results.map((r) => r.nidNumber))];
    const nids = await NID.find({ nidNumber: { $in: nidSet } }).lean();
    const nidMap = new Map(nids.map((n) => [n.nidNumber, n]));

    const maskNid = (n) =>
      n && n.length >= 4 ? `${n.slice(0, 2)}${'*'.repeat(n.length - 4)}${n.slice(-2)}` : n;

    const payload = results.map((r) => {
      const nid = nidMap.get(r.nidNumber);
      return {
        rank: r.rank,
        rollNumber: r.rollNumber,
        candidateName: nid?.nameEnglish || '—',
        candidateNameNepali: nid?.nameNepali || '',
        maskedNid: maskNid(r.nidNumber),
        postCode: r.postId?.postCode,
        postName: r.postId?.postNameEnglish,
        ministry: r.postId?.ministry,
        writtenScore: r.writtenScore,
        interviewScore: r.interviewScore,
        totalScore: r.totalScore,
        status: r.status,
        publishedAt: r.publishedAt
      };
    });

    return res.json(payload);
  } catch (err) {
    console.error('merit list error:', err);
    return res.status(500).json({ message: 'Failed to fetch merit list', error: err.message });
  }
});

// GET /api/merit-list/summary — per-post counts
router.get('/summary', async (req, res) => {
  try {
    const posts = await Post.find().sort({ postCode: 1 }).lean();
    const data = [];
    for (const p of posts) {
      const [total, passed, waitlist, failed] = await Promise.all([
        Result.countDocuments({ postId: p._id, published: true }),
        Result.countDocuments({ postId: p._id, published: true, status: 'pass' }),
        Result.countDocuments({ postId: p._id, published: true, status: 'waitlist' }),
        Result.countDocuments({ postId: p._id, published: true, status: 'fail' })
      ]);
      if (total > 0) {
        data.push({
          postId: p._id,
          postCode: p.postCode,
          postName: p.postNameEnglish,
          ministry: p.ministry,
          total,
          passed,
          waitlist,
          failed
        });
      }
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

module.exports = router;
