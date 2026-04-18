const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const Result = require('../models/Result');
const Priority = require('../models/Priority');
const MinistrySection = require('../models/MinistrySection');
const PlacementOrder = require('../models/PlacementOrder');
const ExamRegister = require('../models/ExamRegister');
const NID = require('../models/NID');
const Post = require('../models/Post');

const QUAL_HIERARCHY = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];

const requirePscAdmin = requireRole('psc-admin');

// ─────────────────────────────────────────────────────────────
// Education match scoring (Flowchart A3)
//
// Match type : Score  : Condition
// exact      :   3    : Section preferredStream & specialization match candidate's stream
//                       AND candidate's degree meets or exceeds section min
// stream     :   2    : Section preferredStream loosely matches candidate's faculty/stream
//                       (substring/token overlap) AND degree meets min
// general    :   1    : Candidate's degree meets section's min — no stream-level match
// no-match   :   0    : Candidate's degree does NOT meet section's min
// ─────────────────────────────────────────────────────────────
function scoreEducationMatch(section, candidate) {
  const cand = {
    qual: candidate.maximumQualification || '',
    faculty: (candidate.faculty || '').toLowerCase().trim(),
    stream: (candidate.stream || '').toLowerCase().trim()
  };
  const sec = {
    minDegree: section.educationRequirements?.degreeLevel || '',
    preferredStream: (section.educationRequirements?.preferredStream || '').toLowerCase().trim(),
    preferredSpec: (section.educationRequirements?.preferredSpecialization || '').toLowerCase().trim()
  };

  const candIdx = QUAL_HIERARCHY.indexOf(cand.qual);
  const minIdx = QUAL_HIERARCHY.indexOf(sec.minDegree);

  if (candIdx === -1 || minIdx === -1) return 0;
  if (candIdx < minIdx) return 0; // does not meet minimum

  // Exact match: stream matches AND (specialization matches OR specialization not specified)
  if (sec.preferredStream && cand.stream === sec.preferredStream) {
    if (!sec.preferredSpec || cand.stream.includes(sec.preferredSpec) || cand.faculty.includes(sec.preferredSpec)) {
      return 3; // exact
    }
    return 2; // stream match (exact stream, spec differs)
  }

  // Stream match: loose overlap between section stream and candidate faculty/stream
  if (sec.preferredStream) {
    const tokens = sec.preferredStream.split(/[\s,&/]+/).filter((t) => t.length >= 3);
    const hitFaculty = tokens.some((t) => cand.faculty.includes(t));
    const hitStream = tokens.some((t) => cand.stream.includes(t));
    if (hitFaculty || hitStream) return 2; // stream match
  }

  // Candidate meets min degree but no stream match
  return 1; // general
}

function describeMatch(score) {
  if (score === 3) return 'exact';
  if (score === 2) return 'stream';
  if (score === 1) return 'general';
  return 'unplaced';
}

