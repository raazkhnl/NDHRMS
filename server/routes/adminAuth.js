const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const AdminUser = require('../models/AdminUser');
const auth = require('../middleware/auth');

// POST /api/admin-auth/login
// Body: { nidNumber, password }
router.post('/login', async (req, res) => {
  try {
    const { nidNumber, password } = req.body;
    if (!nidNumber || !password) {
      return res.status(400).json({ message: 'NID number and password are required' });
    }

    const user = await AdminUser.findOne({ nidNumber: nidNumber.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        nidNumber: user.nidNumber,
        roles: user.roles,
        ministry: user.ministry,
        fullName: user.fullName,
        kind: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        nidNumber: user.nidNumber,
        fullName: user.fullName,
        roles: user.roles,
        ministry: user.ministry,
        designation: user.designation,
        dscVerified: user.dscVerified
      }
    });
  } catch (err) {
    console.error('admin login error:', err);
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET /api/admin-auth/me — return current admin user
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.kind !== 'admin') {
      return res.status(403).json({ message: 'Not an admin session' });
    }
    const user = await AdminUser.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      nidNumber: user.nidNumber,
      fullName: user.fullName,
      roles: user.roles,
      ministry: user.ministry,
      designation: user.designation,
      dscVerified: user.dscVerified
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

module.exports = router;
