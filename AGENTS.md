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

## Current progress (as of 2026-07-11)
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

### Concepts covered so far
- Server vs Client Components in the App Router: Server Components run only on
  the server and can hold secrets (`GITHUB_TOKEN`); Client Components
  (`"use client"`) are the opt-in needed for `useState`/event handlers, and
  should be small leaves fed by props from a Server Component parent, not the
  whole page.

## Immediate next step
Build the AI PR-summary feature against a **mocked** Claude summarizer:
1. `lib/summarize.ts` exporting `summarizePR(diff: string): Promise<string>`
   that returns canned fake summary text (no real API call).
2. Fetch a given PR's diff from GitHub (new API call).
3. Wire the mock summary into the UI with loading/error states.
4. Real Claude API integration is deferred to one deliberate pass at the end
   of the project.

## SDLC pipeline (not yet built)
Planned 8 slash commands in `.claude/commands/`:
`/requirements` → `/grill-requirements` → `/plan` → `/code` → `/review` →
`/optimize` → `/qa` → `/teach`, each stage saving artifacts to `.claude/sdlc/`.
Both directories are currently empty — this is a deferred track, worth setting
up once more ad-hoc feature cycles have surfaced what process is actually
needed, not before.
