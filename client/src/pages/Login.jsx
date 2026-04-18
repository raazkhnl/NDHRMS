import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import NidLookup from '../components/NidLookup.jsx';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [nidNumber, setNidNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const [resendTimer, setResendTimer] = useState(0);

  const inputsRef = useRef([]);

  // Countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleNidChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setNidNumber(v);
    setError('');
  };

  const validateNid = () => {
    if (nidNumber.length !== 10) {
      setError('NID must be exactly 10 digits');
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setError('');
    if (!validateNid()) return;

    setSending(true);
    try {
      const res = await api.post('/auth/send-otp', { nidNumber });
      setOtpSent(true);
      setMaskedMobile(res.data.maskedMobile || '');
      setResendTimer(30);
      // focus first OTP cell
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || sending) return;
    setOtp(['', '', '', '', '', '']);
    await handleSendOtp();
  };

  const handleOtpDigit = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError('');

    if (digit && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const filled = pasted.split('').concat(['', '', '', '', '', '']).slice(0, 6);
    setOtp(filled);
    const lastIdx = Math.min(pasted.length, 5);
    inputsRef.current[lastIdx]?.focus();
  };

  const handleVerify = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter all 6 digits of the OTP');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post('/auth/verify-otp', { nidNumber, otp: code });
      login(res.data.token, res.data.nidData);
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="login-page page-enter">
      <div className="login-card">
        <div className="login-header">
          <div className="login-lock">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h2>Candidate Login</h2>
          <p>Enter your NID to receive a one-time password</p>
        </div>

        <div className="login-body">
          <NidLookup
            label="National ID Number"
            required
            value={nidNumber}
            onChange={(v) => { setNidNumber(v); if (error) setError(''); }}
            disabled={otpSent}
            placeholder="Enter 10-digit NID"
          />

          {!otpSent && (
            <button
              type="button"
              className="btn-primary login-btn"
              onClick={handleSendOtp}
              disabled={sending}
            >
              {sending ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} /> Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          )}

          {otpSent && (
            <>
              <div className="otp-notice">
                OTP sent to <strong>{maskedMobile}</strong>
                <span className="otp-hint">Check the server terminal for the code.</span>
              </div>

              <div className="login-divider" />

              <label className="form-label">Enter 6-digit OTP</label>
              <div className="otp-grid" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    className="otp-cell"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                className="btn-crimson login-btn"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: '#fff' }} /> Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="resend-row">
                {resendTimer > 0 ? (
                  <span className="resend-timer">Resend OTP in {resendTimer}s</span>
                ) : (
                  <button type="button" className="resend-link" onClick={handleResend}>
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="banner banner-error" style={{ marginTop: 14 }}>
              <span className="x-icon">!</span>
              {error}
            </div>
          )}

          <div className="login-hint">
            <strong>Test NIDs:</strong> 112-345-6789, 223-456-7890, 334-567-8901, 445-678-9012, 556-789-0123
          </div>
        </div>
      </div>
    </div>
  );
}
