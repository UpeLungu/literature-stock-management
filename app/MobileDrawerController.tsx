'use client';

import { useEffect } from 'react';

export default function MobileDrawerController() {
  useEffect(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobileDrawerButton';
    button.setAttribute('aria-label', 'Open navigation menu');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '☰';

    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'mobileDrawerOverlay';
    overlay.setAttribute('aria-label', 'Close navigation menu');

    const closeDrawer = () => {
      document.body.classList.remove('drawerOpen');
      button.setAttribute('aria-expanded', 'false');
      button.textContent = '☰';
    };

    const toggleDrawer = () => {
      const isOpen = document.body.classList.toggle('drawerOpen');
      button.setAttribute('aria-expanded', String(isOpen));
      button.textContent = isOpen ? '×' : '☰';
    };

    button.addEventListener('click', toggleDrawer);
    overlay.addEventListener('click', closeDrawer);

    const sidebar = document.querySelector('.sidebar');
    const handleNavigation = (event: Event) => {
      if ((event.target as HTMLElement).closest('button')) closeDrawer();
    };
    sidebar?.addEventListener('click', handleNavigation);

    document.body.append(button, overlay);

    return () => {
      button.removeEventListener('click', toggleDrawer);
      overlay.removeEventListener('click', closeDrawer);
      sidebar?.removeEventListener('click', handleNavigation);
      button.remove();
      overlay.remove();
      document.body.classList.remove('drawerOpen');
    };
  }, []);

  return null;
}
