# AI-powered PR review view — implementation plan

Source: `02-grilled-requirements.md`. Decisions below marked "confirmed with
Selva" came out of the `/plan` back-and-forth; everything else follows
directly from the grilled doc or from reading the current codebase
(`app/page.tsx`, `lib/github.ts`, `lib/summarize.ts`,
`components/pr-list/*`).

## Architecture decisions

### 1. Server Component renders the page directly — no new API route
The grilled doc's Constraints text assumed a new API route (like
`summary/route.ts`) that a Client Component would fetch on mount. Reading
the actual codebase changes that: `app/page.tsx` already calls Supabase and
(historically) `getPullRequests()` **directly** from a Server Component,
no self-fetch. `/prs/[number]/page.tsx` can do the same — call
`getPullRequestDiff()` and the new `reviewDiffFiles()` directly during
render, since both already run server-side (`GITHUB_TOKEN`/`GEMINI_API_KEY`
never need to cross into the browser).

**Chosen over** the click-based pattern `SummarizeAction` uses, **because**:
- It sidesteps the exact failure mode the grilled doc's Success Criteria
  called out by name — React Strict Mode double-firing a `useEffect` on
  mount, which would need its own guard logic to avoid a second Gemini
  call. A Server Component renders once per request; there's no effect to
  double-fire.
- It matches this app's own established split: Server Components fetch,
  Client Components are small interactive leaves. There's no interactivity
  needed to *trigger* this fetch (it's auto-fire, not a button), so there's
  no reason for a Client Component to own it.
- One fewer file (no route), one fewer network hop (browser → route →
  GitHub/Gemini becomes just render-time → GitHub/Gemini).

The existing `requireUser()`-gated API routes under `app/api/prs/**` are
unaffected — they still guard the dashboard's click-triggered actions
(merge, comment, request-changes, the card's Summarize). The new page gets
its own gate the same way `app/page.tsx` does (#2 below), not via a route.

### 2. Auth gate: `redirect('/')`, not a duplicated sign-in prompt
`app/page.tsx` already renders the sign-in prompt + `SignInButton` when
`getUser()` returns null. Rather than copy that JSX into the new page,
`/prs/[number]/page.tsx` calls `redirect('/')` (from `next/navigation`) when
there's no user — `/` will itself show the sign-in prompt. Satisfies the
grilled doc's "gated at the Server Component level, not just the API
layer" constraint with less duplication than the alternative (copy-pasting
the prompt markup).

### 3. One Gemini call, fanned out to N per-file UI slots via a content-keyed cache
Confirmed layout: one card per changed file, diff and AI note together in
that card (not two separate scrolling columns). Confirmed loading: the diff
renders immediately; the AI notes stream in via `<Suspense>` once Gemini
responds, so an ~8s Gemini round trip doesn't block the diff from painting
(same latency `summarizePRReal` already showed in an earlier session).

Reconciling "one shared call" with "N independent card slots that Suspend
their own note": `reviewDiffFiles(files)` (new, in `lib/review-diff.ts`) is
cached by a **string key derived from the included files' diff content**,
exactly like `summarizePR`'s `summaryCache` in `lib/summarize.ts` — a
module-level `Map<string, Promise<FileReview[]>>`. Every card's note slot
calls `reviewDiffFiles(includedFiles)` with the same input, so every call
after the first hits the same in-flight promise — one real Gemini request,
awaited N times. This is the same trick already proven for
`getPullRequestDiff`/`getPullRequests` (React's `cache()`) and for
`summarizePR` (a hand-rolled Map) — here it's the hand-rolled Map again,
since the cache key is a derived string, not a primitive argument
`cache()` can dedupe on directly.

Each card's note slot is individually wrapped in `<Suspense>`, but because
they all await the same promise object, they resolve together in practice
— visually it reads as "the notes column fills in all at once," which
matches the approved preview.

### 4. Diff truncation is whole-file, budget-driven, shared by both the renderer and the Gemini prompt
Confirmed budget: **50,000 characters** total, walked file-by-file in diff
order. `lib/diff.ts` exports a function that walks the parsed files,
running total of characters; a file is **included** if adding its full diff
keeps the running total ≤ 50,000, otherwise it's **dropped whole** (never
truncated mid-file) and every file after it is dropped too (order-preserving,
simplest to reason about and to explain later). The same `includedFiles`
list feeds both the diff renderer and `reviewDiffFiles()` — there's exactly
one "K of M" computation, not two that could disagree.

Checked against real repo data before picking 50,000: PR #1 (11 files) is
35,008 chars total; PR #14 (a 64-file full-branch merge, an outlier — not a
normal single-feature PR) is 390,482 chars and will cleanly hit the cap
around its first 10-15 files, which is exactly the case this budget exists
to catch and gives a real PR to test the truncation banner against without
fabricating an oversized throwaway PR.

### 5. New Gemini call shape is a new file, not a change to `lib/summarize.ts`
`summarizePR(diff: string): Promise<string>` (one blurb, one string in/out)
stays completely untouched — the grilled doc's Non-goal is explicit that
`SummarizeAction` isn't being replaced, and its shape (single string) can't
express "structured per-file JSON" without becoming a different function
anyway. New file `lib/review-diff.ts` gets its own
`reviewDiffFilesMock`/`reviewDiffFilesReal` split behind the same
`USE_REAL_SUMMARIZER` flag, and its own content-keyed cache — same pattern,
sibling file, not a shared one.

### Skill relevance check (per `/plan` instructions)
- **`vercel:nextjs`** — directly relevant: a new `[number]` dynamic segment
  (extends the pattern already used under `app/api/prs/[number]/*`),
  `redirect()`, a route-level `loading.tsx`, and (new to this codebase)
  `<Suspense>` streaming a slow Server Component. Worth a skim before
  Step 6 below.
- **`vercel:shadcn`** — lightly relevant. No new shadcn component install
  planned for v1: `Card`, `Skeleton`, `Alert`, `Badge` (already installed)
  cover everything here, and the diff itself is deliberately hand-rolled
  colored monospace per the grilled doc's non-goal (no diff-viewing
  library). If a later polish pass wants a `Collapsible` for long files,
  that's a follow-up.
