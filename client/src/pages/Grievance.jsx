import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import NidLookup from '../components/NidLookup.jsx';
import './Grievance.css';

const TYPE_OPTIONS = [
  { value: 'score-challenge', label: 'Score Challenge' },
  { value: 'registration-issue', label: 'Registration Issue' },
  { value: 'result-dispute', label: 'Result Dispute' },
  { value: 'other', label: 'Other' }
];

export default function Grievance() {
  const [form, setForm] = useState({
    nidNumber: '',
    rollNumber: '',
    contactMobile: '',
    type: 'score-challenge',
    subject: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [mine, setMine] = useState([]);

  const refreshMine = async (nid) => {
    if (!nid || nid.length !== 11) return;
    try {
      const res = await api.get(`/grievances/mine/${nid}`);
      setMine(res.data || []);
    } catch {
      setMine([]);
    }
  };

  useEffect(() => {
    if (form.nidNumber.length === 11) {
      refreshMine(form.nidNumber);
    } else {
      setMine([]);
    }
  }, [form.nidNumber]);

  const handleChange = (field) => (e) => {
    const v = field === 'nidNumber' ? e.target.value.replace(/\D/g, '').slice(0, 11) : e.target.value;
    setForm({ ...form, [field]: v });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);

    if (form.nidNumber.length !== 11) {
      setError('NID must be 11 digits');
      return;
    }
    if (!form.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (form.description.trim().length < 30) {
      setError('Description must be at least 30 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/grievances', form);
      setMessage(res.data.message || 'Submitted successfully');
      setForm({
        nidNumber: form.nidNumber,
        rollNumber: '',
        contactMobile: '',
        type: 'score-challenge',
        subject: '',
        description: ''
      });
      refreshMine(form.nidNumber);
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grievance-page page-enter">
      <div className="container">
        <div className="grievance-hero">
          <h1>File a Grievance</h1>
          <p>
            Dispute a score, report a registration issue, or raise any concern about the examination process.
            The review committee responds within 7 working days.
          </p>
        </div>

        <div className="grievance-layout-public">
          <div className="card">
            <h3 className="card-title">Submit New Grievance</h3>

            <form onSubmit={handleSubmit}>
              <div className="min-form-grid">
                <div className="field-group">
                  <NidLookup
                    label="Your NID Number"
                    required
                    value={form.nidNumber}
                    onChange={(v) => { setForm({ ...form, nidNumber: v }); setError(''); }}
                  />
                </div>
                <div className="field-group">
                  <label className="form-label">Roll Number (optional)</label>
                  <input
                    className="form-input"
                    placeholder="PSC-2026-XXXXXX"
                    value={form.rollNumber}
                    onChange={handleChange('rollNumber')}
                  />
                </div>
              </div>

              <div className="min-form-grid">
                <div className="field-group">
                  <label className="form-label">Contact Mobile (optional)</label>
                  <input
                    className="form-input"
                    placeholder="98XXXXXXXX"
                    value={form.contactMobile}
                    onChange={handleChange('contactMobile')}
                  />
                </div>
                <div className="field-group">
                  <label className="form-label">Grievance Type *</label>
                  <select className="form-select" value={form.type} onChange={handleChange('type')}>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="form-label">Subject *</label>
                <input
                  className="form-input"
                  placeholder="Brief subject line"
                  value={form.subject}
                  onChange={handleChange('subject')}
                  maxLength={120}
                />
              </div>

              <div className="field-group">
                <label className="form-label">
                  Description * <small style={{ color: 'var(--gray-500)' }}>(min 30 characters)</small>
                </label>
                <textarea
                  className="form-input"
                  rows={5}
                  style={{ height: 'auto', padding: 12 }}
                  placeholder="Describe the issue in detail, including any relevant question numbers, dates, or references..."
                  value={form.description}
                  onChange={handleChange('description')}
                />
                <small style={{ color: 'var(--gray-500)' }}>
                  {form.description.length} characters
                </small>
              </div>

              <div className="min-form-actions">
                <button type="submit" className="btn-crimson" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Grievance'}
                </button>
              </div>

              {error && (
                <div className="banner banner-error mt-16">
                  <span className="x-icon">!</span>{error}
                </div>
              )}
              {message && (
                <div className="banner banner-success mt-16">
                  <span className="check-icon">✓</span>{message}
                </div>
              )}
            </form>
          </div>

          {mine.length > 0 && (
            <div className="card mt-24">
              <h3 className="card-title">Your Previous Grievances</h3>
              <div className="grievance-items">
                {mine.map((g) => (
                  <div key={g._id} className="grievance-item-public">
                    <div className="grievance-item-top">
                      <span className={`badge badge-${statusColor(g.status)}`}>{g.status}</span>
                      <small>{new Date(g.submittedAt).toLocaleDateString()}</small>
                    </div>
                    <div className="grievance-item-subject">{g.subject}</div>
                    <div className="grievance-item-meta">{g.type}{g.rollNumber ? ` · ${g.rollNumber}` : ''}</div>
                    {g.adminNotes && (
                      <div className="grievance-admin-response">
                        <strong>PSC Response:</strong> {g.adminNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function statusColor(status) {
  return {
    submitted: 'warning',
    'under-review': 'navy',
    resolved: 'success',
    rejected: 'error'
  }[status] || 'navy';
}
