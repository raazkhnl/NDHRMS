const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const NID = require('../models/NID');
const Candidate = require('../models/Candidate');

// Mask all but last two digits of a 10-digit mobile number => 98*****67
function maskMobile(mobile) {
  if (!mobile || mobile.length < 4) return mobile || '';
  const first2 = mobile.substring(0, 2);
  const last2 = mobile.substring(mobile.length - 2);
  const middleLen = mobile.length - 4;
  return `${first2}${'*'.repeat(middleLen)}${last2}`;
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { nidNumber } = req.body;

    if (!nidNumber || typeof nidNumber !== 'string') {
      return res.status(400).json({ message: 'NID number is required' });
    }

    const nid = await NID.findOne({ nidNumber: nidNumber.trim() });
    if (!nid) {
      return res.status(404).json({ message: 'NID not found in database' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let candidate = await Candidate.findOne({ nidNumber: nid.nidNumber });
    if (!candidate) {
      candidate = new Candidate({
        nidNumber: nid.nidNumber,
        mobileNumber: nid.mobileNumber
      });
    }
    candidate.otp = otp;
    candidate.otpExpiry = otpExpiry;
    candidate.mobileNumber = nid.mobileNumber;
    candidate.isVerified = false;
    await candidate.save();

    // Simulated SMS
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📱 SMS to ${nid.mobileNumber}: Your PSC OTP is ${otp}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    return res.json({
      success: true,
      message: 'OTP sent to registered mobile',
      maskedMobile: maskMobile(nid.mobileNumber)
    });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { nidNumber, otp } = req.body;

    if (!nidNumber || !otp) {
      return res.status(400).json({ message: 'NID number and OTP are required' });
    }

    const candidate = await Candidate.findOne({ nidNumber: nidNumber.trim() });
    if (!candidate) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (!candidate.otp || candidate.otp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (!candidate.otpExpiry || candidate.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    candidate.isVerified = true;
    candidate.otp = null;
    candidate.otpExpiry = null;

    const nid = await NID.findOne({ nidNumber: candidate.nidNumber });
    if (!nid) {
      return res.status(404).json({ message: 'NID record not found' });
    }

    const token = jwt.sign(
      { nidNumber: nid.nidNumber, id: candidate._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    candidate.token = token;
    await candidate.save();

    return res.json({
      token,
      nidData: {
        nidNumber: nid.nidNumber,
        nameNepali: nid.nameNepali,
        nameEnglish: nid.nameEnglish,
        dateOfBirth: nid.dateOfBirth,
        gender: nid.gender,
        permanentAddress: nid.permanentAddress,
        mobileNumber: nid.mobileNumber,
        fatherName: nid.fatherName,
        motherName: nid.motherName,
        grandparentName: nid.grandparentName
      }
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ message: 'Failed to verify OTP', error: err.message });
  }
});

module.exports = router;
