import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import './WatchdogDashboard.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '🛡️' },
  { id: 'alerts', label: 'Alerts', icon: '🚨' },
  { id: 'audit', label: 'Audit Log', icon: '📜' },
  { id: 'integrity', label: 'Chain Integrity', icon: '🔐' }
];

export default function WatchdogDashboard() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user?.roles?.some((r) => ['ciaa-auditor', 'oag-auditor'].includes(r))) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;
  const roleLabel = user.roles.includes('ciaa-auditor') ? 'CIAA' : 'OAG';

  return (
    <div className="watchdog-dashboard page-enter">
      <div className="container">
        <div className="watchdog-header">
          <div>
            <span className={`watchdog-badge watchdog-badge-${roleLabel.toLowerCase()}`}>
              {roleLabel} Watchdog Portal
            </span>
            <h2>{roleLabel === 'CIAA' ? 'Commission for the Investigation of Abuse of Authority' : 'Office of the Auditor General'}</h2>
            <p className="watchdog-sub">{user.fullName} · {user.designation}</p>
            <p className="watchdog-readonly">🔒 Read-only access — every action below is logged</p>
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
          {activeTab === 'alerts' && <AlertsTab />}
          {activeTab === 'audit' && <AuditLogTab />}
          {activeTab === 'integrity' && <IntegrityTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    adminApi.get('/audit/public/dashboard').then((r) => setDashboard(r.data)).catch(() => {});
  }, []);

  if (!dashboard) return <p>Loading transparency dashboard...</p>;

  return (
    <>
      <div className="card">
        <h3 className="card-title">Transparency Dashboard</h3>

        <div className="integrity-status">
          <div className={`integrity-badge ${dashboard.integrity.chainIntact ? 'intact' : 'broken'}`}>
            {dashboard.integrity.chainIntact ? '✓ AUDIT CHAIN INTACT' : '⚠ CHAIN TAMPERED'}
          </div>
          <div className="integrity-detail">
            {dashboard.integrity.chainLength} entries cryptographically linked
            {dashboard.integrity.brokenAt && ` · Break at sequence #${dashboard.integrity.brokenAt}`}
          </div>
        </div>

        <div className="watchdog-metrics">
          <div className="wd-metric">
            <div className="wd-metric-v">{dashboard.integrityMetrics.totalOverrides}</div>
            <div className="wd-metric-l">Total Overrides</div>
          </div>
          <div className="wd-metric">
            <div className="wd-metric-v">{dashboard.integrityMetrics.totalAppeals}</div>
            <div className="wd-metric-l">Total Appeals</div>
          </div>
          <div className="wd-metric">
            <div className="wd-metric-v" style={{ color: dashboard.integrityMetrics.openAlerts > 0 ? 'var(--error)' : 'var(--success)' }}>
              {dashboard.integrityMetrics.openAlerts}
            </div>
            <div className="wd-metric-l">Open Alerts</div>
          </div>
          <div className="wd-metric">
            <div className="wd-metric-v">{dashboard.integrity.chainLength}</div>
            <div className="wd-metric-l">Audit Entries</div>
          </div>
        </div>
      </div>

      {dashboard.windows.length > 0 && (
        <div className="card mt-16">
          <h4 className="card-title">Recent Transfer Windows</h4>
          <div className="sections-table-wrap">
            <table className="sections-table">
              <thead><tr><th>Window</th><th>State</th><th>Drafted</th><th>Appeals</th><th>Issued</th><th>Opens</th></tr></thead>
              <tbody>
                {dashboard.windows.map((w) => (
                  <tr key={w.name}>
                    <td><span className="mono">{w.name}</span></td>
                    <td><span className={`state-chip state-${w.state}`}>{w.state}</span></td>
                    <td>{w.draftCount}</td>
                    <td>{w.appealsReceived}</td>
                    <td>{w.ordersIssued}</td>
                    <td>{new Date(w.openDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function AlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('open');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await adminApi.get('/audit/alerts', { params });
      setAlerts(res.data || []);
    } finally { setLoading(false); }
  };

  const act = async (id, status) => {
    const notes = prompt(`Resolution notes for "${status}":`);
    if (status === 'closed' && !notes) return;
    try {
      await adminApi.patch(`/audit/alerts/${id}`, { status, resolutionNotes: notes || '' });
      load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Investigation Alerts</h3>
        <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="investigating">Investigating</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : alerts.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p>No alerts matching this filter. When override count exceeds threshold (3+) in a window, an alert auto-triggers.</p>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map((a) => (
            <div key={a._id} className={`alert-card severity-${a.severity}`}>
              <div className="alert-head">
                <span className={`severity-badge severity-${a.severity}`}>{a.severity}</span>
                <strong>{a.title}</strong>
                <span className={`badge badge-${alertStatusColor(a.status)}`}>{a.status}</span>
              </div>
              <p className="alert-desc">{a.description}</p>
              <div className="alert-meta">
                {a.windowName && <span><strong>Window:</strong> <span className="mono">{a.windowName}</span></span>}
                <span><strong>Triggered:</strong> {a.triggerCount}/{a.threshold}</span>
                <span><strong>Raised:</strong> {new Date(a.createdAt).toLocaleString()}</span>
              </div>
              {a.resolutionNotes && (
                <div className="alert-resolution">
                  <strong>{a.acknowledgedByName}:</strong> {a.resolutionNotes}
                </div>
              )}
              {a.status === 'open' && (
                <div className="alert-actions">
                  <button className="btn-outline" onClick={() => act(a._id, 'acknowledged')}>Acknowledge</button>
                  <button className="btn-primary" onClick={() => act(a._id, 'investigating')}>Investigate</button>
                  <button className="btn-crimson" onClick={() => act(a._id, 'closed')}>Close</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function alertStatusColor(s) {
  return { open: 'error', acknowledged: 'warning', investigating: 'navy', closed: 'success' }[s] || 'navy';
}

function AuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [stats, setStats] = useState(null);
  const LIMIT = 30;

  useEffect(() => { load(); loadStats(); /* eslint-disable-next-line */ }, [skip, actionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, skip };
      if (actionFilter) params.action = actionFilter;
      const res = await adminApi.get('/audit/log', { params });
      setEntries(res.data.entries);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await adminApi.get('/audit/stats');
      setStats(res.data);
    } catch {}
  };

  return (
    <>
      <div className="card">
        <div className="psc-tab-header">
          <h3>Immutable Audit Log</h3>
          <select className="form-select" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setSkip(0); }} style={{ maxWidth: 240 }}>
            <option value="">All actions ({total})</option>
            {stats?.byAction?.map((x) => (
              <option key={x.action} value={x.action}>{x.action} ({x.count})</option>
            ))}
          </select>
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          Every sensitive action — placements, overrides, score runs, window advances — is hashed into a
          SHA-256 chain. Tampering with any entry breaks the chain cryptographically.
        </p>

        {loading ? <p>Loading...</p> : entries.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><p>No audit entries match this filter.</p></div>
        ) : (
          <div className="audit-list">
            {entries.map((e) => (
              <div key={e._id} className="audit-row">
                <div className="audit-seq">#{e.sequence}</div>
                <div className="audit-main">
                  <div className="audit-action">{e.action}</div>
                  <div className="audit-summary">{e.summary}</div>
                  <div className="audit-meta">
                    <span>{e.actorName || 'SYSTEM'}</span>
                    {e.subjectRef && <span className="mono">{e.subjectRef}</span>}
                    <span>{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="audit-hashes">
                    <div><small>prev</small> <code>{(e.previousHash || '').slice(0, 16)}…</code></div>
                    <div><small>this</small> <code>{(e.entryHash || '').slice(0, 16)}…</code></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > LIMIT && (
          <div className="audit-pager">
            <button className="btn-outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - LIMIT))}>← Newer</button>
            <span>{skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</span>
            <button className="btn-outline" disabled={skip + LIMIT >= total} onClick={() => setSkip(skip + LIMIT)}>Older →</button>
          </div>
        )}
      </div>
    </>
  );
}

function IntegrityTab() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/audit/verify');
      setResult(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { verify(); }, []);

  return (
    <div className="card">
      <div className="psc-tab-header">
        <h3>Cryptographic Chain Verification</h3>
        <button className="btn-primary" disabled={loading} onClick={verify}>
          {loading ? 'Verifying...' : '🔐 Re-verify Chain'}
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
        Walks every entry in the audit log, recomputes each SHA-256 hash, and verifies that
        <code>previousHash</code> links match. Any tampering — whether by an insider or a compromised
        database — breaks the chain and shows the exact sequence where the break occurred.
      </p>

      {!result ? <p>Running verification...</p> : (
        <div className={`integrity-result ${result.intact ? 'intact' : 'broken'}`}>
          <div className="integrity-icon">{result.intact ? '✓' : '⚠'}</div>
          <div>
            <h4>{result.intact ? 'Chain Integrity Verified' : 'TAMPERING DETECTED'}</h4>
            {result.intact ? (
              <p>All <strong>{result.count}</strong> audit entries validate against their cryptographic predecessors. No evidence of tampering or backdated modifications.</p>
            ) : (
              <p>
                The chain broke at sequence <strong>#{result.brokenAt}</strong>. Reason: <em>{result.reason}</em>.
                Immediate investigation required — an entry has been modified after it was recorded.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="info-card mt-16">
        <h4>How the chain works</h4>
        <p>
          Each entry's hash is computed from its own content PLUS the previous entry's hash. Changing a
          single byte anywhere in history would require recomputing every hash from that point forward —
          which the verifier would detect immediately. This is the same primitive used in blockchain,
          applied here to make the audit log effectively tamper-evident.
        </p>
      </div>
    </div>
  );
}
