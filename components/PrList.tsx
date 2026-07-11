'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PullRequest } from '@/lib/github';

type Filter = 'all' | 'open' | 'merged' | 'closed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
];

function matchesFilter(pr: PullRequest, filter: Filter) {
  if (filter === 'all') return true;
  if (filter === 'merged') return pr.isMerged;
  if (filter === 'closed') return pr.state === 'closed' && !pr.isMerged;
  return pr.state === 'open';
}

function StatusBadge({ pr }: { pr: PullRequest }) {
  if (pr.isMerged) {
    return (
      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
        Merged
      </span>
    );
  }
  if (pr.state === 'open') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
        Open
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
      Closed
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PrList({ prs }: { prs: PullRequest[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const filteredPrs = prs.filter((pr) => matchesFilter(pr, filter));

  return (
    <>
      <div className="mt-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f.value
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="mt-6 divide-y divide-black/10 dark:divide-white/10">
        {filteredPrs.map((pr) => (
          <li key={pr.number} className="flex items-center gap-3 py-4">
            <Image
              src={pr.authorAvatarUrl}
              alt={pr.author}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="truncate font-medium hover:underline"
              >
                {pr.title}
              </a>
              <p className="text-sm text-black/60 dark:text-white/60">
                #{pr.number} opened by {pr.author} on {formatDate(pr.createdAt)}
              </p>
            </div>
            <StatusBadge pr={pr} />
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
