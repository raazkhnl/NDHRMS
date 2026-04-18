const mongoose = require('mongoose');

const prioritySchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, unique: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  priorities: {
    type: [String], // ministry names in preference order
    validate: {
      validator: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 3,
      message: 'Priorities must have 1–3 ministry choices'
    }
  },
  submittedAt: { type: Date, default: Date.now },
  locked: { type: Boolean, default: false } // once placement runs, priorities freeze
}, { timestamps: true });

module.exports = mongoose.model('Priority', prioritySchema);
