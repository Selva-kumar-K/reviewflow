# Frontend redesign: PR dashboard — grilled requirements

## What we grilled
- **Lighthouse-100 target had a hidden wall**: the dashboard is auth-gated,
  and Lighthouse CLI launches a fresh, unauthenticated Chrome profile by
  default — it would only ever see the sign-in screen, not the redesigned
  cards. Not a product decision, an engineering necessity: resolved by
  auditing with a persistent, pre-authenticated Chrome profile
  (`--chrome-flags="--user-data-dir=<profile>"`), signed in once manually,
  reused on every `/optimize` run. Flagged now so `/optimize` doesn't
  rediscover this from scratch.
- **SEO-100 on a private, auth-gated page sounds contradictory** —
  pre-answered for `/teach`: it's nearly free (title tag, meta description,
  viewport meta, semantic HTML, crawlable internal links), Lighthouse's SEO
  category doesn't know or care the page is gated, and satisfying it is
  good practice regardless. Keeps "100 across all four" an honest claim
  instead of "3 out of 4, SEO doesn't apply here."
- **Accessibility additions technically violated the "no new
  functionality" non-goal** — `aria-live` on the realtime PR list (so a
  screen reader announces live updates), visible focus rings, and proper
  landmark roles are new markup/behavior, but they're required for the
  Accessibility score and are presentation-layer, not product features.
  Resolved: explicitly carved out as in-scope, see Non-goals below.
- **Icon set was left open but wasn't a real judgment call** —
  `lucide-react` is shadcn/ui's standard pairing (tree-shakes cleanly, no
  meaningful alternative worth weighing). Locked, not asked.
- **Dark mode toggle vs. OS-preference-only** — a real product call.
  Resolved: OS-preference only, no toggle UI. Cleanest fit with
  "presentation-only, no new functionality" — an explicit toggle would need
  new persisted state (cookie/localStorage), which is a small feature in
  its own right.
- **Action layout pattern was underspecified** — "grouped/labeled actions"
  in the original Goal didn't say *how*. Two real options: an always-visible
  button toolbar (matches today's always-visible pattern, just styled), or
  a primary-action-plus-overflow-menu (denser, more "polished," but a new
  interaction pattern to design and justify). Resolved: toolbar — all four
  actions stay visible as icon+label buttons, same interaction model as
  today, only the styling changes.
- **Card layout width was underspecified** — single column vs. a
  responsive multi-column grid on wide viewports. The latter would've
  quietly contradicted the original doc's own non-goal against restructuring
  the information architecture (a grid changes reading/scan order, and
  cramps expanded panels like Comments/Merge-confirm into a narrower
  column). Resolved: single column, full width — matches how GitHub/Linear
  render PR lists, and keeps IA unchanged as originally intended.

No goals were found to be in direct, unresolved conflict once the above were
settled, and no success criteria turned out unmeasurable as written.

## Problem
(unchanged from `01-requirements.md`) The authenticated dashboard is
functionally complete but visually plain: a bare `<ul>`, system-default
type scale, no elevation, and every action rendered as stacked plain-text
links with no visual hierarchy.

## Goal
Someone landing on the dashboard should immediately read it as a polished,
modern SaaS-style dashboard — comparable to Linear/Vercel-style internal
tools — not a functional prototype. Concretely:
- PRs render as single-column, full-width elevated cards (shadcn/ui `Card`)
  with real typographic hierarchy.
- The four actions (Summarize, Merge, Request changes, Comments) render as
  an icon+label button toolbar per card — same always-visible interaction
  model as today, restyled with clear visual affordance and grouping.
- Status (open/merged/closed) uses shadcn/ui `Badge` variants, visually
  prominent.
- Built on shadcn/ui components (`Card`, `Badge`, `Button`, `Avatar`,
  `Tabs` for the filter row, `Textarea`) with `lucide-react` icons —
  consistent and extensible rather than one-off hand-rolled elements.
- Dark mode continues to follow OS preference (no new toggle UI).
- A production Lighthouse run, audited against an authenticated session,
  scores 100 (or documented-reason-for-less) across Performance,
  Accessibility, Best Practices, and SEO.

## Non-goals (this round)
- The signed-out sign-in/landing screen — out of scope, may get its own
  pass later.
- Restructuring the information architecture — stays a single-column list
  of PR cards, not a grid, table, or kanban board.
- New product functionality — no changes to what the app *does* (GitHub API
  calls, Supabase realtime, auth, the summary/merge/comment/request-changes
  logic). **Explicit carve-out**: accessibility-required additions
  (`aria-live` regions, focus states, semantic landmarks/roles) are in
  scope even though they're technically new markup — they're presentation-
  layer requirements of the Lighthouse Accessibility target, not new
  features.
- A dark/light/system theme toggle control — stays OS-preference-only.
- An action overflow/dropdown menu — all four actions stay visible as a
  toolbar, not collapsed behind a menu.
- Rebuilding `SummaryPanel`/`CommentsSection`/`RequestChangesSection`/
  `MergeSection`'s internal state machines — their logic stays as-is; only
  their rendered markup/styling changes.

## Constraints
- Solo, weekends + 30-min-daily sessions — `/plan` breaks this into small
  steps, not one big rewrite commit.
- Selva must understand every line — no vibe coding. shadcn/ui components
  are copied into the repo (not an opaque package); each new one gets
  briefly explained (what it wraps, why this one) before use.
- Stack stays Next.js App Router + TypeScript + Tailwind v4 + Supabase, on
  Vercel. shadcn/ui (Tailwind + Radix) fits without adding a competing
  styling system.
- Keep the existing Server/Client Component split: only interactive leaf
  components (the four action panels, filter tabs) are Client Components,
  same as today — shadcn/ui's interactive primitives (`Dialog`,
  `DropdownMenu`, etc., if used later) get the `'use client'` boundary kept
  as narrow as possible, for bundle size and to stay consistent with this
  codebase's established pattern.
- Must not break already-verified behavior: realtime updates, the
  merge/comment/request-changes GitHub mutations, the Gemini summary
  cache/rate-limit, and the auth gate.
- No new paid dependencies or services.

## Success criteria
- Visual: dashboard renders as single-column shadcn/ui cards with a clear
  type scale, consistent spacing, and a visible action toolbar — confirmed
  by eye in a real browser.
- Functional parity, explicitly re-verified in `/qa`: filter tabs, summarize
  (cache + rate limit intact), merge confirm flow, request-changes,
  comments (list + post), realtime merge-in of updated rows.
- Performance: Lighthouse (production build, authenticated session via
  persistent Chrome profile) scores 100, or documented-reason-for-less, on
  Performance, Accessibility, Best Practices, and SEO — recorded with
  before/after numbers in `/optimize`'s artifact.
- Explainability: `/teach`'s output gives Selva a clear "why shadcn/ui, why
  a toolbar not a menu, why single-column, why OS-only dark mode" answer
  set, backed by this doc's "What we grilled" section.

## Open questions
None outstanding — all three product-level judgment calls (dark mode,
action layout, grid layout) were resolved above; everything else was either
resolved unilaterally as a non-ambiguous engineering call (Lighthouse auth
handling, icon set) or found not to be in real conflict.
