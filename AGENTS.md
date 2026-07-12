<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ReviewFlow — Project Context

## What we're building
A PR Review Dashboard called "ReviewFlow" for team leads to:
- See all open PRs across a repo in one view (not one at a time like GitHub)
- Get AI-generated summaries of each PR diff (using Claude API)
- Take actions: merge, comment, request changes — without leaving the dashboard
- Human-centric: AI assists, human decides

## Why this project
Portfolio project for Selva (1 year frontend exp) to demonstrate:
- GitHub API + webhooks
- AI integration (Claude API)
- System design thinking
- Strong, optimized frontend
- Real-time updates

## Timeline & working style
- 3 months, weekends + 30 min daily sessions. One small step at a time.
- Selva must understand every line — no vibe coding. New architectural concepts
  (e.g. server vs client components) get explained in plain terms, tied to the
  actual code, before they get built.
- Must be able to explain every architecture decision in interviews — this is
  portfolio-grade, not tutorial-grade.
- Do NOT call the real Claude API during local dev/testing. Build the AI summary
  feature against a mocked summarizer (e.g. `summarizePR(diff): Promise<string>`
  stub) so the UI/data flow can be built and tested for free. Swap in the real
  API call only in one deliberate pass once the rest of the project is done.
- Update the "Current progress" and "Immediate next step" sections below at the
  end of each session, and commit AGENTS.md, so a fresh chat (or Selva, reading
  cold) can pick up context without relying on prior conversation history.

## Stack
- Next.js App Router + TypeScript + Tailwind v4 (set up)
- Supabase — auth + DB + realtime (not yet added)
- Claude API — PR diff summarization (not yet added; mock first, see above)
- Vercel — deployment (not yet done)

## Current progress (as of 2026-07-12)
- `lib/github.ts` — `getPullRequests()`, a `cache()`-wrapped fetch against the
  GitHub REST API. Maps the raw GitHub response (`GitHubPullRequest`) into a
  clean `PullRequest` type: `number`, `title`, `author`, `authorAvatarUrl`,
  `state` (`"open" | "closed"`), `isMerged`, `createdAt`, `url`. Throws on a
  non-ok response.
- `app/api/prs/route.ts` — `GET` route handler returning `getPullRequests()` as
  JSON.
- `app/page.tsx` — Server Component. Fetches the PR list server-side (using
  `GITHUB_TOKEN`, which never reaches the browser) and renders `<PrList
  prs={prs} />`.
- `components/PrList.tsx` — Client Component (`"use client"`). Owns filter
  state (`all` / `open` / `merged` / `closed`) via `useState`, filters the
  already-fetched PR array in memory (no extra network call), and renders the
  list: avatar (via `next/image`, optimized), title linked to the GitHub PR,
  `#number opened by author on date`, and a status badge.
- `next.config.ts` — `images.remotePatterns` allows
  `avatars.githubusercontent.com` so `next/image` can optimize GitHub avatars.
- Verified end-to-end against the real GitHub API and real repo data; filter
  buttons confirmed working in the browser.
- `lib/summarize.ts` — `summarizePR(diff: string): Promise<string>` mock. Adds
  an 800ms fake delay (so loading states have to be handled honestly) and
  picks from a small list of canned summaries deterministically, keyed by
  `diff.length`, so re-summarizing the same PR is stable rather than random.
  No real Claude API call — signature matches what the real call will need,
  so swapping it in later is a one-line change inside this file only.
- `lib/github.ts` — added `getPullRequestDiff(number)`, `cache()`-wrapped like
  `getPullRequests()`. Hits the same single-PR GitHub endpoint but with
  `Accept: application/vnd.github.v3.diff` instead of the JSON accept header,
  and returns `res.text()` (a raw diff string) instead of parsed JSON.
- `app/api/prs/[number]/summary/route.ts` — new dynamic API route. `GET`
  handler awaits `params` (async in this Next version), calls
  `getPullRequestDiff` then `summarizePR`, returns `{ summary }` as JSON. This
  route is the boundary Client Components fetch through, since
  `getPullRequestDiff` needs `GITHUB_TOKEN` and can't run in the browser.
- `components/PrList.tsx` — added `SummaryPanel`, a per-row Client Component
  with its own `useState<SummaryState>` (`idle` / `loading` / `error` /
  `done`), so one PR's summary loading/error doesn't affect any other row.
  Renders a "Summarize" button that fetches `/api/prs/{number}/summary`, shows
  "Summarizing…" while pending, the summary text on success, and a "Retry"
  link on failure.
- Verified via direct HTTP calls (`Invoke-RestMethod`) against the running dev
  server: `/api/prs/1/summary` returns a real-diff-derived mock summary; the
  "Summarize" button confirmed present in rendered HTML. Not yet click-tested
  in an actual browser (Chrome extension wasn't connected this session) — do
  a manual click-through next session to eyeball the loading/result states.

### Concepts covered so far
- Server vs Client Components in the App Router: Server Components run only on
  the server and can hold secrets (`GITHUB_TOKEN`); Client Components
  (`"use client"`) are the opt-in needed for `useState`/event handlers, and
  should be small leaves fed by props from a Server Component parent, not the
  whole page.
- Dynamic API routes (`[number]` folder segments) as the secret-safe boundary
  between a Client Component and server-only data/env vars — the client can't
  call `getPullRequestDiff` directly, so it fetches a route that calls it.
- Per-item async state in a list: one `useState` per rendered `SummaryPanel`
  row, keyed by nothing more than component identity (React gives each list
  item its own instance), instead of one shared state object indexed by PR
  number — simpler because each row already is its own component.

## Immediate next step
AI PR-summary feature (mock) is done: `summarizePR` stub, diff fetch, and UI
wiring with loading/error states are all in place and verified via direct API
calls. Manually click through the "Summarize" button in a real browser next
session to confirm the UX feels right (loading text, error/retry path), then
decide what's next — likely either the merge/comment/request-changes actions
from the "What we're building" list, or Supabase auth/DB setup. Real Claude
API integration stays deferred to one deliberate pass at the end of the
project, once everything else is built.

## SDLC pipeline (not yet built)
Planned 8 slash commands in `.claude/commands/`:
`/requirements` → `/grill-requirements` → `/plan` → `/code` → `/review` →
`/optimize` → `/qa` → `/teach`, each stage saving artifacts to `.claude/sdlc/`.
Both directories are currently empty — this is a deferred track, worth setting
up once more ad-hoc feature cycles have surfaced what process is actually
needed, not before.
