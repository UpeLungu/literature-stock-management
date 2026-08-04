'use client';

import { useEffect } from 'react';

const WRAPPER_CLASS = 'publicationCategoryBrowser';

export default function PublicationCategoryBrowser() {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const mountBrowser = () => {
      const tools = document.querySelector<HTMLElement>('.publicationTools');
      const select = tools?.querySelector<HTMLSelectElement>('select');
      if (!tools || !select) return;

      const existing = tools.parentElement?.querySelector<HTMLElement>(`:scope > .${WRAPPER_CLASS}`);
      if (existing) {
        existing.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
          button.classList.toggle('active', button.dataset.value === select.value);
        });
        return;
      }

      const wrapper = document.createElement('section');
      wrapper.className = WRAPPER_CLASS;
      wrapper.setAttribute('aria-label', 'Browse publications by category');

      const heading = document.createElement('div');
      heading.className = 'publicationCategoryBrowserHead';
      heading.innerHTML = '<strong>Browse by category</strong><span>Select one group to view its publications together.</span>';

      const buttons = document.createElement('div');
      buttons.className = 'publicationCategoryButtons';

      Array.from(select.options).forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.textContent || option.value;
        button.dataset.value = option.value;
        button.classList.toggle('active', option.value === select.value);
        button.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          buttons.querySelectorAll('button').forEach(item => item.classList.remove('active'));
          button.classList.add('active');
          tools.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        buttons.appendChild(button);
      });

      wrapper.append(heading, buttons);
      tools.insertAdjacentElement('afterend', wrapper);

      select.addEventListener('change', () => {
        buttons.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
          button.classList.toggle('active', button.dataset.value === select.value);
        });
      });
    };

    mountBrowser();
    observer = new MutationObserver(mountBrowser);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer?.disconnect();
  }, []);

  return null;
}
