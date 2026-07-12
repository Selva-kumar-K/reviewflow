const CANNED_SUMMARIES = [
  "This PR refactors the authentication middleware to use async/await instead of callbacks. No behavior changes, but error handling is now more consistent.",
  "Adds a new `/api/health` endpoint for uptime monitoring. Includes a basic test and updates the README.",
  "Fixes a race condition where two concurrent requests could both pass a stale cache check. Adds a mutex around the cache write.",
  "Updates dependencies (React 18 -> 19, Next.js patch bump). No source changes required.",
];

function fakeDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function summarizePR(diff: string): Promise<string> {
  await fakeDelay(800);

  if (diff.trim().length === 0) {
    return "This PR has no changes to summarize.";
  }

  const index = diff.length % CANNED_SUMMARIES.length;
  return CANNED_SUMMARIES[index];
}
