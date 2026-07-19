'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import type { MergeMethod, PrComment, PullRequest } from '@/lib/github';

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

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; summary: string };

function SummaryPanel({ pr }: { pr: PullRequest }) {
  const [state, setState] = useState<SummaryState>({ status: 'idle' });

  async function handleSummarize() {
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
      <button
        type="button"
        onClick={handleSummarize}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Summarize
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">Summarizing…</p>
    );
  }

  if (state.status === 'error') {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {state.message}{' '}
        <button
          type="button"
          onClick={handleSummarize}
          className="font-medium hover:underline"
        >
          Retry
        </button>
      </p>
    );
  }

  return (
    <p className="text-sm text-black/80 dark:text-white/80">{state.summary}</p>
  );
}

type CommentsListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; comments: PrComment[] };

type PostCommentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' };

function CommentsSection({ pr }: { pr: PullRequest }) {
  const [listState, setListState] = useState<CommentsListState>({ status: 'idle' });
  const [text, setText] = useState('');
  const [postState, setPostState] = useState<PostCommentState>({ status: 'idle' });

  async function loadComments() {
    setListState({ status: 'loading' });
    try {
      const res = await fetch(`/api/prs/${pr.number}/comments`);
      if (!res.ok) throw new Error('Request failed');
      const comments: PrComment[] = await res.json();
      setListState({ status: 'loaded', comments });
    } catch {
      setListState({ status: 'error' });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (text.trim().length === 0) return;

    setPostState({ status: 'loading' });
    try {
      const res = await fetch(`/api/prs/${pr.number}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error('Request failed');
      setPostState({ status: 'idle' });
      setText('');
      await loadComments();
    } catch {
      setPostState({ status: 'error' });
    }
  }

  if (listState.status === 'idle') {
    return (
      <button
        type="button"
        onClick={loadComments}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Show comments
      </button>
    );
  }

  if (listState.status === 'loading') {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">Loading comments…</p>
    );
  }

  if (listState.status === 'error') {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Couldn&apos;t load comments.{' '}
        <button
          type="button"
          onClick={loadComments}
          className="font-medium hover:underline"
        >
          Retry
        </button>
      </p>
    );
  }

  const { comments } = listState;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-black/60 dark:text-white/60">
        {comments.length === 0
          ? 'No comments yet'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </p>
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Image
                src={c.authorAvatarUrl}
                alt={c.author}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    {c.author}
                  </a>{' '}
                  <span className="text-black/50 dark:text-white/50">
                    {formatDate(c.createdAt)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a comment…"
          rows={1}
          disabled={postState.status === 'loading'}
          className="min-w-0 flex-1 resize-none rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 disabled:opacity-50 dark:border-white/10 dark:focus:border-white/30"
        />
        <button
          type="submit"
          disabled={postState.status === 'loading' || text.trim().length === 0}
          className="rounded-md bg-black/5 px-3 py-1 text-sm font-medium text-black/70 hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
        >
          {postState.status === 'loading' ? 'Posting…' : 'Comment'}
        </button>
      </form>
      {postState.status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t post that comment. Try again.
        </p>
      )}
    </div>
  );
}

type RequestChangesState =
  | { status: 'idle' }
  | { status: 'open' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done' };

function RequestChangesSection({ pr }: { pr: PullRequest }) {
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
      <button
        type="button"
        onClick={() => setState({ status: 'open' })}
        className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
      >
        Request changes
      </button>
    );
  }

  if (state.status === 'done') {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Changes requested on GitHub.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to change?"
        rows={2}
        disabled={state.status === 'loading'}
        className="min-w-0 flex-1 resize-none rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 disabled:opacity-50 dark:border-white/10 dark:focus:border-white/30"
      />
      <button
        type="submit"
        disabled={state.status === 'loading' || text.trim().length === 0}
        className="rounded-md bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-50 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
      >
        {state.status === 'loading' ? 'Submitting…' : 'Submit'}
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}

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

function MergeSection({ pr }: { pr: PullRequest }) {
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

  if (state.status === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState({ status: 'confirming' })}
        className="text-sm font-medium text-green-600 hover:underline dark:text-green-400"
      >
        Merge
      </button>
    );
  }

  if (state.status === 'done') {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Merged on GitHub.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={mergeMethod}
        onChange={(e) => setMergeMethod(e.target.value as MergeMethod)}
        disabled={state.status === 'loading'}
        className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 disabled:opacity-50 dark:border-white/10 dark:focus:border-white/30"
      >
        {MERGE_METHODS.map((m) => (
          <option key={m.value} value={m.value} className="text-black">
            {m.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleConfirmMerge}
        disabled={state.status === 'loading'}
        className="rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
      >
        {state.status === 'loading' ? 'Merging…' : 'Confirm merge'}
      </button>
      <button
        type="button"
        onClick={() => setState({ status: 'idle' })}
        disabled={state.status === 'loading'}
        className="text-sm font-medium text-black/60 hover:underline disabled:opacity-50 dark:text-white/60"
      >
        Cancel
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </div>
  );
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
          <li key={pr.number} className="py-4">
            <div className="flex items-center gap-3">
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
            </div>
            <div className="mt-2 space-y-2 pl-11">
              <SummaryPanel pr={pr} />
              <MergeSection pr={pr} />
              <RequestChangesSection pr={pr} />
              <CommentsSection pr={pr} />
            </div>
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
