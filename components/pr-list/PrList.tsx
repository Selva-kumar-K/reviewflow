'use client';

import { useEffect, useState } from 'react';
import type { PullRequest } from '@/lib/github';
import { createClient } from '@/lib/supabase/client';
import { mapRowToPullRequest, type PullRequestRow } from '@/lib/pull-requests';
import { FilterTabs, matchesFilter, type Filter } from './FilterTabs';
import { PrCard } from './PrCard';

export function PrList({ prs: initialPrs }: { prs: PullRequest[] }) {
  // Seeded once from the server-rendered prop, then kept fresh by the
  // realtime subscription below — deliberately not re-synced from the prop
  // on every render (no `useEffect(() => setPrs(initialPrs), [initialPrs])`),
  // since page.tsx only re-renders this prop on a fresh navigation, and
  // resyncing could let a stale server-rendered prop clobber a newer
  // realtime update.
  const [prs, setPrs] = useState(initialPrs);
  const [filter, setFilter] = useState<Filter>('all');

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
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const filteredPrs = prs.filter((pr) => matchesFilter(pr, filter));

  return (
    <>
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
