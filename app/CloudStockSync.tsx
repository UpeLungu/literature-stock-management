'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type LocalCount = { physical: number; verified: boolean };
type LocalCounts = Record<string, LocalCount>;

type SyncState = 'browser' | 'connecting' | 'cloud' | 'error';

const PERIOD_PREFIX = 'lms-counts-v3:';

function selectedPeriod(): string | null {
  return localStorage.getItem('lms-selected-period');
}

function selectedCongregation(): string | null {
  return document.querySelector<HTMLSelectElement>('.topbar select')?.value || null;
}

function readCounts(period: string): LocalCounts {
  try {
    return JSON.parse(localStorage.getItem(`${PERIOD_PREFIX}${period}`) || '{}') as LocalCounts;
  } catch {
    return {};
  }
}

export default function CloudStockSync() {
  const [state, setState] = useState<SyncState>('connecting');
  const lastPayload = useRef('');
  const busy = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState('browser');
      return;
    }

    let cancelled = false;

    const sync = async () => {
      if (busy.current || cancelled) return;
      const period = selectedPeriod();
      const congregation = selectedCongregation();
      if (!period || !congregation) return;

      const allCounts = readCounts(period);
      const congregationEntries = Object.entries(allCounts).filter(([key]) => key.startsWith(`${congregation}|`));
      const payloadKey = JSON.stringify([period, congregation, congregationEntries]);
      if (payloadKey === lastPayload.current) return;

      busy.current = true;
      try {
        const { data: periodRow, error: periodError } = await supabase
          .from('stock_count_periods')
          .upsert(
            { congregation_key: congregation, period, updated_at: new Date().toISOString() },
            { onConflict: 'congregation_key,period' },
          )
          .select('id,status')
          .single();

        if (periodError) throw periodError;

        if (congregationEntries.length) {
          const itemRows = congregationEntries.map(([key, value]) => ({
            period_id: periodRow.id,
            publication_key: key.slice(congregation.length + 1),
            physical_quantity: Math.max(0, Number(value.physical) || 0),
            verified: Boolean(value.verified),
            updated_at: new Date().toISOString(),
          }));

          const { error: itemError } = await supabase
            .from('stock_count_items')
            .upsert(itemRows, { onConflict: 'period_id,publication_key' });
          if (itemError) throw itemError;
        }

        lastPayload.current = payloadKey;
        if (!cancelled) setState('cloud');
      } catch (error) {
        console.warn('Cloud stock sync unavailable; browser storage remains active.', error);
        if (!cancelled) setState('error');
      } finally {
        busy.current = false;
      }
    };

    const submit = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.reviewScreen .wizardActions button:last-child');
      if (!button) return;

      const period = selectedPeriod();
      const congregation = selectedCongregation();
      if (!period || !congregation) return;

      try {
        await sync();
        const { error } = await supabase
          .from('stock_count_periods')
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submitted_by: 'Current user',
            updated_at: new Date().toISOString(),
          })
          .eq('congregation_key', congregation)
          .eq('period', period);
        if (error) throw error;
        button.textContent = 'Submitted';
        button.disabled = true;
        setState('cloud');
      } catch (error) {
        console.warn('Submission was retained in the browser but could not reach Supabase.', error);
        setState('error');
      }
    };

    void sync();
    const timer = window.setInterval(() => void sync(), 2500);
    document.addEventListener('click', submit);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('click', submit);
    };
  }, []);

  const label = state === 'cloud' ? 'Cloud synced' : state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Browser saved · Cloud unavailable' : 'Browser saved';
  return <div className={`cloudSyncBadge ${state}`} aria-live="polite">{label}</div>;
}
