'use client';

import { useEffect } from 'react';

export default function NavigationScrollController() {
  useEffect(() => {
    const scrollToContentTop = () => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;

      const isNavigationAction = Boolean(
        button.closest('.sidebar nav') ||
        button.closest('.categoryGrid') ||
        button.closest('.wizardActions') ||
        button.closest('.headerActions')
      );

      if (isNavigationAction) scrollToContentTop();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
