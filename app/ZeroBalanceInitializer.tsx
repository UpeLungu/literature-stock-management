'use client';

import { useEffect } from 'react';

type Publication = { id: string; opening?: number; active?: boolean };
type Congregation = { id: string; active?: boolean };
type AdminData = {
  publications?: Publication[];
  congregations?: Congregation[];
  categories?: unknown[];
};

const ADMIN_KEY = 'lms-admin-v3';
const LEGACY_COUNTS_KEY = 'lms-counts-v3';

function previousMonthKey() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function ZeroBalanceInitializer() {
  useEffect(() => {
    let reloading = false;

    const initialise = () => {
      if (reloading) return;

      const rawAdmin = localStorage.getItem(ADMIN_KEY);
      if (!rawAdmin) return;

      try {
        const admin = JSON.parse(rawAdmin) as AdminData;
        const publications = admin.publications || [];
        const congregations = admin.congregations || [];
        let changed = false;

        const zeroedPublications = publications.map(publication => {
          if ((publication.opening || 0) === 0) return publication;
          changed = true;
          return { ...publication, opening: 0 };
        });

        if (changed) {
          localStorage.setItem(
            ADMIN_KEY,
            JSON.stringify({ ...admin, publications: zeroedPublications }),
          );
        }

        if (localStorage.getItem(LEGACY_COUNTS_KEY) !== null) {
          localStorage.removeItem(LEGACY_COUNTS_KEY);
          changed = true;
        }

        const period = localStorage.getItem('lms-selected-period') || previousMonthKey();
        const periodKey = `lms-counts-v3:${period}`;

        if (localStorage.getItem(periodKey) === null) {
          const zeroCounts: Record<string, { physical: number; verified: boolean }> = {};
          const activePublications = zeroedPublications.filter(item => item.active !== false);
          const activeCongregations = congregations.filter(item => item.active !== false);

          for (const congregation of activeCongregations) {
            for (const publication of activePublications) {
              zeroCounts[`${congregation.id}|${publication.id}`] = {
                physical: 0,
                verified: false,
              };
            }
          }

          localStorage.setItem(periodKey, JSON.stringify(zeroCounts));
          changed = true;
        }

        if (changed) {
          reloading = true;
          window.location.reload();
        }
      } catch {
        // Leave malformed local data untouched; the normal app recovery path handles it.
      }
    };

    initialise();
    const timer = window.setInterval(initialise, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
