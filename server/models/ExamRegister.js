const mongoose = require('mongoose');

const QUALIFICATION_LEVELS = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];

const examRegisterSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  nidNumber: { type: String, required: true, trim: true },
  maximumQualification: {
    type: String,
    enum: QUALIFICATION_LEVELS,
    required: true
  },
  university: { type: String, default: '' },
  faculty: { type: String, default: '' },
  stream: { type: String, default: '' },
  yearOfCompletion: { type: String, default: '' },
  percentage: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ExamRegister', examRegisterSchema);
module.exports.QUALIFICATION_LEVELS = QUALIFICATION_LEVELS;
