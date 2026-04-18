import React, { useState } from 'react';
import './PaymentModal.css';

const PAYMENT_OPTIONS = [
  { key: 'FonePay', label: 'FonePay', tagline: 'Mobile Banking', brand: 'fonepay' },
  { key: 'eSewa', label: 'eSewa', tagline: 'Digital Wallet', brand: 'esewa' },
  { key: 'Khalti', label: 'Khalti', tagline: 'Digital Wallet', brand: 'khalti' },
  { key: 'ConnectIPS', label: 'ConnectIPS', tagline: 'Bank Transfer', brand: 'connectips' }
];

export default function PaymentModal({
  open,
  onClose,
  amount = 0,
  onPay, // async function (paymentMethod) => { rollNumber, ... }
}) {
  const [stage, setStage] = useState('select'); // select | processing | success | error
  const [selected, setSelected] = useState(null);
  const [rollNumber, setRollNumber] = useState('');
  const [errMsg, setErrMsg] = useState('');

  if (!open) return null;

  const handleSelect = async (method) => {
    setSelected(method);
    setStage('processing');
    setErrMsg('');

    // Simulated payment: 2s delay, then call the parent handler
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const result = await onPay(method);
      if (result?.rollNumber) {
        setRollNumber(result.rollNumber);
        setStage('success');
      } else {
        setErrMsg('Payment could not be completed.');
        setStage('error');
      }
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err?.message || 'Payment failed');
      setStage('error');
    }
  };

  const handleClose = () => {
    // reset
    setStage('select');
    setSelected(null);
    setRollNumber('');
    setErrMsg('');
    onClose();
  };

  return (
    <div className="pay-backdrop" role="dialog" aria-modal="true">
      <div className="pay-card">
        <div className="pay-header">
          <h3 className="pay-title">
            {stage === 'success'
              ? 'Payment Successful'
              : stage === 'error'
              ? 'Payment Failed'
              : stage === 'processing'
              ? 'Processing Payment'
              : 'Select Payment Method'}
          </h3>
          <button
            type="button"
            className="pay-close"
            onClick={handleClose}
            aria-label="Close payment modal"
            disabled={stage === 'processing'}
          >
            ×
          </button>
        </div>

        {stage === 'select' && (
          <>
            <div className="pay-amount">
              Application Fee: <strong>NPR {Number(amount || 0).toLocaleString()}</strong>
            </div>

            <div className="pay-grid">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  className={`pay-option pay-${opt.brand}`}
                  onClick={() => handleSelect(opt.key)}
                >
                  <span className="pay-option-logo">{opt.label}</span>
                  <span className="pay-option-tag">{opt.tagline}</span>
                </button>
              ))}
            </div>

            <p className="pay-note">
              This is a simulated payment for demonstration. No real charge is made.
            </p>
          </>
        )}

        {stage === 'processing' && (
          <div className="pay-processing">
            <div className="spinner spinner-lg" />
            <p className="pay-processing-text">Processing payment via {selected}...</p>
            <p className="pay-processing-sub">Please do not close this window.</p>
          </div>
        )}

        {stage === 'success' && (
          <div className="pay-success">
            <div className="pay-check">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h4>Payment Successful!</h4>
            <p className="pay-success-sub">Your application has been registered.</p>
            <div className="pay-roll">
              <span className="pay-roll-label">Roll Number</span>
              <span className="pay-roll-value">{rollNumber}</span>
            </div>
            <button type="button" className="btn-primary pay-done-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="pay-success">
            <div className="pay-fail">!</div>
            <h4>Payment Failed</h4>
            <p className="pay-success-sub">{errMsg}</p>
            <button type="button" className="btn-outline pay-done-btn" onClick={() => setStage('select')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
