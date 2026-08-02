'use client';

import { useEffect, useMemo, useState } from 'react';

function periodKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function duePeriod() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return periodKey(date);
}

export default function MonthWorkflow() {
  const due = useMemo(duePeriod, []);
  const [selected, setSelected] = useState(due);

  const periods = useMemo(() => {
    const [year, month] = due.split('-').map(Number);
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(year, month - 1 - index, 1);
      return periodKey(date);
    });
  }, [due]);

  useEffect(() => {
    const saved = localStorage.getItem('lms-selected-period');
    setSelected(saved || due);
  }, [due]);

  useEffect(() => {
    const label = periodLabel(selected);
    const uppercaseLabel = label.toUpperCase();

    const updateLabels = () => {
      document.querySelectorAll('.topbar p, .version').forEach(node => {
        if (node.textContent) node.textContent = label;
      });
      document.querySelectorAll('.countIntro > span').forEach(node => {
        node.textContent = `${uppercaseLabel} | ENGLISH`;
      });
      document.querySelectorAll('.submissionPanel article span').forEach(node => {
        node.textContent = label;
      });
      document.querySelectorAll('.panelHead h2').forEach(node => {
        if (node.textContent?.includes('stock report')) node.textContent = `${label} stock report`;
      });
    };

    updateLabels();
    const observer = new MutationObserver(updateLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selected]);

  const changePeriod = (value: string) => {
    localStorage.setItem('lms-selected-period', value);
    window.location.reload();
  };

  const isDuePeriod = selected === due;

  return (
    <div className="monthWorkflow" aria-label="Stock count month selection">
      <div className={isDuePeriod ? 'monthDueBanner due' : 'monthDueBanner history'}>
        <div>
          <strong>{isDuePeriod ? `${periodLabel(due)} stock count is due` : `Viewing ${periodLabel(selected)}`}</strong>
          <span>{isDuePeriod ? `The stock counted this month must report the previous month: ${periodLabel(due)}.` : 'Previous periods are kept separately and can be reviewed without mixing their quantities.'}</span>
        </div>
        <label>
          Count month
          <select value={selected} onChange={event => changePeriod(event.target.value)}>
            {periods.map(period => <option key={period} value={period}>{periodLabel(period)}{period === due ? ' — Due' : ''}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
