const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Application = require('../models/Application');
const Result = require('../models/Result');
const Post = require('../models/Post');
const NID = require('../models/NID');
const Grievance = require('../models/Grievance');

// Pass threshold defaults — tunable per post in future
const PASS_MARK = 60;       // total score required to pass
const WAITLIST_LOW = 50;    // between WAITLIST_LOW and PASS_MARK → waitlist

const requirePscAdmin = requireRole('psc-admin');

// ─────────────────────────────────────────────────────────────
// GET /api/psc-admin/applications — list all applications
// Optional filters: ?postId=xxx   ?status=registered|appeared|result_published
// ─────────────────────────────────────────────────────────────
router.get('/applications', auth, requirePscAdmin, async (req, res) => {
  try {
    const { postId, status } = req.query;
    const filter = {};
    if (postId) filter.postId = postId;
    if (status) filter.status = status;

    const apps = await Application.find(filter)
      .populate('postId')
      .sort({ applicationDate: -1 });

    // Enrich with candidate name + existing result (if any)
    const nidSet = [...new Set(apps.map((a) => a.nidNumber))];
    const nids = await NID.find({ nidNumber: { $in: nidSet } }).lean();
    const nidMap = new Map(nids.map((n) => [n.nidNumber, n]));

    const rollSet = apps.map((a) => a.rollNumber);
    const results = await Result.find({ rollNumber: { $in: rollSet } }).lean();
    const resultMap = new Map(results.map((r) => [r.rollNumber, r]));

    const enriched = apps.map((a) => {
      const nid = nidMap.get(a.nidNumber);
      const result = resultMap.get(a.rollNumber);
      return {
        _id: a._id,
        rollNumber: a.rollNumber,
        nidNumber: a.nidNumber,
        candidateName: nid?.nameEnglish || '—',
        candidateNameNepali: nid?.nameNepali || '',
        mobileNumber: nid?.mobileNumber || '',
        postId: a.postId?._id,
        postName: a.postId?.postNameEnglish || '—',
        postCode: a.postId?.postCode || '',
        ministry: a.postId?.ministry || '',
        examDate: a.examDate,
        examCenter: a.examCenter,
        paymentStatus: a.paymentStatus,
        paymentMethod: a.paymentMethod,
        applicationDate: a.applicationDate,
        applicationStatus: a.status,
        scored: !!result,
        writtenScore: result?.writtenScore ?? null,
        interviewScore: result?.interviewScore ?? null,
        totalScore: result?.totalScore ?? null,
        rank: result?.rank ?? null,
        resultStatus: result?.status ?? null,
        resultPublished: result?.published ?? false,
        resultId: result?._id
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('psc-admin applications error:', err);
    return res.status(500).json({ message: 'Failed to list applications', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/psc-admin/stats — high-level counts for dashboard
// ─────────────────────────────────────────────────────────────
router.get('/stats', auth, requirePscAdmin, async (req, res) => {
  try {
    const [totalApps, totalResults, published, pending, grievances] = await Promise.all([
      Application.countDocuments({}),
      Result.countDocuments({}),
      Result.countDocuments({ published: true }),
      Grievance.countDocuments({ status: { $in: ['submitted', 'under-review'] } }),
      Grievance.countDocuments({})
    ]);

    // Unscored = applications that don't yet have a matching Result
    const allRolls = await Application.distinct('rollNumber');
    const scoredRolls = await Result.distinct('rollNumber');
    const unscored = allRolls.filter((r) => !scoredRolls.includes(r)).length;

    return res.json({
      totalApplications: totalApps,
      totalResults,
      publishedResults: published,
      unscoredApplications: unscored,
      pendingGrievances: pending,
      totalGrievances: grievances
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/psc-admin/score — enter or update a score for one application
// Body: { rollNumber, writtenScore, interviewScore }
// Auto-computes status (pass/waitlist/fail) based on totals.
// Rank is recomputed when merit list is published (separate endpoint).
// ─────────────────────────────────────────────────────────────
router.post('/score', auth, requirePscAdmin, async (req, res) => {
  try {
    const { rollNumber, writtenScore, interviewScore } = req.body;
    if (!rollNumber) return res.status(400).json({ message: 'rollNumber is required' });

    const written = Number(writtenScore);
    const interview = Number(interviewScore);
    if (Number.isNaN(written) || written < 0 || written > 80) {
      return res.status(400).json({ message: 'writtenScore must be 0..80' });
    }
    if (Number.isNaN(interview) || interview < 0 || interview > 20) {
      return res.status(400).json({ message: 'interviewScore must be 0..20' });
    }

    const application = await Application.findOne({ rollNumber });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const total = written + interview;
    const status = total >= PASS_MARK ? 'pass' : total >= WAITLIST_LOW ? 'waitlist' : 'fail';

    let result = await Result.findOne({ rollNumber });
    if (!result) {
      result = new Result({
        rollNumber,
        nidNumber: application.nidNumber,
        postId: application.postId
      });
    }
    result.writtenScore = written;
    result.interviewScore = interview;
    result.totalScore = total;
    result.status = status;
    result.published = false; // needs explicit publish
    result.publishedBy = null;
    result.publishedAt = null;
    await result.save();

    // Update application status
    if (application.status === 'registered') {
      application.status = 'appeared';
      await application.save();
    }

    return res.json({ success: true, result });
  } catch (err) {
    console.error('score entry error:', err);
    return res.status(500).json({ message: 'Failed to enter score', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/psc-admin/publish-merit-list
// Body: { postId }
// Ranks all scored results for the post (passes first, waitlist, fails),
// sets published=true, and flips application.status to "result_published".
// ─────────────────────────────────────────────────────────────
router.post('/publish-merit-list', auth, requirePscAdmin, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Grab all results for this post, sorted by total desc (pass/waitlist/fail combined — rank is overall)
    const results = await Result.find({ postId })
      .sort({ totalScore: -1, writtenScore: -1 })
      .exec();

    if (results.length === 0) {
      return res.status(400).json({ message: 'No scored applications for this post. Enter scores first.' });
    }

    // Assign ranks (tiebreaker: higher written score). All candidates get a rank.
    for (let i = 0; i < results.length; i++) {
      results[i].rank = i + 1;
      results[i].published = true;
      results[i].publishedBy = req.user.id;
      results[i].publishedAt = new Date();
      await results[i].save();
    }

    // Update applications → "result_published"
    const rolls = results.map((r) => r.rollNumber);
    await Application.updateMany(
      { rollNumber: { $in: rolls } },
      { $set: { status: 'result_published' } }
    );

    const summary = {
      post: post.postNameEnglish,
      total: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      waitlist: results.filter((r) => r.status === 'waitlist').length,
      failed: results.filter((r) => r.status === 'fail').length
    };

    return res.json({ success: true, summary });
  } catch (err) {
    console.error('publish merit list error:', err);
    return res.status(500).json({ message: 'Failed to publish merit list', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/psc-admin/unpublish-merit-list   (rollback)
// ─────────────────────────────────────────────────────────────
router.post('/unpublish-merit-list', auth, requirePscAdmin, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    await Result.updateMany({ postId }, { $set: { published: false } });
    const rolls = await Result.find({ postId }).distinct('rollNumber');
    await Application.updateMany(
      { rollNumber: { $in: rolls } },
      { $set: { status: 'appeared' } }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to unpublish', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/psc-admin/sector-segregation
// Groups passed candidates (across all posts) by sector via their
// applied-post's ministry. Useful for Phase 4 placement prep.
// ─────────────────────────────────────────────────────────────
router.get('/sector-segregation', auth, requirePscAdmin, async (req, res) => {
  try {
    const passedResults = await Result.find({ status: 'pass', published: true })
      .populate('postId')
      .sort({ rank: 1 });

    const nidSet = [...new Set(passedResults.map((r) => r.nidNumber))];
    const nids = await NID.find({ nidNumber: { $in: nidSet } }).lean();
    const nidMap = new Map(nids.map((n) => [n.nidNumber, n]));

    const grouped = {};
    for (const r of passedResults) {
      const ministry = r.postId?.ministry || 'Unassigned';
      if (!grouped[ministry]) grouped[ministry] = [];
      const nid = nidMap.get(r.nidNumber);
      grouped[ministry].push({
        rollNumber: r.rollNumber,
        nidNumber: r.nidNumber,
        candidateName: nid?.nameEnglish || '—',
        rank: r.rank,
        totalScore: r.totalScore,
        postName: r.postId?.postNameEnglish,
        postCode: r.postId?.postCode
      });
    }

    return res.json(grouped);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to segregate', error: err.message });
  }
});

module.exports = router;
