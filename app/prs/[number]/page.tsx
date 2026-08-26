import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPullRequestDiff } from '@/lib/github';
import { parseDiff, selectFilesWithinBudget, DEFAULT_DIFF_CHAR_BUDGET } from '@/lib/diff';
import { mapRowToPullRequest, type PullRequestRow } from '@/lib/pull-requests';
import { reviewDiffFiles } from '@/lib/review-diff';
import { FileReviewCard } from '@/components/pr-review/FileReviewCard';
import { TruncationBanner } from '@/components/pr-review/TruncationBanner';
import { Button } from '@/components/ui/button';

export default async function PrReviewPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const prNumber = Number(number);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: row, error } = await supabase
    .from('pull_requests')
    .select('*')
    .eq('number', prNumber)
    .single();

  if (error || !row) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-6" render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <p className="text-sm text-gray-500">PR #{prNumber} not found.</p>
      </main>
    );
  }

  const pr = mapRowToPullRequest(row as PullRequestRow);

  const diff = await getPullRequestDiff(prNumber);
  const files = parseDiff(diff);
  const { included, totalCount } = selectFilesWithinBudget(files, DEFAULT_DIFF_CHAR_BUDGET);

  // Not awaited here — kicked off once, then handed to every card as the
  // same promise instance. Each card's own <Suspense> boundary is what
  // lets the diffs paint immediately while this one shared Gemini call is
  // still in flight. Chaining .then() (rather than awaiting) builds the
  // by-path lookup map once, off the same promise, so every card's note
  // slot gets an O(1) get() instead of each re-scanning the array.
  const reviewsByPathPromise = reviewDiffFiles(included).then(
    (reviews) => new Map(reviews.map((review) => [review.path, review])),
  );
  // No-op catch, purely to attach a rejection handler synchronously.
  // FileReviewNote's own try/catch (inside a Suspense boundary further
  // down the tree) does the real handling, but React doesn't get to that
  // await until later in the streaming render — past the microtask tick
  // Node checks for a handler on — so without this, a real Gemini failure
  // logs a spurious "unhandledRejection" warning even though the error is
  // genuinely caught and rendered correctly. This second handler doesn't
  // consume the rejection; reviewsByPathPromise still rejects normally for
  // every card that awaits it.
  reviewsByPathPromise.catch(() => {});

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Button variant="ghost" size="sm" className="mb-6" render={<Link href="/" />}>
        <ArrowLeft data-icon="inline-start" />
        Back
      </Button>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{pr.title}</h1>
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm text-black/60 hover:underline dark:text-white/60"
        >
          View on GitHub ↗
        </a>
      </div>

      {included.length < totalCount && (
        <TruncationBanner includedCount={included.length} totalCount={totalCount} />
      )}

      <div className="flex flex-col gap-4">
        {included.map((file) => (
          <FileReviewCard
            key={file.path}
            file={file}
            reviewsByPathPromise={reviewsByPathPromise}
          />
        ))}
      </div>
    </main>
  );
}
