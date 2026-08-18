'use client';

import { useState, type FormEvent } from 'react';
import { MessageSquare } from 'lucide-react';
import type { PrComment, PullRequest } from '@/lib/github';
import { formatDate } from './format';
import { PrAvatar } from './PrAvatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type CommentsListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; comments: PrComment[] };

type PostCommentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' };

export function CommentsAction({ pr }: { pr: PullRequest }) {
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
      <Button variant="ghost" size="sm" onClick={loadComments}>
        <MessageSquare data-icon="inline-start" />
        Show comments
      </Button>
    );
  }

  if (listState.status === 'loading') {
    return (
      <div className="w-full space-y-2" aria-label="Loading comments">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (listState.status === 'error') {
    return (
      <Alert variant="destructive" className="w-full">
        <AlertDescription>
          Couldn&apos;t load comments.{' '}
          <button type="button" onClick={loadComments} className="font-medium underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const { comments } = listState;

  return (
    <div className="w-full space-y-3">
      <p className="text-sm font-medium text-black/60 dark:text-white/60">
        {comments.length === 0
          ? 'No comments yet'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </p>
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <PrAvatar src={c.authorAvatarUrl} alt={c.author} size="sm" />
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
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a comment…"
          rows={1}
          disabled={postState.status === 'loading'}
          className="min-h-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={postState.status === 'loading' || text.trim().length === 0}
        >
          {postState.status === 'loading' ? 'Posting…' : 'Comment'}
        </Button>
      </form>
      {postState.status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t post that comment. Try again.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
