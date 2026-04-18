const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  province: { type: String, default: '' },
  district: { type: String, default: '' },
  municipality: { type: String, default: '' },
  ward: { type: String, default: '' },
  tole: { type: String, default: '' }
}, { _id: false });

const nidSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, unique: true, trim: true },
  nameNepali: { type: String, default: '' },
  nameEnglish: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  },
  permanentAddress: { type: addressSchema, default: () => ({}) },
  mobileNumber: { type: String, default: '' },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  grandparentName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('NID', nidSchema);
