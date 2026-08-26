import Link from 'next/link';
import { FileDiff } from 'lucide-react';
import type { PullRequest } from '@/lib/github';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrAvatar } from './PrAvatar';
import { StatusBadge } from './StatusBadge';
import { SummarizeAction } from './SummarizeAction';
import { MergeAction } from './MergeAction';
import { RequestChangesAction } from './RequestChangesAction';
import { CommentsAction } from './CommentsAction';
import { formatDate } from './format';

export function PrCard({ pr }: { pr: PullRequest }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <PrAvatar src={pr.authorAvatarUrl} alt={pr.author} />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{pr.title}</CardTitle>
          <CardDescription>
            #{pr.number} opened by {pr.author} on {formatDate(pr.createdAt)}
          </CardDescription>
        </div>
        <StatusBadge pr={pr} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="View diff review"
          title="View diff review"
          render={<Link href={`/prs/${pr.number}`} />}
        >
          <FileDiff />
        </Button>
      </CardContent>
      <CardContent className="flex flex-wrap items-center gap-2">
        <SummarizeAction pr={pr} />
        <MergeAction pr={pr} />
        <RequestChangesAction pr={pr} />
        <CommentsAction pr={pr} />
      </CardContent>
    </Card>
  );
}
