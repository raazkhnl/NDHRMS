const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const AuditEntry = require('../models/AuditEntry');
const CiaaAlert = require('../models/CiaaAlert');
const TransferOrder = require('../models/TransferOrder');
const TransferWindow = require('../models/TransferWindow');
const Officer = require('../models/Officer');
const MinistrySection = require('../models/MinistrySection');

const requireMofaga = requireRole('mofaga-admin', 'psc-admin');
const requireWatchdog = requireRole('mofaga-admin', 'psc-admin', 'ciaa-auditor', 'oag-auditor');

const OVERRIDE_JUSTIFICATION_MIN = 100;
const OVERRIDE_ALERT_THRESHOLD = 3;

// ═══════════════════════════════════════════════════════════════════
// OVERRIDE WORKFLOW
// ═══════════════════════════════════════════════════════════════════

// POST /api/audit/override/:orderId — Secretary proposes an override
// Body: { newMinistry, newSection, justification }
//   - justification MUST be >= 100 chars
//   - Needs countersign by MoFAGA admin to take effect
router.post('/override/:orderId', auth, requireRole('ministry-secretary', 'mofaga-admin', 'psc-admin'), async (req, res) => {
  try {
    const { newMinistry, newSection, newSectionId, justification } = req.body;

    if (!newMinistry || !newSection || !justification) {
      return res.status(400).json({ message: 'newMinistry, newSection, and justification required' });
    }
    if (String(justification).trim().length < OVERRIDE_JUSTIFICATION_MIN) {
      return res.status(400).json({
        message: `Justification must be at least ${OVERRIDE_JUSTIFICATION_MIN} characters`
      });
    }

    const order = await TransferOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (['issued', 'reported', 'withdrawn'].includes(order.status)) {
      return res.status(409).json({ message: `Cannot override order in status: ${order.status}` });
    }
    if (order.overridden) {
      return res.status(409).json({ message: 'Order already has a pending override' });
    }

    // Ministry secretary can only override orders going TO their own ministry
    if (
      req.user.roles.includes('ministry-secretary') &&
      !req.user.roles.includes('mofaga-admin') &&
      !req.user.roles.includes('psc-admin') &&
      order.toMinistry !== req.user.ministry
    ) {
      return res.status(403).json({ message: 'You can only override orders to your ministry' });
    }

    // Snapshot the system recommendation if not already captured
    if (!order.systemRecommendedMinistry) {
      order.systemRecommendedMinistry = order.toMinistry;
      order.systemRecommendedSection = order.toSection;
    }

    order.overridden = true;
    order.overrideJustification = String(justification).trim();
    order.overrideSecretaryId = req.user.id;
    order.overrideSecretaryName = req.user.fullName;
    order.toMinistry = newMinistry;
    order.toSection = newSection;
    await order.save();

    await AuditEntry.append({
      action: 'order.override',
      actorId: req.user.id,
      actorName: req.user.fullName,
      actorRole: (req.user.roles || []).join(','),
      subjectType: 'TransferOrder',
      subjectId: order._id,
      subjectRef: order.orderNumber,
      summary: `${req.user.fullName} overrode ${order.orderNumber}: ${order.systemRecommendedMinistry}→${newMinistry}`,
      metadata: {
        from: { ministry: order.systemRecommendedMinistry, section: order.systemRecommendedSection },
        to: { ministry: newMinistry, section: newSection },
        justification: String(justification).trim(),
        countersigned: false
      }
    });

    // Check alert threshold
    await checkOverrideThreshold(order.windowId);

    return res.json({ success: true, order });
  } catch (err) {
    console.error('override error:', err);
    return res.status(500).json({ message: 'Override failed', error: err.message });
  }
});

