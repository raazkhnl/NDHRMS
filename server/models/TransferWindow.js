const mongoose = require('mongoose');

const WINDOW_STATES = ['scheduled', 'T-60', 'T-30', 'T-15', 'T-10', 'T-0', 'closed'];
const WINDOW_KINDS = ['primary', 'secondary']; // Window 1 (Apr-May) / Window 2 (Oct-Nov)

const transferWindowSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // "2082-83-W1"
  kind: { type: String, enum: WINDOW_KINDS, required: true },
  fiscalYear: { type: String, required: true }, // "2082/83"

  // Key dates (computed from openDate)
  openDate: { type: Date, required: true }, // T-0 — day window opens
  draftAt: { type: Date, required: true },      // T-60
  appealsOpenAt: { type: Date, required: true }, // T-30
  appealsCloseAt: { type: Date, required: true }, // T-15
  ordersIssueAt: { type: Date, required: true }, // T-10

  state: { type: String, enum: WINDOW_STATES, default: 'scheduled' },

  // 15% cap enforcement per ministry
  ministryCapPercent: { type: Number, default: 15 },

  // Stats captured as state advances
  draftCount: { type: Number, default: 0 },
  appealsReceived: { type: Number, default: 0 },
  ordersIssued: { type: Number, default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  closedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TransferWindow', transferWindowSchema);
module.exports.WINDOW_STATES = WINDOW_STATES;
module.exports.WINDOW_KINDS = WINDOW_KINDS;
