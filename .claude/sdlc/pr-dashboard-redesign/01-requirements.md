# Frontend redesign: PR dashboard

## Problem
The authenticated dashboard (`app/page.tsx` + `components/PrList.tsx`) is
functionally complete but visually plain: a bare `<ul>` with a
`divide-y` border between rows, system-default type scale, no elevation
(cards/shadows), and every action (`Summarize`, `Merge`, `Request changes`,
`Comments`) rendered as stacked plain-text links/buttons under each row with
no visual hierarchy between them. It works, but doesn't read as a portfolio-
grade "modern frontend" piece — which matters because this project exists
specifically to demonstrate frontend skill to recruiters (see AGENTS.md
"Why this project").

## Goal
Someone landing on the dashboard (a recruiter, or Selva demoing it in an
interview) should immediately read it as a polished, modern SaaS-style
dashboard — comparable in visual quality to Linear/Vercel-style internal
tools — not a functional prototype. Concretely:
- PRs render as elevated cards with real typographic hierarchy, not a flat
  list of text lines.
- Actions (summarize/merge/comment/request-changes) have clear visual
  affordance and grouping instead of being indistinguishable stacked links.
- Status (open/merged/closed) is visually prominent, not just a small badge.
- The whole screen is built on shadcn/ui components rather than one-off
  hand-rolled buttons/inputs, so it's consistent and extensible.
- A production Lighthouse run scores 100 (or as close as genuinely
  achievable) across Performance, Accessibility, Best Practices, and SEO —
  "Lighthouse score perfect" as a real, quotable, measured claim.

## Non-goals (this round)
- The signed-out sign-in/landing screen (`app/page.tsx`'s unauthenticated
  branch) — out of scope for this pass, may get its own pass later.
- Changing the underlying information architecture — this stays a list of
  PR cards (one per PR, actions grouped underneath), not a restructure into
  a data table, kanban board, or multi-page layout.
- New functionality — this is a presentation-layer pass only. No new
  features, no changes to what the app *does* (GitHub API calls, Supabase
  realtime, auth) — only how it looks and how the DOM/CSS is structured to
  produce that look.
- Rebuilding `SummaryPanel`/`CommentsSection`/`RequestChangesSection`/
  `MergeSection`'s internal state machines — their logic (idle/loading/
  error/done states, rate limiting, confirm-before-merge) stays as-is; only
  their rendered markup/styling changes.

## Constraints
- Solo, weekends + 30-min-daily sessions — the plan stage should break this
  into small steps, not one big rewrite commit.
- Selva must understand every line — no vibe coding. shadcn/ui components
  get copied into the repo (not installed as an opaque package), so each
  one that gets added should be briefly explained (what it wraps, why this
  one) before use.
- Stack stays Next.js App Router + TypeScript + Tailwind v4 + Supabase,
  deployed on Vercel. shadcn/ui is Tailwind + Radix-based, so it fits this
  stack without adding a competing styling system.
- Must not break already-verified behavior: realtime updates, the
  merge/comment/request-changes GitHub mutations, the Gemini summary
  cache/rate-limit, and the auth gate. Visual-only change, verified by
  `/qa` re-running the existing golden paths, not just eyeballing it.
- No new paid dependencies or services.

## Success criteria
- Visual: dashboard renders as elevated shadcn/ui cards with a clear type
  scale, consistent spacing, and grouped/labeled actions — confirmed by
  eye in a real browser (not just "looks different in code").
- Functional parity: every existing action (summarize, merge w/ confirm,
  request changes, comment post + list, filter tabs, realtime update
  merge-in) still works exactly as before — verified in `/qa` against the
  same flows already validated in prior sessions (see AGENTS.md).
- Performance: Lighthouse (production build, `localhost`) scores 100 (or
  documented-reason-for-less) on Performance, Accessibility, Best
  Practices, and SEO — recorded with before/after numbers in `/optimize`'s
  artifact.
- Explainability: `/teach`'s output gives Selva a clear "why shadcn/ui, why
  cards over table, what changed and why" answer for interview use.

## Open questions
- Icon set: shadcn/ui commonly pairs with `lucide-react` — not yet
  confirmed with Selva, default to it unless objected to in
  `/grill-requirements`.
- Dark mode: current code has manual `dark:` Tailwind classes throughout,
  presumably following OS preference (no toggle UI exists). Redesign should
  preserve dark mode support via shadcn/ui's theming, but whether to add an
  explicit toggle control is undecided — carry into grilling.
- Whether to add subtle motion/transitions (card hover states, panel
  expand/collapse animation) as part of "modern," or treat that as a
  separate future pass — undecided, carry into grilling.
