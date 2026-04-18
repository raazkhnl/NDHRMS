import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDefaultAvatar } from '../utils/avatar.js';
import { formatNid } from '../utils/formatNid.js';
import './Navbar.css';

export default function Navbar() {
  const { token, nidData, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const avatarUrl = nidData ? getDefaultAvatar(nidData.gender) : null;

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
          <div className="navbar-crest" aria-hidden="true">
            <span className="logo-badge">NDHRMS </span>
          </div>
          <div className="navbar-title">
            <span className="title-np nepali">नेपाल डिजिटल मानव स्रोत व्यवस्थापन प्रणाली</span>
            <span className="title-en">Nepal Digital HR Management System</span>
          </div>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        <nav className={`navbar-actions ${mobileOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/" className="nav-link" end onClick={() => setMobileOpen(false)}>Home</NavLink>
          <NavLink to="/merit-list" className="nav-link" onClick={() => setMobileOpen(false)}>Merit List</NavLink>
          <NavLink to="/results" className="nav-link" onClick={() => setMobileOpen(false)}>Results</NavLink>
          <NavLink to="/transparency" className="nav-link" onClick={() => setMobileOpen(false)}>Transparency</NavLink>
          <NavLink to="/grievance" className="nav-link" onClick={() => setMobileOpen(false)}>Grievance</NavLink>

          {token && nidData ? (
            <div className="nav-profile-wrap" ref={menuRef}>
              <button className="nav-profile-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <img src={avatarUrl} alt="" className="nav-avatar" />
                <span className="nav-profile-name">{nidData.nameEnglish?.split(' ')[0] || 'User'}</span>
                <svg className={`nav-caret ${menuOpen ? 'open' : ''}`} width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2 3 L5 7 L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </button>
              {menuOpen && (
                <div className="nav-profile-menu">
                  <div className="nav-profile-header">
                    <img src={avatarUrl} alt="" />
                    <div>
                      <strong>{nidData.nameEnglish}</strong>
                      <small>NID <span className="mono">{formatNid(nidData.nidNumber)}</span></small>
                    </div>
                  </div>
                  <Link to="/profile" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                    <span>🏠</span> My Profile
                  </Link>
                  <Link to="/dashboard" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                    <span>📋</span> Apply for Exam
                  </Link>
                  <Link to="/priority" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                    <span>🎯</span> Priority &amp; Placement
                  </Link>
                  <Link to="/officer" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                    <span>🏛️</span> HRMIS Officer Profile
                  </Link>
                  <div className="nav-menu-divider" />
                  <button className="nav-menu-item nav-menu-danger" onClick={handleLogout}>
                    <span>⎋</span> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-btn" onClick={() => setMobileOpen(false)}>Candidate Login</Link>
              <Link to="/admin/login" className="nav-link nav-link-admin" onClick={() => setMobileOpen(false)}>Admin</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
