import { GoogleGenAI } from "@google/genai";

const CANNED_SUMMARIES = [
  "This PR refactors the authentication middleware to use async/await instead of callbacks. No behavior changes, but error handling is now more consistent.",
  "Adds a new `/api/health` endpoint for uptime monitoring. Includes a basic test and updates the README.",
  "Fixes a race condition where two concurrent requests could both pass a stale cache check. Adds a mutex around the cache write.",
  "Updates dependencies (React 18 -> 19, Next.js patch bump). No source changes required.",
];

function fakeDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function summarizePRMock(diff: string): Promise<string> {
  await fakeDelay(800);

  if (diff.trim().length === 0) {
    return "This PR has no changes to summarize.";
  }

  const index = diff.length % CANNED_SUMMARIES.length;
  return CANNED_SUMMARIES[index];
}

async function summarizePRReal(diff: string): Promise<string> {
  if (diff.trim().length === 0) {
    return "This PR has no changes to summarize.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Summarize this pull request diff in 2-3 sentences for a reviewer. Focus on what changed and why, not a line-by-line description.\n\n${diff}`,
  });

  return response.text ?? "Gemini returned no summary text.";
}

const summaryCache = new Map<string, Promise<string>>();

export async function summarizePR(diff: string): Promise<string> {
  const cached = summaryCache.get(diff);
  if (cached) {
    return cached;
  }

  const promise = (
    process.env.USE_REAL_SUMMARIZER === "true"
      ? summarizePRReal(diff)
      : summarizePRMock(diff)
  ).catch((error) => {
    summaryCache.delete(diff);
    throw error;
  });

  summaryCache.set(diff, promise);
  return promise;
}
