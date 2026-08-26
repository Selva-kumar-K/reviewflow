import { GitPullRequest, ListChecks, Sparkles, CircleCheckBig } from 'lucide-react';
import { PrList } from '@/components/pr-list/PrList';
import { SignInButton } from '@/components/SignInButton';
import { SignOutButton } from '@/components/SignOutButton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { mapRowToPullRequest, type PullRequestRow } from '@/lib/pull-requests';

const FEATURES = [
  { icon: ListChecks, text: 'See every open PR across your repo in one view' },
  { icon: Sparkles, text: 'AI-generated summaries of each diff' },
  { icon: CircleCheckBig, text: 'Merge, comment, or request changes without leaving the page' },
];

// Note: lib/github.ts's getPullRequests() (live GitHub fetch) is no longer
// used here — the `pull_requests` Supabase table, kept in sync by the
// GitHub webhook, is now the source of truth for the list. getPullRequests
// is kept around; it's still used by the one-time backfill route.

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-svh w-full items-center justify-center px-4 py-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center gap-2 pb-0 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GitPullRequest className="size-5" />
            </div>
            <CardTitle className="text-lg">ReviewFlow</CardTitle>
            <CardDescription>
              A single dashboard for reviewing, summarizing, and acting on
              pull requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Icon className="mt-0.5 size-4 shrink-0 text-foreground/70" />
                  {text}
                </li>
              ))}
            </ul>
            <SignInButton />
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data, error } = await supabase
    .from('pull_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const prs = (data ?? []).map((row) => mapRowToPullRequest(row as PullRequestRow));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pull Requests</h1>
        <SignOutButton />
      </div>
      <PrList prs={prs} />
    </main>
  );
}
