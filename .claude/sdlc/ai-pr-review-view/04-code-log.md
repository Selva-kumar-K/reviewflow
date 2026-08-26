# AI-powered PR review view — code log

Source: `03-plan.md`. Log style follows AGENTS.md's "Current progress"
entries — one entry per meaningful chunk, updated as work happens.

## Step 1: `lib/diff.ts` — diff parser + budget selector
- New file, pure functions, no I/O — `parseDiff(diff: string): DiffFile[]`
  and `selectFilesWithinBudget(files, maxChars)`, plus an exported
  `DEFAULT_DIFF_CHAR_BUDGET = 50_000` constant (the plan's confirmed
  budget) so the page and any future caller share one number instead of
  each hardcoding `50_000`.
- Parser is a line-by-line state machine over GitHub's unified diff text:
  `diff --git` starts a new file section, `@@ ...` starts a new hunk,
  everything else is bucketed by its first character (`+`/`-`/space) into
  `add`/`remove`/`context`. Each `DiffFile` also keeps a `raw` string — the
  exact diff text for just that file — since both the char-budget math and
  (later) the Gemini prompt need "how big is this file's diff" and should
  agree on the same number.
- Path resolution: prefers the `+++ b/path` line (the post-change path),
  but for a deleted file (`+++ /dev/null`) falls back to `--- a/path`
  instead — handles adds/deletes/renames without special-casing each one.
- `selectFilesWithinBudget` walks files in diff order, breaking (not
  skipping) at the first file that would push the running total over
  budget — everything after it is dropped too, matching the plan's
  "whole-file, order-preserving, never truncated mid-file" rule.
- **Sanity-checked against real PR data** (scratch script, not committed):
  PR #1 → 11 files, 34,998 total chars, all 11 included (within budget).
  PR #14 → 64 files, 390,419 total chars, only the first 12 included before
  the 50,000-char cap trips. Both numbers line up with the plan's own
  pre-check (35,008 / 390,482 — the small diff is just from Git's exact
  byte count vs. this rough script's `.length`, not a bug). Confirms the
  budget will cleanly show "full coverage" on a normal PR and "truncated"
  on the outlier merge PR, which is exactly the two test cases the plan
  wanted covered.
- `tsc --noEmit` clean.

## Step 2: Page skeleton + navigation wiring
- `app/prs/[number]/page.tsx` — new dynamic route, async Server Component,
  same `params: Promise<{ number: string }>` shape already used under
  `app/api/prs/[number]/*` (confirmed against the installed Next 16 docs
  before writing it — this Next version's docs, not training data). Mirrors
  `app/page.tsx`'s own inline `createClient()` + `getUser()` pattern (rather
  than `requireUser()`) because the same client is needed again right after
  for the `pull_requests` table query — one client instance, not two.
  `redirect('/')` on no user (plan decision #2). Fetches the PR's metadata
  row from Supabase (`.eq('number', prNumber).single()`), and if that errors
  or comes back empty, renders a plain "PR #N not found" message instead of
  throwing. Then fetches the diff via the existing `getPullRequestDiff`,
  runs it through `parseDiff` + `selectFilesWithinBudget` from step 1, and
  renders: title, "View on GitHub ↗" link, a plain-text truncation note
  when `included.length < totalCount`, and a bare `<ul>` of included file
  paths — deliberately unstyled per the plan's step 2 scope (real diff
  rendering + the dedicated `TruncationBanner` component are step 3, not
  built yet).
- `app/prs/[number]/loading.tsx` — new. Next's file-convention: dropping
  `loading.tsx` next to `page.tsx` in the same route segment auto-wraps the
  page in `<Suspense>`, no import or wiring needed — Next shows this file's
  content while the async page Server Component is still fetching. Reuses
  the existing `Skeleton` component, shaped to roughly match the real
  page's layout (title/link row + a few file-path-shaped bars).
- `components/pr-list/PrCard.tsx` — title anchor changed from `<a
  href={pr.url} target="_blank">` to `<Link href={`/prs/${pr.number}`}>`,
  per the plan. The external GitHub link isn't lost — it now lives on the
  new detail page as "View on GitHub ↗".
- `tsc --noEmit` clean. Ran `vercel:react-best-practices` after touching
  three TSX files — no changes needed; the one candidate (parallelizing the
  auth check, PR-row fetch, and diff fetch with `Promise.all`) was skipped
  deliberately: the auth gate has to resolve before the diff fetch fires
  anyway (don't want to hit GitHub for a signed-out visitor), so the calls
  aren't truly independent, and this is a low-traffic page where the extra
  indirection isn't worth trading away readability for.
- **Verified in a real browser** (Selva's own already-running dev server
  and already-authenticated tab, via Chrome automation — not a fresh
  server/session I stood up): clicked PR #1's title from the dashboard,
  landed on `/prs/1`, confirmed `href="/prs/1"` on the link, title + "View
  on GitHub ↗" + all 11 file paths rendered, no truncation note (correct —
  #1 is within budget, matches step 1's script-based check). Navigated
  directly to `/prs/14` to check the truncation path.
- **Found, not a code bug**: PR #14 (the day-3-into-master merge PR, the
  large outlier the plan picked specifically to exercise the truncation
  cap) **isn't in the Supabase `pull_requests` table** — the dashboard list
  goes …#13, #15, skipping #14 entirely. Likely never went through the
  GitHub webhook (probably merged before/without it firing correctly for
  this one). Navigating to `/prs/14` correctly rendered "PR #14 not found."
  instead of crashing — a real, if accidental, confirmation that the
  not-found path works — but it means step 3's planned truncation-banner
  check against #14 won't work as written. **Flagged for Selva**: either
  backfill #14 into the table (same one-off pattern as the original
  `admin/backfill` route, run once and deleted) or pick a different
  in-table PR with enough files to trip the 50,000-char budget, before
  step 3's visual verification.
