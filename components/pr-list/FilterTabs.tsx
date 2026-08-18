import type { PullRequest } from '@/lib/github';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type Filter = 'all' | 'open' | 'merged' | 'closed';

export const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
];

export function matchesFilter(pr: PullRequest, filter: Filter) {
  if (filter === 'all') return true;
  if (filter === 'merged') return pr.isMerged;
  if (filter === 'closed') return pr.state === 'closed' && !pr.isMerged;
  return pr.state === 'open';
}

export function FilterTabs({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (filter: Filter) => void;
}) {
  return (
    <Tabs
      value={filter}
      onValueChange={(value) => onChange(value as Filter)}
      className="mt-4"
    >
      <TabsList>
        {FILTERS.map((f) => (
          <TabsTrigger key={f.value} value={f.value}>
            {f.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
