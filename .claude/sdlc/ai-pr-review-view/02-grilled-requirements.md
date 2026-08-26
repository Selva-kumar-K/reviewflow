# AI-powered PR review view (grilled)

## Problem
Today, `SummarizeAction` gives a single one-line-ish blurb per PR ("this
PR refactors X to use Y") and nothing else — the raw diff itself is never
shown anywhere in ReviewFlow. To actually judge a PR, the TL has to leave
the dashboard and read the diff on GitHub directly, which means the "review
PRs from one dashboard" pitch breaks down at the exact moment real judgment
is needed. The AI also currently only *describes* what changed — it has no
opinion on whether anything in the diff looks worth a second look, so it
can't help triage attention the way a real review pass would.

## Goal
A TL can open a single PR from the dashboard and see, on one screen:
- The actual diff, file by file, rendered readably (not raw curl-style
  text).
- Next to it, an AI-generated per-file read: a short summary of what
  changed in that file, plus freeform notes flagging anything unusual,
  risky, or worth a second look — or a plain "looks fine" when nothing
  stands out.
- The AI review runs automatically the moment the page loads — the TL
  doesn't click a separate "run review" button, the same way the diff
  itself doesn't need a button. It's still exactly one Gemini call per
  page load (see Constraints), so this is a UX choice, not a rate-limit
  change.

Said out loud to a recruiter: "The dashboard shows the real diff and an
AI-assisted first pass side by side, so the reviewer isn't choosing between
reading raw code or trusting a black-box AI summary — they get both, and
the AI is explicitly a second opinion, not a verdict."

## Non-goals (this round)
- Not replacing the existing dashboard-card `SummarizeAction` — the card
  keeps its quick one-line blurb; this is a new, deeper view reached by
  opening a specific PR (its title becomes a link), not a redesign of the
  list.
- The card's title link changes from external (GitHub, current behavior)
  to internal (`/prs/[number]`, the new detail page). GitHub access isn't
  dropped — it moves to a small "View on GitHub ↗" link on the detail page
  itself, near its title. The card no longer links out to GitHub directly.
- Not a fixed-category review taxonomy (no "Security / Performance / Style"
  buckets) — the AI writes freeform per-file notes. Forcing a category onto
  every note risks the AI overclaiming expertise (confidently mislabeling
  something as a "performance issue") it hasn't actually verified through
  any real analysis (no linter, no profiler — see prior session's
  discussion of what the AI can/can't actually know).
- Not a syntax-highlighted, GitHub-quality diff viewer — first pass renders
  the unified diff as colored monospace (green add / red remove), hand-
  rolled, no new dependency. A nicer viewer is a future pass if this proves
  out.
- Not changing merge/comment/request-changes — those stay exactly as they
  are today, on the dashboard card.
- Not attempting full-diff coverage regardless of size — see size handling
  under Constraints. The cap operates on whole files, not raw lines (see
  "What we grilled" below) — no special-casing of lockfiles or other
  generated files to preserve budget for "real" files. If that turns out to
  matter in practice (e.g. a `package-lock.json` diff eating the whole
  file budget on a real PR), it's a follow-up, not solved this round.

## Constraints
- Solo, weekends + 30-min-daily sessions — `/plan` should break this into
  small steps (e.g. diff parsing, then per-file rendering, then the
  Gemini call, then wiring the two together), not one big page built in
  one sitting.
- Selva must understand every line — no vibe coding, no dependency pulled
  in just to save typing (see diff-rendering non-goal above).
- Stack stays Next.js App Router + TypeScript + Tailwind v4 + shadcn/ui,
  Supabase, deployed on Vercel — same as the rest of the app.
- **Must stay to one Gemini API call per PR view**, same constraint that
  already shaped `SummarizeAction`'s rate-limit guard and
  `summarizePR`'s cache in `lib/summarize.ts`. The prompt asks for a
  structured (JSON) per-file breakdown in a single request rather than one
  request per file — multiplying calls by file count would blow the
  free-tier 10 req/min / ~250 req/day budget almost immediately. Since the
  call now auto-fires on page load (see Goal) rather than waiting for a
  click, `/plan` must carry forward the same cache-by-diff-content and
  rate-limit-guard patterns already proven in `lib/summarize.ts` and
  `SummarizeAction` — auto-fire makes it *more* important these are reused
  correctly, not less.
- Large diffs: cap what's sent to Gemini (and rendered) at a **whole-file**
  budget, not a raw line/character budget — keep full diffs for the first
  K files that fit, drop any file that would exceed it entirely, rather
  than truncating mid-file. This avoids ever handing Gemini (or the UI) a
  file whose diff was cut off partway through, which would risk an
  incomplete or misleading per-file note on exactly the file where it
  matters most to get it right. Exact value of K (informed by Gemini's
  context window and a few real diff sizes from this repo) is still a
  `/plan`-stage decision — see Open questions. If the diff exceeds the
  cap, the UI must say so explicitly (e.g. "AI review covers the first K
  of M changed files — PR too large to review in full") rather than
  silently producing a confident-sounding summary of files it never saw.
- Follows the same mock-first convention as the rest of the app's Gemini
  usage (see `AGENTS.md`'s "Do NOT call the real Claude API during local
  dev/testing" and `lib/summarize.ts`'s `summarizePRMock`/`summarizePRReal`
  split): the new structured per-file call needs its own mock branch,
  gated by the same `USE_REAL_SUMMARIZER` flag, so this feature can be
  built and clicked through for free before the real Gemini wiring is a
  single deliberate pass at the end — same pattern, not a new one.
- The new `/prs/[number]` page is gated the same way `app/page.tsx` is
  today: an unauthenticated visitor is redirected to the sign-in prompt at
  the Server Component level, not just at the API-route level. (The
  original doc only specified the API-route `requireUser()` gate — the
  page itself needs the same treatment `app/page.tsx` already has, or a
  signed-out visitor with a direct link could see the page shell even
  though its data fetches would 401.)
- No new paid dependencies or services (same as the original redesign's
  constraint) — reuse `@google/genai` (already wired up), no diff-viewing
  library.
- Must not break already-verified behavior: the existing `SummarizeAction`
  card blurb, cache, and rate-limit guard; merge/comment/request-changes;
  realtime updates; auth gating on any new route this adds (new API routes
  under a per-PR review endpoint need the same `requireUser()` gate every
  other `/api/prs/**` route has, and the new page needs the same
  Server-Component-level gate `app/page.tsx` has).

## Success criteria
- Functional: opening a real PR (e.g. the redesign PRs already merged, or
  a fresh throwaway PR) from the dashboard shows the real diff, file by
  file, next to an AI-generated per-file note for each file, with the AI
  review already running/loaded without any extra click — confirmed by eye
  in a real browser, not just a passing typecheck.
- Judgment signal actually shows up: on a PR with something genuinely worth
  flagging (can be tested the same way the rate-limit guard was — a
  deliberate throwaway PR with an obviously odd change, e.g. a removed
  error-handling block or a hardcoded secret-looking string), the AI notes
  it rather than blandly saying everything looks fine on every PR
  regardless of content.
- Rate-limit discipline verified: opening several different PRs' review
  pages in a row is confirmed (e.g. via `read_network_requests` or a
  request counter, same technique used for the original rate-limit
  verification) to fire exactly one Gemini call each, not one per file —
  including confirming the auto-fire-on-load behavior doesn't silently
  refire on re-render (React Strict Mode double-effects, etc.).
  Re-opening the *same* PR should hit the existing diff-keyed cache, not
  fire a second Gemini call.
- Large-diff handling verified: a real PR with a large diff (or an
  artificially large throwaway one) shows the "K of M files" truncation
  message rather than either crashing, truncating a file mid-diff, or
  silently fabricating full coverage.
- Explainability: `/teach`'s eventual output gives Selva a clear answer to
  "how does the AI know what's risky" that matches what's actually true
  (freeform LLM judgment over a possibly-truncated set of files, no static
  analysis, no repo-wide context) — consistent with the boundary already
  discussed this session for the existing Summarize feature.

## Open questions
- Exact value of K (how many files' worth of diff fit the budget) —
  deferred to `/plan`, needs a quick check of Gemini's context window and
  a couple of real PR diff sizes from this repo to pick a sane number
  rather than guessing. Explicitly deferred, not an oversight.
- Whether the new page needs its own loading/error states distinct from
  the dashboard's existing patterns — **resolved**: reuse the same
  Skeleton/Alert/Retry conventions already established in
  `components/pr-list/*`. No reason found to diverge; revisit only if the
  page's two-pane (diff + AI notes) layout turns out to need a loading
  state shape the existing components don't cover.
- Route/URL shape for the new page — **resolved**: `/prs/[number]`, as
  originally proposed. Matches the `[number]`-keyed convention already
  used throughout `app/api/prs/[number]/*`.

## What we grilled
- **Title-link non-goal was actually inconsistent with the current code.**
  The original doc said the PR title "becomes a link" as if that were
  already true — but `PrCard.tsx` already links the title externally to
  GitHub (`target="_blank"`). Left unresolved, `/code` would have had to
  guess whether the internal link replaces or supplements that external
  one. Resolved with Selva: title becomes fully internal
  (`/prs/[number]`); GitHub access moves to a small "View on GitHub ↗"
  link on the new detail page itself, so nothing is actually lost, just
  relocated.
- **Auto-fire vs. click-to-run for the Gemini call.** Every other
  Gemini-touching feature in this app (`SummarizeAction`) is
  explicit-click, partly because that made the original rate-limit guard
  easy to reason about ("a click is a request"). This feature's Goal
  section reads as "open a PR and see the AI read," which implies
  auto-fire on page load instead. That's a real behavior change worth
  calling out, not a rewording — auto-fire means every page visit is a
  candidate Gemini call unless the cache catches it, versus a deliberate
  click. Resolved with Selva: auto-fire, but explicitly leaning on the
  same cache + rate-limit-guard patterns already proven for
  `SummarizeAction`, carried into Constraints and Success criteria above
  so `/plan` doesn't quietly drop them for the new call site.
- **"Per-file" framing vs. "line/character budget" framing were two
  different designs wearing the same requirements doc.** The Goal and
  most of the Success criteria talk about coverage in terms of files; the
  original Constraints section and one success criterion talked about a
  raw line/character cap ("first N of M changed lines"). Those aren't the
  same thing: a raw line cutoff can end mid-file, which is a real problem
  once that file's diff is also going into a *structured, per-file* JSON
  request to Gemini — the model would either have to guess at an
  incomplete diff or the JSON schema would need an explicit
  "incomplete" flag per file, adding complexity nobody asked for.
  Resolved with Selva: the cap operates on whole files (keep full diffs
  for the first K files that fit, drop the rest entirely), which matches
  the "per-file" framing used everywhere else in the doc and means
  Gemini never sees a half-shown file. This also simplifies the
  truncation message to "K of M files" instead of a line count, which is
  more meaningful to a TL anyway.
- **Missed constraint: mock-first for the new structured call.** The
  original doc didn't mention the AGENTS.md-wide "don't call the real API
  during local dev" convention at all for this feature, even though it's
  a hard rule the rest of the codebase already follows
  (`summarizePRMock`/`summarizePRReal`). Not a disagreement — just an
  omission that would've either gotten caught in `/review` or, worse,
  burned real Gemini quota during `/code`'s own iteration. Added
  explicitly to Constraints so `/plan` schedules a mock branch for the
  new call the same way the original summarizer got one.
- **Missed constraint: page-level auth gate.** The doc constrained the
  *API routes* to `requireUser()` but didn't say anything about the page
  itself. `app/page.tsx` already redirects unauthenticated visitors at
  the Server Component level — a new page that only gates its API calls
  (not its own render) would be a regression from that existing pattern,
  even though it wouldn't leak any real data (the API calls would still
  401). Added explicitly to Constraints so it's built right the first
  time instead of caught in `/review`.
- **Non-conflict, checked and left alone**: "no fixed-category taxonomy"
  (Non-goals) vs. "judgment signal actually shows up" (Success criteria)
  looked like it might be in tension — how do you verify a signal with no
  structure to check? On inspection this holds up fine: the success
  criterion is verified by eye (does the note actually call out the
  planted issue in prose), not by checking a category field, so freeform
  notes don't block testability. No change made.
- **Non-conflict, checked and left alone**: "modern and dense" /
  Lighthouse-score tension that shaped grilling on the earlier
  `pr-dashboard-redesign` slug doesn't apply here — this feature adds a
  new page rather than densifying an existing one, so there's no direct
  layout/performance trade-off in scope for this round.
