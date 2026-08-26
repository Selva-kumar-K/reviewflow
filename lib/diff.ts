// Hand-parses the unified diff format GitHub's `.diff` accept header returns
// (already consumed as a raw string by getPullRequestDiff in lib/github.ts).
// A unified diff is plain text, one file after another, each shaped like:
//
//   diff --git a/path/to/file b/path/to/file
//   index abc123..def456 100644
//   --- a/path/to/file          (or /dev/null for a newly added file)
//   +++ b/path/to/file          (or /dev/null for a deleted file)
//   @@ -12,7 +12,9 @@ optional hunk context
//    unchanged line (leading space)
//   -removed line (leading -)
//   +added line (leading +)
//
// There's no npm package pulled in for this — the grilled requirements doc
// ruled out a diff-viewing library on purpose, and the format is simple
// enough to walk line-by-line.

export type DiffLineType = "add" | "remove" | "context";

export type DiffLine = {
  type: DiffLineType;
  content: string;
};

export type DiffHunk = {
  header: string;
  lines: DiffLine[];
};

export type DiffFile = {
  path: string;
  hunks: DiffHunk[];
  // The exact diff text for just this file (the "diff --git" line through
  // to the line before the next file's "diff --git", or EOF). This is what
  // both the char-budget accounting and the Gemini prompt use — one string,
  // one source of truth for "how big is this file's diff."
  raw: string;
};

export const DEFAULT_DIFF_CHAR_BUDGET = 50_000;

export function parseDiff(diff: string): DiffFile[] {
  if (diff.trim().length === 0) return [];

  const files: DiffFile[] = [];

  let currentRawLines: string[] | null = null;
  let currentPath = "";
  let currentHunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  function flushFile() {
    if (currentRawLines === null) return;
    if (currentHunk) {
      currentHunks.push(currentHunk);
    }
    files.push({
      path: currentPath,
      hunks: currentHunks,
      raw: currentRawLines.join("\n"),
    });
    currentRawLines = null;
    currentHunks = [];
    currentHunk = null;
  }

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      flushFile();
      currentRawLines = [line];
      currentPath = line.slice("diff --git ".length);
      continue;
    }

    // Anything before the first "diff --git" isn't part of any file.
    if (currentRawLines === null) continue;
    currentRawLines.push(line);

    if (line.startsWith("--- ")) {
      const p = line.slice(4).trim();
      if (p !== "/dev/null") {
        currentPath = p.startsWith("a/") ? p.slice(2) : p;
      }
      continue;
    }

    if (line.startsWith("+++ ")) {
      const p = line.slice(4).trim();
      if (p !== "/dev/null") {
        currentPath = p.startsWith("b/") ? p.slice(2) : p;
      }
      continue;
    }

    if (line.startsWith("@@ ")) {
      if (currentHunk) currentHunks.push(currentHunk);
      currentHunk = { header: line, lines: [] };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({ type: "add", content: line.slice(1) });
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({ type: "remove", content: line.slice(1) });
    } else if (line.startsWith(" ")) {
      currentHunk.lines.push({ type: "context", content: line.slice(1) });
    }
    // Anything else inside a hunk (e.g. "\ No newline at end of file") is
    // metadata, not a line of code — skipped rather than rendered.
  }
  flushFile();

  return files;
}

// Walks files in diff order, including each one whole only if doing so
// keeps the running character total within budget. The first file that
// would push the total over the cap is dropped, along with every file
// after it — never truncated mid-file, and never reordered to fit more in.
export function selectFilesWithinBudget(
  files: DiffFile[],
  maxChars: number,
): { included: DiffFile[]; totalCount: number } {
  const included: DiffFile[] = [];
  let runningTotal = 0;

  for (const file of files) {
    if (runningTotal + file.raw.length > maxChars) break;
    included.push(file);
    runningTotal += file.raw.length;
  }

  return { included, totalCount: files.length };
}
