import { Suspense } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { DiffFileView } from './DiffFileView';
import { RetryReviewButton } from './RetryReviewButton';
import type { DiffFile } from '@/lib/diff';
import type { FileReview } from '@/lib/review-diff';

const FALLBACK_REVIEW: FileReview = {
  path: '',
  summary: 'No AI note available for this file.',
  notes: '',
};

// Async Server Component, not a plain function returning JSX — the `await`
// below is what lets this slot suspend independently of the diff already
// rendered above it. Every FileReviewCard on the page is handed the exact
// same reviewsByPathPromise instance (one reviewDiffFiles call in the
// page), so they all suspend on, and resolve from, one shared Gemini
// request.
async function FileReviewNote({
  reviewsByPathPromise,
  path,
}: {
  reviewsByPathPromise: Promise<Map<string, FileReview>>;
  path: string;
}) {
  // Caught here, not left to throw into the Suspense boundary — an
  // uncaught rejection would bubble past Suspense (which only handles
  // pending promises, not rejected ones) to the nearest error.tsx, which
  // doesn't exist for this route, so it'd blank out the whole page instead
  // of just this one card's note slot. Every card awaits the same shared
  // promise, so a Gemini failure shows this same inline Alert on all of
  // them at once — consistent with it being one shared call, not N.
  let reviewsByPath: Map<string, FileReview>;
  try {
    reviewsByPath = await reviewsByPathPromise;
  } catch (error) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertDescription>
          Couldn&apos;t get an AI note for this file:{' '}
          {error instanceof Error ? error.message : 'Unknown error.'}
        </AlertDescription>
        <AlertAction>
          <RetryReviewButton />
        </AlertAction>
      </Alert>
    );
  }

  const review = reviewsByPath.get(path) ?? FALLBACK_REVIEW;

  return (
    <>
      <p className="text-sm">{review.summary}</p>
      <p className="mt-1 text-sm text-muted-foreground">{review.notes}</p>
    </>
  );
}

function NoteSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

// Diff and AI note live side by side (diff left, note right) rather than
// stacked — one row per file. This keeps each row's height driven by that
// file's own diff only, instead of adding the note's height underneath it,
// which is what cuts down total scroll on PRs with many changed files. The
// diff renders immediately (DiffFileView is sync/presentational); the note
// slot is wrapped in its own <Suspense> so an ~8s Gemini round trip doesn't
// hold up the diff painting. Below the `lg` breakpoint there's not enough
// width for both columns, so it falls back to stacked.
export function FileReviewCard({
  file,
  reviewsByPathPromise,
}: {
  file: DiffFile;
  reviewsByPathPromise: Promise<Map<string, FileReview>>;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <DiffFileView file={file} />
        </div>
        <div className="flex flex-col gap-1 border-t pt-4 lg:w-72 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
          <Suspense fallback={<NoteSkeleton />}>
            <FileReviewNote reviewsByPathPromise={reviewsByPathPromise} path={file.path} />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
