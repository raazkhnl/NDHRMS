const mongoose = require('mongoose');

const QUALIFICATION_LEVELS = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];

const postSchema = new mongoose.Schema({
  postCode: { type: String, unique: true, trim: true },
  postNameEnglish: { type: String, required: true },
  postNameNepali: { type: String, default: '' },
  ministry: { type: String, default: '' },
  department: { type: String, default: '' },
  level: { type: String, default: '' },
  minimumQualification: {
    type: String,
    enum: QUALIFICATION_LEVELS,
    required: true
  },
  examFee: { type: Number, default: 0 },
  totalVacancy: { type: Number, default: 0 },
  examDate: { type: String, default: '' },
  examCenter: { type: String, default: '' },
  syllabus: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
module.exports.QUALIFICATION_LEVELS = QUALIFICATION_LEVELS;