- **Resolved the #14 gap above**: backfilled PR #14's metadata into the
  Supabase `pull_requests` table via a one-off script (fetched the row from
  GitHub, upserted via the service-role key over Supabase's REST API,
  `on_conflict=number` + `resolution=merge-duplicates`) — same one-off,
  run-once-and-discard pattern as the original `admin/backfill` route, no
  new route file added to the codebase. Confirmed row landed via the
  script's own success output.

## Step 3: `DiffFileView.tsx` + `TruncationBanner.tsx` — real colored-diff rendering
- `components/pr-review/DiffFileView.tsx` — new, purely presentational (no
  hooks, no `'use client'`). Renders one `DiffFile`'s path as a header, then
  each hunk's `@@ ... @@` line as a muted separator, then each line colored
  by `line.type`: green background for `add`, red for `remove`, muted
  foreground for `context` — plus a non-selectable `+`/`-`/space gutter
  character so copy-pasting a block doesn't carry the color-coding markup
  with it.
- `components/pr-review/TruncationBanner.tsx` — new, wraps the existing
  `Alert`/`AlertDescription` components with the exact copy from the plan
  ("AI review covers the first K of M changed files — PR too large to
  review in full").
- `app/prs/[number]/page.tsx` — swapped the step 2 plumbing placeholder
  (plain-text truncation note + bare `<ul>` of paths) for the real
  components: `<TruncationBanner>` when `included.length < totalCount`,
  and `<DiffFileView>` per included file. AI note slots are explicitly not
  here yet — that's `FileReviewCard.tsx` in step 4, which will wrap
  `DiffFileView` rather than replace it.
- `tsc --noEmit` clean. Ran `vercel:react-best-practices` again after
  adding the two new TSX files — no changes; both are static,
  server-rendered, non-reordering content, so index-based `.map()` keys are
  fine here (no rule against it for immutable lists).
- **Verified visually in the browser** (same live dev server/session as
  step 2): PR #1 — full diff renders with the path header, hunk headers,
  and both add (green) and remove (red) lines confirmed on `next.config.ts`
  and `app/page.tsx`'s hunks (PR #1's other files were pure additions, so
  those two were needed to see the remove-line styling); no truncation
  banner shown, correct for an in-budget PR. PR #14 (now backfilled) — the
  `loading.tsx` skeleton visibly appeared first (confirms the Suspense-via-
  file-convention wiring works, not just in theory), then the page settled
  showing **"AI review covers the first 12 of 64 changed files — PR too
  large to review in full"** — exact match to step 1's script-based
  precheck (12/64). Both of the plan's step 3 visual checks now pass.

