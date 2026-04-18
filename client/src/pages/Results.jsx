import React, { useState } from 'react';
import api from '../utils/api.js';
import './Results.css';

export default function Results() {
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    setError('');
    setResult(null);
    const roll = rollNumber.trim();
    if (!roll) {
      setError('Enter a roll number to check your result');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/results/${roll}`);
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Result not published yet for this roll number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="results-page page-enter">
      <div className="container">
        <div className="results-hero">
          <h2>Check Your Result</h2>
          <p>Enter your PSC roll number to view your examination result.</p>
        </div>

        <form onSubmit={handleSearch} className="card results-form">
          <label className="form-label" htmlFor="roll-input">
            Roll Number
          </label>
          <div className="results-row">
            <input
              id="roll-input"
              className="form-input"
              placeholder="PSC-2026-XXXXXX"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} /> Checking...
                </>
              ) : (
                'Check Result'
              )}
            </button>
          </div>

          <div className="results-hint">
            <strong>Test roll numbers:</strong>
            <ul>
              <li><code>PSC-2026-100001</code> → PASS</li>
              <li><code>PSC-2026-100002</code> → FAIL</li>
              <li><code>PSC-2026-100003</code> → WAITLIST</li>
            </ul>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)' }}>
              Disagree with your result? <a href="/grievance" style={{ color: 'var(--crimson)', fontWeight: 600 }}>File a grievance →</a>
            </div>
          </div>
        </form>

        {error && (
          <div className="banner banner-error mt-16">
            <span className="x-icon">!</span>
            {error}
          </div>
        )}

        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const total = Number(result.totalScore) || 0;
  const statusMap = {
    pass: { label: 'PASS', cls: 'result-pass', msg: 'Congratulations! You have qualified for the next round.' },
    fail: { label: 'NOT QUALIFIED', cls: 'result-fail', msg: 'Better luck next time. Keep preparing — you can do it.' },
    waitlist: { label: 'WAITLIST', cls: 'result-wait', msg: 'You are on the waitlist. Await further communication from PSC.' }
  };
  const meta = statusMap[result.status] || statusMap.fail;

  return (
    <div className={`result-card ${meta.cls} page-enter`}>
      <div className="result-band">
        <span>{meta.label}</span>
      </div>
      <div className="result-body">
        <div className="result-roll">
          <span className="result-roll-label">Roll Number</span>
          <span className="result-roll-value">{result.rollNumber}</span>
        </div>

        {result.postId && (
          <div className="result-post">
            <span className="result-row-label">Post</span>
            <span className="result-row-value">{result.postId.postNameEnglish}</span>
          </div>
        )}

        <div className="result-scores">
          <div className="score-box">
            <span className="score-label">Written</span>
            <span className="score-val">{result.writtenScore} / 80</span>
          </div>
          <div className="score-box">
            <span className="score-label">Interview</span>
            <span className="score-val">{result.interviewScore} / 20</span>
          </div>
          <div className="score-box score-total">
            <span className="score-label">Total</span>
            <span className="score-val">{total} / 100</span>
          </div>
        </div>

        <div className="result-rank">
          <span className="result-row-label">Rank</span>
          <span className="result-row-value">#{result.rank || '—'}</span>
        </div>

        <p className="result-msg">{meta.msg}</p>
      </div>
    </div>
  );
}
