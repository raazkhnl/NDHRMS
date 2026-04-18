const mongoose = require('mongoose');
const crypto = require('crypto');

const AUDIT_ACTIONS = [
  'score.compute', 'score.override',
  'placement.run', 'placement.publish',
  'appraisal.submit', 'appraisal.countersign',
  'exemption.submit', 'exemption.verify', 'exemption.reject',
  'window.create', 'window.advance',
  'order.draft', 'order.override', 'order.issue',
  'appeal.submit', 'appeal.review',
  'tenure.scan', 'officer.update',
  'login.admin', 'login.candidate'
];

const auditEntrySchema = new mongoose.Schema({
  sequence: { type: Number, required: true, unique: true }, // monotonic counter

  action: { type: String, enum: AUDIT_ACTIONS, required: true },

  // Who
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: '' },
  actorNid: { type: String, default: '' },

  // What (subject of the action)
  subjectType: { type: String, default: '' }, // e.g. 'Officer', 'TransferOrder'
  subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
  subjectRef: { type: String, default: '' }, // human-readable ref like 'TRF-2082-W1-0001'

  // Payload summary (not the full data — just what changed)
  summary: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Hash chain
  previousHash: { type: String, default: '' },
  entryHash: { type: String, required: true },

  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

auditEntrySchema.index({ action: 1, timestamp: -1 });
auditEntrySchema.index({ subjectId: 1 });
auditEntrySchema.index({ actorId: 1 });

// Static helper: append a new entry with auto-linked hash chain
auditEntrySchema.statics.append = async function append(payload) {
  const last = await this.findOne().sort({ sequence: -1 }).lean();
  const sequence = (last?.sequence || 0) + 1;
  const previousHash = last?.entryHash || '0000000000000000000000000000000000000000000000000000000000000000';

  const timestamp = new Date();
  const canonical = JSON.stringify({
    sequence,
    action: payload.action,
    actorId: String(payload.actorId || ''),
    actorName: payload.actorName || '',
    subjectType: payload.subjectType || '',
    subjectId: String(payload.subjectId || ''),
    subjectRef: payload.subjectRef || '',
    summary: payload.summary,
    metadata: payload.metadata || {},
    previousHash,
    timestamp: timestamp.toISOString()
  });
  const entryHash = crypto.createHash('sha256').update(canonical).digest('hex');

  return await this.create({
    sequence,
    ...payload,
    previousHash,
    entryHash,
    timestamp
  });
};

// Verify the entire hash chain — returns first-broken-link index or null if intact
auditEntrySchema.statics.verifyChain = async function verifyChain() {
  const all = await this.find().sort({ sequence: 1 }).lean();
  let prev = '0000000000000000000000000000000000000000000000000000000000000000';
  for (const e of all) {
    if (e.previousHash !== prev) return { intact: false, brokenAt: e.sequence, reason: 'previousHash mismatch' };
    const canonical = JSON.stringify({
      sequence: e.sequence,
      action: e.action,
      actorId: String(e.actorId || ''),
      actorName: e.actorName || '',
      subjectType: e.subjectType || '',
      subjectId: String(e.subjectId || ''),
      subjectRef: e.subjectRef || '',
      summary: e.summary,
      metadata: e.metadata || {},
      previousHash: e.previousHash,
      timestamp: new Date(e.timestamp).toISOString()
    });
    const computed = crypto.createHash('sha256').update(canonical).digest('hex');
    if (computed !== e.entryHash) return { intact: false, brokenAt: e.sequence, reason: 'entryHash tampered' };
    prev = e.entryHash;
  }
  return { intact: true, count: all.length };
};

module.exports = mongoose.model('AuditEntry', auditEntrySchema);
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
