import type { PullRequest } from '@/lib/github';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ pr }: { pr: PullRequest }) {
  if (pr.isMerged) return <Badge variant="merged">Merged</Badge>;
  if (pr.state === 'open') return <Badge variant="open">Open</Badge>;
  return <Badge variant="closed">Closed</Badge>;
}
