'use client';

import { useRouter } from 'next/navigation';

// Same pattern as SignOutButton: a client-side trigger that calls
// router.refresh() to re-run the Server Component tree. Here that means
// page.tsx calls reviewDiffFiles(included) again — and since a rejected
// promise deletes its own cache entry (lib/review-diff.ts), this is a
// genuine retry of the Gemini call, not just a re-render of stale data.
export function RetryReviewButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.refresh()}
      className="cursor-pointer text-sm font-medium underline underline-offset-2"
    >
      Retry
    </button>
  );
}
