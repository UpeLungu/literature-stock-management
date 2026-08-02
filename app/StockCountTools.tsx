'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const categoryNames = [
  'Bibles',
  'Books',
  'Brochures and Booklets',
  'Tracts',
  'Public Magazines',
  'Study Watchtower',
  'Meeting Workbooks',
  'Examining the Scriptures Daily',
  'Forms and Supplies',
];

export default function StockCountTools() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const findTarget = () => {
      const screen = document.querySelector<HTMLElement>('.countScreen');
      setTarget(screen);
      if (screen) {
        const title = screen.querySelector('h2')?.textContent?.trim() || '';
        setSelectedCategory(title);
      }
    };

    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!target) return;
    const normalized = query.trim().toLowerCase();
    const cards = target.querySelectorAll<HTMLElement>('.countCards > article');
    cards.forEach(card => {
      const text = card.textContent?.toLowerCase() || '';
      card.style.display = !normalized || text.includes(normalized) ? '' : 'none';
    });
    return () => cards.forEach(card => { card.style.display = ''; });
  }, [query, target]);

  const resultCount = useMemo(() => {
    if (!target) return 0;
    return Array.from(target.querySelectorAll<HTMLElement>('.countCards > article'))
      .filter(card => card.style.display !== 'none').length;
  }, [query, target]);

  const changeCategory = (name: string) => {
    if (!target || !name) return;
    const current = categoryNames.indexOf(selectedCategory);
    const destination = categoryNames.indexOf(name);
    if (current < 0 || destination < 0) return;

    const selector = destination > current
      ? '.wizardActions button:last-child'
      : '.wizardActions button:first-child';
    const steps = Math.abs(destination - current);

    let completed = 0;
    const move = () => {
      const screen = document.querySelector<HTMLElement>('.countScreen');
      const button = screen?.querySelector<HTMLButtonElement>(selector);
      if (!button || completed >= steps) return;
      button.click();
      completed += 1;
      if (completed < steps) window.setTimeout(move, 80);
    };

    setQuery('');
    setSelectedCategory(name);
    move();
  };

  if (!target) return null;

  return createPortal(
    <div className="stockCountTools" aria-label="Stock count search and category selection">
      <label>
        <span>Search publication</span>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search name or code…"
        />
      </label>
      <label>
        <span>Select category</span>
        <select value={selectedCategory} onChange={event => changeCategory(event.target.value)}>
          {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      {query && <small>{resultCount} matching item{resultCount === 1 ? '' : 's'}</small>}
    </div>,
    target
  );
}
