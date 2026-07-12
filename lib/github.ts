import { cache } from "react";

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
    "https://api.github.com/repos/Selva-kumar-K/reviewflow/pulls?state=all",
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
    const res = await fetch(
      `https://api.github.com/repos/Selva-kumar-K/reviewflow/pulls/${number}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.diff",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    return res.text();
  },
);
