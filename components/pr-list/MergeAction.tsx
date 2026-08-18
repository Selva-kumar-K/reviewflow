'use client';

import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import type { MergeMethod, PullRequest } from '@/lib/github';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

type MergeState =
  | { status: 'idle' }
  | { status: 'confirming' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done' };

const MERGE_METHODS: { value: MergeMethod; label: string }[] = [
  { value: 'squash', label: 'Squash and merge' },
  { value: 'merge', label: 'Create a merge commit' },
  { value: 'rebase', label: 'Rebase and merge' },
];

export function MergeAction({ pr }: { pr: PullRequest }) {
  const [state, setState] = useState<MergeState>({ status: 'idle' });
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('squash');

  if (pr.state !== 'open' || pr.isMerged) return null;

  async function handleConfirmMerge() {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/prs/${pr.number}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeMethod }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Request failed');
      }
      setState({ status: 'done' });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    }
  }

  if (state.status === 'done') {
    return (
      <p className="w-full text-sm text-black/60 dark:text-white/60">
        Merged on GitHub.
      </p>
    );
  }

  // Dialog stays fully controlled by our own state machine (not left to the
  // trigger/close primitives' default behavior) so it can't be dismissed
  // mid-request: AlertDialogAction is a plain Button (confirmed from its
  // source), it doesn't auto-close on click, so `loading` naturally keeps
  // the dialog open until the fetch resolves either way.
  const dialogOpen = state.status !== 'idle';

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setState({ status: 'confirming' })}>
        <GitMerge data-icon="inline-start" />
        Merge
      </Button>
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && state.status !== 'loading') setState({ status: 'idle' });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge this pull request?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a merge strategy. This writes a commit to the base branch on GitHub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select
            value={mergeMethod}
            onValueChange={(value) => setMergeMethod(value as MergeMethod)}
          >
            <SelectTrigger disabled={state.status === 'loading'} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MERGE_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={state.status === 'loading'}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMerge} disabled={state.status === 'loading'}>
              {state.status === 'loading' ? 'Merging…' : 'Confirm merge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
