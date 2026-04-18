import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import './PSCAdminDashboard.css';

const TABS = [
  { id: 'applications', label: 'Applications', icon: '📋' },
  { id: 'scoring', label: 'Score Entry', icon: '✏️' },
  { id: 'merit', label: 'Merit List', icon: '🏆' },
  { id: 'sectors', label: 'Sectors', icon: '🏛️' },
  { id: 'placement', label: 'Placement', icon: '🎯' },
  { id: 'grievances', label: 'Grievances', icon: '📨' }
];

export default function PSCAdminDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('applications');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.roles?.includes('psc-admin')) {
      navigate('/admin/login', { replace: true });
      return;
    }
    loadStats();
  }, [user, navigate]);

  const loadStats = () => {
    adminApi.get('/psc-admin/stats').then((r) => setStats(r.data)).catch(() => {});
  };

  if (!user) return null;

  return (
    <div className="psc-dashboard page-enter">
      <div className="container">
        <div className="psc-header">
          <div>
            <span className="psc-badge">PSC Admin</span>
            <h2>Public Service Commission Nepal</h2>
            <p className="psc-sub">
              {user.fullName} · {user.designation}
            </p>
          </div>
          <button className="btn-outline" onClick={logout}>Logout</button>
        </div>

        {stats && (
          <div className="psc-stats">
            <button type="button" className="psc-stat psc-stat-btn" onClick={() => setActiveTab('applications')} title="View all applications">
              <div className="psc-stat-v">{stats.totalApplications}</div>
              <div className="psc-stat-l">Applications</div>
            </button>
            <button type="button" className="psc-stat psc-stat-btn" onClick={() => setActiveTab('scoring')} title="Score unscored applications">
              <div className="psc-stat-v" style={{ color: 'var(--warning)' }}>{stats.unscoredApplications}</div>
              <div className="psc-stat-l">Unscored</div>
            </button>
            <button type="button" className="psc-stat psc-stat-btn" onClick={() => setActiveTab('merit')} title="View merit list">
              <div className="psc-stat-v" style={{ color: 'var(--success)' }}>{stats.publishedResults}</div>
              <div className="psc-stat-l">Results Published</div>
            </button>
            <button type="button" className="psc-stat psc-stat-btn" onClick={() => setActiveTab('grievances')} title="Handle grievances">
              <div className="psc-stat-v" style={{ color: 'var(--crimson)' }}>{stats.pendingGrievances}</div>
              <div className="psc-stat-l">Pending Grievances</div>
            </button>
          </div>
        )}

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
          {activeTab === 'applications' && <ApplicationsTab onRefresh={loadStats} />}
          {activeTab === 'scoring' && <ScoringTab onRefresh={loadStats} />}
          {activeTab === 'merit' && <MeritListTab onRefresh={loadStats} />}
          {activeTab === 'sectors' && <SectorsTab />}
          {activeTab === 'placement' && <PlacementTab onRefresh={loadStats} />}
          {activeTab === 'grievances' && <GrievancesTab onRefresh={loadStats} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 1 — Applications
// ─────────────────────────────────────────────────────────────
function ApplicationsTab() {
  const [apps, setApps] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPost, setFilterPost] = useState('');

  useEffect(() => {
    adminApi.get('/posts').then((r) => setPosts(r.data || []));
    load();
  }, []);

  const load = async (postId = '') => {
    setLoading(true);
    try {
      const res = await adminApi.get('/psc-admin/applications', {
        params: postId ? { postId } : {}
      });
      setApps(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    setFilterPost(e.target.value);
    load(e.target.value);
  };

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>All Candidate Applications</h3>
        <select className="form-select" value={filterPost} onChange={handleFilter} style={{ maxWidth: 360 }}>
          <option value="">All posts ({apps.length})</option>
          {posts.map((p) => (
            <option key={p._id} value={p._id}>{p.postCode} — {p.postNameEnglish}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-16">Loading...</p>
      ) : apps.length === 0 ? (
        <p className="mt-16" style={{ color: 'var(--gray-500)' }}>No applications yet.</p>
      ) : (
        <div className="sections-table-wrap">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Roll #</th>
                <th>Candidate</th>
                <th>Post</th>
                <th>Applied</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a._id}>
                  <td><strong className="mono">{a.rollNumber}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.candidateName}</div>
                    <small style={{ color: 'var(--gray-500)' }}>NID {a.nidNumber}</small>
                  </td>
                  <td>
                    <div>{a.postName}</div>
                    <small style={{ color: 'var(--gray-500)' }}>{a.postCode}</small>
                  </td>
                  <td>{new Date(a.applicationDate).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-success">{a.paymentMethod}</span>
                  </td>
                  <td>
                    <StatusBadge status={a.applicationStatus} />
                  </td>
                  <td>
                    {a.scored ? (
                      <div className="score-inline">
                        <strong>{a.totalScore}</strong>/100
                        <small className={`result-${a.resultStatus}`}>
                          {a.resultStatus?.toUpperCase()}
                        </small>
                      </div>
                    ) : (
                      <span className="badge badge-warning">Unscored</span>
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
// TAB 2 — Score Entry
// ─────────────────────────────────────────────────────────────
function ScoringTab({ onRefresh }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [written, setWritten] = useState('');
  const [interview, setInterview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/psc-admin/applications');
      setApps(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (app) => {
    setSelected(app);
    setWritten(app.writtenScore ?? '');
    setInterview(app.interviewScore ?? '');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selected) return;

    const w = Number(written);
    const i = Number(interview);
    if (Number.isNaN(w) || w < 0 || w > 80) {
      setError('Written score must be 0..80');
      return;
    }
    if (Number.isNaN(i) || i < 0 || i > 20) {
      setError('Interview score must be 0..20');
      return;
    }

    setSaving(true);
    try {
      await adminApi.post('/psc-admin/score', {
        rollNumber: selected.rollNumber,
        writtenScore: w,
        interviewScore: i
      });
      setSuccess(`Scored ${selected.rollNumber}: ${w + i}/100`);
      await load();
      onRefresh?.();
      // keep selection but refresh
      const fresh = (await adminApi.get('/psc-admin/applications')).data;
      const refreshed = fresh.find((x) => x.rollNumber === selected.rollNumber);
      setSelected(refreshed || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  const unscored = apps.filter((a) => !a.scored);
  const scored = apps.filter((a) => a.scored);

  return (
    <div className="scoring-layout">
      <div className="card scoring-list">
        <h3 className="card-title">
          Pending Scoring · {unscored.length} left
        </h3>
        {loading && <p>Loading...</p>}
        {!loading && (
          <>
            {unscored.length > 0 && (
              <div className="scoring-group">
                <h4 className="scoring-group-title">Unscored</h4>
                {unscored.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    className={`scoring-item ${selected?._id === a._id ? 'active' : ''}`}
                    onClick={() => handleSelect(a)}
                  >
                    <div className="scoring-item-roll">{a.rollNumber}</div>
                    <div className="scoring-item-name">{a.candidateName}</div>
                    <div className="scoring-item-post">{a.postCode} · {a.postName}</div>
                  </button>
                ))}
              </div>
            )}
            {scored.length > 0 && (
              <div className="scoring-group">
                <h4 className="scoring-group-title">Scored (click to re-enter)</h4>
                {scored.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    className={`scoring-item scoring-item-scored ${selected?._id === a._id ? 'active' : ''}`}
                    onClick={() => handleSelect(a)}
                  >
                    <div className="scoring-item-roll">{a.rollNumber}</div>
                    <div className="scoring-item-name">
                      {a.candidateName}
                      <span className="scoring-item-tot">{a.totalScore}/100</span>
                    </div>
                    <div className="scoring-item-post">{a.postCode} · {a.resultStatus?.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card scoring-form">
        {!selected ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>Select a candidate from the list to enter scores.</p>
          </div>
        ) : (
          <>
            <h3 className="card-title">Enter Exam Scores</h3>
            <div className="scoring-candidate">
              <div>
                <div className="scoring-roll-big">{selected.rollNumber}</div>
                <div className="scoring-cand-name">{selected.candidateName}</div>
                <div className="scoring-cand-sub">
                  {selected.postName} · {selected.ministry}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-24">
              <div className="min-form-grid">
                <div className="field-group">
                  <label className="form-label">Written Exam Score (0–80)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    max={80}
                    value={written}
                    onChange={(e) => setWritten(e.target.value)}
                    placeholder="e.g. 72"
                  />
                </div>
                <div className="field-group">
                  <label className="form-label">Interview Score (0–20)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    max={20}
                    value={interview}
                    onChange={(e) => setInterview(e.target.value)}
                    placeholder="e.g. 16"
                  />
                </div>
              </div>

              <div className="score-preview">
                <span>Total: </span>
                <strong>{(Number(written) || 0) + (Number(interview) || 0)} / 100</strong>
                <span className="score-preview-note">
                  {(() => {
                    const t = (Number(written) || 0) + (Number(interview) || 0);
                    if (t >= 60) return '→ PASS';
                    if (t >= 50) return '→ WAITLIST';
                    return '→ FAIL';
                  })()}
                </span>
              </div>

              <div className="min-form-actions">
                <button type="button" className="btn-outline" onClick={() => setSelected(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Score'}
                </button>
              </div>

              {error && (
                <div className="banner banner-error mt-16">
                  <span className="x-icon">!</span>{error}
                </div>
              )}
              {success && (
                <div className="banner banner-success mt-16">
                  <span className="check-icon">✓</span>{success}
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3 — Merit List Publishing
// ─────────────────────────────────────────────────────────────
function MeritListTab({ onRefresh }) {
  const [posts, setPosts] = useState([]);
  const [apps, setApps] = useState([]);
  const [publishing, setPublishing] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.get('/posts'),
      adminApi.get('/psc-admin/applications')
    ]).then(([postsRes, appsRes]) => {
      setPosts(postsRes.data || []);
      setApps(appsRes.data || []);
    });
  }, []);

  const byPost = useMemo(() => {
    const m = {};
    apps.forEach((a) => {
      if (!m[a.postId]) m[a.postId] = { total: 0, scored: 0, published: 0, unscored: 0 };
      m[a.postId].total += 1;
      if (a.scored) m[a.postId].scored += 1;
      else m[a.postId].unscored += 1;
      if (a.resultPublished) m[a.postId].published += 1;
    });
    return m;
  }, [apps]);

  const handlePublish = async (post) => {
    setError('');
    setSuccess('');
    if (!confirm(`Publish merit list for ${post.postNameEnglish}? All scored candidates will appear on the public dashboard.`)) return;
    setPublishing(post._id);
    try {
      const res = await adminApi.post('/psc-admin/publish-merit-list', { postId: post._id });
      setSuccess(`Published: ${res.data.summary.total} ranked (${res.data.summary.passed} pass, ${res.data.summary.waitlist} waitlist, ${res.data.summary.failed} fail)`);
      const r2 = await adminApi.get('/psc-admin/applications');
      setApps(r2.data || []);
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublish = async (post) => {
    if (!confirm(`Unpublish merit list for ${post.postNameEnglish}? Results will be hidden from public.`)) return;
    try {
      await adminApi.post('/psc-admin/unpublish-merit-list', { postId: post._id });
      setSuccess('Unpublished');
      const r2 = await adminApi.get('/psc-admin/applications');
      setApps(r2.data || []);
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to unpublish');
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Merit List Publishing</h3>
      <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 18 }}>
        Publishing computes final rankings and makes results visible on the public merit list at <code>/merit-list</code>.
      </p>

      {error && <div className="banner banner-error mb-16"><span className="x-icon">!</span>{error}</div>}
      {success && <div className="banner banner-success mb-16"><span className="check-icon">✓</span>{success}</div>}

      <div className="merit-posts">
        {posts.map((p) => {
          const stats = byPost[p._id] || { total: 0, scored: 0, published: 0, unscored: 0 };
          const fullyPublished = stats.total > 0 && stats.published === stats.total;
          const canPublish = stats.scored > 0 && stats.unscored === 0;
          return (
            <div key={p._id} className="merit-post-card">
              <div className="merit-post-head">
                <div>
                  <div className="merit-post-code">{p.postCode}</div>
                  <div className="merit-post-name">{p.postNameEnglish}</div>
                  <div className="merit-post-min">{p.ministry}</div>
                </div>
                <div>
                  {fullyPublished ? (
                    <span className="badge badge-success">Published</span>
                  ) : stats.total === 0 ? (
                    <span className="badge badge-warning">No Applications</span>
                  ) : stats.unscored > 0 ? (
                    <span className="badge badge-warning">{stats.unscored} Unscored</span>
                  ) : (
                    <span className="badge badge-navy">Ready to Publish</span>
                  )}
                </div>
              </div>
              <div className="merit-post-stats">
                <div><span>Applications</span><strong>{stats.total}</strong></div>
                <div><span>Scored</span><strong>{stats.scored}</strong></div>
                <div><span>Published</span><strong>{stats.published}</strong></div>
              </div>
              <div className="merit-post-actions">
                <button
                  className="btn-crimson"
                  disabled={!canPublish || fullyPublished || publishing === p._id}
                  onClick={() => handlePublish(p)}
                >
                  {publishing === p._id ? 'Publishing...' : fullyPublished ? '✓ Published' : 'Publish Merit List'}
                </button>
                {fullyPublished && (
                  <button
                    className="btn-outline"
                    onClick={() => handleUnpublish(p)}
                  >
                    Unpublish
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4 — Sector-wise Segregation
// ─────────────────────────────────────────────────────────────
function SectorsTab() {
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get('/psc-admin/sector-segregation')
      .then((r) => setGroups(r.data || {}))
      .finally(() => setLoading(false));
  }, []);

  const ministries = Object.keys(groups);

  return (
    <div className="card">
      <h3 className="card-title">Sector-Wise Segregation</h3>
      <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 18 }}>
        Passed candidates are grouped by the ministry of their applied post. This list feeds the Phase 4 placement algorithm.
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : ministries.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No passed + published candidates yet. Publish merit lists in the previous tab.</p>
        </div>
      ) : (
        <div className="sectors-grid">
          {ministries.map((m) => (
            <div key={m} className="sector-group">
              <h4 className="sector-group-title">
                {m}
                <span className="sector-count">{groups[m].length}</span>
              </h4>
              <ol className="sector-list">
                {groups[m].map((c, idx) => (
                  <li key={idx} className="sector-item">
                    <span className="sector-rank">#{c.rank}</span>
                    <span className="sector-roll mono">{c.rollNumber}</span>
                    <span className="sector-name">{c.candidateName}</span>
                    <span className="sector-score">{c.totalScore}/100</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 5 — Grievances
// ─────────────────────────────────────────────────────────────
function GrievancesTab({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/grievances');
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? items : items.filter((g) => g.status === filter);

  const handleOpen = (g) => {
    setSelected(g);
    setNotes(g.adminNotes || '');
  };

  const handleUpdate = async (newStatus) => {
    setSaving(true);
    try {
      await adminApi.patch(`/grievances/${selected._id}`, { status: newStatus, adminNotes: notes });
      setSelected(null);
      await load();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grievance-layout">
      <div className="card grievance-list">
        <div className="psc-tab-header">
          <h3>Grievances</h3>
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="all">All ({items.length})</option>
            <option value="submitted">Submitted</option>
            <option value="under-review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><p>No grievances found.</p></div>
        ) : (
          <div className="grievance-items">
            {filtered.map((g) => (
              <button
                key={g._id}
                className={`grievance-item ${selected?._id === g._id ? 'active' : ''}`}
                onClick={() => handleOpen(g)}
              >
                <div className="grievance-item-top">
                  <span className={`badge badge-${statusColor(g.status)}`}>{g.status}</span>
                  <small>{new Date(g.submittedAt).toLocaleDateString()}</small>
                </div>
                <div className="grievance-item-subject">{g.subject}</div>
                <div className="grievance-item-meta">
                  {g.candidateName} · {g.type} {g.rollNumber ? `· ${g.rollNumber}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card grievance-detail">
        {!selected ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>Select a grievance to review.</p>
          </div>
        ) : (
          <>
            <div className="grievance-detail-head">
              <span className={`badge badge-${statusColor(selected.status)}`}>{selected.status}</span>
              <h3>{selected.subject}</h3>
              <p className="grievance-detail-meta">
                {selected.candidateName} · NID {selected.nidNumber}
                {selected.rollNumber && <> · Roll {selected.rollNumber}</>} · <em>{selected.type}</em>
              </p>
              <small style={{ color: 'var(--gray-500)' }}>
                Submitted {new Date(selected.submittedAt).toLocaleString()}
              </small>
            </div>

            <div className="grievance-body">
              <strong>Description</strong>
              <p>{selected.description}</p>
            </div>

            <div className="field-group mt-16">
              <label className="form-label">Admin Notes</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ height: 'auto', padding: 10 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, resolution details..."
              />
            </div>

            <div className="grievance-actions">
              <button className="btn-outline" onClick={() => setSelected(null)}>Close</button>
              <button className="btn-outline" disabled={saving} onClick={() => handleUpdate('under-review')}>Mark Under Review</button>
              <button className="btn-crimson" disabled={saving} onClick={() => handleUpdate('rejected')}>Reject</button>
              <button className="btn-primary" disabled={saving} onClick={() => handleUpdate('resolved')}>Resolve</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB — Placement Algorithm (Phase 4)
// ─────────────────────────────────────────────────────────────
function PlacementTab({ onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/placement/orders');
      setOrders(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!confirm('Run the placement algorithm? This will process all passed candidates rank-by-rank and create (unpublished) placement orders. Existing published orders are preserved.')) return;
    setError(''); setMessage(''); setRunning(true);
    try {
      const res = await adminApi.post('/placement/run');
      setSummary(res.data.summary);
      setLog(res.data.log || []);
      setMessage(`Algorithm complete: ${res.data.summary.placed} placed, ${res.data.summary.unplaced} unplaced`);
      await load();
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Algorithm run failed');
    } finally {
      setRunning(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish all unpublished placement orders? Candidates and ministries will be notified.')) return;
    setError(''); setMessage(''); setPublishing(true);
    try {
      const res = await adminApi.post('/placement/publish');
      setMessage(`${res.data.count} placement orders published to ${Object.keys(res.data.byMinistry).length} ministries.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all UNPUBLISHED placement orders and unlock priorities? Published orders are preserved.')) return;
    try {
      await adminApi.post('/placement/reset');
      setSummary(null);
      setLog([]);
      setMessage('Unpublished orders cleared');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Reset failed');
    }
  };

  const unpublished = orders.filter((o) => !o.published).length;
  const published = orders.filter((o) => o.published).length;

  return (
    <>
      <div className="card">
        <div className="psc-tab-header">
          <h3>Placement Algorithm · Flowchart A3</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" disabled={running} onClick={handleRun}>
              {running ? 'Running...' : '🎯 Run Algorithm'}
            </button>
            <button className="btn-crimson" disabled={publishing || unpublished === 0} onClick={handlePublish}>
              {publishing ? 'Publishing...' : `Publish (${unpublished})`}
            </button>
            <button className="btn-outline" onClick={handleReset}>Reset Draft</button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          Processes passed candidates rank-by-rank, assigning each to the best-matching section across
          their 3 priorities, then falls back nationally. Education match: <strong>exact=3 · stream=2 · general=1</strong>.
        </p>

        {error && <div className="banner banner-error mb-16"><span className="x-icon">!</span>{error}</div>}
        {message && <div className="banner banner-success mb-16"><span className="check-icon">✓</span>{message}</div>}

        {summary && (
          <div className="placement-summary">
            <div className="placement-sum-row">
              <div>
                <div className="placement-sum-v">{summary.totalProcessed}</div>
                <div className="placement-sum-l">Processed</div>
              </div>
              <div>
                <div className="placement-sum-v placement-sum-ok">{summary.placed}</div>
                <div className="placement-sum-l">Placed</div>
              </div>
              <div>
                <div className="placement-sum-v placement-sum-fail">{summary.unplaced}</div>
                <div className="placement-sum-l">Unplaced</div>
              </div>
            </div>

            <div className="placement-subsum">
              <div>
                <strong>By match type:</strong>
                <span className="chip chip-success">{summary.byMatchType.exact} exact</span>
                <span className="chip chip-warning">{summary.byMatchType.stream} stream</span>
                <span className="chip">{summary.byMatchType.general} general</span>
                <span className="chip">{summary.byMatchType.fallback} fallback</span>
              </div>
              <div>
                <strong>By priority:</strong>
                <span className="chip chip-success">{summary.byPriorityUsed.priority1} P1</span>
                <span className="chip chip-warning">{summary.byPriorityUsed.priority2} P2</span>
                <span className="chip">{summary.byPriorityUsed.priority3} P3</span>
                <span className="chip chip-error">{summary.byPriorityUsed.fallback} fallback</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--gray-700)' }}>
          <strong>Status:</strong> {published} published · {unpublished} draft
        </div>
      </div>

      <div className="card mt-16">
        <h4 className="card-title">Placement Orders · {orders.length} total</h4>
        {loading ? <p>Loading...</p> : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>No placement orders yet. Make sure candidates have submitted priorities and run the algorithm.</p>
          </div>
        ) : (
          <div className="sections-table-wrap">
            <table className="sections-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Assignment</th>
                  <th>Match</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td><span className="mono">{o.orderNumber}</span></td>
                    <td><strong>#{o.resultRank}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.candidateName}</div>
                      <small style={{ color: 'var(--gray-500)' }}>{o.rollNumber}</small>
                    </td>
                    <td>
                      {o.assignedSectionId ? (
                        <>
                          <div>{o.assignedMinistry}</div>
                          <small style={{ color: 'var(--gray-500)' }}>{o.assignedSectionName}</small>
                        </>
                      ) : (
                        <span className="badge badge-error">Unplaced</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${matchBadgeColor(o.matchType)}`}>
                        {o.matchType} · {o.matchScore}
                      </span>
                    </td>
                    <td>{o.priorityUsed ? `P${o.priorityUsed}` : '—'}</td>
                    <td>
                      {o.published ? (
                        <span className="badge badge-success">Published</span>
                      ) : (
                        <span className="badge badge-warning">Draft</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div className="card mt-16">
          <h4 className="card-title">Algorithm Run Log</h4>
          <pre className="algo-log">
{log.map((e) => `Rank #${String(e.rank).padStart(3, ' ')}  ${(e.name || '').padEnd(28)}  →  ${(e.assigned || 'UNPLACED').padEnd(50)}  [${e.matchType}=${e.score}${e.priorityUsed ? ` P${e.priorityUsed}` : ''}]`).join('\n')}
          </pre>
        </div>
      )}
    </>
  );
}

function matchBadgeColor(mt) {
  return { exact: 'success', stream: 'warning', general: 'navy', fallback: 'error', unplaced: 'error' }[mt] || 'navy';
}


function statusColor(status) {
  return {
    submitted: 'warning',
    'under-review': 'navy',
    resolved: 'success',
    rejected: 'error',
    registered: 'navy',
    appeared: 'warning',
    result_published: 'success'
  }[status] || 'navy';
}

function StatusBadge({ status }) {
  const color = statusColor(status);
  const label = (status || 'unknown').replace(/_/g, ' ');
  return <span className={`badge badge-${color}`}>{label}</span>;
}