- **`vercel:next-cache-components`** — considered, not used. This feature's
  whole point is a fresh-per-content Gemini call with an explicit,
  auditable cache (content-keyed Map, verified by request-counting in the
  grilled doc's Success Criteria). Framework-level `use cache`/PPR would
  add a second, less legible caching layer on top of that and make "did
  this actually call Gemini once or did the framework serve a cached
  render" harder to verify by eye — not worth it for a feature whose
  correctness criterion *is* "count the network requests."

## New concepts to explain during `/code` (per AGENTS.md's no-vibe-coding rule)
- Hand-parsing a unified diff (`diff --git` / `@@` hunk headers / `+`/`-`/
  context lines) into a structured `DiffFile[]` — nothing exotic, but new
  to this codebase.
- `redirect()` from `next/navigation` (new — existing auth gate in
  `app/page.tsx` branches in JSX instead of redirecting).
- `<Suspense>` streaming a slow async Server Component, and why several
  components can `await` the *same* cached promise without triggering
  multiple network calls (ties back to the already-understood
  `getPullRequestDiff` `cache()` pattern).
- `loading.tsx` as a route-segment-level convention (new — nothing in this
  app uses it yet).
- Asking Gemini for structured JSON output and parsing/validating the
  response, including the new failure mode of a malformed/non-JSON reply
  (the existing `summarizePRReal` has no analogous parsing step — it just
  returns `response.text` as-is).

## File-level changes

**New:**
- `lib/diff.ts` — `parseDiff(diff: string): DiffFile[]`,
  `selectFilesWithinBudget(files: DiffFile[], maxChars: number): { included: DiffFile[]; totalCount: number }`.
  Pure functions, no I/O — easiest piece to build and sanity-check first.
- `lib/review-diff.ts` — `type FileReview`, `reviewDiffFiles(files: DiffFile[]): Promise<FileReview[]>`,
  content-keyed Map cache, `reviewDiffFilesMock`/`reviewDiffFilesReal` split
  on `USE_REAL_SUMMARIZER`.
- `app/prs/[number]/page.tsx` — the new detail page. Auth gate via
  `redirect('/')`, fetches PR metadata from the Supabase `pull_requests`
  table (already the source of truth for the list, per `app/page.tsx`'s own
  comment — avoids a redundant GitHub JSON call for data already mirrored
  locally), fetches + parses + budgets the diff, renders the title +
  "View on GitHub ↗" link + truncation banner (if any) + the per-file
  card list.
- `app/prs/[number]/loading.tsx` — route-level loading UI shown while the
  page Server Component fetches, reusing `Skeleton`.
- `components/pr-review/DiffFileView.tsx` — renders one `DiffFile`'s hunks
  as colored monospace (green add / red remove / neutral context). No
  hooks, no `'use client'` needed — purely presentational.
- `components/pr-review/FileReviewCard.tsx` — one file's `Card`: diff on
  one side (immediate), AI note slot on the other (its own `<Suspense>`,
  awaits the shared cached `reviewDiffFiles` promise, renders the matching
  file's summary/notes or a caught-error Alert inline).
- `components/pr-review/TruncationBanner.tsx` — small alert-style banner,
  "AI review covers the first K of M changed files — PR too large to
  review in full," shown only when `includedFiles.length < totalCount`.

**Modified:**
- `components/pr-list/PrCard.tsx` — title anchor changes from
  `<a href={pr.url} target="_blank">` to `<Link href={`/prs/${pr.number}`}>`
  (`next/link`, new to this component). No other change to the card.

**Untouched (explicitly, per Non-goals):** `lib/summarize.ts`,
`SummarizeAction.tsx`, `MergeAction.tsx`, `RequestChangesAction.tsx`,
`CommentsAction.tsx`, all existing `app/api/prs/**` routes.

## Sequencing

1. **`lib/diff.ts`** — parser + budget selector, no UI. Sanity-check with a
   throwaway script or a quick console.log against `getPullRequestDiff`'s
   output for a couple of real PR numbers (#1 and #14 are good test cases —
   one normal, one that should trigger the budget cap).
2. **Page skeleton + navigation wiring** — `app/prs/[number]/page.tsx` with
   the auth redirect, Supabase metadata fetch, diff fetch + parse + budget,
   rendering just a plain list of included file *paths* (no styled hunks
   yet) to confirm the whole plumbing end-to-end. Update `PrCard.tsx`'s
   title to `Link` here, so the new page is reachable from the dashboard.
3. **`DiffFileView.tsx` + `TruncationBanner.tsx`** — real colored-diff
   rendering, plus the banner. Verify visually against #1 (full coverage)
   and #14 (truncated) in a real browser.
4. **`lib/review-diff.ts`, mock only** — wire the mock branch in behind
   `FileReviewCard.tsx` (no Suspense yet, plain blocking await, matching
   step 2's simplicity) so the full data shape (diff + AI note per file) is
   visible and clickable through for free before touching Gemini.
5. **`reviewDiffFilesReal`** — the real structured-JSON Gemini call, tested
   deliberately once with `USE_REAL_SUMMARIZER=true` (same "one deliberate
   pass" convention as `summarizePRReal`). Handle the malformed-response
   edge case explicitly rather than letting a parse failure throw
   unhandled.
6. **Suspense streaming** — split `FileReviewCard.tsx`'s note slot out so
   the diff card renders immediately and the note streams in via
   `<Suspense>` + `app/prs/[number]/loading.tsx`. This is the step where
   the "new concept" explanation from above actually lands in real code.
7. **Error handling polish** — confirm a Gemini failure renders an inline
   Alert (not Next's generic error page), with a way to retry (a small
   Client Component "Retry" link that calls `router.refresh()`, same
   pattern `SignOutButton` already uses).
8. **Verification pass**, mapped directly to the grilled doc's Success
   Criteria: functional click-through on a real PR; judgment-signal check
   on a deliberate throwaway PR with something worth flagging (real Gemini
   call); rate-limit/cache check via `read_network_requests` across several
   different PRs plus a repeat visit to the same one; large-diff truncation
   check against #14.

Each step is independently shippable/checkable in a single sitting — no
step requires touching more than 1-2 new files.

## Open item carried forward
K's exact file count isn't fixed — it falls out naturally from the 50,000-
char budget and each PR's actual file sizes, which is what the grilled doc
asked for (a budget-driven K, not a guessed constant).
