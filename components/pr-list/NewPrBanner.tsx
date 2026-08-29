import { Sparkles, X } from 'lucide-react';
import type { PullRequest } from '@/lib/github';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export type NewArrival = { pr: PullRequest; count: number };

export function NewPrBanner({
  arrival,
  onDismiss,
}: {
  arrival: NewArrival;
  onDismiss: () => void;
}) {
  const { pr, count } = arrival;

  return (
    <Alert role="status" aria-live="polite" className="mb-4 border-primary/30 bg-primary/5">
      <Sparkles className="text-primary" />
      <AlertTitle>
        {count === 1 ? 'New pull request arrived' : `${count} new pull requests arrived`}
      </AlertTitle>
      <AlertDescription>
        #{pr.number} — {pr.title} (opened by {pr.author})
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismiss}>
          <X />
        </Button>
      </AlertAction>
    </Alert>
  );
}
