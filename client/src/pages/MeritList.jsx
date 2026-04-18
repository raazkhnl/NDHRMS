import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api.js';
import './MeritList.css';

export default function MeritList() {
  const [summary, setSummary] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postFilter, setPostFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/merit-list/summary').then((r) => setSummary(r.data || []));
    load();
  }, []);

  const load = async (postId = '', status = '') => {
    setLoading(true);
    try {
      const params = {};
      if (postId) params.postId = postId;
      if (status) params.status = status;
      const res = await api.get('/merit-list', { params });
      setEntries(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handlePostChange = (e) => {
    setPostFilter(e.target.value);
    load(e.target.value, statusFilter);
  };
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    load(postFilter, e.target.value);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.rollNumber?.toLowerCase().includes(q) ||
        e.candidateName?.toLowerCase().includes(q) ||
        e.postName?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totals = useMemo(() => {
    return {
      all: entries.length,
      pass: entries.filter((e) => e.status === 'pass').length,
      waitlist: entries.filter((e) => e.status === 'waitlist').length,
      fail: entries.filter((e) => e.status === 'fail').length
    };
  }, [entries]);

  return (
    <div className="merit-page page-enter">
      <section className="merit-hero">
        <div className="container">
          <h1>Public Merit List</h1>
          <p>
            Real-time rankings of all published examination results.
            This dashboard is publicly accessible to every citizen of Nepal.
          </p>
        </div>
      </section>

      <div className="container">
        {summary.length > 0 && (
          <div className="merit-summary">
            <h3 className="card-title">Published Examinations</h3>
            <div className="summary-grid">
              {summary.map((s) => (
                <button
                  key={s.postId}
                  className={`summary-tile ${postFilter === s.postId ? 'active' : ''}`}
                  onClick={() => {
                    setPostFilter(s.postId);
                    load(s.postId, statusFilter);
                  }}
                >
                  <div className="summary-tile-code">{s.postCode}</div>
                  <div className="summary-tile-name">{s.postName}</div>
                  <div className="summary-tile-stats">
                    <span className="chip chip-success">{s.passed} pass</span>
                    <span className="chip chip-warning">{s.waitlist} wait</span>
                    <span className="chip chip-error">{s.failed} fail</span>
                  </div>
                </button>
              ))}
            </div>
            {postFilter && (
              <button className="btn-outline" onClick={() => { setPostFilter(''); load('', statusFilter); }}>
                Clear post filter
              </button>
            )}
          </div>
        )}

        <div className="card mt-24">
          <div className="merit-toolbar">
            <input
              className="form-input"
              placeholder="Search name, roll #, or post..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-select" value={statusFilter} onChange={handleStatusChange}>
              <option value="">All statuses ({totals.all})</option>
              <option value="pass">Pass ({totals.pass})</option>
              <option value="waitlist">Waitlist ({totals.waitlist})</option>
              <option value="fail">Fail ({totals.fail})</option>
            </select>
          </div>

          {loading ? (
            <p className="mt-16">Loading merit list...</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No published results matching filters.</p>
            </div>
          ) : (
            <div className="sections-table-wrap mt-16">
              <table className="sections-table merit-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Rank</th>
                    <th>Candidate</th>
                    <th>Roll #</th>
                    <th>Post / Ministry</th>
                    <th style={{ textAlign: 'center' }}>Written</th>
                    <th style={{ textAlign: 'center' }}>Interview</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr key={e.rollNumber || idx} className={`merit-row-${e.status}`}>
                      <td><strong className="merit-rank-cell">#{e.rank}</strong></td>
                      <td>
                        {e.candidateNameNepali && (
                          <div className="nepali merit-name-np">{e.candidateNameNepali}</div>
                        )}
                        <div className="merit-name-en">{e.candidateName}</div>
                        <small style={{ color: 'var(--gray-500)' }}>NID {e.maskedNid}</small>
                      </td>
                      <td><span className="mono">{e.rollNumber}</span></td>
                      <td>
                        <div>{e.postName}</div>
                        <small style={{ color: 'var(--gray-500)' }}>{e.ministry}</small>
                      </td>
                      <td style={{ textAlign: 'center' }}>{e.writtenScore}</td>
                      <td style={{ textAlign: 'center' }}>{e.interviewScore}</td>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{e.totalScore}</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${statusBadgeColor(e.status)}`}>
                          {e.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="info-card mt-24">
          <h4>Transparency &amp; Grievance</h4>
          <p>
            This merit list is published under the Right to Information Act. Any citizen may inspect any entry.
            If you believe a score is incorrect, file a grievance — the review committee responds within 7 working days.
          </p>
          <a href="/grievance" className="btn-outline mt-16" style={{ display: 'inline-block', textDecoration: 'none' }}>
            File a Grievance →
          </a>
        </div>
      </div>
    </div>
  );
}

function statusBadgeColor(status) {
  return { pass: 'success', waitlist: 'warning', fail: 'error' }[status] || 'navy';
}
