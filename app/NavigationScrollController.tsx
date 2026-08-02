'use client';

import { useEffect } from 'react';

export default function NavigationScrollController() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;

      // Only genuine navigation controls should trigger scrolling.
      // Panel actions such as Add, Edit, Delete, Activate and search controls
      // must be left completely untouched.
      const isNavigationAction = Boolean(
        button.closest('.sidebar nav') ||
        button.closest('.categoryGrid') ||
        button.closest('.wizardActions')
      );

      if (!isNavigationAction) return;

      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
