const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');

const QUALIFICATION_HIERARCHY = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];

// GET /api/posts — public list of all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ postCode: 1 });
    return res.json(posts);
  } catch (err) {
    console.error('posts list error:', err);
    return res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

// GET /api/posts/:postId/check-eligibility?qualification=Master (protected)
router.get('/:postId/check-eligibility', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { qualification } = req.query;

    if (!qualification) {
      return res.status(400).json({ message: 'qualification query parameter is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const candidateIdx = QUALIFICATION_HIERARCHY.indexOf(qualification);
    const minIdx = QUALIFICATION_HIERARCHY.indexOf(post.minimumQualification);

    if (candidateIdx === -1) {
      return res.status(400).json({
        eligible: false,
        message: `Unknown qualification: ${qualification}`,
        postName: post.postNameEnglish,
        minimumQualification: post.minimumQualification,
        candidateQualification: qualification
      });
    }

    const eligible = candidateIdx >= minIdx;

    return res.json({
      eligible,
      postName: post.postNameEnglish,
      minimumQualification: post.minimumQualification,
      candidateQualification: qualification,
      message: eligible
        ? `Eligible — your qualification (${qualification}) meets the minimum requirement (${post.minimumQualification}).`
        : `Not eligible — your qualification (${qualification}) does not meet the minimum requirement (${post.minimumQualification}).`
    });
  } catch (err) {
    console.error('check-eligibility error:', err);
    return res.status(500).json({ message: 'Failed to check eligibility', error: err.message });
  }
});

module.exports = router;
