'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type LocalCount = { physical: number; verified: boolean };
type LocalCounts = Record<string, LocalCount>;

const COUNTS_PREFIX = 'lms-counts-v3:';
const SUBMIT_SUCCESS_MESSAGE = 'Stock count submitted successfully.';
const SUBMIT_SUCCESS_EVENT = 'lms:stock-submitted';

function parseCounts(value: string | null): LocalCounts {
  if (!value) return {};
  try {
    return JSON.parse(value) as LocalCounts;
  } catch {
    return {};
  }
}

export default function SafeCloudWriter() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const originalSetItem = Storage.prototype.setItem;
    const originalAlert = window.alert.bind(window);
    let timer: number | undefined;
    let stopped = false;

    const syncPeriod = async (period: string) => {
      if (stopped || !/^\d{4}-\d{2}$/.test(period)) return;

      const counts = parseCounts(localStorage.getItem(`${COUNTS_PREFIX}${period}`));
      const grouped = new Map<string, Array<[string, LocalCount]>>();

      Object.entries(counts).forEach(([compoundKey, count]) => {
        const separator = compoundKey.indexOf('|');
        if (separator < 1) return;
        const congregationKey = compoundKey.slice(0, separator);
        const publicationKey = compoundKey.slice(separator + 1);
        if (!publicationKey) return;
        const group = grouped.get(congregationKey) || [];
        group.push([publicationKey, count]);
        grouped.set(congregationKey, group);
      });

      for (const [congregationKey, entries] of grouped) {
        const { data: periodRow, error: periodError } = await supabase
          .schema('public')
          .from('stock_count_periods')
          .upsert(
            {
              congregation_key: congregationKey,
              period,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'congregation_key,period' },
          )
          .select('id')
          .single();

        if (periodError || !periodRow) {
          console.warn('Supabase period save failed; browser copy remains safe.', periodError);
          continue;
        }

        const rows = entries.map(([publicationKey, count]) => ({
          period_id: periodRow.id,
          publication_key: publicationKey,
          physical_quantity: Math.max(0, Number(count.physical) || 0),
          verified: Boolean(count.verified),
          updated_at: new Date().toISOString(),
        }));

        if (rows.length) {
          const { error } = await supabase
            .schema('public')
            .from('stock_count_items')
            .upsert(rows, { onConflict: 'period_id,publication_key' });

          if (error) console.warn('Supabase item save failed; browser copy remains safe.', error);
        }
      }
    };

    const submitCurrentPeriod = async () => {
      const period = localStorage.getItem('lms-selected-period');
      const congregationKey = document.querySelector<HTMLSelectElement>('.topbar select')?.value;
      if (!period || !congregationKey || !/^\d{4}-\d{2}$/.test(period)) return;

      await syncPeriod(period);
      const submittedAt = new Date().toISOString();
      const { error } = await supabase
        .schema('public')
        .from('stock_count_periods')
        .update({
          status: 'submitted',
          submitted_at: submittedAt,
          submitted_by: 'Current user',
          updated_at: submittedAt,
        })
        .eq('congregation_key', congregationKey)
        .eq('period', period);

      if (error) {
        console.warn('Supabase submission status update failed; browser counts remain safe.', error);
      }
    };

    const schedule = (period: string) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void syncPeriod(period), 500);
    };

    Storage.prototype.setItem = function setItem(key: string, value: string) {
      originalSetItem.call(this, key, value);

      if (this !== localStorage) return;
      if (key.startsWith(COUNTS_PREFIX)) {
        schedule(key.slice(COUNTS_PREFIX.length));
      } else if (key === 'lms-selected-period') {
        schedule(value);
      }
    };

    window.alert = (message?: unknown) => {
      if (String(message) === SUBMIT_SUCCESS_MESSAGE) {
        void submitCurrentPeriod().finally(() => {
          window.dispatchEvent(new CustomEvent(SUBMIT_SUCCESS_EVENT));
        });
        return;
      }

      originalAlert(message === undefined ? '' : String(message));
    };

    const currentPeriod = localStorage.getItem('lms-selected-period');
    if (currentPeriod) schedule(currentPeriod);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      Storage.prototype.setItem = originalSetItem;
      window.alert = originalAlert;
    };
  }, []);

  return null;
}
