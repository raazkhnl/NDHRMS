const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Officer = require('../models/Officer');
const Exemption = require('../models/Exemption');
const EmergencyTransfer = require('../models/EmergencyTransfer');
const TransferOrder = require('../models/TransferOrder');
const TransferWindow = require('../models/TransferWindow');
const Grievance = require('../models/Grievance');
const AuditEntry = require('../models/AuditEntry');

const requireMofaga = requireRole('mofaga-admin', 'psc-admin');
const requireChiefSecretary = requireRole('psc-admin'); // Chairman/PSC acts as Chief Secretary here

// ═══════════════════════════════════════════════════════════════════
// ANTI-GAMING RULE CHECKS (can be called before transfer window advance
// or any transfer order is issued)
// ═══════════════════════════════════════════════════════════════════

// POST /api/anti-gaming/check-return-block
// Body: { nidNumber, toMinistry, toSection }
// Rule: An officer may NOT return to the same section within 5 years of leaving.
router.post('/check-return-block', auth, requireMofaga, async (req, res) => {
  try {
    const { nidNumber, toMinistry, toSection } = req.body;
    if (!nidNumber || !toMinistry || !toSection) {
      return res.status(400).json({ message: 'nidNumber, toMinistry, toSection required' });
    }
    const officer = await Officer.findOne({ nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const history = officer.postingHistory || [];
    const violations = history
      .filter((p) => p.ministry === toMinistry && p.sectionName === toSection)
      .filter((p) => {
        const end = p.endDate ? new Date(p.endDate) : new Date();
        return end >= fiveYearsAgo;
      });

    if (violations.length > 0) {
      return res.json({
        blocked: true,
        reason: `Officer served at ${toMinistry} → ${toSection} within the past 5 years`,
        lastEnded: violations[violations.length - 1].endDate || 'present'
      });
    }

    return res.json({ blocked: false });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/anti-gaming/enforce-exemption-renewal
// Expires any verified exemption whose validUntil has passed; forces renewal.
router.post('/enforce-exemption-renewal', auth, requireMofaga, async (req, res) => {
  try {
    const now = new Date();
    const expired = await Exemption.updateMany(
      { status: 'verified', validUntil: { $lt: now } },
      { $set: { status: 'expired' } }
    );

    try {
      await AuditEntry.append({
        action: 'exemption.submit',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'Exemption',
        summary: `${req.user.fullName} ran renewal sweep — ${expired.modifiedCount} exemptions marked expired`,
        metadata: { expiredCount: expired.modifiedCount }
      });
    } catch {}

    return res.json({ expiredCount: expired.modifiedCount });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/anti-gaming/exemption-patterns
// Watchdog aid: returns exemption clustering statistics by type, ministry, district tier
router.get(
  '/exemption-patterns',
  auth,
  requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const pipeline = [
        { $match: { status: 'verified' } },
        { $lookup: {
            from: 'officers',
            localField: 'officerId',
            foreignField: '_id',
            as: 'officer'
        } },
        { $unwind: '$officer' },
        { $group: {
            _id: { type: '$type', ministry: '$officer.currentMinistry', tier: '$officer.currentDistrictTier' },
            count: { $sum: 1 }
        } },
        { $sort: { count: -1 } }
      ];
      const clusters = await Exemption.aggregate(pipeline);
      return res.json(clusters.map((c) => ({
        type: c._id.type,
        ministry: c._id.ministry,
        tier: c._id.tier,
        count: c.count
      })));
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// EMERGENCY TRANSFER
// ═══════════════════════════════════════════════════════════════════

// POST /api/anti-gaming/emergency — MoFAGA requests an emergency transfer
router.post('/emergency', auth, requireMofaga, async (req, res) => {
  try {
    const { nidNumber, type, reason, toMinistry, toSection, toTier } = req.body;
    if (!nidNumber || !type || !reason || !toMinistry || !toSection) {
      return res.status(400).json({ message: 'nidNumber, type, reason, toMinistry, toSection required' });
    }
    if (String(reason).trim().length < 50) {
      return res.status(400).json({ message: 'Emergency reason must be at least 50 characters' });
    }

    const officer = await Officer.findOne({ nidNumber });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    const count = await EmergencyTransfer.countDocuments();
    const orderNumber = `EMRG-2082-${String(count + 1).padStart(3, '0')}`;

    const emergency = await EmergencyTransfer.create({
      orderNumber,
      officerId: officer._id,
      nidNumber: officer.nidNumber,
      employeeId: officer.employeeId,
      officerName: officer.nameEnglish,
      type,
      reason: String(reason).trim(),
      fromMinistry: officer.currentMinistry,
      fromSection: officer.currentSection,
      toMinistry,
      toSection,
      toTier: toTier || 'A',
      requestedBy: req.user.id,
      requestedByName: req.user.fullName,
      status: 'submitted'
    });

    try {
      await AuditEntry.append({
        action: 'order.draft',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'EmergencyTransfer',
        subjectId: emergency._id,
        subjectRef: orderNumber,
        summary: `Emergency transfer proposed: ${officer.nameEnglish} (${type})`,
        metadata: { type, from: officer.currentMinistry, to: toMinistry }
      });
    } catch {}

    return res.status(201).json(emergency);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/anti-gaming/emergency/:id/approve — Chief Secretary (PSC admin) approves
router.post('/emergency/:id/approve', auth, requireChiefSecretary, async (req, res) => {
  try {
    const { notes } = req.body;
    const emergency = await EmergencyTransfer.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Not found' });
    if (emergency.status !== 'submitted') return res.status(409).json({ message: `Already ${emergency.status}` });

    const now = new Date();
    const mustPublish = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    emergency.chiefSecretaryApprovalBy = req.user.id;
    emergency.chiefSecretaryApprovalName = req.user.fullName;
    emergency.chiefSecretaryApprovalAt = now;
    emergency.chiefSecretaryNotes = notes || '';
    emergency.mustPublishBy = mustPublish;
    emergency.status = 'approved';
    await emergency.save();

    try {
      await AuditEntry.append({
        action: 'order.override',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'EmergencyTransfer',
        subjectId: emergency._id,
        subjectRef: emergency.orderNumber,
        summary: `Chief Secretary ${req.user.fullName} approved emergency transfer ${emergency.orderNumber}`,
        metadata: { notes, mustPublishBy: mustPublish }
      });
    } catch {}

    return res.json(emergency);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/anti-gaming/emergency/:id/reject
router.post('/emergency/:id/reject', auth, requireChiefSecretary, async (req, res) => {
  try {
    const { notes } = req.body;
    const emergency = await EmergencyTransfer.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Not found' });
    emergency.status = 'rejected';
    emergency.chiefSecretaryApprovalBy = req.user.id;
    emergency.chiefSecretaryApprovalName = req.user.fullName;
    emergency.chiefSecretaryApprovalAt = new Date();
    emergency.chiefSecretaryNotes = notes || '';
    await emergency.save();
    return res.json(emergency);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/anti-gaming/emergency/:id/publish — MoFAGA publishes + applies to officer
router.post('/emergency/:id/publish', auth, requireMofaga, async (req, res) => {
  try {
    const emergency = await EmergencyTransfer.findById(req.params.id);
    if (!emergency) return res.status(404).json({ message: 'Not found' });
    if (emergency.status !== 'approved') return res.status(409).json({ message: `Must be approved first (is ${emergency.status})` });

    if (emergency.mustPublishBy && new Date() > emergency.mustPublishBy) {
      emergency.status = 'expired';
      await emergency.save();
      return res.status(410).json({ message: 'Approval expired (24-hr window elapsed). Re-request.' });
    }

    const now = new Date();
    const payload = `${emergency.orderNumber}|${emergency.nidNumber}|${emergency.toMinistry}|${emergency.toSection}|${now.toISOString()}`;
    emergency.dscSignature = crypto.createHash('sha256').update(payload).digest('hex');
    emergency.publishedAt = now;
    emergency.status = 'published';
    await emergency.save();

    // Apply to officer immediately
    const officer = await Officer.findById(emergency.officerId);
    if (officer) {
      officer.postingHistory.forEach((p) => { if (!p.endDate) p.endDate = now; });
      officer.postingHistory.push({
        ministry: emergency.toMinistry,
        sectionName: emergency.toSection,
        districtTier: emergency.toTier,
        startDate: now
      });
      officer.currentMinistry = emergency.toMinistry;
      officer.currentSection = emergency.toSection;
      officer.currentDistrictTier = emergency.toTier;
      officer.tenureStartDate = now;
      await officer.save();
      emergency.status = 'applied';
      await emergency.save();
    }

    try {
      await AuditEntry.append({
        action: 'order.issue',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'EmergencyTransfer',
        subjectId: emergency._id,
        subjectRef: emergency.orderNumber,
        summary: `Emergency transfer ${emergency.orderNumber} issued and applied to HRMIS`,
        metadata: { dscSignature: emergency.dscSignature }
      });
    } catch {}

    return res.json(emergency);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/anti-gaming/emergency — list
router.get(
  '/emergency',
  auth,
  requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor'),
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const list = await EmergencyTransfer.find(filter).sort({ createdAt: -1 }).lean();
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// ANNUAL TRANSPARENCY REPORT
// ═══════════════════════════════════════════════════════════════════

// GET /api/anti-gaming/annual-report?year=2082
// Returns a JSON report the client can render as a printable/downloadable document.
router.get('/annual-report', async (req, res) => {
  try {
    const year = req.query.year || '2082';

    // Window activity
    const windows = await TransferWindow.find({ fiscalYear: { $regex: year } }).lean();

    const [orders, overrides, appeals, emergencies, exemptions, grievances, chainStatus] = await Promise.all([
      TransferOrder.countDocuments({ windowId: { $in: windows.map((w) => w._id) } }),
      TransferOrder.countDocuments({ windowId: { $in: windows.map((w) => w._id) }, overridden: true }),
      TransferOrder.countDocuments({ windowId: { $in: windows.map((w) => w._id) }, appealFiled: true }),
      EmergencyTransfer.countDocuments({ createdAt: { $gte: new Date(`${parseInt(year) - 57}-01-01`) } }),
      Exemption.countDocuments({}),
      Grievance.countDocuments({}),
      AuditEntry.verifyChain()
    ]);

    const [officerByMinistry, officerByTier, grievanceResolved] = await Promise.all([
      Officer.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$currentMinistry', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Officer.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$currentDistrictTier', count: { $sum: 1 } } }
      ]),
      Grievance.countDocuments({ status: 'resolved' })
    ]);

    const overridePercent = orders > 0 ? ((overrides / orders) * 100).toFixed(1) : '0.0';
    const grievanceResolutionPercent = grievances > 0 ? ((grievanceResolved / grievances) * 100).toFixed(1) : 'N/A';

    return res.json({
      year,
      generatedAt: new Date(),
      windowsOpened: windows.length,
      summary: {
        totalTransferOrders: orders,
        totalOverrides: overrides,
        overridePercent: `${overridePercent}%`,
        totalAppeals: appeals,
        totalEmergencies: emergencies,
        totalExemptions: exemptions,
        totalGrievances: grievances,
        grievanceResolutionPercent: grievanceResolutionPercent === 'N/A' ? 'N/A' : `${grievanceResolutionPercent}%`
      },
      integrity: {
        chainIntact: chainStatus.intact,
        auditEntries: chainStatus.count || 0,
        brokenAt: chainStatus.brokenAt || null
      },
      workforceDistribution: {
        byMinistry: officerByMinistry.map((x) => ({ ministry: x._id, count: x.count })),
        byTier: officerByTier.map((x) => ({ tier: x._id, count: x.count }))
      },
      windows: windows.map((w) => ({
        name: w.name,
        state: w.state,
        draftCount: w.draftCount,
        appealsReceived: w.appealsReceived,
        ordersIssued: w.ordersIssued
      }))
    });
  } catch (err) {
    console.error('annual-report error:', err);
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

module.exports = router;
