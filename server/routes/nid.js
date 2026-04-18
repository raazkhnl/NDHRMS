const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const NID = require('../models/NID');

// GET /api/nid/:nidNumber
router.get('/:nidNumber', async (req, res) => {
  try {
    let user = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
          // Invalid token, proceed as public
        }
      }
    }

    const nid = await NID.findOne({ nidNumber: req.params.nidNumber.trim() });
    if (!nid) {
      return res.status(404).json({ message: 'NID record not found' });
    }

    let isAuthorized = false;
    if (user) {
      if ((user.roles && user.roles.length > 0) || user.nidNumber === nid.nidNumber) {
        isAuthorized = true;
      }
    }

    if (isAuthorized) {
      return res.json(nid);
    }

    const maskName = (name) => {
      if (!name) return name;
      return name.split(' ').map(w => w.length > 2 ? w.substring(0, 2) + '*'.repeat(4) : w).join(' ');
    };

    const maskedNid = {
      _id: nid._id,
      nidNumber: nid.nidNumber,
      nameEnglish: maskName(nid.nameEnglish),
      nameNepali: maskName(nid.nameNepali)
    };

    return res.json(maskedNid);
  } catch (err) {
    console.error('nid lookup error:', err);
    return res.status(500).json({ message: 'Failed to fetch NID', error: err.message });
  }
});

module.exports = router;
