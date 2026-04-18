import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getDefaultAvatar, getInitials } from '../utils/avatar.js';
import { generateAdmitCard } from '../utils/admitCard.js';
import { generatePlacementOrderPDF } from '../utils/placementOrder.js';
import { formatNid } from '../utils/formatNid.js';
import './Profile.css';

const TABS = [
  { id: 'overview',    label: 'Overview',       icon: '🏠' },
  { id: 'applications', label: 'Applications',   icon: '📋' },
  { id: 'payments',    label: 'Payments',       icon: '💳' },
  { id: 'results',     label: 'Results',        icon: '📊' },
  { id: 'priority',    label: 'Priority & Placement', icon: '🎯' },
  { id: 'officer',     label: 'HRMIS Officer',  icon: '🏛️' },
  { id: 'score',       label: 'Transfer Score', icon: '⭐' },
  { id: 'transfers',   label: 'Transfer Orders', icon: '🔄' },
  { id: 'appeals',     label: 'Appeals',        icon: '⚖️' },
  { id: 'grievances',  label: 'Grievances',     icon: '📨' },
  { id: 'settings',    label: 'Account',        icon: '⚙️' }
];

export default function Profile() {
  const { nidData, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    apps: [], results: [], priority: null, placement: null,
    officer: null, score: null, orders: [], appeals: [], grievances: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !nidData) {
      navigate('/login', { replace: true });
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get('/application/my-applications', { params: { nidNumber: nidData.nidNumber } }),
      api.get(`/results/by-nid/${nidData.nidNumber}`),
      api.get('/priority/mine'),
      api.get('/officer/me'),
      api.get(`/score/officer/${nidData.nidNumber}`),
      api.get('/transfer-window/orders/mine'),
      api.get('/transfer-window/appeals/mine'),
      api.get(`/grievances/mine/${nidData.nidNumber}`)
    ]);
    const pick = (i) => results[i].status === 'fulfilled' ? results[i].value.data : null;
    setData({
      apps: pick(0) || [],
      results: pick(1) || [],
      priority: pick(2),
      placement: pick(2)?.placement || null,
      officer: pick(3)?.officer || null,
      tenureDays: pick(3)?.tenureDays || null,
      score: pick(4)?.score || null,
      orders: pick(5) || [],
      appeals: pick(6) || [],
      grievances: pick(7) || []
    });
    setLoading(false);
  };

  if (!nidData) return null;

  const avatarUrl = getDefaultAvatar(nidData.gender);
  const counts = {
    applications: data.apps.length,
    results: data.results.length,
    payments: data.apps.filter((a) => a.paymentStatus === 'paid').length,
    orders: data.orders.length,
    appeals: data.appeals.length,
    grievances: data.grievances.length
  };

  return (
    <div className="profile-page page-enter">
      <div className="container profile-container">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <img src={avatarUrl} alt="avatar" className="profile-avatar" />
            <div className="profile-name">{nidData.nameEnglish}</div>
            {nidData.nameNepali && <div className="profile-name-np nepali">{nidData.nameNepali}</div>}
            <div className="profile-nid">NID <span className="mono">{formatNid(nidData.nidNumber)}</span></div>
            <div className="profile-meta">
              <small>{nidData.gender} · DOB {nidData.dateOfBirth}</small>
            </div>
          </div>

          <nav className="profile-nav" aria-label="profile sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`profile-nav-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="nav-icon">{t.icon}</span>
                <span>{t.label}</span>
                {t.id === 'applications' && counts.applications > 0 && <span className="nav-badge">{counts.applications}</span>}
                {t.id === 'orders' && counts.orders > 0 && <span className="nav-badge">{counts.orders}</span>}
                {t.id === 'grievances' && counts.grievances > 0 && <span className="nav-badge">{counts.grievances}</span>}
              </button>
            ))}
          </nav>

          <div className="profile-sidebar-footer">
            <button className="btn-outline" onClick={logout} style={{ width: '100%' }}>Logout</button>
          </div>
        </aside>

        {/* Main content */}
        <main className="profile-main">
          {loading ? (
            <div className="card"><p>Loading your profile…</p></div>
          ) : (
            <>
              {activeTab === 'overview'    && <OverviewTab data={data} counts={counts} go={setActiveTab} nav={navigate} />}
              {activeTab === 'applications' && <ApplicationsTab apps={data.apps} nav={navigate} />}
              {activeTab === 'payments'    && <PaymentsTab apps={data.apps} />}
              {activeTab === 'results'     && <ResultsTab results={data.results} nav={navigate} />}
              {activeTab === 'priority'    && <PriorityTab priority={data.priority} placement={data.placement} nav={navigate} candidateName={nidData.nameEnglish} />}
              {activeTab === 'officer'     && <OfficerTab officer={data.officer} tenureDays={data.tenureDays} nav={navigate} />}
              {activeTab === 'score'       && <ScoreTab score={data.score} />}
              {activeTab === 'transfers'   && <TransfersTab orders={data.orders} />}
              {activeTab === 'appeals'     && <AppealsTab appeals={data.appeals} />}
              {activeTab === 'grievances'  && <GrievancesTab grievances={data.grievances} nav={navigate} />}
              {activeTab === 'settings'    && <SettingsTab nidData={nidData} logout={logout} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ════════ Tab components ════════

function OverviewTab({ data, counts, go, nav }) {
  const stage = computeStage(data);
  return (
    <>
      <div className="card">
        <h3 className="card-title">Your Journey</h3>
        <div className="stage-tracker">
          {stage.steps.map((s, i) => (
            <div key={s.id} className={`stage-step ${s.state}`}>
              <div className="stage-dot">{s.state === 'done' ? '✓' : i + 1}</div>
              <div className="stage-label">{s.label}</div>
              {s.detail && <div className="stage-detail">{s.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="overview-grid mt-16">
        <button className="overview-card" onClick={() => go('applications')}>
          <div className="oc-icon">📋</div>
          <div className="oc-count">{counts.applications}</div>
          <div className="oc-label">Applications</div>
        </button>
        <button className="overview-card" onClick={() => go('payments')}>
          <div className="oc-icon">💳</div>
          <div className="oc-count">{counts.payments}</div>
          <div className="oc-label">Payments Made</div>
        </button>
        <button className="overview-card" onClick={() => go('results')}>
          <div className="oc-icon">📊</div>
          <div className="oc-count">{counts.results}</div>
          <div className="oc-label">Exam Results</div>
        </button>
        <button className="overview-card" onClick={() => go('priority')}>
          <div className="oc-icon">🎯</div>
          <div className="oc-count">{data.placement ? '✓' : (data.priority?.priority ? 'Draft' : '—')}</div>
          <div className="oc-label">Placement</div>
        </button>
        <button className="overview-card" onClick={() => go('officer')}>
          <div className="oc-icon">🏛️</div>
          <div className="oc-count">{data.officer ? '✓' : '—'}</div>
          <div className="oc-label">HRMIS Profile</div>
        </button>
        <button className="overview-card" onClick={() => go('score')}>
          <div className="oc-icon">⭐</div>
          <div className="oc-count">{data.score?.finalScore?.toFixed(1) || '—'}</div>
          <div className="oc-label">Transfer Score</div>
        </button>
        <button className="overview-card" onClick={() => go('transfers')}>
          <div className="oc-icon">🔄</div>
          <div className="oc-count">{counts.orders}</div>
          <div className="oc-label">Transfer Orders</div>
        </button>
        <button className="overview-card" onClick={() => go('grievances')}>
          <div className="oc-icon">📨</div>
          <div className="oc-count">{counts.grievances}</div>
          <div className="oc-label">Grievances</div>
        </button>
      </div>

      <div className="card mt-16">
        <h3 className="card-title">Quick Actions</h3>
        <div className="action-row">
          <button className="btn-primary" onClick={() => nav('/dashboard')}>Apply for Exam</button>
          <button className="btn-outline" onClick={() => nav('/grievance')}>File Grievance</button>
          <button className="btn-outline" onClick={() => nav('/results')}>Check Results</button>
          <button className="btn-outline" onClick={() => nav('/merit-list')}>View Merit List</button>
        </div>
      </div>
    </>
  );
}

function computeStage(data) {
  const steps = [
    { id: 'registered', label: 'Registered', state: 'done', detail: 'NID verified' },
    { id: 'applied', label: 'Applied',
      state: data.apps.length > 0 ? 'done' : 'pending',
      detail: data.apps.length > 0 ? `${data.apps.length} application(s)` : '' },
    { id: 'exam', label: 'Results Published',
      state: data.results.length > 0 ? 'done' : 'pending',
      detail: data.results.length > 0 ? data.results[0].status : '' },
    { id: 'priority', label: 'Priority Submitted',
      state: data.priority?.priority ? 'done' : 'pending' },
    { id: 'placement', label: 'Placed',
      state: data.placement?.published ? 'done' : 'pending',
      detail: data.placement?.assignedMinistry || '' },
    { id: 'officer', label: 'HRMIS Active',
      state: data.officer ? 'done' : 'pending',
      detail: data.officer?.employeeId || '' }
  ];
  // Set the first non-done step to 'active'
  const firstPendingIdx = steps.findIndex((s) => s.state === 'pending');
  if (firstPendingIdx >= 0) steps[firstPendingIdx].state = 'active';
  return { steps };
}

function ApplicationsTab({ apps, nav }) {
  if (apps.length === 0) return (
    <EmptyState icon="📋" title="No applications yet"
      text="Start by applying for an exam from the Apply page."
      cta={<button className="btn-crimson" onClick={() => nav('/dashboard')}>Apply Now</button>} />
  );
  return (
    <div className="card">
      <h3 className="card-title">Exam Applications</h3>
      <div className="app-grid">
        {apps.map((a) => (
          <div key={a._id} className="app-row">
            <div className="app-main">
              <div className="app-post">{a.postName || a.post?.postName}</div>
              <div className="app-meta">
                <span className="mono">{a.rollNumber}</span> ·
                <span> {a.post?.ministry || a.ministry}</span>
              </div>
              <div className="app-status-line">
                <span className={`badge badge-${appStatusColor(a.status)}`}>{a.status?.replace('_', ' ')}</span>
                <span className={`badge badge-${a.paymentStatus === 'paid' ? 'success' : 'warning'}`}>
                  {a.paymentStatus || 'unpaid'}
                </span>
              </div>
            </div>
            <div className="app-actions">
              {a.paymentStatus === 'paid' && (
                <button className="btn-outline" onClick={() => generateAdmitCard(a)}>⬇ Admit Card</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function appStatusColor(s) {
  return { registered: 'navy', appeared: 'warning', result_published: 'success' }[s] || 'navy';
}

function PaymentsTab({ apps }) {
  const paid = apps.filter((a) => a.paymentStatus === 'paid');
  if (paid.length === 0) return (
    <EmptyState icon="💳" title="No payments recorded" text="Your payment history will appear here." />
  );
  return (
    <div className="card">
      <h3 className="card-title">Payment History</h3>
      <div className="sections-table-wrap">
        <table className="sections-table">
          <thead><tr><th>Transaction</th><th>For</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {paid.map((a) => (
              <tr key={a._id}>
                <td><span className="mono">{a.paymentRef || a._id.slice(-8).toUpperCase()}</span></td>
                <td>{a.postName || a.post?.postName || 'Exam application'}</td>
                <td>{a.paymentMethod || '—'}</td>
                <td>NPR {a.paymentAmount || a.post?.examFee || '—'}</td>
                <td>{a.paidAt ? new Date(a.paidAt).toLocaleString() : new Date(a.updatedAt).toLocaleDateString()}</td>
                <td><span className="badge badge-success">paid</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultsTab({ results, nav }) {
  if (results.length === 0) return (
    <EmptyState icon="📊" title="No results published yet"
      text="Results appear here once PSC publishes the merit list for your exam."
      cta={<button className="btn-outline" onClick={() => nav('/results')}>Look up by Roll No.</button>} />
  );
  return (
    <div className="card">
      <h3 className="card-title">Your Exam Results</h3>
      {results.map((r) => (
        <div key={r._id} className="result-card">
          <div className="result-head">
            <span className="mono" style={{ fontWeight: 700 }}>{r.rollNumber}</span>
            <span className={`badge badge-${r.status === 'pass' ? 'success' : r.status === 'waitlist' ? 'warning' : 'error'}`}>{r.status}</span>
          </div>
          <div className="result-grid">
            <div><small>Written</small><strong>{r.writtenScore}/80</strong></div>
            <div><small>Interview</small><strong>{r.interviewScore}/20</strong></div>
            <div><small>Total</small><strong>{r.totalScore}/100</strong></div>
            <div><small>Rank</small><strong>#{r.rank}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PriorityTab({ priority, placement, nav, candidateName }) {
  return (
    <div className="card">
      <h3 className="card-title">Priority &amp; Placement</h3>
      {placement?.published ? (
        <>
          <div className="banner banner-success mb-16">
            <span className="check-icon">✓</span>
            You have been placed. Order {placement.orderNumber}
          </div>
          <div className="placement-summary-card">
            <div><small>MINISTRY</small><strong>{placement.assignedMinistry}</strong></div>
            <div><small>SECTION</small><strong>{placement.assignedSectionName}</strong></div>
            <div><small>MATCH</small><strong>{placement.matchType} ({placement.matchScore}/3)</strong></div>
            <div><small>PRIORITY</small><strong>{placement.priorityUsed ? `P${placement.priorityUsed}` : 'Fallback'}</strong></div>
          </div>
          <div className="action-row">
            <button className="btn-crimson" onClick={() => generatePlacementOrderPDF({ ...placement, candidateName })}>
              ⬇ Download Placement Order
            </button>
            <button className="btn-outline" onClick={() => nav('/priority')}>View Details</button>
          </div>
        </>
      ) : priority?.priority?.priorities?.length ? (
        <>
          <div className="banner banner-navy mb-16">
            Priorities submitted. Awaiting placement algorithm run by PSC.
          </div>
          <ol className="priority-list">
            {priority.priority.priorities.map((p, i) => (
              <li key={i}><strong>Priority {i + 1}:</strong> {p}</li>
            ))}
          </ol>
          <button className="btn-outline" onClick={() => nav('/priority')}>Edit Priorities</button>
        </>
      ) : (
        <EmptyState icon="🎯" title="Priorities not yet submitted"
          text="If you've passed an exam, you can rank your top 3 ministry choices."
          cta={<button className="btn-crimson" onClick={() => nav('/priority')}>Submit Priorities</button>} />
      )}
    </div>
  );
}

function OfficerTab({ officer, tenureDays, nav }) {
  if (!officer) return (
    <EmptyState icon="🏛️" title="Not yet an HRMIS officer"
      text="Your HRMIS profile is auto-created when you receive your Placement Order." />
  );
  const months = Math.floor((tenureDays || 0) / 30);
  return (
    <div className="card">
      <h3 className="card-title">HRMIS Officer Profile</h3>
      <div className="officer-strip">
        <div><small>Employee ID</small><strong className="mono">{officer.employeeId}</strong></div>
        <div><small>Current Ministry</small><strong>{officer.currentMinistry}</strong></div>
        <div><small>Section</small><strong>{officer.currentSection}</strong></div>
        <div><small>Tier</small><strong><span className={`tier-chip tier-${officer.currentDistrictTier}`}>{officer.currentDistrictTier}</span></strong></div>
        <div><small>Tenure</small><strong>{months} months</strong></div>
        <div><small>Status</small><strong><span className="badge badge-success">{officer.status}</span></strong></div>
      </div>
      <button className="btn-outline mt-16" onClick={() => nav('/officer')}>View Full Profile &amp; History</button>
    </div>
  );
}

function ScoreTab({ score }) {
  if (!score) return (
    <EmptyState icon="⭐" title="No transfer score yet"
      text="Scores are computed only after MoFAGA runs the scoring engine on the transfer queue." />
  );
  return (
    <div className="card">
      <h3 className="card-title">Your Transfer Score</h3>
      <div className="score-hero">
        <div>
          <div className="score-hero-label">Final Score</div>
          <div className="score-hero-v">{score.finalScore?.toFixed(2)}</div>
          <div className="score-hero-sub">Weighted {score.totalScore?.toFixed(2)} + tier bonus {score.hardshipBonus}</div>
        </div>
        <div>
          <div className="score-hero-label">Current Rank</div>
          <div className="score-hero-v">#{score.rank || '—'}</div>
          <div className="score-hero-sub">among queued officers</div>
        </div>
      </div>
      <div className="score-criteria">
        {(score.breakdown || []).map((b, i) => (
          <div key={i} className="criterion-row">
            <div className="criterion-top">
              <strong>{b.criterion}</strong>
              <span className="criterion-weight">{b.weight}%</span>
            </div>
            <div className="criterion-detail">{b.detail}</div>
            <div className="criterion-bar">
              <div className="criterion-bar-track">
                <div className="criterion-bar-fill" style={{ width: `${b.rawScore}%` }} />
              </div>
              <span className="criterion-raw">{b.rawScore}/100</span>
              <span className="criterion-weighted">→ {b.weightedScore.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransfersTab({ orders }) {
  if (orders.length === 0) return (
    <EmptyState icon="🔄" title="No transfer orders yet" text="Transfer orders appear here once MoFAGA issues them." />
  );
  return (
    <div className="card">
      <h3 className="card-title">Your Transfer Orders</h3>
      {orders.map((o) => (
        <div key={o._id} className="order-row">
          <div className="order-row-head">
            <span className="mono">{o.orderNumber}</span>
            <span className={`badge badge-${o.status === 'issued' ? 'success' : 'warning'}`}>{o.status}</span>
            <small>{new Date(o.createdAt).toLocaleDateString()}</small>
          </div>
          <div className="order-route">
            {o.fromMinistry} / {o.fromSection}
            <span className="order-arrow">→</span>
            <strong>{o.toMinistry}</strong> / {o.toSection}
          </div>
          <div className="order-meta">
            <span><strong>Rank:</strong> #{o.rank}</span>
            <span><strong>Score:</strong> {o.finalScore?.toFixed(2)}</span>
            {o.overridden && <span className="order-override">⚠ OVERRIDDEN</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AppealsTab({ appeals }) {
  if (appeals.length === 0) return (
    <EmptyState icon="⚖️" title="No appeals filed" text="If you believe a transfer order is incorrect, file an appeal from your HRMIS page." />
  );
  return (
    <div className="card">
      <h3 className="card-title">Your Appeals</h3>
      {appeals.map((a) => (
        <div key={a._id} className="appeal-mine">
          <div className="appeal-mine-head">
            <span className={`badge badge-${appealBadge(a.status)}`}>{a.status}</span>
            <strong>{a.subject}</strong>
            <small>{new Date(a.submittedAt).toLocaleDateString()}</small>
          </div>
          <p className="appeal-mine-desc">{a.description}</p>
          {a.reviewDecision && (
            <div className="appeal-mine-decision">
              <strong>Committee decision:</strong> {a.reviewDecision}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function appealBadge(s) {
  return { submitted: 'warning', 'under-review': 'navy', upheld: 'success', rejected: 'error' }[s] || 'navy';
}

function GrievancesTab({ grievances, nav }) {
  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Your Grievances</h3>
        <button className="btn-crimson" onClick={() => nav('/grievance')}>+ File New</button>
      </div>
      {grievances.length === 0 ? (
        <EmptyState icon="📨" title="No grievances filed" text="File a grievance if you dispute any decision." />
      ) : (
        grievances.map((g) => (
          <div key={g._id} className="grievance-item">
            <div className="grievance-head">
              <span className={`badge badge-${grievanceStatusColor(g.status)}`}>{g.status}</span>
              <strong>{g.subject}</strong>
              <small>{new Date(g.submittedAt).toLocaleDateString()}</small>
            </div>
            <p>{g.description}</p>
            {g.adminNotes && (
              <div className="grievance-response">
                <strong>Response:</strong> {g.adminNotes}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function grievanceStatusColor(s) {
  return { submitted: 'warning', 'under-review': 'navy', resolved: 'success', rejected: 'error' }[s] || 'navy';
}

function SettingsTab({ nidData, logout }) {
  return (
    <div className="card">
      <h3 className="card-title">Account Settings</h3>

      <h4 style={{ color: 'var(--navy)', marginTop: 10, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Personal Information (from NID)</h4>
      <div className="kv-grid">
        <KV k="Name (English)" v={nidData.nameEnglish} />
        <KV k="Name (Nepali)" v={nidData.nameNepali} nepali />
        <KV k="NID Number" v={formatNid(nidData.nidNumber)} mono />
        <KV k="Date of Birth" v={nidData.dateOfBirth} />
        <KV k="Gender" v={nidData.gender} />
        <KV k="Mobile" v={nidData.mobileNumber} />
        <KV k="Province" v={nidData.permanentAddress?.province} />
        <KV k="District" v={nidData.permanentAddress?.district} />
        <KV k="Municipality" v={nidData.permanentAddress?.municipality} />
        <KV k="Ward" v={nidData.permanentAddress?.ward} />
      </div>
      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-500)', fontStyle: 'italic' }}>
        Personal information comes from the NID registry and cannot be changed here. Contact NID office for corrections.
      </p>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
        <h4 style={{ color: 'var(--navy)', marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session</h4>
        <button className="btn-outline" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

function KV({ k, v, mono, nepali }) {
  return (
    <div className="kv-row">
      <span className="kv-k">{k}</span>
      <span className={`kv-v ${mono ? 'mono' : ''} ${nepali ? 'nepali' : ''}`}>{v || '—'}</span>
    </div>
  );
}

function EmptyState({ icon, title, text, cta }) {
  return (
    <div className="card empty-state-card">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {cta && <div style={{ marginTop: 14 }}>{cta}</div>}
    </div>
  );
}
