import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { formatNid } from '../utils/formatNid.js';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [nidNumber, setNidNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!nidNumber.trim() || !password.trim()) {
      setError('Enter both NID and password');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminApi.post('/admin-auth/login', { nidNumber, password });
      login(res.data.token, res.data.user);

      // Route based on primary role
      const roles = res.data.user.roles || [];
      if (roles.includes('psc-admin')) {
        navigate('/admin/psc', { replace: true });
      } else if (roles.includes('mofaga-admin')) {
        navigate('/admin/mofaga', { replace: true });
      } else if (roles.some((r) => ['ciaa-auditor', 'oag-auditor'].includes(r))) {
        navigate('/admin/watchdog', { replace: true });
      } else if (roles.includes('ministry-secretary')) {
        navigate('/admin/ministry', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page page-enter">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-seal">
            <span>DSC</span>
          </div>
          <h2>HRMIS Administrative Login</h2>
          <p>Ministry Secretaries · PSC Officials · MoFAGA Administrators</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-body">
          <div className="field-group">
            <label className="form-label" htmlFor="admin-nid">NID Number</label>
            <input
              id="admin-nid"
              className="form-input"
              placeholder="10-digit NID"
              value={formatNid(nidNumber)}
              onChange={(e) => {
                setNidNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              maxLength={12}
              inputMode="numeric"
            />
          </div>

          <div className="field-group">
            <label className="form-label" htmlFor="admin-pw">Password (DSC PIN)</label>
            <input
              id="admin-pw"
              className="form-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary admin-login-btn"
            disabled={submitting}
          >
            {submitting ? (
              <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Authenticating DSC...</>
            ) : (
              'Authenticate via DSC'
            )}
          </button>

          {error && (
            <div className="banner banner-error" style={{ marginTop: 14 }}>
              <span className="x-icon">!</span>
              {error}
            </div>
          )}

          <div className="admin-login-hint">
            <strong>Test Accounts (password: admin123):</strong>
            <ul>
              <li><code>900-000-0001</code> — Secretary, MoFA</li>
              <li><code>900-000-0002</code> — Secretary, Finance</li>
              <li><code>900-000-0003</code> — Secretary, Home Affairs</li>
              <li><code>999-999-9999</code> — PSC Chairman</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
