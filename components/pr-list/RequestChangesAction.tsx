'use client';

import { useState, type FormEvent } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import type { PullRequest } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

type RequestChangesState =
  | { status: 'idle' }
  | { status: 'open' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done' };

export function RequestChangesAction({ pr }: { pr: PullRequest }) {
  const [state, setState] = useState<RequestChangesState>({ status: 'idle' });
  const [text, setText] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (text.trim().length === 0) return;

    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/prs/${pr.number}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
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

  if (state.status === 'idle') {
    return (
      <Button variant="ghost" size="sm" onClick={() => setState({ status: 'open' })}>
        <MessageSquareWarning data-icon="inline-start" />
        Request changes
      </Button>
    );
  }

  if (state.status === 'done') {
    return (
      <p className="w-full text-sm text-black/60 dark:text-white/60">
        Changes requested on GitHub.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      <div className="flex items-start gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to change?"
          rows={2}
          disabled={state.status === 'loading'}
          className="min-h-0 flex-1"
        />
        <Button
          type="submit"
          disabled={state.status === 'loading' || text.trim().length === 0}
        >
          {state.status === 'loading' ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
      {state.status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
