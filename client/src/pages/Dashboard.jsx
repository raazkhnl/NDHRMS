import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Stepper from '../components/Stepper.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import { generateAdmitCard } from '../utils/admitCard.js';
import './Dashboard.css';

const QUALIFICATION_COLORS = {
  'SLC/SEE': { bg: '#fee2e2', color: '#b91c1c' },
  '+2/PCL': { bg: '#fef3c7', color: '#b45309' },
  Bachelor: { bg: '#dbeafe', color: '#1d4ed8' },
  Master: { bg: '#d1fae5', color: '#047857' },
  MPhil: { bg: '#e9d5ff', color: '#6b21a8' },
  PhD: { bg: '#fae8ff', color: '#86198f' }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { nidData, examData, setExamData, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // --- Tab 2 state ---
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fetchingExam, setFetchingExam] = useState(false);
  const [examError, setExamError] = useState('');

  // --- Tab 3 state ---
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);

  // --- Tab 4 state ---
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const selectedPost = useMemo(
    () => posts.find((p) => p._id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  // Guard
  useEffect(() => {
    if (!nidData) {
      navigate('/login', { replace: true });
    }
  }, [nidData, navigate]);

  // Load posts once
  useEffect(() => {
    let cancelled = false;
    setLoadingPosts(true);
    api
      .get('/posts')
      .then((res) => {
        if (!cancelled) setPosts(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load applications when entering Tab 4
  useEffect(() => {
    if (currentStep !== 4 || !nidData?.nidNumber) return;
    let cancelled = false;
    setLoadingApps(true);
    api
      .get('/application/my-applications', { params: { nidNumber: nidData.nidNumber } })
      .then((res) => {
        if (!cancelled) setApplications(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingApps(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, nidData]);

  const handleFetchExam = async () => {
    setExamError('');
    if (!registrationNumber.trim()) {
      setExamError('Enter your Exam Registration Number');
      return;
    }
    setFetchingExam(true);
    try {
      const res = await api.get(`/exam-register/${registrationNumber.trim()}`);
      if (res.data.nidNumber !== nidData.nidNumber) {
        setExamError('This registration number is not linked to your NID.');
        setExamData(null);
        return;
      }
      setExamData(res.data);
    } catch (err) {
      setExamError(err?.response?.data?.message || 'Failed to fetch registration');
      setExamData(null);
    } finally {
      setFetchingExam(false);
    }
  };

  const handleSelectPost = async (postId) => {
    setSelectedPostId(postId);
    setEligibility(null);
    setConfirmCheck(false);
    if (!postId || !examData?.maximumQualification) return;

    setCheckingEligibility(true);
    try {
      const res = await api.get(`/posts/${postId}/check-eligibility`, {
        params: { qualification: examData.maximumQualification }
      });
      setEligibility(res.data);
    } catch (err) {
      setEligibility({
        eligible: false,
        message: err?.response?.data?.message || 'Could not verify eligibility'
      });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmitPayment = async (method) => {
    if (!selectedPost) throw new Error('No post selected');
    const res = await api.post('/application/submit', {
      nidNumber: nidData.nidNumber,
      postId: selectedPost._id,
      paymentMethod: method,
      amount: selectedPost.examFee
    });
    // Refresh applications list
    api
      .get('/application/my-applications', { params: { nidNumber: nidData.nidNumber } })
      .then((r) => setApplications(r.data || []))
      .catch(() => {});
    return res.data;
  };

  const handleDownloadAdmit = (app) => {
    const addr = nidData.permanentAddress || {};
    const fullAddr = [addr.tole, addr.municipality, `Ward ${addr.ward}`, addr.district, addr.province]
      .filter(Boolean)
      .join(', ');
    generateAdmitCard({
      candidateName: nidData.nameEnglish,
      rollNumber: app.rollNumber,
      postName: app.postId?.postNameEnglish || '—',
      examDate: app.examDate || app.postId?.examDate,
      examCenter: app.examCenter || app.postId?.examCenter,
      fatherName: nidData.fatherName,
      dob: nidData.dateOfBirth,
      address: fullAddr
    });
  };

  if (!nidData) return null;

  const addr = nidData.permanentAddress || {};

  return (
    <div className="dashboard page-enter">
      <div className="container">
        <div className="dash-header">
          <div>
            <h2>Welcome, {nidData.nameEnglish}</h2>
            <p className="dash-sub">
              NID: <strong>{nidData.nidNumber}</strong> · Mobile: {nidData.mobileNumber}
            </p>
          </div>
          <button type="button" className="btn-outline" onClick={() => navigate('/officer')} style={{ marginRight: 8 }}>
            🏛 HRMIS Officer Profile
          </button>
          <button type="button" className="btn-outline" onClick={logout}>
            Logout
          </button>
        </div>

        <Stepper currentStep={currentStep} />

        {/* ───────────────────────── TAB 1 ───────────────────────── */}
        {currentStep === 1 && (
          <div className="tab-content page-enter">
            <h3 className="tab-title">Step 1 — NID Data Review</h3>
            <p className="tab-sub">
              Your details have been auto-populated from the National ID database.
              Please review carefully before proceeding.
            </p>

            <div className="dash-grid-2">
              <div className="card">
                <h4 className="card-title">Personal Information</h4>
                <Field label="Name (Nepali)" value={nidData.nameNepali} nepali />
                <Field label="Name (English)" value={nidData.nameEnglish} />
                <Field label="Date of Birth" value={nidData.dateOfBirth} />
                <Field label="Gender" value={nidData.gender} />
                <Field label="Mobile Number" value={nidData.mobileNumber} />
              </div>

              <div className="card">
                <h4 className="card-title">Family Details</h4>
                <Field label="Father's Name" value={nidData.fatherName} />
                <Field label="Mother's Name" value={nidData.motherName} />
                <Field label="Grandparent's Name" value={nidData.grandparentName} />
              </div>
            </div>

            <div className="card mt-16">
              <h4 className="card-title">Permanent Address</h4>
              <div className="dash-addr">
                <Field label="Province" value={addr.province} />
                <Field label="District" value={addr.district} />
                <Field label="Municipality" value={addr.municipality} />
                <Field label="Ward" value={addr.ward} />
                <Field label="Tole" value={addr.tole} />
              </div>
            </div>

            <div className="dash-actions">
              <button type="button" className="btn-primary" onClick={() => setCurrentStep(2)}>
                Continue to Qualification Details →
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────── TAB 2 ───────────────────────── */}
        {currentStep === 2 && (
          <div className="tab-content page-enter">
            <h3 className="tab-title">Step 2 — Qualification Details</h3>
            <p className="tab-sub">
              Enter your Exam Registration Number to auto-fetch your academic records.
            </p>

            <div className="card">
              <label className="form-label" htmlFor="reg-num">
                Exam Registration Number
              </label>
              <div className="reg-row">
                <input
                  id="reg-num"
                  className="form-input"
                  placeholder="ERN-2024-XXX"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  disabled={fetchingExam}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleFetchExam}
                  disabled={fetchingExam}
                >
                  {fetchingExam ? (
                    <>
                      <span className="spinner" style={{ borderTopColor: '#fff' }} /> Fetching...
                    </>
                  ) : (
                    'Fetch Details'
                  )}
                </button>
              </div>

              {examError && (
                <div className="banner banner-error mt-16">
                  <span className="x-icon">!</span>
                  {examError}
                </div>
              )}

              {examData && (
                <div className="qual-result">
                  <div className="banner banner-success">
                    <span className="check-icon">✓</span>
                    Qualification details verified
                  </div>

                  <div className="qual-card">
                    <div className="qual-head">
                      <span
                        className="qual-badge"
                        style={{
                          background: QUALIFICATION_COLORS[examData.maximumQualification]?.bg,
                          color: QUALIFICATION_COLORS[examData.maximumQualification]?.color
                        }}
                      >
                        {examData.maximumQualification}
                      </span>
                      <span className="qual-reg">#{examData.registrationNumber}</span>
                    </div>
                    <div className="qual-grid">
                      <Field label="University" value={examData.university} />
                      <Field label="Faculty" value={examData.faculty} />
                      <Field label="Stream" value={examData.stream} />
                      <Field label="Year of Completion" value={examData.yearOfCompletion} />
                      <Field label="Percentage / GPA" value={examData.percentage} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="dash-actions">
              <button type="button" className="btn-outline" onClick={() => setCurrentStep(1)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentStep(3)}
                disabled={!examData}
              >
                Continue to Post Selection →
              </button>
            </div>

            <div className="hint-box">
              <strong>Test Registration Numbers:</strong> ERN-2024-001 through ERN-2024-005 (matched to the 5 test NIDs).
            </div>
          </div>
        )}

        {/* ───────────────────────── TAB 3 ───────────────────────── */}
        {currentStep === 3 && (
          <div className="tab-content page-enter">
            <h3 className="tab-title">Step 3 — Post Selection &amp; Review</h3>
            <p className="tab-sub">
              Select a post. Eligibility is verified against your qualification automatically.
            </p>

            <div className="card">
              <label className="form-label" htmlFor="post-select">
                Select Examination Post
              </label>
              <select
                id="post-select"
                className="form-select"
                value={selectedPostId}
                onChange={(e) => handleSelectPost(e.target.value)}
                disabled={loadingPosts}
              >
                <option value="">— Choose a post —</option>
                {posts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.postCode} · {p.postNameEnglish} (Min: {p.minimumQualification})
                  </option>
                ))}
              </select>

              {checkingEligibility && (
                <div className="eligibility-loading">
                  <span className="spinner" /> Checking eligibility...
                </div>
              )}

              {eligibility && !checkingEligibility && selectedPost && (
                <div className={`elig-card ${eligibility.eligible ? 'elig-ok' : 'elig-no'}`}>
                  <div className="elig-head">
                    {eligibility.eligible ? (
                      <>
                        <span className="check-icon">✓</span>
                        <span>You are eligible for this post</span>
                      </>
                    ) : (
                      <>
                        <span className="x-icon">!</span>
                        <span>
                          Your qualification ({eligibility.candidateQualification}) does not meet the minimum
                          requirement ({eligibility.minimumQualification})
                        </span>
                      </>
                    )}
                  </div>

                  {eligibility.eligible && (
                    <div className="qual-grid elig-details">
                      <Field label="Ministry" value={selectedPost.ministry} />
                      <Field label="Department" value={selectedPost.department} />
                      <Field label="Level" value={selectedPost.level} />
                      <Field label="Total Vacancies" value={String(selectedPost.totalVacancy)} />
                      <Field label="Exam Date" value={selectedPost.examDate} />
                      <Field label="Exam Centers" value={selectedPost.examCenter} />
                      <Field
                        label="Application Fee"
                        value={`NPR ${Number(selectedPost.examFee).toLocaleString()}`}
                      />
                    </div>
                  )}

                  {!eligibility.eligible && (
                    <p className="elig-sub">Please select a different post.</p>
                  )}
                </div>
              )}
            </div>

            {eligibility?.eligible && selectedPost && (
              <>
                <div className="dash-grid-2 mt-16">
                  <div className="card">
                    <h4 className="card-title">Section A — Personal Information</h4>
                    <Field label="Name (Nepali)" value={nidData.nameNepali} nepali />
                    <Field label="Name (English)" value={nidData.nameEnglish} />
                    <Field label="Date of Birth" value={nidData.dateOfBirth} />
                    <Field label="Gender" value={nidData.gender} />
                    <Field
                      label="Address"
                      value={[addr.tole, addr.municipality, addr.district, addr.province]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  </div>
                  <div className="card">
                    <h4 className="card-title">Section B — Academic Information</h4>
                    <Field label="Maximum Qualification" value={examData.maximumQualification} />
                    <Field label="University" value={examData.university} />
                    <Field label="Faculty / Stream" value={`${examData.faculty} / ${examData.stream}`} />
                    <Field label="Year" value={examData.yearOfCompletion} />
                    <Field label="Percentage" value={examData.percentage} />
                  </div>
                </div>

                <div className="card mt-16">
                  <label className="confirm-check">
                    <input
                      type="checkbox"
                      checked={confirmCheck}
                      onChange={(e) => setConfirmCheck(e.target.checked)}
                    />
                    <span>
                      I, <strong>{nidData.nameEnglish}</strong>, hereby verify that all the above information is
                      correct and complete.
                    </span>
                  </label>
                </div>

                <div className="dash-actions">
                  <button type="button" className="btn-outline" onClick={() => setCurrentStep(2)}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-crimson"
                    disabled={!confirmCheck}
                    onClick={() => setPaymentOpen(true)}
                  >
                    Proceed to Payment →
                  </button>
                </div>
              </>
            )}

            {!eligibility?.eligible && (
              <div className="dash-actions">
                <button type="button" className="btn-outline" onClick={() => setCurrentStep(2)}>
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────── TAB 4 ───────────────────────── */}
        {currentStep === 4 && (
          <div className="tab-content page-enter">
            <h3 className="tab-title">Step 4 — Application Status &amp; Admit Card</h3>
            <p className="tab-sub">Download your admit card for each registered post.</p>

            {loadingApps && (
              <div className="card text-center">
                <span className="spinner spinner-lg" />
                <p className="mt-16">Loading applications...</p>
              </div>
            )}

            {!loadingApps && applications.length === 0 && (
              <div className="card empty-state">
                <div className="empty-illus" aria-hidden="true">📄</div>
                <h4>No applications found</h4>
                <p>Complete the registration process to apply for a post.</p>
                <button type="button" className="btn-primary" onClick={() => setCurrentStep(1)}>
                  Start Registration
                </button>
              </div>
            )}

            {!loadingApps && applications.length > 0 && (
              <div className="applications-list">
                {applications.map((app) => (
                  <div className="card application-card" key={app._id}>
                    <div className="app-header">
                      <div>
                        <div className="app-roll-label">Roll Number</div>
                        <div className="app-roll">{app.rollNumber}</div>
                      </div>
                      <span className="badge badge-success">Registered</span>
                    </div>
                    <div className="app-grid">
                      <Field label="Post" value={app.postId?.postNameEnglish || '—'} />
                      <Field label="Ministry" value={app.postId?.ministry || '—'} />
                      <Field label="Exam Date" value={app.examDate || '—'} />
                      <Field label="Exam Center" value={app.examCenter || '—'} />
                      <Field
                        label="Payment"
                        value={`NPR ${Number(app.amount || 0).toLocaleString()} — Paid ✓`}
                      />
                      <Field label="Method" value={app.paymentMethod || '—'} />
                    </div>
                    <div className="app-actions">
                      <button
                        type="button"
                        className="btn-crimson"
                        onClick={() => handleDownloadAdmit(app)}
                      >
                        ⬇ Download Admit Card
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => navigate(`/results`)}
                      >
                        View Results
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => navigate(`/priority`)}
                      >
                        🎯 Priority &amp; Placement
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="dash-actions">
              <button type="button" className="btn-outline" onClick={() => setCurrentStep(3)}>
                ← Back to Post Selection
              </button>
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        open={paymentOpen}
        amount={selectedPost?.examFee || 0}
        onPay={handleSubmitPayment}
        onClose={() => {
          setPaymentOpen(false);
          setCurrentStep(4);
        }}
      />
    </div>
  );
}

function Field({ label, value, nepali }) {
  return (
    <div className="field-row">
      <div className="field-label">{label}</div>
      <div className={`field-value ${nepali ? 'nepali' : ''}`}>{value || '—'}</div>
    </div>
  );
}