## Step 4: `lib/review-diff.ts` (mock only) + `FileReviewCard.tsx`
- `lib/review-diff.ts` — new. `FileReview` type (`path`, `summary`,
  `notes` — freeform text, no fixed category taxonomy per the grilled
  doc's Non-goals). `reviewDiffFilesMock(files)` is deterministic per file
  (keyed off `file.raw.length`/`file.path.length`, same non-random trick as
  `summarizePRMock`), with an 800ms fake delay. `reviewDiffFiles(files)` is
  the only exported entry point — for now it always calls the mock branch;
  the `USE_REAL_SUMMARIZER` split lands in step 5 alongside
  `reviewDiffFilesReal`, matching how `summarizePR` itself picked up its
  real branch as a separate, later change historically. Cache key is every
  included file's own `raw` diff text joined together (plan decision #3) —
  a content-keyed `Map<string, Promise<FileReview[]>>`, same
  rejected-promise-deletes-itself pattern as `summaryCache`.
- `components/pr-review/FileReviewCard.tsx` — new. Wraps `DiffFileView`
  and the file's `summary`/`notes` in one `Card` (confirmed layout: diff
  and AI note together, not two scrolling columns). `review` prop is
  required, not optional — step 4 is a plain blocking `await`
  (`reviewDiffFiles` resolves before any card renders), so there's no
  "note still loading" state to handle yet; that appears in step 6 when
  Suspense splits the note slot out.
