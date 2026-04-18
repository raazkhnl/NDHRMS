import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { formatNid } from '../utils/formatNid.js';
import './NidLookup.css';

/**
 * NID input that validates by looking up the name.
 * Shows green check + name if found, red X if not.
 * Usage: <NidLookup value={x} onChange={setX} onResolve={(nid) => ...} />
 */
export default function NidLookup({
  value, onChange, onResolve, label = 'NID Number',
  required = false, disabled = false, placeholder = '10 digit NID'
}) {
  const [lookupState, setLookupState] = useState('idle'); // idle | looking | found | notFound | error
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (!value || value.length !== 10) {
      setLookupState('idle');
      setResolved(null);
      onResolve?.(null);
      return;
    }
    let cancel = false;
    setLookupState('looking');
    api.get(`/nid/${value}`)
      .then((r) => {
        if (cancel) return;
        setResolved(r.data);
        setLookupState('found');
        onResolve?.(r.data);
      })
      .catch((err) => {
        if (cancel) return;
        setResolved(null);
        if (err.response?.status === 404) setLookupState('notFound');
        else setLookupState('error');
        onResolve?.(null);
      });
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="nid-lookup">
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--crimson)' }}>*</span>}
      </label>
      <div className="nid-lookup-wrap">
        <input
          type="text"
          className={`form-input nid-lookup-input state-${lookupState}`}
          value={formatNid(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder={placeholder}
          maxLength={12}
          disabled={disabled}
          required={required}
        />
        <div className={`nid-lookup-status state-${lookupState}`}>
          {lookupState === 'looking' && <span className="nid-spin">⋯</span>}
          {lookupState === 'found' && <span className="nid-check">✓</span>}
          {lookupState === 'notFound' && <span className="nid-x">✗</span>}
          {lookupState === 'error' && <span className="nid-x">!</span>}
        </div>
      </div>
      {lookupState === 'found' && resolved && (
        <div className="nid-resolved">
          <strong>{resolved.nameEnglish}</strong>
          {resolved.nameNepali && <span className="nepali"> · {resolved.nameNepali}</span>}
          {resolved.dateOfBirth && <small> · DOB {resolved.dateOfBirth} · {resolved.gender}</small>}
        </div>
      )}
      {lookupState === 'notFound' && (
        <div className="nid-hint nid-error">NID not found in registry</div>
      )}
      {lookupState === 'error' && (
        <div className="nid-hint nid-error">Lookup failed — check connection</div>
      )}
      {lookupState === 'idle' && value && value.length > 0 && value.length < 10 && (
        <div className="nid-hint">{10 - value.length} more digit{10 - value.length !== 1 ? 's' : ''} needed</div>
      )}
    </div>
  );
}
