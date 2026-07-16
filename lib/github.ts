import { cache } from "react";

const GITHUB_REPO_URL = "https://api.github.com/repos/Selva-kumar-K/reviewflow";

export type PullRequest = {
  number: number;
  title: string;
  author: string;
  authorAvatarUrl: string;
  state: "open" | "closed";
  isMerged: boolean;
  createdAt: string;
  url: string;
};

type GitHubPullRequest = {
  number: number;
  title: string;
  user: { login: string; avatar_url: string };
  state: "open" | "closed";
  merged_at: string | null;
  created_at: string;
  html_url: string;
};

export const getPullRequests = cache(async (): Promise<PullRequest[]> => {
  const res = await fetch(
    `${GITHUB_REPO_URL}/pulls?state=all`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const pulls: GitHubPullRequest[] = await res.json();
  return pulls.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.user.login,
    authorAvatarUrl: pr.user.avatar_url,
    state: pr.state,
    isMerged: pr.merged_at !== null,
    createdAt: pr.created_at,
    url: pr.html_url,
  }));
});

export const getPullRequestDiff = cache(
  async (number: number): Promise<string> => {
    const res = await fetch(`${GITHUB_REPO_URL}/pulls/${number}`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.diff",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    return res.text();
  },
);

export type PrComment = {
  id: number;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  url: string;
};

type GitHubComment = {
  id: number;
  user: { login: string; avatar_url: string };
  body: string;
  created_at: string;
  html_url: string;
};

export const getPullRequestComments = cache(
  async (number: number): Promise<PrComment[]> => {
    const res = await fetch(`${GITHUB_REPO_URL}/issues/${number}/comments`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const comments: GitHubComment[] = await res.json();
    return comments.map((c) => ({
      id: c.id,
      author: c.user.login,
      authorAvatarUrl: c.user.avatar_url,
      body: c.body,
      createdAt: c.created_at,
      url: c.html_url,
    }));
  },
);

export async function commentOnPullRequest(
  number: number,
  body: string,
): Promise<void> {
  const res = await fetch(`${GITHUB_REPO_URL}/issues/${number}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} — ${detail}`);
  }
}

export type MergeMethod = "merge" | "squash" | "rebase";

export async function mergePullRequest(
  number: number,
  mergeMethod: MergeMethod = "squash",
): Promise<void> {
  const res = await fetch(`${GITHUB_REPO_URL}/pulls/${number}/merge`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ merge_method: mergeMethod }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} — ${detail}`);
  }
}

export async function requestChangesOnPullRequest(
  number: number,
  body: string,
): Promise<void> {
  const res = await fetch(`${GITHUB_REPO_URL}/pulls/${number}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body, event: "REQUEST_CHANGES" }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${res.statusText} — ${detail}`);
  }
}
