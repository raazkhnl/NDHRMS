const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  writtenScore: { type: Number, default: 0 },
  interviewScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pass', 'fail', 'waitlist'],
    default: 'fail'
  },
  published: { type: Boolean, default: true }, // Phase 3: controls visibility on public merit list
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
