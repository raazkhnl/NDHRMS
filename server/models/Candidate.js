const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, unique: true, trim: true },
  mobileNumber: { type: String, default: '' },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  token: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);
