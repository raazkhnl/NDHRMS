import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import './Officer.css';

export default function Officer() {
  const { nidData, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [myAppeals, setMyAppeals] = useState([]);

  useEffect(() => {
    if (!token || !nidData) {
      navigate('/login', { replace: true });
      return;
    }
    loadAll();
  }, [token, nidData, navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await api.get('/officer/me');
      setData(res.data);
      if (res.data?.isOfficer) {
        // Load score, orders, appeals in parallel (fail-soft)
        const [s, o, a] = await Promise.all([
          api.get(`/score/officer/${nidData.nidNumber}`).catch(() => ({ data: null })),
          api.get('/transfer-window/orders/mine').catch(() => ({ data: [] })),
          api.get('/transfer-window/appeals/mine').catch(() => ({ data: [] }))
        ]);
        setScoreData(s.data);
        setMyOrders(o.data || []);
        setMyAppeals(a.data || []);
      }
    } catch (err) {
      setData({ isOfficer: false, error: err?.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  if (!nidData) return null;
  if (loading) return <div className="container" style={{ padding: 40 }}>Loading...</div>;

  if (!data?.isOfficer) {
    return (
      <div className="officer-page page-enter">
        <div className="container">
          <div className="card">
            <h2>HRMIS Officer Profile</h2>
            <div className="banner banner-warning mt-16">
              <span className="x-icon">!</span>
              You are not yet registered as an officer in HRMIS.
              Officers are auto-created when PSC publishes your placement order.
            </div>
            <div className="mt-24">
              <button className="btn-outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
              <button className="btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate('/priority')}>
                View Placement Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { officer, tenureDays, tenureYears } = data;
  const tenureMonths = Math.floor(tenureDays / 30);

  return (
    <div className="officer-page page-enter">
      <div className="container">
        <div className="officer-header">
          <div>
            <span className="officer-badge">HRMIS Officer Profile</span>
            <h2>{officer.nameEnglish}</h2>
            <p className="officer-sub nepali">{officer.nameNepali}</p>
          </div>
          <div className="officer-emp">
            <span className="officer-emp-label">Employee ID</span>
            <span className="officer-emp-value">{officer.employeeId}</span>
          </div>
        </div>

        {/* Current posting card */}
        <div className="card officer-current">
          <h3 className="card-title">Current Posting</h3>
          <div className="officer-current-main">
            <div>
              <div className="officer-ministry">{officer.currentMinistry}</div>
              <div className="officer-section">{officer.currentSection}</div>
              <div className="officer-section-meta">
                District Tier <span className={`tier-chip tier-${officer.currentDistrictTier}`}>{officer.currentDistrictTier}</span>
                {' · '}Status <span className="badge badge-success">{officer.status}</span>
              </div>
            </div>
            <div className="officer-tenure-box">
              <div className="officer-tenure-label">Tenure at Posting</div>
              <div className="officer-tenure-value">{tenureMonths}</div>
              <div className="officer-tenure-unit">months</div>
              <div className="officer-tenure-sub">{tenureDays} days · {tenureYears} years</div>
            </div>
          </div>
        </div>

        {/* Profile + education */}
        <div className="dash-grid-2 mt-16">
          <div className="card">
            <h3 className="card-title">Personal Details</h3>
            <OfficerField label="Name (English)" value={officer.nameEnglish} />
            <OfficerField label="Name (Nepali)" value={officer.nameNepali} nepali />
            <OfficerField label="NID Number" value={officer.nidNumber} />
            <OfficerField label="Date of Birth" value={officer.dateOfBirth} />
            <OfficerField label="Gender" value={officer.gender} />
            <OfficerField label="Mobile" value={officer.mobileNumber} />
          </div>

          <div className="card">
            <h3 className="card-title">Education &amp; Entry</h3>
            <OfficerField label="Max Qualification" value={officer.maximumQualification} />
            <OfficerField label="University" value={officer.university} />
            <OfficerField label="Faculty" value={officer.faculty} />
            <OfficerField label="Stream" value={officer.stream} />
            <OfficerField label="PSC Roll No" value={officer.rollNumber} />
            <OfficerField label="Merit Rank at Entry" value={officer.psResultRank ? `#${officer.psResultRank}` : '—'} />
          </div>
        </div>

        {/* Posting history */}
        <div className="card mt-16">
          <h3 className="card-title">Posting History</h3>
          <div className="history-timeline">
            {(officer.postingHistory || []).slice().reverse().map((p, idx) => {
              const ended = !!p.endDate;
              const start = new Date(p.startDate);
              const end = p.endDate ? new Date(p.endDate) : new Date();
              const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              const months = Math.floor(days / 30);
              return (
                <div key={idx} className={`history-item ${!ended ? 'history-current' : ''}`}>
                  <div className="history-dot" />
                  <div className="history-content">
                    <div className="history-dates">
                      {start.toLocaleDateString()} — {p.endDate ? end.toLocaleDateString() : 'Present'}
                      <span className="history-duration">{months} months</span>
                    </div>
                    <div className="history-ministry">{p.ministry}</div>
                    <div className="history-section">{p.sectionName || '—'}</div>
                    {p.districtTier && (
                      <span className={`tier-chip tier-${p.districtTier}`}>Tier {p.districtTier}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Score Breakdown — spec: "Each officer logs into HRMIS and sees their
            exact score per criterion — not just the total." */}
        {scoreData?.score && (
          <div className="card mt-16">
            <h3 className="card-title">Your Transfer Score</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
              Every criterion, weight, and raw score is visible to you — per spec P1 (transparency). Your rank is
              computed across all officers currently in the transfer queue.
            </p>

            <div className="score-hero">
              <div>
                <div className="score-hero-label">Final Score</div>
                <div className="score-hero-v">{scoreData.score.finalScore?.toFixed(2)}</div>
                <div className="score-hero-sub">
                  Weighted total {scoreData.score.totalScore?.toFixed(2)} + tier bonus {scoreData.score.hardshipBonus}
                </div>
              </div>
              <div>
                <div className="score-hero-label">Current Rank</div>
                <div className="score-hero-v">#{scoreData.score.rank || '—'}</div>
                <div className="score-hero-sub">among queued officers</div>
              </div>
            </div>

            <div className="score-criteria">
              {(scoreData.score.breakdown || []).map((b, i) => (
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
        )}

        {/* Transfer Orders */}
        {myOrders.length > 0 && (
          <div className="card mt-16">
            <h3 className="card-title">Your Transfer Orders</h3>
            <div className="order-list">
              {myOrders.map((o) => (
                <OrderRow key={o._id} order={o} onAppeal={loadAll} appeals={myAppeals} />
              ))}
            </div>
          </div>
        )}

        {/* Appeal history */}
        {myAppeals.length > 0 && (
          <div className="card mt-16">
            <h3 className="card-title">Your Appeals</h3>
            {myAppeals.map((a) => (
              <div key={a._id} className={`appeal-mine appeal-mine-${a.status}`}>
                <div className="appeal-mine-head">
                  <span className={`badge badge-${appealBadge(a.status)}`}>{a.status}</span>
                  <strong>{a.subject}</strong>
                  <small>{new Date(a.submittedAt).toLocaleDateString()}</small>
                </div>
                <p className="appeal-mine-desc">{a.description}</p>
                {a.reviewDecision && (
                  <div className="appeal-mine-decision">
                    <strong>Committee decision:</strong> {a.reviewDecision}
                    {a.reviewedByName && <span style={{ marginLeft: 8, color: 'var(--gray-500)' }}>— {a.reviewedByName}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="info-card mt-24">
          <h4>About HRMIS</h4>
          <p>
            The Human Resource Management Information System (HRMIS) is the unified civil service profile
            system maintained by MoFAGA. Your profile is auto-updated on every placement, transfer, and
            performance appraisal. This data feeds the transfer scoring engine every cycle.
          </p>
        </div>
      </div>
    </div>
  );
}

function OfficerField({ label, value, nepali }) {
  return (
    <div className="field-row">
      <div className="field-label">{label}</div>
      <div className={`field-value ${nepali ? 'nepali' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function appealBadge(status) {
  return { submitted: 'warning', 'under-review': 'navy', upheld: 'success', rejected: 'error', withdrawn: 'error' }[status] || 'navy';
}

function OrderRow({ order, onAppeal, appeals }) {
  const [showAppeal, setShowAppeal] = useState(false);
  const [type, setType] = useState('posting-request');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const alreadyAppealed = appeals.some((a) => String(a.transferOrderId) === String(order._id));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post('/transfer-window/appeals/submit', {
        transferOrderId: order._id, type, subject, description
      });
      setMsg('Appeal submitted — review committee will respond before T-15.');
      setShowAppeal(false);
      onAppeal?.();
    } catch (error) {
      setErr(error?.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-row">
      <div className="order-row-head">
        <span className="mono">{order.orderNumber}</span>
        <span className={`badge badge-${orderBadge(order.status)}`}>{order.status}</span>
        <small>{new Date(order.createdAt).toLocaleDateString()}</small>
      </div>
      <div className="order-route">
        {order.fromMinistry} / {order.fromSection}
        <span className="order-arrow">→</span>
        <strong>{order.toMinistry}</strong> / {order.toSection}
      </div>
      <div className="order-meta">
        <span><strong>Rank:</strong> #{order.rank}</span>
        <span><strong>Score:</strong> {order.finalScore?.toFixed(2)}</span>
        {order.overridden && <span className="order-override">⚠ OVERRIDDEN</span>}
      </div>
      {order.dscSignature && (
        <div className="order-dsc"><small>DSC:</small> <code>{order.dscSignature.slice(0, 32)}…</code></div>
      )}

      {!alreadyAppealed && ['draft', 'final', 'appealed'].includes(order.status) && (
        <div className="order-actions">
          {!showAppeal ? (
            <button className="btn-outline" onClick={() => setShowAppeal(true)}>File an Appeal</button>
          ) : (
            <form onSubmit={submit} className="appeal-form">
              <h5>File Appeal against {order.orderNumber}</h5>
              <div className="field-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="score-challenge">Score challenge</option>
                  <option value="exemption-claim">Exemption claim</option>
                  <option value="posting-request">Posting request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field-group">
                <label className="form-label">Subject</label>
                <input className="form-input" required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} required value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={() => setShowAppeal(false)}>Cancel</button>
                <button type="submit" className="btn-crimson" disabled={busy}>{busy ? 'Submitting…' : 'Submit Appeal'}</button>
              </div>
              {err && <div className="banner banner-error mt-16"><span className="x-icon">!</span>{err}</div>}
              {msg && <div className="banner banner-success mt-16"><span className="check-icon">✓</span>{msg}</div>}
            </form>
          )}
        </div>
      )}
      {alreadyAppealed && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-500)' }}>
          ✓ You have already filed an appeal against this order.
        </div>
      )}
    </div>
  );
}

function orderBadge(s) {
  return { draft: 'warning', final: 'navy', issued: 'success', reported: 'success', appealed: 'warning', withdrawn: 'error' }[s] || 'navy';
}
