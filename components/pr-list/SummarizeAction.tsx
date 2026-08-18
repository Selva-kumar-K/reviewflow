'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { PullRequest } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; summary: string };

// Gemini free tier: 10 req/min. Shared across every SummarizeAction instance
// (module scope, not component state) so bursts across different PRs are
// caught, not just repeat clicks on one row. Resets on page reload — fine
// for a single dev/demo session.
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
let requestTimestamps: number[] = [];

function checkRateLimit(): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < WINDOW_MS);
  if (requestTimestamps.length < RATE_LIMIT) return { ok: true };
  const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - requestTimestamps[0])) / 1000);
  return { ok: false, retryAfterSeconds };
}

export function SummarizeAction({ pr }: { pr: PullRequest }) {
  const [state, setState] = useState<SummaryState>({ status: 'idle' });

  async function handleSummarize() {
    const rateCheck = checkRateLimit();
    if (!rateCheck.ok) {
      setState({
        status: 'error',
        message: `Rate limit reached — try again in ${rateCheck.retryAfterSeconds}s`,
      });
      return;
    }
    requestTimestamps.push(Date.now());
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/prs/${pr.number}/summary`);
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Request failed');
      }
      const data: { summary: string } = await res.json();
      setState({ status: 'done', summary: data.summary });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    }
  }

  if (state.status === 'idle') {
    return (
      <Button variant="ghost" size="sm" onClick={handleSummarize}>
        <Sparkles data-icon="inline-start" />
        Summarize
      </Button>
    );
  }

  if (state.status === 'loading') {
    return (
      <p className="w-full text-sm text-black/60 dark:text-white/60">Summarizing…</p>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert variant="destructive" className="w-full">
        <AlertDescription>
          {state.message}{' '}
          <button type="button" onClick={handleSummarize} className="font-medium underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <p className="w-full text-sm text-black/80 dark:text-white/80">{state.summary}</p>
  );
}