// ─────────────────────────────────────────────────────────────
// POST /api/placement/run — PSC admin triggers the placement algorithm
// ─────────────────────────────────────────────────────────────
router.post('/run', auth, requirePscAdmin, async (req, res) => {
  try {
    // 1. Load ranked merit list: all PASSED candidates whose results are published, sorted by
    //    totalScore DESC (global merit order per spec "Sorted by PSC exam score, Rank 1 first").
    //    Tiebreaker: per-post rank ascending.
    const passed = await Result.find({ status: 'pass', published: true })
      .sort({ totalScore: -1, rank: 1 }).lean();
    if (passed.length === 0) {
      return res.status(400).json({ message: 'No passed candidates to place. Publish merit lists first.' });
    }

    // 2. Clear any unpublished placement orders from previous runs (published orders are preserved)
    await PlacementOrder.deleteMany({ published: false });

    // 3. Load all sections (locked only). Track remaining seats in-memory.
    const sectionsRaw = await MinistrySection.find({ locked: true }).lean();
    const sections = sectionsRaw.map((s) => ({ ...s, remaining: s.vacantPositions }));

    // Group sections by ministry for fast lookup
    const sectionsByMinistry = {};
    for (const s of sections) {
      if (!sectionsByMinistry[s.ministry]) sectionsByMinistry[s.ministry] = [];
      sectionsByMinistry[s.ministry].push(s);
    }

    // 4. Load candidate education (ExamRegister) and NID data in bulk
    const nidList = passed.map((p) => p.nidNumber);
    const [examRegs, nids] = await Promise.all([
      ExamRegister.find({ nidNumber: { $in: nidList } }).lean(),
      NID.find({ nidNumber: { $in: nidList } }).lean()
    ]);
    const examByNid = new Map(examRegs.map((e) => [e.nidNumber, e]));
    const nidMap = new Map(nids.map((n) => [n.nidNumber, n]));

    // 5. Load priorities
    const priorities = await Priority.find({ nidNumber: { $in: nidList } }).lean();
    const priorityByNid = new Map(priorities.map((p) => [p.nidNumber, p]));

    // 6. Process rank-by-rank
    const log = [];
    const orders = [];
    let orderSeq = 1;
    const runTimestamp = new Date();

    for (const result of passed) {
      const exam = examByNid.get(result.nidNumber) || {};
      const nid = nidMap.get(result.nidNumber) || {};
      const priorityList = priorityByNid.get(result.nidNumber)?.priorities || [];

      const candidate = {
        nidNumber: result.nidNumber,
        maximumQualification: exam.maximumQualification,
        faculty: exam.faculty,
        stream: exam.stream,
        name: nid.nameEnglish || ''
      };

      let assignedSection = null;
      let matchScore = 0;
      let priorityUsed = null;
      let matchType = 'unplaced';

      // Try priorities 1 → 2 → 3
      for (let i = 0; i < priorityList.length && !assignedSection; i++) {
        const ministryName = priorityList[i];
        const openSections = (sectionsByMinistry[ministryName] || []).filter((s) => s.remaining > 0);
        if (openSections.length === 0) continue;

        // Score all open sections in this ministry
        const scored = openSections
          .map((s) => ({ section: s, score: scoreEducationMatch(s, candidate) }))
          .filter((x) => x.score >= 1)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          assignedSection = scored[0].section;
          matchScore = scored[0].score;
          priorityUsed = i + 1;
          matchType = describeMatch(matchScore);
          assignedSection.remaining -= 1;
        }
      }

      // National fallback: any open section anywhere
      if (!assignedSection) {
        const allOpen = sections.filter((s) => s.remaining > 0);
        const scored = allOpen
          .map((s) => ({ section: s, score: scoreEducationMatch(s, candidate) }))
          .filter((x) => x.score >= 1)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          assignedSection = scored[0].section;
          matchScore = scored[0].score;
          priorityUsed = null;
          matchType = 'fallback';
          assignedSection.remaining -= 1;
        }
      }

      const orderNumber = `PLC-2082-${String(orderSeq).padStart(5, '0')}`;
      orderSeq += 1;

      // Build DSC: SHA-256 of key fields + timestamp
      const payload = `${result.nidNumber}|${result.rollNumber}|${assignedSection?._id || 'UNPLACED'}|${runTimestamp.toISOString()}`;
      const dscSignature = crypto.createHash('sha256').update(payload).digest('hex');

      orders.push({
        nidNumber: result.nidNumber,
        rollNumber: result.rollNumber,
        candidateName: candidate.name,
        resultRank: result.rank,
        resultScore: result.totalScore,
        sourcePostId: result.postId,
        assignedMinistry: assignedSection?.ministry || '',
        assignedSectionId: assignedSection?._id || null,
        assignedSectionName: assignedSection?.sectionName || '',
        matchType: assignedSection ? matchType : 'unplaced',
        matchScore: matchScore,
        priorityUsed,
        candidateQualification: candidate.maximumQualification || '',
        candidateFaculty: candidate.faculty || '',
        candidateStream: candidate.stream || '',
        orderNumber,
        placementDate: runTimestamp,
        dscSignature,
        published: false
      });

      log.push({
        rank: result.rank,
        name: candidate.name,
        nidNumber: candidate.nidNumber,
        assigned: assignedSection
          ? `${assignedSection.ministry} → ${assignedSection.sectionName}`
          : 'UNPLACED',
        matchType: assignedSection ? matchType : 'unplaced',
        score: matchScore,
        priorityUsed
      });
    }

    // Delete any prior unpublished duplicates before inserting
    const rollsToInsert = orders.map((o) => o.rollNumber);
    await PlacementOrder.deleteMany({ rollNumber: { $in: rollsToInsert }, published: false });

    // Skip rolls that already have a PUBLISHED order (shouldn't happen normally, but safety)
    const publishedExisting = await PlacementOrder.find({
      rollNumber: { $in: rollsToInsert },
      published: true
    }).distinct('rollNumber');
    const toInsert = orders.filter((o) => !publishedExisting.includes(o.rollNumber));
    if (toInsert.length > 0) {
      await PlacementOrder.insertMany(toInsert);
    }

    // Lock priorities of placed candidates
    const placedNids = orders.filter((o) => o.assignedSectionId).map((o) => o.nidNumber);
    await Priority.updateMany({ nidNumber: { $in: placedNids } }, { $set: { locked: true } });

    const summary = {
      totalProcessed: orders.length,
      placed: orders.filter((o) => o.assignedSectionId).length,
      unplaced: orders.filter((o) => !o.assignedSectionId).length,
      byMatchType: {
        exact: orders.filter((o) => o.matchType === 'exact').length,
        stream: orders.filter((o) => o.matchType === 'stream').length,
        general: orders.filter((o) => o.matchType === 'general').length,
        fallback: orders.filter((o) => o.matchType === 'fallback').length,
        unplaced: orders.filter((o) => o.matchType === 'unplaced').length
      },
      byPriorityUsed: {
        priority1: orders.filter((o) => o.priorityUsed === 1).length,
        priority2: orders.filter((o) => o.priorityUsed === 2).length,
        priority3: orders.filter((o) => o.priorityUsed === 3).length,
        fallback: orders.filter((o) => o.priorityUsed === null && o.assignedSectionId).length
      }
    };

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🎯 PLACEMENT ALGORITHM RUN — ${runTimestamp.toISOString()}`);
    console.log(`   Processed: ${summary.totalProcessed}   Placed: ${summary.placed}   Unplaced: ${summary.unplaced}`);
    console.log('═══════════════════════════════════════════════════');
    log.forEach((e) => {
      console.log(
        `   Rank ${String(e.rank).padStart(3)}  ${e.name.padEnd(28)}  ${e.assigned.padEnd(50)}  [${e.matchType}=${e.score}${e.priorityUsed ? ` P${e.priorityUsed}` : ''}]`
      );
    });
    console.log('');

    return res.json({ success: true, summary, log });
  } catch (err) {
    console.error('placement run error:', err);
    return res.status(500).json({ message: 'Placement algorithm failed', error: err.message });
  }
});

// GET /api/placement/orders — list all placement orders (admin)
router.get('/orders', auth, requirePscAdmin, async (req, res) => {
  try {
    const orders = await PlacementOrder.find()
      .populate('assignedSectionId')
      .sort({ resultRank: 1 })
      .lean();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list orders', error: err.message });
  }
});

// POST /api/placement/publish — publish all unpublished orders (bulk transfer)
// On publish, each placed candidate becomes an Officer in HRMIS (Phase 5).
router.post('/publish', auth, requirePscAdmin, async (req, res) => {
  try {
    const Officer = require('../models/Officer');
    const NID = require('../models/NID');
    const ExamRegister = require('../models/ExamRegister');
    const AuditEntry = require('../models/AuditEntry');

    const unpublished = await PlacementOrder.find({ published: false });
    if (unpublished.length === 0) {
      return res.status(400).json({ message: 'No unpublished placement orders' });
    }

    const now = new Date();
    let officersCreated = 0;

    // Find an employee-ID starting sequence
    const lastOfficer = await Officer.findOne().sort({ employeeId: -1 }).select('employeeId').lean();
    let nextSeq = 1;
    if (lastOfficer?.employeeId) {
      const m = lastOfficer.employeeId.match(/(\d+)$/);
      if (m) nextSeq = parseInt(m[1], 10) + 1;
    }

    for (const o of unpublished) {
      o.published = true;
      o.publishedAt = now;
      o.publishedBy = req.user.id;
      await o.save();

      // Auto-create Officer for placed candidates (skip unplaced)
      if (!o.assignedSectionId) continue;

      const existing = await Officer.findOne({ nidNumber: o.nidNumber });
      if (existing) {
        // Officer exists — add this placement to postingHistory if not duplicate,
        // and update currentMinistry/section
        const hasThis = existing.postingHistory.some(
          (p) => String(p.placementOrderId) === String(o._id)
        );
        if (!hasThis) {
          // Close prior current posting
          existing.postingHistory.forEach((p) => {
            if (!p.endDate) p.endDate = now;
          });
          existing.postingHistory.push({
            ministry: o.assignedMinistry,
            sectionName: o.assignedSectionName,
            sectionId: o.assignedSectionId,
            startDate: now,
            placementOrderId: o._id
          });
          existing.currentMinistry = o.assignedMinistry;
          existing.currentSection = o.assignedSectionName;
          existing.currentSectionId = o.assignedSectionId;
          existing.tenureStartDate = now;
          await existing.save();
        }
        continue;
      }

      const nid = await NID.findOne({ nidNumber: o.nidNumber });
      const exam = await ExamRegister.findOne({ nidNumber: o.nidNumber });

      const employeeId = `HRMIS-2082-${String(nextSeq).padStart(6, '0')}`;
      nextSeq += 1;

      await Officer.create({
        nidNumber: o.nidNumber,
        employeeId,
        nameEnglish: nid?.nameEnglish || o.candidateName || '',
        nameNepali: nid?.nameNepali || '',
        dateOfBirth: nid?.dateOfBirth || '',
        gender: nid?.gender || '',
        mobileNumber: nid?.mobileNumber || '',
        maximumQualification: exam?.maximumQualification || o.candidateQualification || '',
        university: exam?.university || '',
        faculty: exam?.faculty || o.candidateFaculty || '',
        stream: exam?.stream || o.candidateStream || '',
        rollNumber: o.rollNumber,
        psResultRank: o.resultRank,
        currentMinistry: o.assignedMinistry,
        currentSection: o.assignedSectionName,
        currentSectionId: o.assignedSectionId,
        currentDistrictTier: 'A', // default; Phase 6 sets real tier
        tenureStartDate: now,
        status: 'active',
        postingHistory: [{
          ministry: o.assignedMinistry,
          sectionName: o.assignedSectionName,
          sectionId: o.assignedSectionId,
          startDate: now,
          placementOrderId: o._id
        }]
      });
      officersCreated += 1;
    }

    // Audit log
    try {
      await AuditEntry.append({
        action: 'placement.publish',
        actorId: req.user.id,
        actorName: req.user.fullName,
        actorRole: (req.user.roles || []).join(','),
        subjectType: 'PlacementOrder',
        summary: `${req.user.fullName} published ${unpublished.length} placement orders · created ${officersCreated} HRMIS officers`,
        metadata: { publishedCount: unpublished.length, officersCreated }
      });
    } catch (auditErr) { console.warn('audit append skipped:', auditErr.message); }

    return res.json({
      success: true,
      count: unpublished.length,
      officersCreated,
      publishedAt: now,
      byMinistry: unpublished.reduce((acc, o) => {
        if (!o.assignedMinistry) return acc;
        acc[o.assignedMinistry] = (acc[o.assignedMinistry] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('publish placement error:', err);
    return res.status(500).json({ message: 'Failed to publish', error: err.message });
  }
});

// POST /api/placement/reset — PSC admin clears all unpublished orders (re-run prep)
router.post('/reset', auth, requirePscAdmin, async (req, res) => {
  try {
    const result = await PlacementOrder.deleteMany({ published: false });
    await Priority.updateMany({}, { $set: { locked: false } });
    return res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    return res.status(500).json({ message: 'Reset failed', error: err.message });
  }
});

// GET /api/placement/public — public view of published placement orders
// Returns only ministry-level aggregate (no individual name exposure at this endpoint)
router.get('/public', async (req, res) => {
  try {
    const orders = await PlacementOrder.find({ published: true }).lean();
    const byMinistry = {};
    orders.forEach((o) => {
      if (!o.assignedMinistry) return;
      if (!byMinistry[o.assignedMinistry]) {
        byMinistry[o.assignedMinistry] = { ministry: o.assignedMinistry, total: 0, sections: {} };
      }
      byMinistry[o.assignedMinistry].total += 1;
      const secKey = o.assignedSectionName || 'Unassigned';
      byMinistry[o.assignedMinistry].sections[secKey] =
        (byMinistry[o.assignedMinistry].sections[secKey] || 0) + 1;
    });
    return res.json(Object.values(byMinistry));
  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
});

module.exports = router;