- `app/prs/[number]/page.tsx` — awaits `reviewDiffFiles(included)` once
  after the diff/parse/budget step, builds a `Map<path, FileReview>` for
  O(1) per-file lookup (rather than an `.find()` per card), and swaps
  `DiffFileView` for `FileReviewCard` in the render loop. A small
  `fallbackReview` covers the (shouldn't-happen) case of a file with no
  matching review, keeping the lookup total instead of throwing.
- `tsc --noEmit` clean. Ran `vercel:react-best-practices` — one real
  finding this time (unlike steps 2/3's "nothing to change"): the
  Supabase row query and `getPullRequestDiff` are independent I/O and
  could run via `Promise.all` instead of sequentially. **Not applied** —
  the plan didn't call for restructuring this fetch chain, and the skill's
  own instruction is to note rather than drift into adjacent refactors.
  Flagged here for a future pass if latency actually becomes noticeable
  (more likely once step 5 adds a real ~8s Gemini call after these two).
- **Verified in the browser** (same live session): PR #1 — every file
  card now shows a summary line and a notes line under its diff (e.g.
  `lib/summarize.ts` → "Modifies existing behavior in a few places..." /
  "Looks fine — nothing stands out."), confirming the full mock data shape
  renders end-to-end, not just typechecks. Reloaded the same page: it
  rendered **instantly, no `loading.tsx` skeleton this time** (versus the
  first visit, which visibly sat on the skeleton for the 800ms mock
  delay) — direct visual proof the diff-content-keyed cache in
  `reviewDiffFiles` served the second request without re-running the mock
  delay, the same technique already proven for `summarizePR` now
  confirmed working for the new per-file call too.

## Step 5: `reviewDiffFilesReal` — the real structured-JSON Gemini call
- `lib/review-diff.ts` — added `reviewDiffFilesReal(files)` and wired
  `reviewDiffFiles` to branch on `USE_REAL_SUMMARIZER` (same pattern as
  `summarizePR`). Uses `@google/genai`'s `responseMimeType:
  'application/json'` + `responseSchema` config (found in the installed
  SDK's type defs, `node_modules/@google/genai/dist/node/node.d.ts`) to
  constrain the response to an array of `{ path, summary, notes }`
  objects — `summarizePRReal` has no equivalent since a prose response
  can't be "malformed" the way JSON can. Added explicit handling for that
  new failure mode: `JSON.parse` in a `try/catch` (throws a clear error on
  non-JSON text) plus an `isFileReview` type guard checked over the full
  parsed array (throws a clear error if the shape doesn't match), rather
  than letting a bad response surface as a confusing runtime crash three
  layers away inside `FileReviewCard`. Prompt explicitly carries forward
  the grilled doc's "no fixed category taxonomy" instruction — the model
  is told to flag things freeform, not sorted into buckets it hasn't
  actually verified.
- `tsc --noEmit` clean.
- **Deliberate one-time real-Gemini test**, same "one deliberate pass"
  convention as `summarizePRReal`'s original verification. Found
  `USE_REAL_SUMMARIZER=true` was already set in `.env.local` (left on from
  the 2026-07-26 session's `SummarizeAction` verification — not something
  changed this session, and not touched, since resetting Selva's own local
  dev env isn't this step's call to make). That meant the branch I just
  wired would fire for real on the very next page load with no extra
  setup. Picked `/prs/2` specifically because it hadn't been visited yet
  this session (steps 2-4's testing only touched #1 and #14) — visiting an
  already-cached PR would've just served step 4's cached mock result under
  the same content-derived cache key, not exercised the new code path at
  all.
- **Verified in the browser**: `/prs/2` rendered a genuine
  Gemini-generated summary/notes pair — "Added a placeholder comment
  inside the TSX component." / "The change only adds a comment to test PR
  workflows. It does not affect functionality, but the comment should be
  removed before merging if it is no longer needed." — clearly not one of
  the canned mock strings, and specific enough to the actual diff content
  to confirm the structured JSON round-trip (request → schema-constrained
  response → parse → validate → render) worked end-to-end. As a bonus,
  this already previews the "judgment signal" success criterion the plan
  defers to step 8 — the model correctly flagged the throwaway comment as
  something to clean up before merging, without being asked to look for
  that specifically. Checked `.next/dev/logs/next-development.log` for the
  request window — no errors (the only log noise was the pre-existing,
  unrelated dark-reader-extension hydration warning already present before
  this session started).

## Step 6: Suspense streaming — split `FileReviewCard.tsx`'s note slot
- `components/pr-review/FileReviewCard.tsx` — split into two components.
  `FileReviewCard` stays sync, renders `DiffFileView` immediately (unchanged
  from step 3/4), and now wraps the note half in `<Suspense fallback=
  {<NoteSkeleton />}>`. The note itself moved into a new `FileReviewNote`,
  an **async Server Component** (not a plain function returning JSX) — the
  `await` inside it is what lets this specific slot suspend independently
  of the diff already painted above it, the same mechanism `page.tsx`
  itself already relies on via `loading.tsx`, just one level deeper and
  scoped to one card instead of the whole route.
- `app/prs/[number]/page.tsx` — stopped awaiting `reviewDiffFiles(included)`
  before rendering any cards (step 4/5's behavior). Now calls it once,
  unawaited, and chains a single `.then()` to build a `Map<path,
  FileReview>` — same O(1)-lookup rationale `vercel:react-best-practices`
  flagged and step 4 already applied when the page itself owned the lookup;
  moving the lookup into `FileReviewNote` would otherwise have meant each
  card's note slot re-running `.find()` over the full reviews array. The
  derived map promise (not the raw array promise) is the one thing passed
  to every `FileReviewCard` — same "N awaiters, one promise instance" shape
  the plan called for, just wrapping a Map instead of an array.
- `tsc --noEmit` clean. Ran `vercel:react-best-practices` on both touched
  files — no automated scan available in this environment, so reviewed
  manually against the rule list; the one real finding (`js-index-maps`,
  see above) was applied, not just noted.
- **Verified in the browser** (live dev server, `USE_REAL_SUMMARIZER=true`
  already set): navigated straight to `/prs/3` (unvisited this session, so
  the content-keyed cache in `reviewDiffFiles` couldn't short-circuit the
  real ~8s Gemini call). First screenshot, taken immediately after
  navigation: the diff card was already fully painted (file header, hunk,
  the added line) while the note half showed the `NoteSkeleton` two-bar
  placeholder — direct visual proof the diff isn't waiting on Gemini
  anymore. Second screenshot ~9s later: the skeleton had been replaced by a
  real Gemini-generated summary/notes pair, confirming the note slot
  resolved on its own once the shared promise settled. Checked the red
  "1 Issue" dev-overlay badge visible in both screenshots — it's the same
  pre-existing Dark Reader extension hydration mismatch
  (`data-darkreader-proxy-injected="true"`) already called out as unrelated
  noise in step 5, not a regression from this change. Cross-checked
  `.next/dev/logs/next-development.log` for the request window: no errors
  beyond that one known warning.

## Step 7: Error handling polish
- `components/pr-review/RetryReviewButton.tsx` — new, small Client
  Component, same shape as `SignOutButton.tsx`: `'use client'`, a
  `useRouter()` from `next/navigation`, one button whose `onClick` calls
  `router.refresh()`. Works as a genuine retry (not just a re-render of
  stale data) because `reviewDiffFiles`'s cache already deletes its own
  entry on rejection (built in step 4/5) — a refresh re-runs `page.tsx`,
  which calls `reviewDiffFiles(included)` again, and since the failed
  entry is gone from the cache, that's a real second Gemini call.
- `components/pr-review/FileReviewCard.tsx` — `FileReviewNote` now wraps
  its `await reviewsByPathPromise` in `try/catch`. On rejection it renders
  an inline `Alert` (`variant="destructive"`, same `Alert`/`AlertDescription`
  building blocks `TruncationBanner` already uses, plus `AlertAction` for
  the button slot) showing the real error message and a `RetryReviewButton`
  — instead of letting the rejection propagate. This matters specifically
  because of how Suspense and error boundaries divide responsibility:
  `<Suspense>` only intercepts a *pending* promise (to show the fallback);
  it does nothing for a *rejected* one. An uncaught rejection here would
  propagate up to the nearest error boundary — which for this route is
  Next's generic one, since no `error.tsx` exists under `app/prs/[number]/`
  — and blank out the *entire* page, not just the one card whose note
  failed. The try/catch keeps a Gemini failure contained to its own card.
  Since every card is awaiting the same shared promise, a real failure
  shows this same Alert on every card at once — consistent with it being
  one shared call underneath, not N independent ones.
- `app/prs/[number]/page.tsx` — added a synchronous no-op
  `reviewsByPathPromise.catch(() => {})` right after building the derived
  promise. Found necessary, not just defensive, while testing below: see
  next bullet.
- **Verified in the browser**, deliberately forcing a failure to test the
  actual error path (not just reading the code): temporarily replaced the
  real/mock branch in `lib/review-diff.ts`'s `reviewDiffFiles` with
  `Promise.reject(new Error('TEMP-FORCED-TEST-FAILURE'))` behind the
  existing `USE_REAL_SUMMARIZER` check, reverted immediately after each
  check (confirmed via `grep` that no trace of it was left, plus a final
  `tsc --noEmit`). On an unvisited PR (`/prs/4`): the diff still rendered
  in full, and the note slot showed the inline destructive `Alert` reading
  `Couldn't get an AI note for this file: TEMP-FORCED-TEST-FAILURE` with a
  `Retry` link — no Next.js generic error page, confirming the try/catch
  contains the failure to just that card. Clicked `Retry`: page
  re-rendered showing the same error again (expected — the forced failure
  was still active), confirming `router.refresh()` genuinely re-triggers
  `reviewDiffFiles` rather than getting stuck. Then reverted the temp
  failure and clicked `Retry` again on the same still-open page: this time
  a real Gemini-generated summary/notes pair rendered in place of the
  Alert, closing the loop — error → inline Alert → Retry → real recovery,
  all confirmed live, not just read from the code.
- **Found during that same test, not anticipated**: `.next/dev/logs/next-development.log`
  showed `⨯ "unhandledRejection:" Error: TEMP-FORCED-TEST-FAILURE` (twice,
  once per attempt) even though the try/catch demonstrably worked (no
  crash, correct Alert rendered). Root cause: `reviewsByPathPromise` is
  handed to `FileReviewNote` to be awaited *inside* a `<Suspense>`
  boundary — React doesn't reach that `await` until later in the streaming
  render pass, which can land after the microtask tick Node checks for an
  attached rejection handler on. The rejection genuinely does get handled,
  just "too late" by Node's heuristic, which logs the warning anyway. Since
  this would fire for every real Gemini failure too (not just this forced
  test), and reads exactly like a real unhandled-error bug to anyone
  scanning logs later, fixed it rather than leaving it as noise: added the
  no-op `.catch(() => {})` directly on `reviewsByPathPromise` in
  `page.tsx`, attached synchronously right after the promise is created.
  This doesn't consume the rejection — `FileReviewNote`'s own `await` still
  sees and handles it independently — it only exists to satisfy Node's
  handler-attached check before the tick where it'd otherwise complain.
  Re-ran the same forced-failure test on a fresh, never-visited PR
  (`/prs/5`, needed a fresh one since the cache is content-keyed and #4's
  entry was already resolved from the successful retry above) after adding
  the fix: same visible error UI as before, but this time
  `next-development.log` showed no `unhandledRejection` entries at all for
  that request — only the already-known, unrelated Dark Reader hydration
  warning. Confirms the fix addresses the log noise without changing the
  actual (already-correct) error-handling behavior.
- `tsc --noEmit` clean throughout (checked after every edit, including
  after each temporary test change and its revert).
