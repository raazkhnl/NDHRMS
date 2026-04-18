import React from 'react';
import './Stepper.css';

const STEPS = [
  { id: 1, label: 'NID Verification' },
  { id: 2, label: 'Qualification Details' },
  { id: 3, label: 'Post Selection & Review' },
  { id: 4, label: 'Payment & Admit Card' }
];

export default function Stepper({ currentStep = 1 }) {
  return (
    <div className="stepper" role="navigation" aria-label="Application progress">
      {STEPS.map((step, idx) => {
        const status =
          step.id < currentStep ? 'done' : step.id === currentStep ? 'active' : 'future';
        return (
          <React.Fragment key={step.id}>
            <div className={`stepper-item stepper-${status}`}>
              <div className="stepper-circle">
                {status === 'done' ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span className="stepper-label">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`stepper-line ${
                  step.id < currentStep ? 'stepper-line-done' : ''
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
