import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import './MofagaDashboard.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'queue', label: 'Transfer Queue', icon: '🔄' },
  { id: 'scoring', label: 'Scoring', icon: '🎯' },
  { id: 'windows', label: 'Transfer Windows', icon: '📅' },
  { id: 'emergency', label: 'Emergency', icon: '🚨' },
  { id: 'report', label: 'Annual Report', icon: '📄' },
  { id: 'appraisals', label: 'Appraisals', icon: '⭐' },
  { id: 'exemptions', label: 'Exemptions', icon: '🩺' },
  { id: 'officers', label: 'Officers', icon: '👥' },
  { id: 'districts', label: 'Districts', icon: '🗺️' },
  { id: 'rules', label: 'Tenure Rules', icon: '📜' }
];

export default function MofagaDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user?.roles?.some((r) => ['mofaga-admin', 'psc-admin'].includes(r))) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="mofaga-dashboard page-enter">
      <div className="container">
        <div className="mofaga-header">
          <div>
            <span className="mofaga-badge">MoFAGA Admin</span>
            <h2>Ministry of Federal Affairs &amp; General Administration</h2>
            <p className="mofaga-sub">{user.fullName} · {user.designation}</p>
          </div>
          <button className="btn-outline" onClick={logout}>Logout</button>
        </div>

        <div className="psc-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`psc-tab ${activeTab === t.id ? 'psc-tab-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="psc-content page-enter" key={activeTab}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'queue' && <QueueTab />}
          {activeTab === 'scoring' && <ScoringTab />}
          {activeTab === 'windows' && <WindowsTab />}
          {activeTab === 'emergency' && <EmergencyTab />}
          {activeTab === 'report' && <AnnualReportTab />}
          {activeTab === 'appraisals' && <AppraisalsTab />}
          {activeTab === 'exemptions' && <ExemptionsTab />}
          {activeTab === 'officers' && <OfficersTab />}
          {activeTab === 'districts' && <DistrictsTab />}
          {activeTab === 'rules' && <RulesTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [s, q] = await Promise.all([
        adminApi.get('/officer/stats/summary'),
        adminApi.get('/tenure/queue/stats')
      ]);
      setStats(s.data);
      setQueueStats(q.data);
    } catch {}
  };

  const handleScan = async () => {
    if (!confirm('Run the daily tenure scan? This examines every active officer and updates the transfer queue.')) return;
    setScanning(true); setError(''); setMessage('');
    try {
      const res = await adminApi.post('/tenure/scan');
      setMessage(`Scan complete — ${res.data.totalOfficersScanned} officers examined · ${res.data.newEntries} newly flagged · ${res.data.updatedEntries} updated`);
      loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="psc-tab-header">
          <h3>System Overview</h3>
          <button className="btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : '⚡ Run Tenure Scan'}
          </button>
        </div>

        {message && <div className="banner banner-success mb-16"><span className="check-icon">✓</span>{message}</div>}
        {error && <div className="banner banner-error mb-16"><span className="x-icon">!</span>{error}</div>}

        {stats && queueStats && (
          <>
            <div className="mofaga-stats">
              <button type="button" className="mofaga-stat mofaga-stat-btn" onClick={() => setActiveTab('officers')}>
                <div className="mofaga-stat-v">{stats.active}</div>
                <div className="mofaga-stat-l">Active Officers</div>
              </button>
              <button type="button" className="mofaga-stat mofaga-stat-btn" onClick={() => setActiveTab('queue')}>
                <div className="mofaga-stat-v" style={{ color: 'var(--warning)' }}>{queueStats.approaching}</div>
                <div className="mofaga-stat-l">Approaching Max</div>
              </button>
              <button type="button" className="mofaga-stat mofaga-stat-btn" onClick={() => setActiveTab('queue')}>
                <div className="mofaga-stat-v" style={{ color: 'var(--error)' }}>{queueStats.exceeded}</div>
                <div className="mofaga-stat-l">Exceeded Max</div>
              </button>
              <button type="button" className="mofaga-stat mofaga-stat-btn" onClick={() => setActiveTab('queue')}>
                <div className="mofaga-stat-v" style={{ color: 'var(--crimson)' }}>{queueStats.total}</div>
                <div className="mofaga-stat-l">In Transfer Queue</div>
              </button>
            </div>

            <div className="mofaga-grid mt-24">
              <div className="mofaga-sub-card">
                <h4>Officers by Ministry</h4>
                {stats.byMinistry.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)' }}>No officers yet.</p>
                ) : (
                  <ul className="mofaga-stat-list">
                    {stats.byMinistry.map((m) => (
                      <li key={m.ministry}>
                        <span>{m.ministry || '—'}</span>
                        <strong>{m.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mofaga-sub-card">
                <h4>Officers by District Tier</h4>
                {stats.byTier.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)' }}>No officers yet.</p>
                ) : (
                  <ul className="mofaga-stat-list">
                    {stats.byTier.map((t) => (
                      <li key={t.tier}>
                        <span><span className={`tier-chip tier-${t.tier}`}>Tier {t.tier}</span></span>
                        <strong>{t.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {queueStats.byMinistry.length > 0 && (
              <div className="mofaga-sub-card mt-24">
                <h4>Queue Distribution by Ministry</h4>
                <ul className="mofaga-stat-list">
                  {queueStats.byMinistry.map((m) => (
                    <li key={m.ministry}>
                      <span>{m.ministry || '—'}</span>
                      <strong>{m.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="info-card mt-24">
        <h4>About the Tenure Scan</h4>
        <p>
          The scan examines every active officer's tenure against their district-tier's rule set and
          flags anyone who has reached 90% of their max tenure (<strong>auto-flag</strong>). In production
          this runs daily via a cron job; here you trigger it manually. Flagged officers enter the
          Transfer Queue and become eligible for the next Phase 7 scoring run.
        </p>
      </div>
    </>
  );
}

function QueueTab() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/tenure/queue');
      setQueue(res.data || []);
    } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? queue : queue.filter((q) => q.reason === filter);

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Transfer Queue</h3>
        <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="all">All flagged ({queue.length})</option>
          <option value="exceeded-max">Exceeded Max Only</option>
          <option value="approaching-max">Approaching Max</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No officers in the transfer queue. Run the tenure scan from the Overview tab.</p>
        </div>
      ) : (
        <div className="sections-table-wrap">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Officer</th>
                <th>Current Posting</th>
                <th>Tier</th>
                <th>Tenure</th>
                <th>Progress</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q._id}>
                  <td><span className="mono">{q.employeeId}</span></td>
                  <td>
                    <strong>{q.officerName}</strong>
                    <small style={{ display: 'block', color: 'var(--gray-500)' }}>{q.nidNumber}</small>
                  </td>
                  <td>
                    {q.currentMinistry}
                    <small style={{ display: 'block', color: 'var(--gray-500)' }}>{q.currentSection}</small>
                  </td>
                  <td><span className={`tier-chip tier-${q.currentTier}`}>Tier {q.currentTier}</span></td>
                  <td>
                    <strong>{Math.floor(q.tenureDays / 30)}</strong> mo
                    <small style={{ display: 'block', color: 'var(--gray-500)' }}>{q.tenureDays} days</small>
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <div className="queue-progress">
                      <div
                        className={`queue-progress-bar ${q.tenurePercent >= 100 ? 'exceeded' : ''}`}
                        style={{ width: `${Math.min(q.tenurePercent, 100)}%` }}
                      />
                      <span className="queue-progress-label">{q.tenurePercent}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${q.reason === 'exceeded-max' ? 'error' : 'warning'}`}>
                      {q.reason.replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OfficersTab() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ministry, setMinistry] = useState('');

  useEffect(() => { load(); }, []);

  const load = async (filter = '') => {
    setLoading(true);
    try {
      const params = filter ? { ministry: filter } : {};
      const res = await adminApi.get('/officer/all', { params });
      setOfficers(res.data || []);
    } finally { setLoading(false); }
  };

  const ministries = [...new Set(officers.map((o) => o.currentMinistry))].sort();

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>All Active Officers</h3>
        <select className="form-select" value={ministry} onChange={(e) => { setMinistry(e.target.value); load(e.target.value); }} style={{ maxWidth: 300 }}>
          <option value="">All ministries ({officers.length})</option>
          {ministries.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : officers.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No officers yet.</p>
        </div>
      ) : (
        <div className="sections-table-wrap">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Officer</th>
                <th>Qualification</th>
                <th>Current Posting</th>
                <th>Tier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => {
                const days = Math.floor((Date.now() - new Date(o.tenureStartDate).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={o._id}>
                    <td><span className="mono">{o.employeeId}</span></td>
                    <td>
                      <strong>{o.nameEnglish}</strong>
                      <small style={{ display: 'block', color: 'var(--gray-500)' }}>NID {o.nidNumber}</small>
                    </td>
                    <td>
                      <div>{o.maximumQualification}</div>
                      <small style={{ color: 'var(--gray-500)' }}>{o.faculty} · {o.stream}</small>
                    </td>
                    <td>
                      {o.currentMinistry}
                      <small style={{ display: 'block', color: 'var(--gray-500)' }}>{o.currentSection} · {Math.floor(days/30)}mo</small>
                    </td>
                    <td><span className={`tier-chip tier-${o.currentDistrictTier}`}>{o.currentDistrictTier}</span></td>
                    <td><span className="badge badge-success">{o.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DistrictsTab() {
  const [districts, setDistricts] = useState([]);
  useEffect(() => {
    adminApi.get('/tenure/districts').then((r) => setDistricts(r.data || []));
  }, []);

  const grouped = districts.reduce((acc, d) => {
    if (!acc[d.tier]) acc[d.tier] = [];
    acc[d.tier].push(d);
    return acc;
  }, {});

  return (
    <div className="card">
      <h3 className="card-title">District Hardship Classification</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 18 }}>
        Official tier classifications from NPC. Each tier sets its own tenure window and hardship rotation bonus (used in Phase 7 scoring).
      </p>

      <div className="districts-grid">
        {['A', 'B', 'C', 'D'].map((tier) => (
          <div key={tier} className="districts-group">
            <h4 className="districts-title">
              <span className={`tier-chip tier-${tier}`}>Tier {tier}</span>
              <small>{grouped[tier]?.length || 0} districts</small>
            </h4>
            <ul className="districts-list">
              {(grouped[tier] || []).map((d) => (
                <li key={d._id}>
                  <div>
                    <strong>{d.district}</strong>
                    <small> · {d.province}</small>
                  </div>
                  <div className="districts-desc">{d.description}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState([]);
  useEffect(() => {
    adminApi.get('/tenure/rules').then((r) => setRules(r.data || []));
  }, []);

  return (
    <div className="card">
      <h3 className="card-title">Tenure Rules per District Tier</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 18 }}>
        These rules are derived from the Civil Service Act. The auto-flag threshold marks ~90% of max — when an officer
        hits it, they're added to the transfer queue.
      </p>

      <div className="sections-table-wrap">
        <table className="sections-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Posting Type</th>
              <th style={{ textAlign: 'center' }}>Min Tenure</th>
              <th style={{ textAlign: 'center' }}>Max Tenure</th>
              <th style={{ textAlign: 'center' }}>Auto-Flag</th>
              <th style={{ textAlign: 'center' }}>Hardship Bonus</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.tier}>
                <td><span className={`tier-chip tier-${r.tier}`}>Tier {r.tier}</span></td>
                <td>{tierDesc(r.tier)}</td>
                <td style={{ textAlign: 'center' }}>{r.minMonths} mo</td>
                <td style={{ textAlign: 'center' }}><strong>{r.maxMonths} mo</strong></td>
                <td style={{ textAlign: 'center' }}>{r.autoFlagMonths} mo</td>
                <td style={{ textAlign: 'center' }}>
                  {r.hardshipBonus > 0 ? <strong style={{ color: 'var(--crimson)' }}>+{r.hardshipBonus} pts</strong> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCORING TAB (Phase 7) — 6-criterion weighted formula
// ─────────────────────────────────────────────────────────────
function ScoringTab() {
  const [scores, setScores] = useState([]);
  const [weights, setWeights] = useState(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [w, r] = await Promise.all([
        adminApi.get('/score/weights'),
        adminApi.get('/score/rankings')
      ]);
      setWeights(w.data);
      setScores(r.data || []);
    } catch {}
  };

  const handleRun = async () => {
    if (!confirm('Run the 6-criterion scoring engine for every officer currently in the transfer queue?')) return;
    setRunning(true); setError(''); setMessage('');
    try {
      const res = await adminApi.post('/score/run');
      setMessage(`Scored ${res.data.count} officers · avg ${res.data.summary.avg} · top ${res.data.summary.highest?.score ?? '—'}`);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Scoring failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="psc-tab-header">
          <h3>Transfer Scoring Engine · Flowchart B1</h3>
          <button className="btn-primary" onClick={handleRun} disabled={running}>
            {running ? 'Computing...' : '🎯 Run Scoring'}
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Every flagged officer gets a weighted score across six criteria plus the hardship-tier bonus.
          Each officer can view their own breakdown — no information asymmetry.
        </p>

        {weights && (
          <div className="weights-row">
            <Weight label="Tenure" pct={weights.tenure} />
            <Weight label="Education" pct={weights.education} />
            <Weight label="Experience" pct={weights.experience} />
            <Weight label="Hardship Equity" pct={weights.hardshipEquity} />
            <Weight label="Performance" pct={weights.performance} />
            <Weight label="Personal Circumstance" pct={weights.personalCircumstance} />
          </div>
        )}

        {message && <div className="banner banner-success mt-16"><span className="check-icon">✓</span>{message}</div>}
        {error && <div className="banner banner-error mt-16"><span className="x-icon">!</span>{error}</div>}
      </div>

      <div className="card mt-16">
        <h4 className="card-title">Computed Rankings · {scores.length}</h4>
        {scores.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>No scores computed yet. Ensure the transfer queue has officers (run tenure scan first), then click Run Scoring.</p>
          </div>
        ) : (
          <div className="score-list">
            {scores.map((s) => (
              <div key={s._id} className={`score-card ${expanded === s._id ? 'expanded' : ''}`}>
                <button className="score-summary" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                  <div className="score-rank">#{s.rank}</div>
                  <div className="score-main">
                    <div className="score-name">{s.officerName}</div>
                    <div className="score-meta">
                      <span className="mono">{s.employeeId}</span> · {s.computedFor.currentMinistry}
                      <span className={`tier-chip tier-${s.computedFor.currentTier}`}>{s.computedFor.currentTier}</span>
                    </div>
                  </div>
                  <div className="score-total">
                    <div className="score-total-v">{s.finalScore.toFixed(1)}</div>
                    <div className="score-total-l">
                      {s.totalScore.toFixed(1)} + {s.hardshipBonus} bonus
                    </div>
                  </div>
                </button>

                {expanded === s._id && (
                  <div className="score-breakdown">
                    {s.breakdown.map((b, i) => (
                      <div key={i} className="breakdown-row">
                        <div className="breakdown-crit">
                          <strong>{b.criterion}</strong>
                          <small>{b.detail}</small>
                        </div>
                        <div className="breakdown-weight">{b.weight}%</div>
                        <div className="breakdown-bar">
                          <div className="breakdown-bar-track">
                            <div className="breakdown-bar-fill" style={{ width: `${b.rawScore}%` }} />
                          </div>
                          <span className="breakdown-raw">{b.rawScore}/100</span>
                        </div>
                        <div className="breakdown-weighted">+{b.weightedScore.toFixed(2)}</div>
                      </div>
                    ))}
                    <div className="breakdown-totals">
                      <div><span>Weighted Total</span><strong>{s.totalScore.toFixed(2)}</strong></div>
                      <div><span>Hardship Bonus</span><strong>+{s.hardshipBonus}</strong></div>
                      <div><span>Final Score</span><strong style={{ color: 'var(--crimson)' }}>{s.finalScore.toFixed(2)}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Weight({ label, pct }) {
  return (
    <div className="weight-pill">
      <div className="weight-pct">{pct}%</div>
      <div className="weight-label">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WINDOWS TAB (Phase 8) — T-60 → T-0 state machine
// ─────────────────────────────────────────────────────────────
function WindowsTab() {
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // New window form
  const [newOpen, setNewOpen] = useState('2026-09-15');
  const [newKind, setNewKind] = useState('primary');
  const [newFy, setNewFy] = useState('2082/83');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/transfer-window');
      setWindows(res.data || []);
    } finally { setLoading(false); }
  };

  const openDetail = async (w) => {
    setSelected(w);
    try {
      const res = await adminApi.get(`/transfer-window/${w._id}`);
      setDetail(res.data);
    } catch (err) {
      setErr(err?.response?.data?.message || 'Failed to load window detail');
    }
  };

  const handleCreate = async () => {
    setErr(''); setMsg('');
    const name = `${newFy.replace('/', '-')}-${newKind === 'primary' ? 'W1' : 'W2'}`;
    try {
      await adminApi.post('/transfer-window', { name, kind: newKind, fiscalYear: newFy, openDate: newOpen });
      setMsg(`Window ${name} created`);
      load();
    } catch (err) {
      setErr(err?.response?.data?.message || 'Failed to create window');
    }
  };

  const handleAdvance = async (to) => {
    if (!selected) return;
    if (!confirm(`Advance window ${selected.name} to state ${to}? This triggers the associated workflow action.`)) return;
    setAdvancing(true); setErr(''); setMsg('');
    try {
      const res = await adminApi.post(`/transfer-window/${selected._id}/advance`, { to });
      setMsg(`Advanced to ${to} · ${res.data.notes || ''}`);
      await load();
      openDetail(res.data.window);
    } catch (err) {
      setErr(err?.response?.data?.message || 'Failed to advance');
    } finally {
      setAdvancing(false);
    }
  };

  const stateOrder = ['scheduled', 'T-60', 'T-30', 'T-15', 'T-10', 'T-0', 'closed'];
  const nextState = (s) => {
    const i = stateOrder.indexOf(s);
    return i < stateOrder.length - 1 ? stateOrder[i + 1] : null;
  };

  return (
    <>
      {/* New window + list */}
      <div className="card">
        <div className="psc-tab-header">
          <h3>Transfer Windows · Flowchart B2</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Twice a year: Window 1 (April–May, primary) and Window 2 (October–November, secondary).
          Each moves through T-60 (draft generation) → T-30 (appeals open) → T-15 (final list) → T-10 (orders issued) → T-0 (window opens) → closed.
        </p>

        <div className="window-create">
          <div className="field-group"><label className="form-label">Open Date (T-0)</label><input type="date" className="form-input" value={newOpen} onChange={(e) => setNewOpen(e.target.value)} /></div>
          <div className="field-group"><label className="form-label">Kind</label>
            <select className="form-select" value={newKind} onChange={(e) => setNewKind(e.target.value)}>
              <option value="primary">Primary (April–May)</option>
              <option value="secondary">Secondary (October–November)</option>
            </select>
          </div>
          <div className="field-group"><label className="form-label">Fiscal Year</label><input className="form-input" value={newFy} onChange={(e) => setNewFy(e.target.value)} /></div>
          <button className="btn-primary" onClick={handleCreate} style={{ alignSelf: 'flex-end' }}>Create Window</button>
        </div>

        {msg && <div className="banner banner-success mt-16"><span className="check-icon">✓</span>{msg}</div>}
        {err && <div className="banner banner-error mt-16"><span className="x-icon">!</span>{err}</div>}
      </div>

      <div className="card mt-16">
        <h4 className="card-title">Windows · {windows.length}</h4>
        {loading ? <p>Loading...</p> : windows.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>No transfer windows yet. Create one above.</p>
          </div>
        ) : (
          <div className="window-grid">
            {windows.map((w) => (
              <button key={w._id} className={`window-card ${selected?._id === w._id ? 'active' : ''}`} onClick={() => openDetail(w)}>
                <div className="window-name">{w.name}</div>
                <div className="window-state-label">
                  <span className={`state-chip state-${w.state}`}>{w.state}</span>
                </div>
                <div className="window-dates">
                  <small>Opens {new Date(w.openDate).toLocaleDateString()}</small>
                </div>
                <div className="window-counts">
                  <span>{w.draftCount} draft</span>
                  <span>{w.appealsReceived} appeals</span>
                  <span>{w.ordersIssued} issued</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected window detail */}
      {selected && detail && (
        <div className="card mt-16">
          <div className="psc-tab-header">
            <h3>{selected.name}</h3>
            <div>
              {nextState(selected.state) && (
                <button className="btn-crimson" disabled={advancing} onClick={() => handleAdvance(nextState(selected.state))}>
                  {advancing ? 'Advancing...' : `Advance → ${nextState(selected.state)}`}
                </button>
              )}
            </div>
          </div>

          {/* Countdown timeline */}
          <div className="countdown-timeline">
            {['T-60', 'T-30', 'T-15', 'T-10', 'T-0', 'closed'].map((s, i, arr) => {
              const curIdx = arr.indexOf(selected.state);
              const done = curIdx > i;
              const active = curIdx === i;
              return (
                <React.Fragment key={s}>
                  <div className={`cd-step ${done ? 'cd-done' : active ? 'cd-active' : 'cd-future'}`}>
                    <div className="cd-circle">{done ? '✓' : i + 1}</div>
                    <div className="cd-label">{s}</div>
                    <div className="cd-sub">{s === 'T-60' ? 'Draft' : s === 'T-30' ? 'Appeals Open' : s === 'T-15' ? 'Final List' : s === 'T-10' ? 'Orders Issued' : s === 'T-0' ? 'Window Opens' : 'Closed'}</div>
                  </div>
                  {i < arr.length - 1 && <div className={`cd-line ${done ? 'cd-done' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Orders list */}
          <h4 className="card-title mt-24">Transfer Orders · {detail.orders.length}</h4>
          {detail.orders.length === 0 ? (
            <p style={{ color: 'var(--gray-500)' }}>No orders drafted yet. Advance the window to T-60 to generate.</p>
          ) : (
            <div className="sections-table-wrap">
              <table className="sections-table">
                <thead><tr><th>Order #</th><th>Officer</th><th>From</th><th>→</th><th>To</th><th>Score</th><th>Status</th></tr></thead>
                <tbody>
                  {detail.orders.map((o) => (
                    <tr key={o._id}>
                      <td><span className="mono">{o.orderNumber}</span></td>
                      <td><strong>{o.officerName}</strong><small style={{ display: 'block', color: 'var(--gray-500)' }}>#{o.rank}</small></td>
                      <td>{o.fromMinistry}<small style={{ display: 'block', color: 'var(--gray-500)' }}>{o.fromSection} · {o.fromTier}</small></td>
                      <td style={{ color: 'var(--crimson)', fontSize: 16 }}>→</td>
                      <td>{o.toMinistry}<small style={{ display: 'block', color: 'var(--gray-500)' }}>{o.toSection} · {o.toTier}</small></td>
                      <td><strong>{o.finalScore?.toFixed(1) ?? '—'}</strong></td>
                      <td><span className={`badge badge-${orderStatusColor(o.status)}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Appeals */}
          {detail.appeals.length > 0 && (
            <>
              <h4 className="card-title mt-24">Appeals · {detail.appeals.length}</h4>
              {detail.appeals.map((a) => <AppealRow key={a._id} appeal={a} onRefresh={() => openDetail(selected)} />)}
            </>
          )}
        </div>
      )}
    </>
  );
}

function orderStatusColor(s) {
  return { draft: 'warning', final: 'navy', issued: 'success', reported: 'success', appealed: 'warning', withdrawn: 'error' }[s] || 'navy';
}

function AppealRow({ appeal, onRefresh }) {
  const [decision, setDecision] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (status) => {
    setBusy(true);
    try {
      await adminApi.patch(`/transfer-window/appeals/${appeal._id}`, { status, reviewDecision: decision });
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="appeal-row">
      <div className="appeal-head">
        <span className={`badge badge-${appealStatusColor(appeal.status)}`}>{appeal.status}</span>
        <strong>{appeal.subject}</strong>
        <small>by {appeal.officerName} · {appeal.type}</small>
      </div>
      <p className="appeal-desc">{appeal.description}</p>
      {appeal.reviewDecision && (
        <div className="appeal-decision">
          <strong>Decision:</strong> {appeal.reviewDecision}
          {appeal.reviewedByName && <small> — {appeal.reviewedByName}</small>}
        </div>
      )}
      {appeal.status === 'submitted' && (
        <div className="appeal-actions">
          <input className="form-input" placeholder="Decision note..." value={decision} onChange={(e) => setDecision(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-outline" disabled={busy} onClick={() => act('rejected')}>Reject</button>
          <button className="btn-primary" disabled={busy} onClick={() => act('upheld')}>Uphold</button>
        </div>
      )}
    </div>
  );
}

function appealStatusColor(s) {
  return { submitted: 'warning', 'under-review': 'navy', upheld: 'success', rejected: 'error', withdrawn: 'error' }[s] || 'navy';
}

// ─────────────────────────────────────────────────────────────
// APPRAISALS TAB (Phase 7)
// ─────────────────────────────────────────────────────────────
function AppraisalsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/appraisals');
      setItems(res.data || []);
    } finally { setLoading(false); }
  };

  const handleCountersign = async (id) => {
    if (!confirm('Countersign and lock this appraisal? This cannot be undone.')) return;
    try {
      await adminApi.post(`/appraisals/${id}/countersign`);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Performance Appraisals</h3>
        <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
          Annual ratings feed the 10% performance criterion in transfer scoring
        </span>
      </div>

      {loading ? <p>Loading...</p> : items.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No appraisals submitted yet.</p>
        </div>
      ) : (
        <div className="sections-table-wrap">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Fiscal Year</th>
                <th>NID</th>
                <th style={{ textAlign: 'center' }}>Rating</th>
                <th>Competency · Integrity · Initiative · Punctuality</th>
                <th>Rated By</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.fiscalYear}</strong></td>
                  <td><span className="mono">{a.nidNumber}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="rating-chip" data-rating={a.rating}>{a.rating}/5</span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {a.competency} · {a.integrity} · {a.initiative} · {a.punctuality}
                  </td>
                  <td style={{ fontSize: 12 }}>{a.ratedByName || '—'}</td>
                  <td>
                    {a.locked ? (
                      <span className="badge badge-success">🔒 Locked</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!a.locked && (
                      <button className="icon-btn" onClick={() => handleCountersign(a._id)}>
                        Countersign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXEMPTIONS TAB (Phase 7)
// ─────────────────────────────────────────────────────────────
function ExemptionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/exemptions');
      setItems(res.data || []);
    } finally { setLoading(false); }
  };

  const handleDecision = async (id, status) => {
    const notes = prompt(status === 'verified' ? 'Verification notes (optional):' : 'Reason for rejection:');
    if (status === 'rejected' && !notes) return;
    try {
      await adminApi.patch(`/exemptions/${id}`, { status, verificationNotes: notes || '' });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed');
    }
  };

  const filtered = filter === 'all' ? items : items.filter((x) => x.status === filter);

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Exemption Requests</h3>
        <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="all">All ({items.length})</option>
          <option value="submitted">Submitted (pending)</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No exemption requests matching this filter.</p>
        </div>
      ) : (
        <div className="exemption-list">
          {filtered.map((e) => (
            <div key={e._id} className="exemption-card">
              <div className="exemption-head">
                <div>
                  <div className="exemption-type">{e.type.replace('-', ' ')}</div>
                  <div className="exemption-nid">NID {e.nidNumber}</div>
                </div>
                <span className={`badge badge-${exemptionColor(e.status)}`}>{e.status}</span>
              </div>
              <p className="exemption-desc">{e.description}</p>
              <div className="exemption-meta">
                {e.certificateRef && <span><strong>Cert:</strong> {e.certificateRef}</span>}
                {e.issuingAuthority && <span><strong>Auth:</strong> {e.issuingAuthority}</span>}
                <span><strong>Valid until:</strong> {new Date(e.validUntil).toLocaleDateString()}</span>
              </div>
              {e.verificationNotes && (
                <div className="exemption-notes">
                  <strong>Review:</strong> {e.verificationNotes}
                </div>
              )}
              {e.status === 'submitted' && (
                <div className="exemption-actions">
                  <button className="btn-crimson" onClick={() => handleDecision(e._id, 'rejected')}>Reject</button>
                  <button className="btn-primary" onClick={() => handleDecision(e._id, 'verified')}>Verify</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function exemptionColor(status) {
  return {
    submitted: 'warning',
    verified: 'success',
    rejected: 'error',
    expired: 'navy'
  }[status] || 'navy';
}

// ─────────────────────────────────────────────────────────────
// EMERGENCY TRANSFER TAB (Phase 10)
// ─────────────────────────────────────────────────────────────
function EmergencyTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nidNumber: '', type: 'security-threat', reason: '',
    toMinistry: '', toSection: '', toTier: 'A'
  });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/anti-gaming/emergency');
      setItems(res.data || []);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (form.reason.trim().length < 50) {
      setErr('Reason must be at least 50 characters');
      return;
    }
    try {
      await adminApi.post('/anti-gaming/emergency', form);
      setMsg(`Emergency request submitted. Awaiting Chief Secretary (PSC) approval.`);
      setShowForm(false);
      setForm({ nidNumber: '', type: 'security-threat', reason: '', toMinistry: '', toSection: '', toTier: 'A' });
      load();
    } catch (err) {
      setErr(err?.response?.data?.message || 'Failed');
    }
  };

  const publish = async (id) => {
    if (!confirm('Publish this emergency transfer? This immediately updates the officer\'s posting in HRMIS.')) return;
    try {
      await adminApi.post(`/anti-gaming/emergency/${id}/publish`);
      setMsg('Published and applied to HRMIS');
      load();
    } catch (err) {
      setErr(err?.response?.data?.message || 'Failed');
    }
  };

  const filtered = filter === 'all' ? items : items.filter((x) => x.status === filter);
  const submittedCount = items.filter((x) => x.status === 'submitted').length;
  const approvedCount = items.filter((x) => x.status === 'approved').length;

  return (
    <>
      <div className="card">
        <div className="psc-tab-header">
          <h3>Emergency Transfers</h3>
          <button className="btn-crimson" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Request Emergency'}
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Bypass the regular window for security threats, misconduct, medical evacuations, etc.
          Requires Chief Secretary (PSC) approval. Approved requests must publish within 24 hours or expire.
        </p>

        <div className="emrg-stats">
          <span><strong>{submittedCount}</strong> pending approval</span>
          <span><strong>{approvedCount}</strong> awaiting publication</span>
          <span><strong>{items.filter((x) => ['published', 'applied'].includes(x.status)).length}</strong> applied</span>
        </div>

        {showForm && (
          <form className="emrg-form" onSubmit={handleSubmit}>
            <div className="emrg-grid">
              <div className="field-group"><label className="form-label">Officer NID *</label><input className="form-input" required value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} /></div>
              <div className="field-group"><label className="form-label">Emergency Type *</label>
                <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="security-threat">Security threat</option>
                  <option value="serious-misconduct">Serious misconduct</option>
                  <option value="medical-evacuation">Medical evacuation</option>
                  <option value="family-emergency">Family emergency</option>
                  <option value="policy-crisis">Policy crisis</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field-group"><label className="form-label">Destination Ministry *</label><input className="form-input" required value={form.toMinistry} onChange={(e) => setForm({ ...form, toMinistry: e.target.value })} /></div>
              <div className="field-group"><label className="form-label">Destination Section *</label><input className="form-input" required value={form.toSection} onChange={(e) => setForm({ ...form, toSection: e.target.value })} /></div>
              <div className="field-group"><label className="form-label">Destination Tier</label>
                <select className="form-select" value={form.toTier} onChange={(e) => setForm({ ...form, toTier: e.target.value })}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="Specialist">Specialist</option>
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="form-label">Justification (≥ 50 characters) *</label>
              <textarea className="form-input" rows={4} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              <small style={{ color: form.reason.length < 50 ? 'var(--error)' : 'var(--gray-500)' }}>{form.reason.length} / 50 minimum</small>
            </div>
            <button type="submit" className="btn-crimson">Submit Emergency Request</button>
          </form>
        )}

        {msg && <div className="banner banner-success mt-16"><span className="check-icon">✓</span>{msg}</div>}
        {err && <div className="banner banner-error mt-16"><span className="x-icon">!</span>{err}</div>}
      </div>

      <div className="card mt-16">
        <div className="psc-tab-header">
          <h4>Requests · {items.length}</h4>
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="applied">Applied</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? <p>Loading...</p> : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><p>No emergency transfers.</p></div>
        ) : (
          <div className="emrg-list">
            {filtered.map((e) => (
              <div key={e._id} className="emrg-card">
                <div className="emrg-head">
                  <div>
                    <span className="mono" style={{ color: 'var(--crimson)', fontWeight: 700 }}>{e.orderNumber}</span>
                    <span className={`badge badge-${emrgStatusColor(e.status)}`} style={{ marginLeft: 10 }}>{e.status}</span>
                  </div>
                  <small>{new Date(e.createdAt).toLocaleString()}</small>
                </div>
                <div className="emrg-body">
                  <div><strong>{e.officerName}</strong> <span className="mono" style={{ color: 'var(--gray-500)' }}>({e.employeeId})</span></div>
                  <div className="emrg-route">
                    {e.fromMinistry} / {e.fromSection}
                    <span className="emrg-arrow">→</span>
                    {e.toMinistry} / {e.toSection}
                    <span className={`tier-chip tier-${e.toTier}`}>{e.toTier}</span>
                  </div>
                  <div className="emrg-type"><em>{e.type.replace('-', ' ')}</em></div>
                  <p className="emrg-reason">{e.reason}</p>
                  {e.chiefSecretaryApprovalName && (
                    <div className="emrg-approval">
                      ✓ Approved by <strong>{e.chiefSecretaryApprovalName}</strong> on {new Date(e.chiefSecretaryApprovalAt).toLocaleDateString()}
                      {e.chiefSecretaryNotes && <div style={{ marginTop: 4, fontSize: 12 }}>{e.chiefSecretaryNotes}</div>}
                      {e.mustPublishBy && e.status === 'approved' && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--warning)' }}>
                          ⏰ Must publish by {new Date(e.mustPublishBy).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                  {e.dscSignature && (
                    <div className="emrg-dsc">
                      <small>DSC:</small> <code>{e.dscSignature.slice(0, 32)}…</code>
                    </div>
                  )}
                </div>
                {e.status === 'approved' && (
                  <div className="emrg-actions">
                    <button className="btn-primary" onClick={() => publish(e._id)}>⚡ Publish &amp; Apply</button>
                  </div>
                )}
                {e.status === 'submitted' && (
                  <div className="emrg-actions">
                    <em style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                      Awaiting Chief Secretary (PSC admin) approval at /admin/psc
                    </em>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function emrgStatusColor(s) {
  return {
    submitted: 'warning', approved: 'navy', published: 'success',
    applied: 'success', rejected: 'error', expired: 'error'
  }[s] || 'navy';
}

// ─────────────────────────────────────────────────────────────
// ANNUAL TRANSPARENCY REPORT TAB (Phase 10)
// ─────────────────────────────────────────────────────────────
function AnnualReportTab() {
  const [year, setYear] = useState('2082');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/anti-gaming/annual-report', { params: { year } });
      setReport(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handlePrint = () => window.print();

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Annual Transparency Report</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ maxWidth: 100 }} value={year} onChange={(e) => setYear(e.target.value)} />
          <button className="btn-primary" disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Generate'}</button>
          {report && <button className="btn-outline" onClick={handlePrint}>⬇ Print / Save PDF</button>}
        </div>
      </div>

      {report && (
        <div className="report-canvas" id="annual-report-print">
          <div className="report-header">
            <div className="report-header-top">GOVERNMENT OF NEPAL</div>
            <h1>Annual Transparency Report · FY {report.year}</h1>
            <p>Ministry of Federal Affairs &amp; General Administration</p>
            <p className="report-gen"><em>Generated {new Date(report.generatedAt).toLocaleString()}</em></p>
          </div>

          <div className="report-section">
            <h2>1. Executive Summary</h2>
            <div className="report-grid">
              <ReportMetric label="Transfer Windows Opened" value={report.windowsOpened} />
              <ReportMetric label="Total Transfer Orders" value={report.summary.totalTransferOrders} />
              <ReportMetric label="Overrides Applied" value={`${report.summary.totalOverrides} (${report.summary.overridePercent})`} />
              <ReportMetric label="Appeals Filed" value={report.summary.totalAppeals} />
              <ReportMetric label="Emergency Transfers" value={report.summary.totalEmergencies} />
              <ReportMetric label="Active Exemptions" value={report.summary.totalExemptions} />
              <ReportMetric label="Grievances Filed" value={report.summary.totalGrievances} />
              <ReportMetric label="Grievance Resolution" value={report.summary.grievanceResolutionPercent} />
            </div>
          </div>

          <div className="report-section">
            <h2>2. System Integrity</h2>
            <div className={`integrity-result ${report.integrity.chainIntact ? 'intact' : 'broken'}`}>
              <div className="integrity-icon">{report.integrity.chainIntact ? '✓' : '⚠'}</div>
              <div>
                <h4>{report.integrity.chainIntact ? 'Audit Chain Verified' : 'INTEGRITY BREACH'}</h4>
                <p>
                  {report.integrity.auditEntries} cryptographically chained audit entries.
                  {report.integrity.chainIntact
                    ? ' No tampering detected — system operated within spec for all decisions this year.'
                    : ` Chain broke at entry #${report.integrity.brokenAt}. Forensic investigation required.`}
                </p>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>3. Workforce Distribution</h2>
            <div className="report-grid">
              <div>
                <h3>By Ministry</h3>
                <ul className="report-list">
                  {report.workforceDistribution.byMinistry.map((m) => (
                    <li key={m.ministry}><span>{m.ministry || 'Unassigned'}</span><strong>{m.count}</strong></li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>By District Tier</h3>
                <ul className="report-list">
                  {report.workforceDistribution.byTier.map((t) => (
                    <li key={t.tier}>
                      <span><span className={`tier-chip tier-${t.tier}`}>Tier {t.tier}</span></span>
                      <strong>{t.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {report.windows.length > 0 && (
            <div className="report-section">
              <h2>4. Transfer Windows</h2>
              <table className="report-table">
                <thead><tr><th>Window</th><th>State</th><th>Drafted</th><th>Appeals</th><th>Issued</th></tr></thead>
                <tbody>
                  {report.windows.map((w) => (
                    <tr key={w.name}>
                      <td className="mono">{w.name}</td>
                      <td>{w.state}</td>
                      <td>{w.draftCount}</td>
                      <td>{w.appealsReceived}</td>
                      <td>{w.ordersIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="report-footer">
            <p>This report is auto-generated from HRMIS audit data. Integrity status reflects real-time cryptographic verification.</p>
            <p>Published under the Right to Information Act, 2064 · Government of Nepal</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="report-metric">
      <div className="report-metric-v">{value}</div>
      <div className="report-metric-l">{label}</div>
    </div>
  );
}

function tierDesc(tier) {
  return {
    A: 'Kathmandu / urban',
    B: 'Semi-urban / hill',
    C: 'Remote district',
    D: 'Extreme hardship',
    Specialist: 'Specialist technical role'
  }[tier] || tier;
}
