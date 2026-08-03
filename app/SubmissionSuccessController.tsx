'use client';

import { useEffect, useState } from 'react';

const SUCCESS_MESSAGE = 'Stock count submitted successfully.';

export default function SubmissionSuccessController() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const originalAlert = window.alert.bind(window);
    let hideTimer: number | undefined;

    window.alert = (message?: unknown) => {
      if (String(message) !== SUCCESS_MESSAGE) {
        originalAlert(String(message ?? ''));
        return;
      }

      setVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 3200);

      const dashboardButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'),
      ).find((button) => button.textContent?.trim() === 'Dashboard');

      dashboardButton?.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return () => {
      window.alert = originalAlert;
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