// POST /api/audit/override/:orderId/countersign — MoFAGA approves the override
router.post('/override/:orderId/countersign', auth, requireRole('mofaga-admin', 'psc-admin'), async (req, res) => {
  try {
    const order = await TransferOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.overridden) return res.status(400).json({ message: 'Order has no pending override' });
    if (order.overrideCountersignedAt) return res.status(409).json({ message: 'Already countersigned' });

    order.overrideCountersignedBy = req.user.id;
    order.overrideCountersignedByName = req.user.fullName;
    order.overrideCountersignedAt = new Date();
    await order.save();

    await AuditEntry.append({
      action: 'order.override',
      actorId: req.user.id,
      actorName: req.user.fullName,
      actorRole: (req.user.roles || []).join(','),
      subjectType: 'TransferOrder',
      subjectId: order._id,
      subjectRef: order.orderNumber,
      summary: `Override countersigned by ${req.user.fullName}`,
      metadata: { countersigned: true }
    });

    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOG ACCESS
// ═══════════════════════════════════════════════════════════════════

// GET /api/audit/log — paginated audit log (watchdog read-only)
router.get('/log', auth, requireWatchdog, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const skip = parseInt(req.query.skip || '0', 10);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actorId) filter.actorId = req.query.actorId;

    const [entries, total] = await Promise.all([
      AuditEntry.find(filter).sort({ sequence: -1 }).skip(skip).limit(limit).lean(),
      AuditEntry.countDocuments(filter)
    ]);
    return res.json({ entries, total, limit, skip });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/audit/verify — cryptographic verification of the entire chain
router.get('/verify', auth, requireWatchdog, async (req, res) => {
  try {
    const result = await AuditEntry.verifyChain();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/audit/stats — counts by action type
router.get('/stats', auth, requireWatchdog, async (req, res) => {
  try {
    const byAction = await AuditEntry.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const total = await AuditEntry.countDocuments();
    return res.json({
      total,
      byAction: byAction.map((x) => ({ action: x._id, count: x.count }))
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CIAA ALERTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/audit/alerts — watchdog portal list
router.get('/alerts', auth, requireWatchdog, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const list = await CiaaAlert.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// PATCH /api/audit/alerts/:id — CIAA acknowledges / investigates / closes
router.patch('/alerts/:id', auth, requireRole('ciaa-auditor', 'oag-auditor', 'mofaga-admin', 'psc-admin'), async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    if (!['acknowledged', 'investigating', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'status must be acknowledged, investigating, or closed' });
    }
    const alert = await CiaaAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Not found' });

    alert.status = status;
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedByName = req.user.fullName;
    alert.acknowledgedAt = new Date();
    if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    await alert.save();

    return res.json(alert);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC TRANSPARENCY DASHBOARD (anonymized aggregates)
// ═══════════════════════════════════════════════════════════════════

// GET /api/audit/public/dashboard — no auth required
router.get('/public/dashboard', async (req, res) => {
  try {
    const [windows, orderStats, overrideCount, appealCount, overrides] = await Promise.all([
      TransferWindow.find().sort({ openDate: -1 }).limit(5).lean(),
      TransferOrder.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      TransferOrder.countDocuments({ overridden: true }),
      TransferOrder.countDocuments({ appealFiled: true }),
      // Per spec: "Full justification text appears on public dashboard alongside the transfer record"
      TransferOrder.find({ overridden: true })
        .select('orderNumber officerName fromMinistry toMinistry systemRecommendedMinistry systemRecommendedSection overrideJustification overrideSecretaryName overrideCountersignedByName overrideCountersignedAt createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    const chainStatus = await AuditEntry.verifyChain();
    const alertCount = await CiaaAlert.countDocuments({ status: 'open' });

    return res.json({
      windows: windows.map((w) => ({
        name: w.name,
        kind: w.kind,
        state: w.state,
        draftCount: w.draftCount,
        appealsReceived: w.appealsReceived,
        ordersIssued: w.ordersIssued,
        openDate: w.openDate,
        closedAt: w.closedAt
      })),
      orderStats: orderStats.map((x) => ({ status: x._id, count: x.count })),
      integrity: {
        chainIntact: chainStatus.intact,
        chainLength: chainStatus.count || 0,
        brokenAt: chainStatus.brokenAt || null
      },
      integrityMetrics: {
        totalOverrides: overrideCount,
        totalAppeals: appealCount,
        openAlerts: alertCount
      },
      // Published justifications — every override is publicly visible with full text
      overrides: overrides.map((o) => ({
        orderNumber: o.orderNumber,
        officerName: o.officerName,
        from: `${o.fromMinistry}`,
        systemRecommended: `${o.systemRecommendedMinistry} / ${o.systemRecommendedSection}`,
        overriddenTo: `${o.toMinistry}`,
        justification: o.overrideJustification,
        proposedBy: o.overrideSecretaryName,
        countersignedBy: o.overrideCountersignedByName || null,
        countersignedAt: o.overrideCountersignedAt,
        date: o.createdAt
      }))
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Internal helper — auto-fire alert when override count >= threshold
// ═══════════════════════════════════════════════════════════════════
async function checkOverrideThreshold(windowId) {
  if (!windowId) return;
  const count = await TransferOrder.countDocuments({ windowId, overridden: true });
  if (count < OVERRIDE_ALERT_THRESHOLD) return;

  const existing = await CiaaAlert.findOne({
    windowId,
    type: 'override-threshold',
    status: { $in: ['open', 'acknowledged', 'investigating'] }
  });
  if (existing) {
    existing.triggerCount = count;
    await existing.save();
    return;
  }

  const window = await TransferWindow.findById(windowId).lean();

  await CiaaAlert.create({
    type: 'override-threshold',
    severity: count >= 5 ? 'critical' : 'warning',
    windowId,
    windowName: window?.name || '',
    triggerCount: count,
    threshold: OVERRIDE_ALERT_THRESHOLD,
    title: `Override threshold exceeded in ${window?.name || 'window'}`,
    description: `${count} transfer orders have been overridden by ministry secretaries. Review these overrides for patterns of favoritism or political interference.`,
    evidence: { windowId, overrideCount: count }
  });

  await AuditEntry.append({
    action: 'order.override',
    actorName: 'SYSTEM',
    actorRole: 'system',
    subjectType: 'TransferWindow',
    subjectId: windowId,
    subjectRef: window?.name || '',
    summary: `CIAA alert triggered — ${count} overrides exceed threshold of ${OVERRIDE_ALERT_THRESHOLD}`,
    metadata: { alertType: 'override-threshold' }
  });
}

module.exports = router;
module.exports.appendAudit = (payload) => AuditEntry.append(payload);
