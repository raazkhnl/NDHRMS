const mongoose = require('mongoose');

const ROLES = [
  'ministry-secretary',
  'psc-admin',
  'mofaga-admin',
  'ciaa-auditor',
  'oag-auditor',
  'chief-secretary'
];

const adminUserSchema = new mongoose.Schema({
  nidNumber: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true },
  passwordHash: { type: String, required: true }, // simulated DSC credential
  roles: [{ type: String, enum: ROLES }],
  ministry: { type: String, default: '' }, // for ministry-secretary role
  designation: { type: String, default: '' },
  dscVerified: { type: Boolean, default: true }, // simulated DSC
  lastLogin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', adminUserSchema);
module.exports.ROLES = ROLES;
