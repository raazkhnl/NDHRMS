import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import './MinistryDashboard.css';

const QUALIFICATION_LEVELS = ['SLC/SEE', '+2/PCL', 'Bachelor', 'Master', 'MPhil', 'PhD'];
const SECTORS = [
  { value: 'general-admin', label: 'General Administration' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'judicial', label: 'Judicial' },
  { value: 'foreign-affairs', label: 'Foreign Affairs' }
];

const EMPTY_FORM = {
  sectionName: '',
  vacantPositions: 1,
  degreeLevel: 'Bachelor',
  preferredStream: '',
  preferredSpecialization: '',
  sector: 'general-admin'
};

export default function MinistryDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockedInfo, setLockedInfo] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!user.roles?.includes('ministry-secretary')) {
      navigate('/admin/login', { replace: true });
      return;
    }
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/ministry/sections');
      setSections(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  };

  const handleEdit = (section) => {
    if (section.locked) return;
    setForm({
      sectionName: section.sectionName,
      vacantPositions: section.vacantPositions,
      degreeLevel: section.educationRequirements?.degreeLevel || 'Bachelor',
      preferredStream: section.educationRequirements?.preferredStream || '',
      preferredSpecialization: section.educationRequirements?.preferredSpecialization || '',
      sector: section.sector || 'general-admin'
    });
    setEditingId(section._id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (sectionId) => {
    if (!confirm('Delete this section? This cannot be undone.')) return;
    try {
      await adminApi.delete(`/ministry/sections/${sectionId}`);
      setSuccess('Section deleted');
      loadSections();
    } catch (err) {
      setError(err?.response?.data?.message || 'Delete failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.sectionName.trim()) {
      setError('Section name is required');
      return;
    }
    if (!form.vacantPositions || Number(form.vacantPositions) < 1) {
      setError('Vacant positions must be at least 1');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sectionName: form.sectionName.trim(),
        vacantPositions: Number(form.vacantPositions),
        educationRequirements: {
          degreeLevel: form.degreeLevel,
          preferredStream: form.preferredStream.trim(),
          preferredSpecialization: form.preferredSpecialization.trim()
        },
        sector: form.sector
      };

      if (editingId) {
        await adminApi.put(`/ministry/sections/${editingId}`, payload);
        setSuccess('Section updated');
      } else {
        await adminApi.post('/ministry/sections', payload);
        setSuccess('Section added to the running list');
      }

      resetForm();
      loadSections();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    setLocking(true);
    setError('');
    try {
      const res = await adminApi.post('/ministry/sections/lock');
      setLockedInfo(res.data);
      setLockConfirmOpen(false);
      loadSections();
    } catch (err) {
      setError(err?.response?.data?.message || 'Lock failed');
      setLockConfirmOpen(false);
    } finally {
      setLocking(false);
    }
  };

  const unlockedCount = sections.filter((s) => !s.locked).length;
  const lockedCount = sections.filter((s) => s.locked).length;
  const totalVacancies = sections.reduce((sum, s) => sum + (s.vacantPositions || 0), 0);

  if (!user) return null;

  return (
    <div className="min-dashboard page-enter">
      <div className="container">
        {/* Header */}
        <div className="min-header">
          <div>
            <span className="min-badge">Ministry Secretary</span>
            <h2>{user.ministry}</h2>
            <p className="min-sub">
              {user.fullName} · <strong>DSC Verified ✓</strong>
            </p>
          </div>
          <button type="button" className="btn-outline" onClick={logout}>
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="min-stats">
          <div className="min-stat"><div className="min-stat-v">{sections.length}</div><div className="min-stat-l">Total Sections</div></div>
          <div className="min-stat"><div className="min-stat-v">{totalVacancies}</div><div className="min-stat-l">Total Vacancies</div></div>
          <div className="min-stat"><div className="min-stat-v" style={{ color: 'var(--success)' }}>{lockedCount}</div><div className="min-stat-l">Approved / Locked</div></div>
          <div className="min-stat"><div className="min-stat-v" style={{ color: 'var(--warning)' }}>{unlockedCount}</div><div className="min-stat-l">Pending Approval</div></div>
        </div>

        {/* Form */}
        <div className="card">
          <h3 className="card-title">
            {editingId ? 'Edit Section' : 'Add Section to Ministry'}
          </h3>
          <p className="min-form-sub">
            Define an internal section of your ministry with the required education profile.
            Sections remain editable until you digitally sign and lock them.
          </p>

          <form onSubmit={handleSubmit} className="min-form">
            <div className="field-group">
              <label className="form-label">Section Name *</label>
              <input
                className="form-input"
                placeholder="e.g. International Relations"
                value={form.sectionName}
                onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
              />
            </div>

            <div className="min-form-grid">
              <div className="field-group">
                <label className="form-label">Vacant Positions *</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={form.vacantPositions}
                  onChange={(e) => setForm({ ...form, vacantPositions: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label className="form-label">Sector</label>
                <select
                  className="form-select"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                >
                  {SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="min-form-grid">
              <div className="field-group">
                <label className="form-label">Minimum Degree Level *</label>
                <select
                  className="form-select"
                  value={form.degreeLevel}
                  onChange={(e) => setForm({ ...form, degreeLevel: e.target.value })}
                >
                  {QUALIFICATION_LEVELS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label className="form-label">Preferred Stream</label>
                <input
                  className="form-input"
                  placeholder="e.g. International Relations"
                  value={form.preferredStream}
                  onChange={(e) => setForm({ ...form, preferredStream: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="form-label">Preferred Specialization</label>
              <input
                className="form-input"
                placeholder="e.g. Policy, Economics, Public Finance"
                value={form.preferredSpecialization}
                onChange={(e) => setForm({ ...form, preferredSpecialization: e.target.value })}
              />
            </div>

            <div className="min-form-actions">
              {editingId && (
                <button type="button" className="btn-outline" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Section' : 'Add to Running List'}
              </button>
            </div>
          </form>

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
        </div>

        {/* Sections list */}
        <div className="card mt-24">
          <div className="sections-list-header">
            <h3 className="card-title" style={{ margin: 0, border: 0, padding: 0 }}>
              Running List of Sections
            </h3>
            <button
              type="button"
              className="btn-crimson"
              disabled={unlockedCount === 0}
              onClick={() => setLockConfirmOpen(true)}
            >
              Approve &amp; Lock ({unlockedCount})
            </button>
          </div>

          {loading && <p className="mt-16">Loading...</p>}
          {!loading && sections.length === 0 && (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>No sections defined yet. Use the form above to add your first section.</p>
            </div>
          )}

          {!loading && sections.length > 0 && (
            <div className="sections-table-wrap">
              <table className="sections-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'center' }}>Positions</th>
                    <th>Education Required</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s._id} className={s.locked ? 'row-locked' : ''}>
                      <td><strong>{s.sectionName}</strong></td>
                      <td>
                        <span className="sector-chip">
                          {SECTORS.find((x) => x.value === s.sector)?.label || s.sector}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="pos-num">{s.vacantPositions}</span>
                      </td>
                      <td>
                        <div className="edu-stack">
                          <strong>{s.educationRequirements?.degreeLevel}</strong>
                          {s.educationRequirements?.preferredStream && (
                            <small>· {s.educationRequirements.preferredStream}</small>
                          )}
                          {s.educationRequirements?.preferredSpecialization && (
                            <small>· {s.educationRequirements.preferredSpecialization}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        {s.locked ? (
                          <span className="badge badge-success">🔒 Locked</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.locked ? (
                          <small className="locked-hint">DSC signed</small>
                        ) : (
                          <>
                            <button className="icon-btn" onClick={() => handleEdit(s)}>✎ Edit</button>
                            <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(s._id)}>🗑 Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="info-card mt-24">
          <h4>About Approve &amp; Lock</h4>
          <p>
            Clicking <strong>Approve &amp; Lock</strong> applies a simulated Digital Signature Certificate (DSC)
            to all unlocked sections in your ministry. A SHA-256 hash of the ministry, your secretary ID,
            and the approval timestamp is stored with each section. Locked sections cannot be edited —
            only a PSC administrator can unlock them.
          </p>
        </div>
      </div>

      {/* Lock confirmation modal */}
      {lockConfirmOpen && (
        <div className="pay-backdrop" role="dialog" aria-modal="true">
          <div className="pay-card" style={{ maxWidth: 480 }}>
            <div className="pay-header">
              <h3 className="pay-title">Confirm Digital Signature</h3>
              <button className="pay-close" onClick={() => setLockConfirmOpen(false)}>×</button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gray-700)', marginBottom: 16 }}>
              You are about to digitally sign and lock <strong>{unlockedCount}</strong> section{unlockedCount !== 1 ? 's' : ''} for <strong>{user.ministry}</strong>.
              Once locked, sections cannot be edited without PSC admin unlock.
            </p>
            <div className="min-form-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setLockConfirmOpen(false)} disabled={locking}>
                Cancel
              </button>
              <button className="btn-crimson" onClick={handleLock} disabled={locking}>
                {locking ? 'Signing...' : '🔒 Apply DSC & Lock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locked success */}
      {lockedInfo && (
        <div className="pay-backdrop" role="dialog" aria-modal="true">
          <div className="pay-card" style={{ maxWidth: 520 }}>
            <div className="pay-success" style={{ padding: '20px 12px' }}>
              <div className="pay-check">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h4>DSC Applied Successfully</h4>
              <p className="pay-success-sub">
                {lockedInfo.count} section{lockedInfo.count !== 1 ? 's' : ''} approved and locked for {lockedInfo.ministry}.
              </p>
              <div className="dsc-hash">
                <span className="dsc-label">SHA-256 DSC Signature</span>
                <span className="dsc-value">{lockedInfo.dscSignature}</span>
              </div>
              <button
                className="btn-primary pay-done-btn"
                onClick={() => setLockedInfo(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
