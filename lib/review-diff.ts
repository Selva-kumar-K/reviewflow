import { GoogleGenAI, Type } from '@google/genai';
import type { DiffFile } from './diff';

// One AI-generated read per changed file: a short summary of what changed,
// plus freeform notes flagging anything unusual/risky, or a plain "looks
// fine" when nothing stands out. Deliberately no fixed category taxonomy
// (see the grilled requirements doc's Non-goals) — the model isn't forced
// to label something "Security" or "Performance" when it hasn't actually
// verified that through any real analysis.
export type FileReview = {
  path: string;
  summary: string;
  notes: string;
};

const MOCK_SUMMARIES = [
  "Adds new logic to this file without touching any existing exports.",
  "Modifies existing behavior in a few places; surface area looks contained to this file.",
  "Mostly configuration/boilerplate changes — nothing behavioral here.",
  "Removes a chunk of code and replaces it with a smaller equivalent.",
];

const MOCK_NOTES = [
  "Looks fine — nothing stands out.",
  "Worth a second look: this touches error-handling behavior.",
  "Looks fine, though the change is large enough to skim closely.",
  "Nothing risky spotted, but double-check any renamed exports are updated everywhere they're imported.",
];

function fakeDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deterministic (not random) per file, same trick as summarizePRMock in
// lib/summarize.ts — keyed off each file's own diff/path length so
// re-reviewing the same PR always shows the same mock notes.
async function reviewDiffFilesMock(files: DiffFile[]): Promise<FileReview[]> {
  await fakeDelay(800);

  return files.map((file) => ({
    path: file.path,
    summary: MOCK_SUMMARIES[file.raw.length % MOCK_SUMMARIES.length],
    notes: MOCK_NOTES[file.path.length % MOCK_NOTES.length],
  }));
}

// Constrains Gemini's JSON response to exactly this shape (one entry per
// file, three required string fields) rather than trusting free-form JSON
// to happen to match. Doesn't make a malformed response impossible — see
// the parsing/validation below — just much less likely.
const REVIEW_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING },
      summary: { type: Type.STRING },
      notes: { type: Type.STRING },
    },
    required: ['path', 'summary', 'notes'],
  },
};

function isFileReview(value: unknown): value is FileReview {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).path === 'string' &&
    typeof (value as Record<string, unknown>).summary === 'string' &&
    typeof (value as Record<string, unknown>).notes === 'string'
  );
}

async function reviewDiffFilesReal(files: DiffFile[]): Promise<FileReview[]> {
  if (files.length === 0) {
    return [];
  }

  const filesText = files.map((file) => `### File: ${file.path}\n${file.raw}`).join('\n\n');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents:
      "You are reviewing a pull request, file by file. For each file below, write a short " +
      'summary of what changed and freeform notes flagging anything unusual, risky, or worth ' +
      "a second look — or say the change looks fine if nothing stands out. Don't force a " +
      "category onto every note; only flag something you'd genuinely raise in a real code " +
      'review.\n\nRespond with a JSON array, one entry per file, in the same order as listed, ' +
      `each with "path", "summary", and "notes".\n\n${filesText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: REVIEW_RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned no review text.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isFileReview)) {
    throw new Error('Gemini response did not match the expected per-file review shape.');
  }

  return parsed;
}

// Cache key is every included file's own diff text, joined in order — same
// "cache on the content being reviewed, not an ID that points at it" idea
// as summarizePR's cache, extended to a whole file set: if any included
// file's diff changes, or which files are included changes, the key
// changes too.
function cacheKeyFor(files: DiffFile[]): string {
  return files.map((file) => file.raw).join("\n");
}

const reviewCache = new Map<string, Promise<FileReview[]>>();

export async function reviewDiffFiles(files: DiffFile[]): Promise<FileReview[]> {
  const key = cacheKeyFor(files);
  const cached = reviewCache.get(key);
  if (cached) {
    return cached;
  }

  const promise = (
    process.env.USE_REAL_SUMMARIZER === 'true'
      ? reviewDiffFilesReal(files)
      : reviewDiffFilesMock(files)
  ).catch((error) => {
    reviewCache.delete(key);
    throw error;
  });

  reviewCache.set(key, promise);
  return promise;
}
