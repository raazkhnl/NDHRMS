import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { generateAdmitCard } from '../utils/admitCard.js';
import './AdmitCard.css';

export default function AdmitCard() {
  const { nidData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRoll = searchParams.get('roll');

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(preselectedRoll || '');

  useEffect(() => {
    if (!nidData?.nidNumber) {
      navigate('/login');
      return;
    }
    setLoading(true);
    api
      .get('/application/my-applications', { params: { nidNumber: nidData.nidNumber } })
      .then((r) => {
        setApplications(r.data || []);
        if (!preselectedRoll && r.data?.length) {
          setSelectedRoll(r.data[0].rollNumber);
        }
      })
      .finally(() => setLoading(false));
  }, [nidData, navigate, preselectedRoll]);

  const app = applications.find((a) => a.rollNumber === selectedRoll);
  const addr = nidData?.permanentAddress || {};
  const fullAddr = [addr.tole, addr.municipality, `Ward ${addr.ward}`, addr.district, addr.province]
    .filter(Boolean)
    .join(', ');

  const handleDownload = () => {
    if (!app || !nidData) return;
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

  const handlePrint = () => {
    window.print();
  };

  if (!nidData) return null;

  return (
    <div className="admit-page page-enter">
      <div className="container">
        <h2 className="admit-page-title">Admit Card</h2>

        {loading && (
          <div className="card text-center">
            <span className="spinner spinner-lg" />
            <p className="mt-16">Loading applications...</p>
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="card text-center">
            <p>No registered applications found.</p>
            <button type="button" className="btn-primary mt-16" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && applications.length > 0 && (
          <>
            <div className="card no-print">
              <label className="form-label" htmlFor="roll-pick">
                Select Roll Number
              </label>
              <select
                id="roll-pick"
                className="form-select"
                value={selectedRoll}
                onChange={(e) => setSelectedRoll(e.target.value)}
              >
                {applications.map((a) => (
                  <option key={a._id} value={a.rollNumber}>
                    {a.rollNumber} — {a.postId?.postNameEnglish}
                  </option>
                ))}
              </select>
            </div>

            {app && (
              <div className="admit-card-preview">
                <div className="admit-header">
                  <div className="admit-seal" aria-hidden="true">PSC</div>
                  <div>
                    <div className="admit-h-np nepali">लोक सेवा आयोग</div>
                    <div className="admit-h-en">Public Service Commission Nepal</div>
                    <div className="admit-h-sub">Anamnagar, Kathmandu · www.psc.gov.np</div>
                  </div>
                </div>

                <div className="admit-title-row">
                  <h3>ADMIT CARD</h3>
                  <span>Online Examination 2082/83</span>
                </div>

                <div className="admit-body">
                  <div className="admit-photo" aria-hidden="true">
                    <span>Candidate</span>
                    <span>Photograph</span>
                  </div>
                  <div className="admit-data">
                    <AdmitRow label="Roll Number" value={app.rollNumber} bold />
                    <AdmitRow label="Candidate Name" value={nidData.nameEnglish} />
                    <AdmitRow label="Name (Nepali)" value={nidData.nameNepali} nepali />
                    <AdmitRow label="Father's Name" value={nidData.fatherName} />
                    <AdmitRow label="Date of Birth" value={nidData.dateOfBirth} />
                    <AdmitRow label="Post Applied" value={app.postId?.postNameEnglish} />
                    <AdmitRow label="Exam Date" value={app.examDate || app.postId?.examDate} />
                    <AdmitRow label="Exam Center" value={app.examCenter || app.postId?.examCenter} />
                    <AdmitRow label="Address" value={fullAddr} />
                  </div>
                </div>

                <div className="admit-instructions">
                  <strong>Instructions:</strong>
                  <ol>
                    <li>This admit card must be brought to the examination hall.</li>
                    <li>Arrive 30 minutes before the examination starts.</li>
                    <li>Bring a valid government-issued photo ID along with this admit card.</li>
                    <li>Mobile phones and electronic devices are strictly prohibited.</li>
                    <li>Results will be published on www.psc.gov.np</li>
                  </ol>
                </div>

                <div className="admit-sigs">
                  <div className="sig-box">
                    <div className="sig-line" />
                    <span>Candidate's Signature</span>
                  </div>
                  <div className="sig-box">
                    <div className="sig-line" />
                    <span>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            )}

            <div className="admit-actions no-print">
              <button type="button" className="btn-crimson" onClick={handleDownload}>
                ⬇ Download PDF
              </button>
              <button type="button" className="btn-outline" onClick={handlePrint}>
                🖨 Print
              </button>
              <button type="button" className="btn-outline" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdmitRow({ label, value, bold, nepali }) {
  return (
    <div className="admit-row">
      <span className="admit-row-label">{label}</span>
      <span className={`admit-row-value ${bold ? 'admit-row-bold' : ''} ${nepali ? 'nepali' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
