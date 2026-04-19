import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Breadcrumbs from './components/Breadcrumbs.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import AdmitCard from './pages/AdmitCard.jsx';
import Results from './pages/Results.jsx';
import Priority from './pages/Priority.jsx';
import Officer from './pages/Officer.jsx';
import Transparency from './pages/Transparency.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import MinistryDashboard from './pages/MinistryDashboard.jsx';
import PSCAdminDashboard from './pages/PSCAdminDashboard.jsx';
import MofagaDashboard from './pages/MofagaDashboard.jsx';
import WatchdogDashboard from './pages/WatchdogDashboard.jsx';
import MeritList from './pages/MeritList.jsx';
import Grievance from './pages/Grievance.jsx';

import { useAuth } from './context/AuthContext.jsx';
import { useAdminAuth } from './context/AdminAuthContext.jsx';
import './App.css';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/profile" replace />;
  return children;
}

function AdminProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAdminAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles || [];
    if (!allowedRoles.some((r) => userRoles.includes(r))) return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function AdminPublicOnlyRoute({ children }) {
  const { token, user } = useAdminAuth();
  if (token && user) {
    if (user.roles?.includes('psc-admin')) return <Navigate to="/admin/psc" replace />;
    if (user.roles?.includes('mofaga-admin')) return <Navigate to="/admin/mofaga" replace />;
    if (user.roles?.some((r) => ['ciaa-auditor', 'oag-auditor'].includes(r))) return <Navigate to="/admin/watchdog" replace />;
    if (user.roles?.includes('ministry-secretary')) return <Navigate to="/admin/ministry" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Breadcrumbs />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admit-card" element={<ProtectedRoute><AdmitCard /></ProtectedRoute>} />
          <Route path="/priority" element={<ProtectedRoute><Priority /></ProtectedRoute>} />
          <Route path="/officer" element={<ProtectedRoute><Officer /></ProtectedRoute>} />
          <Route path="/results" element={<Results />} />
          <Route path="/merit-list" element={<MeritList />} />
          <Route path="/grievance" element={<Grievance />} />
          <Route path="/transparency" element={<Transparency />} />

          <Route path="/admin/login" element={<AdminPublicOnlyRoute><AdminLogin /></AdminPublicOnlyRoute>} />
          <Route path="/admin/ministry" element={
            <AdminProtectedRoute allowedRoles={['ministry-secretary']}><MinistryDashboard /></AdminProtectedRoute>
          } />
          <Route path="/admin/psc" element={
            <AdminProtectedRoute allowedRoles={['psc-admin']}><PSCAdminDashboard /></AdminProtectedRoute>
          } />
          <Route path="/admin/mofaga" element={
            <AdminProtectedRoute allowedRoles={['mofaga-admin']}><MofagaDashboard /></AdminProtectedRoute>
          } />
          <Route path="/admin/watchdog" element={
            <AdminProtectedRoute allowedRoles={['ciaa-auditor', 'oag-auditor']}><WatchdogDashboard /></AdminProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container footer-grid">
          <div className="footer-block">
            <div className="footer-logo">
              <span className="logo-badge skiptranslate">NDHRMS </span>
              <strong>Nepal Digital HR Management System</strong>
            </div>
            <p className="footer-tag">
              An integrated platform for PSC recruitment, MoFAGA transfers, and HRMIS — built on
              transparency, rule-based scoring, and cryptographically auditable decisions.
            </p>
          </div>
          <div className="footer-block">
            <h4>Public</h4>
            <a href="/merit-list">Merit List</a>
            <a href="/results">Results</a>
            <a href="/transparency">Transparency</a>
            <a href="/grievance">Grievance</a>
          </div>
          <div className="footer-block">
            <h4>Access</h4>
            <a href="/login">Candidate Login</a>
            <a href="/profile">My Profile</a>
            <a href="/admin/login">Admin Portal</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            © 2026 Government of Nepal · NDHRMS · Licensed under
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer"> MIT License</a>
            {' · '}Developed by <a href="https://github.com/raazkhnl" target="_blank" rel="noreferrer">@raazkhnl</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
