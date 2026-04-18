const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const MinistrySection = require('../models/MinistrySection');

// All routes require ministry-secretary or psc-admin role
const mustBeSecretaryOrAdmin = requireRole('ministry-secretary', 'psc-admin');

// GET /api/ministry/sections — list sections for the secretary's ministry
// PSC admins can list all with ?ministry=xxx or no filter
router.get('/sections', auth, mustBeSecretaryOrAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.user.roles.includes('ministry-secretary') && !req.user.roles.includes('psc-admin')) {
      // Scoped to own ministry
      filter.ministry = req.user.ministry;
    } else if (req.query.ministry) {
      filter.ministry = req.query.ministry;
    }
    const sections = await MinistrySection.find(filter).sort({ createdAt: -1 });
    return res.json(sections);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch sections', error: err.message });
  }
});

// GET /api/ministry/sections/public — list ALL approved sections (for candidates during priority form)
router.get('/sections/public', async (req, res) => {
  try {
    const sections = await MinistrySection.find({ locked: true }).sort({ ministry: 1, sectionName: 1 });
    return res.json(sections);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch sections', error: err.message });
  }
});

// POST /api/ministry/sections — create a new section
router.post('/sections', auth, mustBeSecretaryOrAdmin, async (req, res) => {
  try {
    const {
      sectionName,
      ministry,
      vacantPositions,
      educationRequirements,
      sector
    } = req.body;

    if (!sectionName || !vacantPositions || !educationRequirements?.degreeLevel) {
      return res.status(400).json({
        message: 'sectionName, vacantPositions and educationRequirements.degreeLevel are required'
      });
    }

    // Secretaries can only create sections for their own ministry
    let ministryName = ministry;
    if (req.user.roles.includes('ministry-secretary') && !req.user.roles.includes('psc-admin')) {
      ministryName = req.user.ministry;
    }
    if (!ministryName) {
      return res.status(400).json({ message: 'Ministry is required' });
    }

    const section = await MinistrySection.create({
      sectionName: sectionName.trim(),
      ministry: ministryName,
      vacantPositions: Number(vacantPositions),
      educationRequirements: {
        degreeLevel: educationRequirements.degreeLevel,
        preferredStream: educationRequirements.preferredStream || '',
        preferredSpecialization: educationRequirements.preferredSpecialization || ''
      },
      sector: sector || 'general-admin',
      createdBy: req.user.id,
      locked: false
    });

    return res.status(201).json(section);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'A section with this name already exists in this ministry'
      });
    }
    return res.status(500).json({ message: 'Failed to create section', error: err.message });
  }
});

// PUT /api/ministry/sections/:id — update (only if not locked)
router.put('/sections/:id', auth, mustBeSecretaryOrAdmin, async (req, res) => {
  try {
    const section = await MinistrySection.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (section.locked) {
      return res.status(403).json({
        message: 'Section is locked and cannot be edited. Contact PSC admin to unlock.'
      });
    }

    // Scope check
    if (
      req.user.roles.includes('ministry-secretary') &&
      !req.user.roles.includes('psc-admin') &&
      section.ministry !== req.user.ministry
    ) {
      return res.status(403).json({ message: 'You can only edit sections in your own ministry' });
    }

    const { sectionName, vacantPositions, educationRequirements, sector } = req.body;
    if (sectionName !== undefined) section.sectionName = sectionName.trim();
    if (vacantPositions !== undefined) section.vacantPositions = Number(vacantPositions);
    if (educationRequirements) {
      section.educationRequirements.degreeLevel =
        educationRequirements.degreeLevel || section.educationRequirements.degreeLevel;
      section.educationRequirements.preferredStream =
        educationRequirements.preferredStream ?? section.educationRequirements.preferredStream;
      section.educationRequirements.preferredSpecialization =
        educationRequirements.preferredSpecialization ?? section.educationRequirements.preferredSpecialization;
    }
    if (sector !== undefined) section.sector = sector;

    await section.save();
    return res.json(section);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update section', error: err.message });
  }
});

// DELETE /api/ministry/sections/:id — delete (only if not locked)
router.delete('/sections/:id', auth, mustBeSecretaryOrAdmin, async (req, res) => {
  try {
    const section = await MinistrySection.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    if (section.locked) {
      return res.status(403).json({ message: 'Locked sections cannot be deleted' });
    }
    if (
      req.user.roles.includes('ministry-secretary') &&
      !req.user.roles.includes('psc-admin') &&
      section.ministry !== req.user.ministry
    ) {
      return res.status(403).json({ message: 'Scope violation' });
    }
    await section.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete', error: err.message });
  }
});

// POST /api/ministry/sections/lock — approve and lock all unlocked sections in the secretary's ministry
// Acts as the "digital signature" step in Flowchart A2
router.post('/sections/lock', auth, requireRole('ministry-secretary'), async (req, res) => {
  try {
    const unlocked = await MinistrySection.find({
      ministry: req.user.ministry,
      locked: false
    });
    if (unlocked.length === 0) {
      return res.status(400).json({ message: 'No unlocked sections to approve' });
    }

    // Simulated DSC signature — SHA-256 of ministry + secretary ID + timestamp
    const now = new Date();
    const payload = `${req.user.ministry}|${req.user.id}|${now.toISOString()}`;
    const dscSignature = crypto.createHash('sha256').update(payload).digest('hex');

    await MinistrySection.updateMany(
      { ministry: req.user.ministry, locked: false },
      {
        $set: {
          locked: true,
          approvedBy: req.user.id,
          approvedAt: now,
          dscSignature
        }
      }
    );

    return res.json({
      success: true,
      count: unlocked.length,
      ministry: req.user.ministry,
      dscSignature,
      approvedAt: now
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to lock sections', error: err.message });
  }
});

// POST /api/ministry/sections/:id/unlock — PSC admin only
router.post('/sections/:id/unlock', auth, requireRole('psc-admin'), async (req, res) => {
  try {
    const section = await MinistrySection.findById(req.params.id);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    section.locked = false;
    section.approvedBy = null;
    section.approvedAt = null;
    section.dscSignature = null;
    await section.save();
    return res.json({ success: true, section });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to unlock', error: err.message });
  }
});

module.exports = router;
