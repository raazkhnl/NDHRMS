import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import './Home.css';

const HOW_TO_STEPS = [
  {
    num: 1,
    title: 'NID Verification',
    body: 'Enter your National ID number and verify via OTP sent to your registered mobile.'
  },
  {
    num: 2,
    title: 'Qualification Details',
    body: 'Enter your Exam Registration Number to auto-fetch your academic records.'
  },
  {
    num: 3,
    title: 'Post Selection',
    body: 'Choose a post you are eligible for and review your complete application.'
  },
  {
    num: 4,
    title: 'Pay & Download Admit Card',
    body: 'Pay via FonePay, eSewa, Khalti or ConnectIPS and download your admit card.'
  }
];

export default function Home() {
  const [stats, setStats] = useState({
    posts: 7,
    vacancies: '~1,000',
    status: 'Open'
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/posts')
      .then((res) => {
        if (cancelled) return;
        const posts = res.data || [];
        const totalVacancies = posts.reduce(
          (sum, p) => sum + (Number(p.totalVacancy) || 0),
          0
        );
        setStats({
          posts: posts.length,
          vacancies: totalVacancies > 0 ? totalVacancies.toLocaleString() : '~1,000',
          status: 'Open'
        });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home page-enter">
      <section className="hero">
        <div className="hero-overlay" aria-hidden="true" />
        <div className="container hero-content">
          <div className="hero-crest">
            <div className="hero-crest-ring">
              <div className="hero-crest-inner">
                <span className="hero-crest-text skiptranslate" translate="no">NDHRMS</span>
                <span className="hero-crest-year">२०८२</span>
              </div>
            </div>
          </div>
          <h1 className="hero-title nepali">नेपाल डिजिटल मानव स्रोत व्यवस्थापन प्रणाली</h1>
          <h2 className="hero-subtitle skiptranslate">Nepal Digital HR Management System</h2>
          <p className="hero-tagline">Integrated PSC Recruitment · MoFAGA Transfer · HRMIS</p>
          <Link to="/login" className="hero-cta">
            Get Started →
          </Link>
        </div>
      </section>

      <section className="container">
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{stats.posts}</div>
            <div className="stat-label">Posts Available</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.vacancies}</div>
            <div className="stat-label">Vacancies</div>
          </div>
          <div className="stat-card">
            <div className="stat-value stat-open">{stats.status}</div>
            <div className="stat-label">Registration</div>
          </div>
        </div>

        <div className="how-section">
          <h3 className="section-title">How to Apply</h3>
          <p className="section-subtitle">
            Complete your application in four structured steps — fully digital, paperless, and verified.
          </p>
          <div className="how-grid">
            {HOW_TO_STEPS.map((s) => (
              <div className="how-card" key={s.num}>
                <div className="how-num">{s.num}</div>
                <h4 className="how-title">{s.title}</h4>
                <p className="how-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="home-cta-row">
          <Link to="/login" className="btn-crimson">
            Start Application
          </Link>
          <Link to="/results" className="btn-outline">
            Check Results
          </Link>
        </div>
      </section>
    </div>
  );
}
