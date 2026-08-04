'use client';

import { useEffect, useState } from 'react';

const SUBMIT_SUCCESS_EVENT = 'lms:stock-submitted';

export default function SubmissionSuccessController() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: number | undefined;

    const handleSuccess = () => {
      setVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 3200);

      const dashboardButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'),
      ).find((button) => button.textContent?.trim() === 'Dashboard');

      dashboardButton?.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener(SUBMIT_SUCCESS_EVENT, handleSuccess);
    return () => {
      window.removeEventListener(SUBMIT_SUCCESS_EVENT, handleSuccess);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="submissionSuccess" role="status" aria-live="polite">
      <span className="submissionSuccessIcon" aria-hidden="true">✓</span>
      <div>
        <strong>Stock count submitted</strong>
        <span>You have been returned to the Dashboard.</span>
      </div>
      <button type="button" aria-label="Dismiss message" onClick={() => setVisible(false)}>×</button>
    </div>
  );
}
