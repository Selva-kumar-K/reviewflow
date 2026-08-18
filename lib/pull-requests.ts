import type { PullRequest } from '@/lib/github';

// Shape of a row in the Supabase `pull_requests` table (snake_case, as
// Postgres convention dictates) — kept separate from the `PullRequest` type
// in lib/github.ts, which is camelCase and shaped around GitHub's API.
export type PullRequestRow = {
  number: number;
  title: string;
  author: string;
  author_avatar_url: string;
  state: 'open' | 'closed';
  is_merged: boolean;
  created_at: string;
  url: string;
};

export function mapRowToPullRequest(row: PullRequestRow): PullRequest {
  return {
    number: row.number,
    title: row.title,
    author: row.author,
    authorAvatarUrl: row.author_avatar_url,
    state: row.state,
    isMerged: row.is_merged,
    createdAt: row.created_at,
    url: row.url,
  };
}
