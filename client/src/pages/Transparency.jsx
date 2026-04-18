import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import './Transparency.css';

export default function Transparency() {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/audit/public/dashboard').catch(() => ({ data: null })),
      api.get('/anti-gaming/annual-report', { params: { year: '2082' } }).catch(() => ({ data: null }))
    ]).then(([d, r]) => {
      setData(d.data);
      setReport(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="container" style={{ padding: 40 }}>Loading public transparency data...</div>;

  return (
    <div className="transparency-page page-enter">
      <div className="container">
        <div className="transparency-header">
          <span className="transparency-badge">🔓 PUBLIC TRANSPARENCY PORTAL</span>
          <h1>Civil Service Transfer Transparency</h1>
          <p className="transparency-sub">
            Published under the Right to Information Act 2064 · Government of Nepal
          </p>
        </div>

        {data?.integrity && (
          <div className={`transparency-hero ${data.integrity.chainIntact ? 'intact' : 'broken'}`}>
            <div className="hero-icon">{data.integrity.chainIntact ? '🛡️' : '⚠️'}</div>
            <div>
              <h2>{data.integrity.chainIntact ? 'System Integrity: Verified' : 'Integrity Compromised'}</h2>
              <p>
                {data.integrity.chainLength} cryptographically chained audit records. Every scoring, placement, transfer, override, and appeal
                decision is recorded in an immutable SHA-256 hash chain that can be re-verified by any independent auditor at any time.
              </p>
            </div>
          </div>
        )}

        {data?.integrityMetrics && (
          <div className="card mt-16">
            <h3 className="card-title">System-wide Integrity Metrics</h3>
            <div className="metric-row">
              <div className="metric">
                <div className="metric-v">{data.integrityMetrics.totalOverrides}</div>
                <div className="metric-l">Override Decisions</div>
                <div className="metric-note">Each with published written justification</div>
              </div>
              <div className="metric">
                <div className="metric-v">{data.integrityMetrics.totalAppeals}</div>
                <div className="metric-l">Appeals Filed</div>
                <div className="metric-note">By officers against their transfer orders</div>
              </div>
              <div className="metric">
                <div className="metric-v" style={{ color: data.integrityMetrics.openAlerts > 0 ? 'var(--error)' : 'var(--success)' }}>
                  {data.integrityMetrics.openAlerts}
                </div>
                <div className="metric-l">Open CIAA Alerts</div>
                <div className="metric-note">Triggered automatically at 3+ overrides/window</div>
              </div>
              <div className="metric">
                <div className="metric-v">{data.integrity.chainLength}</div>
                <div className="metric-l">Audit Records</div>
                <div className="metric-note">Cryptographically chained, tamper-evident</div>
              </div>
            </div>
          </div>
        )}

        {data?.windows && data.windows.length > 0 && (
          <div className="card mt-16">
            <h3 className="card-title">Recent Transfer Windows</h3>
            <p className="card-sub">
              Twice-yearly batches (April–May primary, October–November secondary). Each window runs a transparent
              6-criterion weighted scoring process visible to every officer.
            </p>
            <div className="sections-table-wrap">
              <table className="sections-table">
                <thead>
                  <tr>
                    <th>Window</th>
                    <th>State</th>
                    <th>Orders Drafted</th>
                    <th>Appeals</th>
                    <th>Orders Issued</th>
                    <th>Opens</th>
                  </tr>
                </thead>
                <tbody>
                  {data.windows.map((w) => (
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

        {report?.workforceDistribution && (
          <div className="card mt-16">
            <h3 className="card-title">Workforce Distribution</h3>
            <div className="dist-grid">
              <div>
                <h4 className="dist-title">By Ministry</h4>
                <ul className="dist-list">
                  {report.workforceDistribution.byMinistry.map((m) => (
                    <li key={m.ministry}>
                      <span>{m.ministry || 'Unassigned'}</span>
                      <strong>{m.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="dist-title">By District Hardship Tier</h4>
                <ul className="dist-list">
                  {report.workforceDistribution.byTier.map((t) => (
                    <li key={t.tier}>
                      <span><span className={`tier-chip tier-${t.tier}`}>Tier {t.tier}</span></span>
                      <strong>{t.count}</strong>
                    </li>
                  ))}
                </ul>
                <div className="tier-legend">
                  <strong>Tier A</strong> urban · <strong>B</strong> semi-accessible ·
                  <strong> C</strong> remote · <strong>D</strong> extreme hardship
                </div>
              </div>
            </div>
          </div>
        )}

        {data?.overrides && data.overrides.length > 0 && (
          <div className="card mt-16">
            <h3 className="card-title">Published Override Justifications</h3>
            <p className="card-sub">
              Per design principle <strong>P2</strong> (rule-based) every deviation from the system's recommended
              transfer must be justified in writing and counter-signed by next-level authority. The full justification
              text is published here alongside the order.
            </p>
            <div className="override-list">
              {data.overrides.map((o) => (
                <div key={o.orderNumber} className="override-card">
                  <div className="override-head">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--crimson)' }}>{o.orderNumber}</span>
                    <span>{new Date(o.date).toLocaleDateString()}</span>
                  </div>
                  <div className="override-officer">
                    Officer: <strong>{o.officerName}</strong>
                  </div>
                  <div className="override-route">
                    <div className="override-box">
                      <small>System recommended</small>
                      <strong>{o.systemRecommended}</strong>
                    </div>
                    <span className="override-arrow">→ overridden to →</span>
                    <div className="override-box override-to">
                      <small>Actually posted</small>
                      <strong>{o.overriddenTo}</strong>
                    </div>
                  </div>
                  <div className="override-justif">
                    <div className="override-justif-label">Secretary's Written Justification</div>
                    <p>{o.justification}</p>
                  </div>
                  <div className="override-signers">
                    <span>Proposed by: <strong>{o.proposedBy}</strong></span>
                    {o.countersignedBy ? (
                      <span>· Counter-signed by: <strong>{o.countersignedBy}</strong></span>
                    ) : (
                      <span style={{ color: 'var(--warning)' }}>· Awaiting counter-sign</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card mt-16">
          <h3 className="card-title">How This System Keeps Civil Service Fair</h3>
          <div className="principle-grid">
            <div className="principle">
              <div className="principle-num">P1</div>
              <h4>Transparency</h4>
              <p>Every decision, score, and posting history visible to any citizen via this dashboard.</p>
            </div>
            <div className="principle">
              <div className="principle-num">P2</div>
              <h4>Rule-based</h4>
              <p>Same 6-criterion weighted formula applied to every officer. No override without logged, counter-signed written justification of at least 100 characters.</p>
            </div>
            <div className="principle">
              <div className="principle-num">P3</div>
              <h4>Timeliness</h4>
              <p>Fixed calendar. No officer may stay beyond mandated tenure. 15% ministry cap prevents service blackouts.</p>
            </div>
            <div className="principle">
              <div className="principle-num">P4</div>
              <h4>Merit + context</h4>
              <p>Qualifications and experience matter, but so do personal circumstance, hardship equity, and verified exemptions.</p>
            </div>
            <div className="principle">
              <div className="principle-num">P5</div>
              <h4>Auditability</h4>
              <p>Every transfer, exemption, appeal, and override permanently logged — SHA-256 chained — accessible to CIAA and OAG.</p>
            </div>
          </div>
        </div>

        <div className="card mt-16">
          <h3 className="card-title">Found Something Unusual?</h3>
          <p>
            If you believe a transfer decision was improper, file a grievance — grievances are permanent parts of
            the public record. If you're a civil servant who believes your own score or placement is incorrect, file
            an appeal through your HRMIS profile.
          </p>
          <div className="action-row">
            <Link to="/grievance" className="btn-crimson">File a Grievance</Link>
            <Link to="/merit-list" className="btn-outline">View Merit List</Link>
            <Link to="/results" className="btn-outline">Check Exam Results</Link>
          </div>
        </div>

        <div className="transparency-footer">
          <small>
            Generated from HRMIS live data · All counts reflect current database state · Integrity status re-verified on page load
          </small>
        </div>
      </div>
    </div>
  );
}
