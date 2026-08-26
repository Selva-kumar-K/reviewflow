# AI-powered PR review view

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

Said out loud to a recruiter: "The dashboard shows the real diff and an
AI-assisted first pass side by side, so the reviewer isn't choosing between
reading raw code or trusting a black-box AI summary — they get both, and
the AI is explicitly a second opinion, not a verdict."

## Non-goals (this round)
- Not replacing the existing dashboard-card `SummarizeAction` — the card
  keeps its quick one-line blurb; this is a new, deeper view reached by
  opening a specific PR (its title becomes a link), not a redesign of the
  list.
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
  under Constraints.

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
  free-tier 10 req/min / ~250 req/day budget almost immediately.
- Large diffs: cap what's sent to Gemini at some line/character budget (
  exact number is a `/plan`-stage decision, informed by Gemini's context
  window and observed real diff sizes). If the diff exceeds the cap, the
  UI must say so explicitly (e.g. "AI review covers the first N of M
  changed lines — diff too large to review in full") rather than silently
  producing a confident-sounding summary of a diff it never fully saw.
- No new paid dependencies or services (same as the original redesign's
  constraint) — reuse `@google/genai` (already wired up), no diff-viewing
  library.
- Must not break already-verified behavior: the existing `SummarizeAction`
  card blurb, cache, and rate-limit guard; merge/comment/request-changes;
  realtime updates; auth gating on any new route this adds (new API routes
  under a per-PR review endpoint need the same `requireUser()` gate every
  other `/api/prs/**` route has).

## Success criteria
- Functional: opening a real PR (e.g. the redesign PRs already merged, or
  a fresh throwaway PR) from the dashboard shows the real diff, file by
  file, next to an AI-generated per-file note for each file — confirmed by
  eye in a real browser, not just a passing typecheck.
- Judgment signal actually shows up: on a PR with something genuinely worth
  flagging (can be tested the same way the rate-limit guard was — a
  deliberate throwaway PR with an obviously odd change, e.g. a removed
  error-handling block or a hardcoded secret-looking string), the AI notes
  it rather than blandly saying everything looks fine on every PR
  regardless of content.
- Rate-limit discipline verified: opening several different PRs' review
  pages in a row is confirmed (e.g. via `read_network_requests` or a
  request counter, same technique used for the original rate-limit
  verification) to fire exactly one Gemini call each, not one per file.
- Large-diff handling verified: a real PR with a large diff (or an
  artificially large throwaway one) shows the "truncated" message rather
  than either crashing or silently fabricating full coverage.
- Explainability: `/teach`'s eventual output gives Selva a clear answer to
  "how does the AI know what's risky" that matches what's actually true
  (freeform LLM judgment over a possibly-truncated diff, no static
  analysis, no repo-wide context) — consistent with the boundary already
  discussed this session for the existing Summarize feature.

## Open questions
- Exact size cap for the diff sent to Gemini (lines/characters) — deferred
  to `/plan`, needs a quick check of Gemini's context window and a couple
  of real PR diff sizes from this repo to pick a sane number rather than
  guessing.
- Whether the new page needs its own loading/error states distinct from
  the dashboard's existing patterns, or can reuse the same
  Skeleton/Alert/Retry conventions already established in
  `components/pr-list/*` — likely "reuse," but worth confirming once the
  page is actually being built.
- Route/URL shape for the new page (`/prs/[number]` was the working
  assumption from this session's discussion) — not yet locked, should be
  confirmed in `/plan`.
