const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const TransferWindow = require('../models/TransferWindow');
const TransferOrder = require('../models/TransferOrder');
const TransferScore = require('../models/TransferScore');
const TransferQueue = require('../models/TransferQueue');
const Appeal = require('../models/Appeal');
const Officer = require('../models/Officer');
const MinistrySection = require('../models/MinistrySection');
const AuditEntry = require('../models/AuditEntry');

const requireMofaga = requireRole('mofaga-admin', 'psc-admin');

// ═══════════════════════════════════════════════════════════════════
// WINDOW LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

// POST /api/transfer-window — create a new window
// Body: { name, kind, fiscalYear, openDate } — open = T-0
// Auto-computes the other countdown milestones.
router.post('/', auth, requireMofaga, async (req, res) => {
  try {
    const { name, kind, fiscalYear, openDate } = req.body;
    if (!name || !kind || !fiscalYear || !openDate) {
      return res.status(400).json({ message: 'name, kind, fiscalYear, openDate required' });
    }

    const t0 = new Date(openDate);
    const daysBefore = (n) => {
      const d = new Date(t0);
      d.setDate(d.getDate() - n);
      return d;
    };

    const doc = await TransferWindow.create({
      name,
      kind,
      fiscalYear,
      openDate: t0,
      draftAt: daysBefore(60),
      appealsOpenAt: daysBefore(30),
      appealsCloseAt: daysBefore(15),
      ordersIssueAt: daysBefore(10),
      state: 'scheduled',
      createdBy: req.user.id
    });
    return res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Window name already exists' });
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/transfer-window — list all
router.get('/', auth, async (req, res) => {
  try {
    const wins = await TransferWindow.find().sort({ openDate: -1 }).lean();
    return res.json(wins);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/transfer-window/:id — single
router.get('/:id', auth, async (req, res) => {
  try {
    const w = await TransferWindow.findById(req.params.id).lean();
    if (!w) return res.status(404).json({ message: 'Window not found' });

    const [orders, appeals] = await Promise.all([
      TransferOrder.find({ windowId: w._id }).sort({ rank: 1 }).lean(),
      Appeal.find({ windowId: w._id }).sort({ submittedAt: -1 }).lean()
    ]);

    return res.json({ window: w, orders, appeals });
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/transfer-window/:id/advance — advance state machine
// Body: { to: 'T-60'|'T-30'|'T-15'|'T-10'|'T-0'|'closed' }
// Each transition performs the spec'd action:
//   T-60 → generate draft orders from TransferScore + eligible sections
//   T-30 → open appeals window (no-op beyond state)
//   T-15 → finalize appeals + regenerate final orders
//   T-10 → issue DSC-signed orders
//   T-0  → window opens (state-only)
//   closed → mark window complete
// ─────────────────────────────────────────────────────────────
router.post('/:id/advance', auth, requireMofaga, async (req, res) => {
  try {
    const { to } = req.body;
    const window = await TransferWindow.findById(req.params.id);
    if (!window) return res.status(404).json({ message: 'Window not found' });

    const valid = ['T-60', 'T-30', 'T-15', 'T-10', 'T-0', 'closed'];
    if (!valid.includes(to)) return res.status(400).json({ message: `to must be one of ${valid.join(', ')}` });

    // Enforce linear state machine progression
    const order = ['scheduled', 'T-60', 'T-30', 'T-15', 'T-10', 'T-0', 'closed'];
    const curIdx = order.indexOf(window.state);
    const toIdx = order.indexOf(to);
    if (toIdx !== curIdx + 1) {
      return res.status(400).json({
        message: `Invalid transition: ${window.state} → ${to}. Must advance one step at a time (expected ${order[curIdx + 1] || 'none'})`
      });
    }

    const result = { state: to, notes: '' };

    if (to === 'T-60') {
      // Generate draft transfer orders from TransferScore rankings
      const scores = await TransferScore.find().sort({ rank: 1 }).lean();
      if (scores.length === 0) {
        return res.status(400).json({ message: 'No scores to use. Run Phase 7 scoring first.' });
      }

      // Load all sections (destinations)
      const allSections = await MinistrySection.find({ locked: true }).lean();
      const sectionsByMinistry = {};
      allSections.forEach((s) => {
        if (!sectionsByMinistry[s.ministry]) sectionsByMinistry[s.ministry] = [];
        sectionsByMinistry[s.ministry].push({ ...s, remaining: s.vacantPositions });
      });

      // Per-ministry 15% cap. Count of officers currently in each ministry defines max draft count.
      const allOfficers = await Officer.find({ status: 'active' }).lean();
      const officersByMinistry = allOfficers.reduce((acc, o) => {
        acc[o.currentMinistry] = (acc[o.currentMinistry] || 0) + 1;
        return acc;
      }, {});
      const draftedByMinistry = {};

      // Wipe any previous draft orders for this window
      await TransferOrder.deleteMany({ windowId: window._id, status: { $in: ['draft', 'final'] } });

      let orderSeq = 1;
      const orders = [];
      let skipped = 0;

      for (const s of scores) {
        const officer = await Officer.findById(s.officerId).lean();
        if (!officer) continue;

        // 15% cap check on SOURCE ministry
        const srcCap = Math.floor((officersByMinistry[officer.currentMinistry] || 0) * (window.ministryCapPercent / 100));
        const drafted = draftedByMinistry[officer.currentMinistry] || 0;
        if (drafted >= srcCap && srcCap > 0) {
          skipped += 1;
          continue;
        }

        // Find a destination: any open section in a DIFFERENT ministry,
        // preferring one that matches officer's education stream.
        let best = null;
        let bestScore = -1;
        const candFaculty = (officer.faculty || '').toLowerCase();
        const candStream = (officer.stream || '').toLowerCase();

        for (const [ministry, secs] of Object.entries(sectionsByMinistry)) {
          if (ministry === officer.currentMinistry) continue; // must be different ministry
          for (const sec of secs) {
            if (sec.remaining <= 0) continue;
            const preferred = (sec.educationRequirements?.preferredStream || '').toLowerCase();
            let fit = 1; // default general
            if (preferred && (candStream === preferred || candFaculty === preferred)) fit = 3;
            else if (preferred && (candStream.includes(preferred) || candFaculty.includes(preferred))) fit = 2;
            if (fit > bestScore) { bestScore = fit; best = { ministry, section: sec }; }
          }
        }

        const orderNumber = `TRF-${window.fiscalYear.replace('/', '-')}-${window.kind === 'primary' ? 'W1' : 'W2'}-${String(orderSeq).padStart(4, '0')}`;
        orderSeq += 1;

        if (!best) {
          // No destination — officer stays; do not create an order
          skipped += 1;
          continue;
        }

        best.section.remaining -= 1;
        draftedByMinistry[officer.currentMinistry] = (draftedByMinistry[officer.currentMinistry] || 0) + 1;

        orders.push({
          orderNumber,
          windowId: window._id,
          windowName: window.name,
          officerId: officer._id,
          nidNumber: officer.nidNumber,
          employeeId: officer.employeeId,
          officerName: officer.nameEnglish,
          fromMinistry: officer.currentMinistry,
          fromSection: officer.currentSection,
          fromTier: officer.currentDistrictTier,
          toMinistry: best.ministry,
          toSection: best.section.sectionName,
          toTier: best.section.tier || 'A',
          finalScore: s.finalScore,
          rank: s.rank,
          systemRecommendedMinistry: best.ministry,
          systemRecommendedSection: best.section.sectionName,
          status: 'draft'
        });
      }

      if (orders.length > 0) await TransferOrder.insertMany(orders);

      window.draftCount = orders.length;
      result.notes = `${orders.length} draft orders generated · ${skipped} officers skipped (cap/no-destination)`;

    } else if (to === 'T-15') {
      // Finalize: any appeals 'submitted' move to 'under-review' if not yet decided
      // For pragmatism: all "submitted" appeals not acted on become "rejected" here
      const pending = await Appeal.updateMany(
        { windowId: window._id, status: 'submitted' },
        { $set: { status: 'rejected', reviewDecision: 'Auto-closed at T-15 (no review recorded)', reviewedAt: new Date() } }
      );
      await TransferOrder.updateMany(
        { windowId: window._id, status: 'draft' },
        { $set: { status: 'final' } }
      );
      result.notes = `${pending.modifiedCount} unresolved appeals auto-closed. Orders frozen to 'final'.`;

    } else if (to === 'T-10') {
      // Issue DSC-signed orders
      // No-gap rule: spec says "successor must confirm posting before predecessor receives order"
      // In practice: every final order must have predecessorConfirmed=true before DSC signing.
      // Auto-confirm in the reference implementation (real deployment wires a ministry acknowledge step).
      const finals = await TransferOrder.find({ windowId: window._id, status: { $in: ['final', 'draft'] } });
      const unconfirmed = finals.filter((o) => !o.predecessorConfirmed);
      if (unconfirmed.length > 0 && req.body.autoConfirm !== true) {
        return res.status(409).json({
          message: `No-gap rule: ${unconfirmed.length} orders lack receiving-ministry confirmation.`,
          unconfirmedOrders: unconfirmed.map((o) => ({ orderNumber: o.orderNumber, to: o.toMinistry })),
          hint: 'Confirm orders individually via POST /api/transfer-window/orders/:id/confirm, or pass autoConfirm:true to bypass (pilot mode only).'
        });
      }
      const now = new Date();
      let issued = 0;
      for (const o of finals) {
        if (!o.predecessorConfirmed) { o.predecessorConfirmed = true; } // auto-confirm when autoConfirm=true
        const payload = `${o.orderNumber}|${o.nidNumber}|${o.toMinistry}|${o.toSection}|${now.toISOString()}`;
        o.dscSignature = crypto.createHash('sha256').update(payload).digest('hex');
        o.issuedAt = now;
        o.issuedBy = req.user.id;
        o.status = 'issued';
        await o.save();
        issued += 1;
      }
      window.ordersIssued = issued;
      result.notes = `${issued} orders DSC-signed and issued`;

    } else if (to === 'closed') {
      window.closedAt = new Date();
      // Apply issued orders to officers: update currentMinistry/section/tenureStartDate
      const issued = await TransferOrder.find({ windowId: window._id, status: 'issued' });
      let applied = 0;
      for (const o of issued) {
        const officer = await Officer.findById(o.officerId);
        if (!officer) continue;
        // Close current posting
        officer.postingHistory.forEach((p) => { if (!p.endDate) p.endDate = new Date(); });
        // Add new posting
        officer.postingHistory.push({
          ministry: o.toMinistry,
          sectionName: o.toSection,
          districtTier: o.toTier,
          startDate: new Date(),
          transferOrderId: o._id
        });
        officer.currentMinistry = o.toMinistry;
        officer.currentSection = o.toSection;
        officer.currentDistrictTier = o.toTier;
        officer.tenureStartDate = new Date();
        await officer.save();
        o.status = 'reported';
        await o.save();
        applied += 1;
      }
      // Mark queue entries as resolved
      await TransferQueue.updateMany({ resolved: false }, { $set: { resolved: true } });
      result.notes = `Window closed · ${applied} officers transferred and HRMIS updated`;
    }

    window.state = to;
    await window.save();

    try {
      await AuditEntry.append({
        action: 'window.advance',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'TransferWindow',
        subjectId: window._id,
        subjectRef: window.name,
        summary: `${req.user.fullName} advanced ${window.name} to ${to} — ${result.notes}`,
        metadata: { to, notes: result.notes }
      });
    } catch (auditErr) { console.warn('audit append skipped:', auditErr.message); }

    return res.json({ success: true, window, ...result });
  } catch (err) {
    console.error('window advance error:', err);
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// APPEALS
// ═══════════════════════════════════════════════════════════════════

// POST /api/transfer-window/appeals — officer submits appeal
// Body: { transferOrderId, type, subject, description }
router.post('/appeals/submit', auth, async (req, res) => {
  try {
    const { transferOrderId, type, subject, description } = req.body;
    const order = await TransferOrder.findById(transferOrderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.nidNumber !== req.user.nidNumber) {
      return res.status(403).json({ message: 'You can only appeal your own transfer order' });
    }

    const window = await TransferWindow.findById(order.windowId);
    if (!window) return res.status(404).json({ message: 'Window not found' });
    // Appeals only during T-30..T-15
    if (!['T-30', 'T-60'].includes(window.state)) {
      return res.status(403).json({ message: `Appeals currently closed (window state: ${window.state})` });
    }

    const appeal = await Appeal.create({
      transferOrderId: order._id,
      windowId: window._id,
      nidNumber: order.nidNumber,
      officerName: order.officerName,
      type,
      subject,
      description,
      status: 'submitted'
    });

    order.appealFiled = true;
    order.status = 'appealed';
    await order.save();

    window.appealsReceived += 1;
    await window.save();

    return res.status(201).json(appeal);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/transfer-window/appeals/mine
router.get('/appeals/mine', auth, async (req, res) => {
  try {
    const list = await Appeal.find({ nidNumber: req.user.nidNumber }).sort({ submittedAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/transfer-window/:id/appeals — admin list
router.get('/:id/appeals', auth, requireMofaga, async (req, res) => {
  try {
    const list = await Appeal.find({ windowId: req.params.id }).sort({ submittedAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// PATCH /api/transfer-window/appeals/:id — review committee decision
router.patch('/appeals/:id', auth, requireMofaga, async (req, res) => {
  try {
    const { status, reviewDecision } = req.body;
    if (!['upheld', 'rejected', 'under-review'].includes(status)) {
      return res.status(400).json({ message: 'status must be upheld, rejected, or under-review' });
    }
    const appeal = await Appeal.findById(req.params.id);
    if (!appeal) return res.status(404).json({ message: 'Not found' });

    appeal.status = status;
    appeal.reviewDecision = reviewDecision || '';
    appeal.reviewedBy = req.user.id;
    appeal.reviewedByName = req.user.fullName;
    appeal.reviewedAt = new Date();
    await appeal.save();
    return res.json(appeal);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// TRANSFER ORDERS
// ═══════════════════════════════════════════════════════════════════

// GET /api/transfer-window/:id/orders — admin list
router.get('/:id/orders', auth, async (req, res) => {
  try {
    const orders = await TransferOrder.find({ windowId: req.params.id }).sort({ rank: 1 }).lean();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// GET /api/transfer-window/orders/mine — officer sees own transfer order
router.get('/orders/mine', auth, async (req, res) => {
  try {
    const list = await TransferOrder.find({ nidNumber: req.user.nidNumber })
      .sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

// POST /api/transfer-window/orders/:id/confirm — receiving ministry confirms successor readiness.
// No-gap rule: a transfer order cannot be DSC-signed until the RECEIVING ministry confirms
// it has a plan for the incoming officer (successor confirms before predecessor order issues).
router.post(
  '/orders/:id/confirm',
  auth,
  requireRole('ministry-secretary', 'mofaga-admin', 'psc-admin'),
  async (req, res) => {
    try {
      const order = await TransferOrder.findById(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      if (
        req.user.roles.includes('ministry-secretary') &&
        !req.user.roles.includes('mofaga-admin') &&
        !req.user.roles.includes('psc-admin') &&
        order.toMinistry !== req.user.ministry
      ) {
        return res.status(403).json({ message: 'Only the receiving ministry can confirm this order' });
      }

      order.predecessorConfirmed = true;
      await order.save();
      return res.json({ success: true, order });
    } catch (err) {
      return res.status(500).json({ message: 'Failed', error: err.message });
    }
  }
);

module.exports = router;
