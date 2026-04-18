import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { generatePlacementOrderPDF } from '../utils/placementOrder.js';
import './Priority.css';

export default function Priority() {
  const { nidData, token } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    try {
      const [statusRes, ministriesRes] = await Promise.all([
        api.get('/priority/mine'),
        api.get('/priority/ministries')
      ]);
      setStatus(statusRes.data);
      setMinistries(ministriesRes.data || []);

      // Prefill form if priority exists
      const existing = statusRes.data?.priority?.priorities || [];
      setP1(existing[0] || '');
      setP2(existing[1] || '');
      setP3(existing[2] || '');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const arr = [p1, p2, p3].map((s) => s.trim()).filter(Boolean);
    if (arr.length < 1) {
      setError('Select at least one ministry priority');
      return;
    }
    if (arr.length !== new Set(arr).size) {
      setError('Each priority must be a different ministry');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/priority/submit', { priorities: arr });
      setSuccess('Priorities submitted. You may edit them until the placement algorithm runs.');
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadOrder = () => {
    if (!status?.placement) return;
    generatePlacementOrderPDF(status.placement);
  };

  if (!nidData) return null;

  return (
    <div className="priority-page page-enter">
      <div className="container">
        <h2 className="priority-title">Ministry Priority &amp; Placement</h2>
        <p className="priority-sub">
          After passing the PSC examination, rank your top ministry choices. The placement algorithm
          will assign you to a specific section based on merit rank, priority order, and education match.
        </p>

        {loading ? (
          <div className="card"><p>Loading...</p></div>
        ) : !status?.eligible ? (
          <div className="card">
            <div className="banner banner-warning">
              <span className="x-icon">!</span>
              You are not yet eligible to submit priorities. Only candidates with a
              published <strong>PASS</strong> result can proceed.
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn-outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : status?.placement?.published ? (
          // ─── Show placement order ───
          <PlacementOrderCard
            order={status.placement}
            candidateName={nidData.nameEnglish}
            onDownload={handleDownloadOrder}
          />
        ) : (
          <>
            {/* Merit rank banner */}
            <div className="rank-banner">
              <div>
                <span className="rank-label">Your Merit Rank</span>
                <span className="rank-value">#{status.resultRank}</span>
              </div>
              <div>
                <span className="rank-label">Roll Number</span>
                <span className="rank-roll">{status.rollNumber}</span>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Select Ministry Priorities</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                Rank 1 is processed first. Higher education match within a ministry wins the section.
                If none of your priorities have a matching open section, national fallback places you in the
                best-matching available section anywhere.
              </p>

              {status?.priority?.locked && (
                <div className="banner banner-warning mb-16">
                  <span className="x-icon">!</span>
                  Priorities are locked — the placement algorithm has been run. Your order will be published shortly.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <PrioritySelect
                  order={1}
                  value={p1}
                  onChange={setP1}
                  ministries={ministries}
                  exclude={[p2, p3]}
                  disabled={status?.priority?.locked}
                />
                <PrioritySelect
                  order={2}
                  value={p2}
                  onChange={setP2}
                  ministries={ministries}
                  exclude={[p1, p3]}
                  disabled={status?.priority?.locked}
                />
                <PrioritySelect
                  order={3}
                  value={p3}
                  onChange={setP3}
                  ministries={ministries}
                  exclude={[p1, p2]}
                  disabled={status?.priority?.locked}
                />

                <div className="min-form-actions mt-24">
                  <button type="button" className="btn-outline" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                  </button>
                  <button
                    type="submit"
                    className="btn-crimson"
                    disabled={submitting || status?.priority?.locked}
                  >
                    {submitting
                      ? 'Submitting...'
                      : status?.priority
                      ? 'Update Priorities'
                      : 'Submit Priorities'}
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
            </div>

            {status?.placement && !status?.placement?.published && (
              <div className="card mt-24">
                <h3 className="card-title">Draft Placement (Not Yet Published)</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  The placement algorithm has been run but the final list has not yet been published.
                  Check back soon — your official placement order will appear here for download.
                </p>
                <div className="placement-draft">
                  <DraftRow label="Match Type" value={status.placement.matchType} />
                  <DraftRow label="Priority Used" value={status.placement.priorityUsed ? `Priority ${status.placement.priorityUsed}` : 'National Fallback'} />
                  <DraftRow label="Order Number" value={status.placement.orderNumber} mono />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PrioritySelect({ order, value, onChange, ministries, exclude, disabled }) {
  const available = ministries.filter((m) => !exclude.includes(m) || m === value);
  return (
    <div className="field-group">
      <label className="form-label">
        Priority {order} {order === 1 && <span style={{ color: 'var(--crimson)' }}>*</span>}
      </label>
      <select
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— Select ministry (optional for P{order}) —</option>
        {available.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

function DraftRow({ label, value, mono }) {
  return (
    <div className="draft-row">
      <span className="draft-label">{label}</span>
      <span className={`draft-value ${mono ? 'mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function PlacementOrderCard({ order, candidateName, onDownload }) {
  const placed = !!order.assignedSectionId && order.matchType !== 'unplaced';
  return (
    <div className="card placement-card">
      <div className={`placement-band ${placed ? 'placed' : 'unplaced'}`}>
        {placed ? 'PLACEMENT ORDER ISSUED' : 'PLACEMENT PENDING'}
      </div>

      <div className="placement-body">
        <div className="placement-order-num">
          Order No. <strong>{order.orderNumber}</strong>
        </div>

        {placed ? (
          <>
            <div className="placement-assigned">
              <span className="placement-assigned-label">PLACED AT</span>
              <div className="placement-ministry">{order.assignedMinistry}</div>
              <div className="placement-section">{order.assignedSectionName}</div>
              <div className="placement-match">
                Education match: <strong>{order.matchType.toUpperCase()}</strong> (score {order.matchScore}/3)
                {' · '}
                {order.priorityUsed ? `Priority ${order.priorityUsed}` : 'National fallback'}
              </div>
            </div>
          </>
        ) : (
          <div className="placement-unplaced-block">
            <p><strong>Unplaced at this cycle.</strong></p>
            <p>No matching section vacancy was available for your profile. PSC will re-run placement in the next cycle.</p>
          </div>
        )}

        <div className="placement-meta">
          <div><span>Candidate</span><strong>{candidateName}</strong></div>
          <div><span>Merit Rank</span><strong>#{order.resultRank}</strong></div>
          <div><span>Exam Score</span><strong>{order.resultScore}/100</strong></div>
          <div><span>Issued</span><strong>{new Date(order.publishedAt || order.placementDate).toLocaleDateString()}</strong></div>
        </div>

        {placed && (
          <div className="placement-dsc">
            <div className="placement-dsc-label">Digital Signature (SHA-256)</div>
            <div className="placement-dsc-val mono">{order.dscSignature}</div>
          </div>
        )}

        <div className="placement-actions">
          <button className="btn-crimson" onClick={onDownload}>
            ⬇ Download Placement Order (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
