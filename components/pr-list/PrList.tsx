'use client';

import { useEffect, useRef, useState } from 'react';
import type { PullRequest } from '@/lib/github';
import { createClient } from '@/lib/supabase/client';
import { mapRowToPullRequest, type PullRequestRow } from '@/lib/pull-requests';
import { FilterTabs, matchesFilter, type Filter } from './FilterTabs';
import { NewPrBanner, type NewArrival } from './NewPrBanner';
import { PrCard } from './PrCard';

// How long the "new PR arrived" banner stays up before auto-dismissing.
const NEW_PR_BANNER_DURATION_MS = 10 * 1000;

export function PrList({ prs: initialPrs }: { prs: PullRequest[] }) {
  // Seeded once from the server-rendered prop, then kept fresh by the
  // realtime subscription below — deliberately not re-synced from the prop
  // on every render (no `useEffect(() => setPrs(initialPrs), [initialPrs])`),
  // since page.tsx only re-renders this prop on a fresh navigation, and
  // resyncing could let a stale server-rendered prop clobber a newer
  // realtime update.
  const [prs, setPrs] = useState(initialPrs);
  const [filter, setFilter] = useState<Filter>('all');
  const [newArrival, setNewArrival] = useState<NewArrival | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismissNewArrival() {
    setNewArrival(null);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }

  // Called on every realtime INSERT (a brand-new PR row, not an update to an
  // existing one). Bumps the count if a banner is already showing rather than
  // replacing it, and restarts the 3-minute auto-dismiss clock so a fresh
  // arrival doesn't get cut off mid-display by an earlier one's timer.
  function announceNewArrival(pr: PullRequest) {
    setNewArrival((current) => ({ pr, count: (current?.count ?? 0) + 1 }));
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setNewArrival(null), NEW_PR_BANNER_DURATION_MS);
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    // Realtime authorizes postgres_changes using whatever session token the
    // socket had when it joined the channel. Subscribing immediately on
    // mount can race the browser client's async read of the session from
    // cookies, joining as anon — which the RLS policy then silently blocks
    // forever (no error, events just never arrive). Waiting for the session
    // and setting it explicitly avoids that race.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel('pull_requests-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pull_requests' },
          (payload) => {
            const updated = mapRowToPullRequest(payload.new as PullRequestRow);
            setPrs((current) => {
              const idx = current.findIndex((pr) => pr.number === updated.number);
              if (idx === -1) return [updated, ...current];
              const next = [...current];
              next[idx] = updated;
              return next;
            });
            // eventType (not array-index membership) is the reliable signal
            // for "this is a new PR" vs. "an existing PR's state changed" —
            // e.g. a PR getting merged is an UPDATE, not an INSERT.
            if (payload.eventType === 'INSERT') announceNewArrival(updated);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const filteredPrs = prs.filter((pr) => matchesFilter(pr, filter));

  return (
    <>
      {newArrival && <NewPrBanner arrival={newArrival} onDismiss={dismissNewArrival} />}
      <FilterTabs filter={filter} onChange={setFilter} />
      <ul className="mt-6 space-y-4" aria-live="polite">
        {filteredPrs.map((pr) => (
          <li key={pr.number}>
            <PrCard pr={pr} />
          </li>
        ))}
      </ul>
      {filteredPrs.length === 0 && (
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          No pull requests match this filter.
        </p>
      )}
    </>
  );
}
