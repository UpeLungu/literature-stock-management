'use client';

import { useEffect } from 'react';

const WRAPPER_CLASS = 'publicationCategoryBrowser';

export default function PublicationCategoryBrowser() {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const mountBrowser = () => {
      const tools = document.querySelector<HTMLElement>('.publicationTools');
      const sourceSelect = tools?.querySelector<HTMLSelectElement>('select');
      if (!tools || !sourceSelect) return;

      const panel = tools.closest<HTMLElement>('.panel');
      const addButton = panel
        ? Array.from(panel.querySelectorAll<HTMLButtonElement>('.panelHead .headerActions button')).find(
            button => !button.textContent?.toLowerCase().includes('category'),
          )
        : null;
      addButton?.classList.add('publicationAddButton');

      const existing = tools.parentElement?.querySelector<HTMLElement>(`:scope > .${WRAPPER_CLASS}`);
      if (existing) {
        const browserSelect = existing.querySelector<HTMLSelectElement>('select');
        if (browserSelect && browserSelect.value !== sourceSelect.value) browserSelect.value = sourceSelect.value;
        return;
      }

      const wrapper = document.createElement('section');
      wrapper.className = WRAPPER_CLASS;
      wrapper.setAttribute('aria-label', 'Select a publication category');

      const heading = document.createElement('div');
      heading.className = 'publicationCategoryBrowserHead';
      heading.innerHTML = '<strong>View publications by category</strong><span>Choose one category to display only the publications in that group.</span>';

      const field = document.createElement('label');
      field.className = 'publicationCategoryField';

      const fieldLabel = document.createElement('span');
      fieldLabel.textContent = 'Select category';

      const browserSelect = document.createElement('select');
      browserSelect.setAttribute('aria-label', 'Select publication category');

      Array.from(sourceSelect.options).forEach(option => {
        const copy = document.createElement('option');
        copy.value = option.value;
        copy.textContent = option.textContent;
        browserSelect.appendChild(copy);
      });
      browserSelect.value = sourceSelect.value;

      browserSelect.addEventListener('change', () => {
        sourceSelect.value = browserSelect.value;
        sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        tools.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      sourceSelect.addEventListener('change', () => {
        browserSelect.value = sourceSelect.value;
      });

      field.append(fieldLabel, browserSelect);
      wrapper.append(heading, field);
      tools.insertAdjacentElement('afterend', wrapper);
    };

    mountBrowser();
    observer = new MutationObserver(mountBrowser);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer?.disconnect();
  }, []);

  return null;
}
