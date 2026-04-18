import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Breadcrumbs.css';

/**
 * Auto-derives crumbs from the current URL path.
 * Custom names can override segments via the `names` prop:
 *   <Breadcrumbs names={{ 'admin': 'Admin', 'psc': 'PSC' }} />
 */
const PATH_NAMES = {
  '': 'Home',
  'login': 'Candidate Login',
  'dashboard': 'Dashboard',
  'profile': 'My Profile',
  'admit-card': 'Admit Card',
  'priority': 'Priority & Placement',
  'officer': 'HRMIS Profile',
  'results': 'Results',
  'merit-list': 'Merit List',
  'grievance': 'Grievances',
  'transparency': 'Transparency',
  'admin': 'Admin',
  'psc': 'PSC',
  'mofaga': 'MoFAGA',
  'ministry': 'Ministry',
  'watchdog': 'Watchdog'
};

export default function Breadcrumbs({ names = {}, showBack = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length === 0) return null;

  const crumbs = [{ path: '/', label: 'Home' }];
  let cur = '';
  parts.forEach((p) => {
    cur += '/' + p;
    const label = names[p] || PATH_NAMES[p] || p.replace(/-/g, ' ');
    crumbs.push({ path: cur, label });
  });

  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      <div className="container breadcrumbs-inner">
        {showBack && (
          <button className="crumb-back" onClick={() => navigate(-1)} title="Back">
            ← Back
          </button>
        )}
        <ol>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={c.path} className={isLast ? 'current' : ''}>
                {isLast ? <span>{c.label}</span> : <Link to={c.path}>{c.label}</Link>}
                {!isLast && <span className="sep">›</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
