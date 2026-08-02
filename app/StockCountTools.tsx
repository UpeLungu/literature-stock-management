'use client';

import { useEffect } from 'react';

const CATEGORY_NAMES = [
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
  useEffect(() => {
    const setup = () => {
      const screen = document.querySelector<HTMLElement>('.countScreen');
      if (!screen || screen.querySelector('.stockCountTools')) return;

      const intro = screen.querySelector('.countIntro');
      const cards = screen.querySelector<HTMLElement>('.countCards');
      const heading = screen.querySelector<HTMLHeadingElement>('.countIntro h2');
      if (!intro || !cards || !heading) return;

      const toolbar = document.createElement('div');
      toolbar.className = 'stockCountTools';

      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'Search publication name or code…';
      search.setAttribute('aria-label', 'Search publications in this category');

      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Select stock count category');
      CATEGORY_NAMES.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = name;
        select.append(option);
      });

      const currentIndex = CATEGORY_NAMES.findIndex(
        name => name.toLowerCase() === heading.textContent?.trim().toLowerCase(),
      );
      select.value = String(Math.max(0, currentIndex));

      const filterCards = () => {
        const query = search.value.trim().toLowerCase();
        cards.querySelectorAll<HTMLElement>(':scope > article').forEach(card => {
          card.hidden = Boolean(query) && !card.textContent?.toLowerCase().includes(query);
        });
      };

      search.addEventListener('input', filterCards);

      select.addEventListener('change', () => {
        const target = Number(select.value);
        const present = CATEGORY_NAMES.findIndex(
          name => name.toLowerCase() === heading.textContent?.trim().toLowerCase(),
        );
        const difference = target - Math.max(0, present);
        const selector = difference > 0
          ? '.wizardActions button:last-child'
          : '.wizardActions button:first-child';
        const clicks = Math.abs(difference);

        search.value = '';
        filterCards();

        let completed = 0;
        const move = () => {
          if (completed >= clicks) return;
          const button = document.querySelector<HTMLButtonElement>(selector);
          if (!button) return;
          button.click();
          completed += 1;
          window.setTimeout(move, 80);
        };
        move();
      });

      toolbar.append(search, select);
      intro.insertAdjacentElement('afterend', toolbar);
    };

    setup();
    const observer = new MutationObserver(setup);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
