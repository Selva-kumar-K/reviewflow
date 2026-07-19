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
- Supabase — auth + DB + realtime (auth in progress, see below)
- Claude API — PR diff summarization (not yet added; mock first, see above).
  Real provider choice undecided between Claude vs Gemini — see note below.
- Vercel — deployment (not yet done)

## Current progress (as of 2026-07-16)
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
- `lib/github.ts` — added `GITHUB_REPO_URL` constant (was previously repeated
  inline in two fetch calls; factored out once a third call needed it).
  Added `commentOnPullRequest(number, body)` — first **mutating** (`POST`)
  call in the codebase, hits GitHub's `issues/{number}/comments` endpoint
  (PRs are comments-compatible with issues in GitHub's API). Also added
  `getPullRequestComments(number)`, a `cache()`-wrapped `GET` on the same
  endpoint, mapped to a new `PrComment` type (`id`, `author`,
  `authorAvatarUrl`, `body`, `createdAt`, `url`).
- `app/api/prs/[number]/comment/route.ts` — `POST` handler, validates
  non-empty body, calls `commentOnPullRequest`, returns `{ ok: true }`.
- `app/api/prs/[number]/comments/route.ts` — `GET` handler, calls
  `getPullRequestComments`, returns the array as JSON.
- `components/PrList.tsx` — added `CommentsSection`, replacing the earlier
  post-only `CommentForm`. Starts as a "Show comments" toggle (lazy-loaded,
  not fetched on page load); once expanded, shows the existing comment list
  plus a post form below it. Posting successfully re-fetches the list so the
  new comment appears without a page reload, instead of just clearing the
  form.
- **Gotcha, verified the hard way**: fine-grained GitHub PATs gate `Issues`
  and `Pull requests` write access as *separate* permission categories from
  general repo push/admin access. A token can show `push: true` on
  `GET /repos/{owner}/{repo}` and still 403 on `POST .../issues/{n}/comments`
  if `Issues` wasn't explicitly set to "Read and write" on the token itself.
  Confirmed fix: set both `Issues` and `Pull requests` to "Read and write" on
  the token (Pull requests needed ahead of time for the merge/request-changes
  actions planned next).
- Verified live against the real repo: posted and listed a real comment on
  PR #1 via the running dev server (not just typecheck/lint) —
  https://github.com/Selva-kumar-K/reviewflow/pull/1#issuecomment-4951341256
  (a test comment; safe to delete from GitHub directly, no in-app delete
  built yet).
- `lib/github.ts` — added `requestChangesOnPullRequest(number, body)`, same
  shape as `commentOnPullRequest` but hits a different GitHub concept:
  `POST /pulls/{number}/reviews` with `{ body, event: "REQUEST_CHANGES" }`.
  A "review" is distinct from an issue comment — it carries formal PR state
  (`APPROVE` / `REQUEST_CHANGES` / `COMMENT`). GitHub requires a non-empty
  `body` when `event` is `REQUEST_CHANGES`.
- `app/api/prs/[number]/request-changes/route.ts` — `POST` handler,
  validates non-empty body, calls `requestChangesOnPullRequest`.
- `components/PrList.tsx` — added `RequestChangesSection`: a "Request
  changes" toggle that opens a textarea + submit, shows "Submitting…" while
  pending, and "Changes requested on GitHub." once it succeeds.
- **Error handling fix, both mutating routes** (`comment` and
  `request-changes`): originally neither route caught errors thrown by the
  `lib/github.ts` call, so any GitHub-side failure surfaced to the browser as
  an opaque 500 with no detail. Both routes now `try/catch` and return
  `{ error: message }` with a `502`; the UI reads and displays that message
  instead of a generic "try again."
- **Gotcha, found while testing request-changes**: GitHub rejects `APPROVE`
  and `REQUEST_CHANGES` reviews submitted on your own pull request (only
  `COMMENT` reviews are allowed on a PR you authored) — same restriction as
  the GitHub web UI, which only offers "Comment" in the review dropdown on
  your own PR. Confirmed by testing against a PR Selva opened themselves;
  the improved error handling above surfaced GitHub's real message instead
  of a blank 500. Means this feature can't be fully happy-path-tested solo
  without a PR authored by a different account — code follows the same
  pattern as the already-verified comment POST, so it's believed correct,
  but not yet verified end-to-end with a successful review filed.
- `lib/github.ts` — added `mergePullRequest(number, mergeMethod)`, hitting
  `PUT /pulls/{number}/merge` with `{ merge_method }`. New `MergeMethod` type
  (`"merge" | "squash" | "rebase"`), defaulting to `"squash"`.
- `app/api/prs/[number]/merge/route.ts` — `POST` handler (internal route
  stays `POST` like the other mutating routes, even though the underlying
  GitHub call is a `PUT`); validates `mergeMethod` against the three known
  values and falls back to `"squash"` if missing/invalid, calls
  `mergePullRequest`, same try/catch → `{ error }` + 502 pattern as
  `comment`/`request-changes`.
- `components/PrList.tsx` — added `MergeSection`: only renders for PRs that
  are still open and unmerged. Two-step confirm instead of a native
  `confirm()` dialog (deliberately — a real `confirm()` would block further
  automated browser testing of the page): click "Merge" reveals a merge-
  strategy `<select>` (squash / merge commit / rebase, defaulting to squash)
  plus "Confirm merge" and "Cancel" buttons; only the second click actually
  calls the API.
- **Gotcha, verified the hard way**: merging is a *different* fine-grained
  PAT permission category than commenting/reviewing. `Issues` and
  `Pull requests` (already set to "Read and write" for comment/request-
  changes) are not enough for `PUT /pulls/{number}/merge` — GitHub returned
  "Resource not accessible by personal access token". Root cause: merging
  actually writes a commit to the base branch, which falls under the
  **Contents** permission, not `Pull requests`. Confirmed fix: set
  `Contents` to "Read and write" on the token as well. Verified end-to-end
  against a real PR after the fix — merge succeeded.
- **Decision**: real Claude API integration is deferred until the rest of the
  project is done, per the original mock-first plan — no change there. What's
  new: Selva doesn't currently have a card to fund Anthropic billing, so
  Gemini (Google AI Studio, free tier, no card required) is under
  consideration as the real backend instead of/ahead of Claude. Not decided
  yet — revisit before actually doing the swap. Either way, `summarizePR`'s
  existing signature keeps this a one-file change in `lib/summarize.ts`
  regardless of provider, and the plan is to gate the real call behind an env
  flag (mock as the default even after the swap exists) so a deployed public
  demo can't rack up unbounded API cost from randoms clicking "Summarize."
- Started Supabase auth. Created a Supabase project
  (`hsnlaozzjkdgrivltiiz.supabase.co`); added `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`. Installed
  `@supabase/supabase-js` + `@supabase/ssr`.
- `lib/supabase/client.ts` — `createClient()` via `createBrowserClient`, for
  Client Components (reads the session cookie straight from the browser).
- `lib/supabase/server.ts` — `createClient()` via `createServerClient`, for
  Server Components/Route Handlers. Reads/writes cookies through Next's
  `cookies()`, which is async in this Next version (same pattern as
  `await params` above) — so this helper is an `async function` too.
- GitHub OAuth App created on GitHub (Client ID + Secret), pasted into
  Supabase's Authentication → Providers → GitHub panel and enabled. Nothing
  in the app consumes this yet — no sign-in button or callback route built.
- **Gotcha, self-inflicted**: appended the two Supabase env vars to
  `.env.local` with `cat >> file <<EOF` specifically to avoid printing the
  existing `GITHUB_TOKEN` line. Missed that the original file had no
  trailing newline, so the append glued straight onto the end of the
  token's value instead of starting a new line — corrupted `GITHUB_TOKEN`
  (broke every `lib/github.ts` call) and meant `NEXT_PUBLIC_SUPABASE_URL`
  was never actually set as its own variable. Fixed with an in-place `sed`
  insert keyed on the literal string that had been appended (never printing
  the token itself), confirmed fixed by checking `/api/prs` returned 200
  again. Lesson for future appends to existing env/secret files: confirm a
  trailing newline exists first, don't assume it.
- `components/SignInButton.tsx` — Client Component, "Sign in with GitHub"
  button. Calls `supabase.auth.signInWithOAuth({ provider: 'github',
  options: { redirectTo: \`${window.location.origin}/auth/callback\` } })`
  via `lib/supabase/client.ts`, which redirects the browser to GitHub's
  OAuth consent screen.
- `app/auth/callback/route.ts` — `GET` route handler, the far end of the
  OAuth redirect. Reads the one-time `code` GitHub appends to the redirect
  URL, calls `supabase.auth.exchangeCodeForSession(code)` via
  `lib/supabase/server.ts` (sets the session cookie server-side, since only
  the server can do that securely), then redirects to `/`.
- `app/page.tsx` — now gated. Calls `supabase.auth.getUser()` (server-side,
  via `lib/supabase/server.ts`) before fetching anything; if there's no
  user, renders just the sign-in prompt + `SignInButton` instead of the PR
  list. Deliberately uses `getUser()` and not `getSession()` — `getSession()`
  only reads whatever's in the cookie without checking it's still valid,
  `getUser()` revalidates against Supabase's Auth server, which is what
  Supabase recommends for any server-side render/data decision.
- Verified end-to-end in a real browser: signed in with a real GitHub
  account, redirected back through `/auth/callback` to `/`, landed on the
  PR list with the now-redundant sign-in button hidden. Confirmed the
  logged-out path too (fresh `curl` with no cookies shows the sign-in
  prompt, not the PR list).
- `components/SignOutButton.tsx` — Client Component, mirrors `SignInButton`'s
  shape. Calls `supabase.auth.signOut()` (via `lib/supabase/client.ts`), then
  `router.refresh()`. Rendered next to the "Pull Requests" heading in
  `app/page.tsx`, only on the gated (logged-in) view. Verified end-to-end in
  a real browser: signed-in state showed the button, clicking it dropped
  back to the sign-in prompt with no manual page reload.

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
- `GET` vs mutating (`POST`) route handlers: reads can be freely re-tested
  (curl it as many times as you want), but a `POST` to a GitHub endpoint has
  a real, visible side effect on the actual repo — so testing a mutation is a
  deliberate, confirmed action, not something to fire casually the way a
  read-only check can be.
- Keeping a list in sync with a write: after `CommentsSection` posts a new
  comment, it re-fetches the comment list rather than trying to locally
  splice the new comment into state — simpler and guarantees the displayed
  data matches what GitHub actually has (including GitHub-side fields like
  `id` that the client doesn't invent itself).
- Route handlers must catch errors from the functions they call, not just
  let them throw: an uncaught throw inside a route handler becomes a bare
  500 with no body, which hides the actual cause (here, GitHub's real error
  message) from the client. Catching and returning `{ error: message }`
  turns a debugging session into a message you can just read.
- Two Supabase clients, not one: auth has to work in both the browser (Client
  Components) and on the server (Server Components/Route Handlers), and each
  side finds "is this user logged in" a different way — the browser reads a
  cookie directly, the server reads it through Next's `cookies()` API. Same
  secret/no-secret, client/server boundary you already know from
  `GITHUB_TOKEN`, just applied to auth sessions instead of a repo token.
- The OAuth redirect round trip: sign-in isn't a single request/response
  like the mutating GitHub API calls elsewhere in this app. It's
  browser → GitHub → back to our server: `SignInButton` (Client Component)
  kicks off the redirect to GitHub; GitHub redirects back to
  `/auth/callback?code=...` with a one-time code; the callback Route
  Handler (server-only) trades that code for a real session. GitHub never
  hands the session to the browser directly — only the opaque code — which
  is what makes the flow resistant to tampering.
- `getUser()` vs `getSession()` in Supabase's server helper: both read the
  auth cookie, but `getSession()` trusts it as-is while `getUser()` calls
  out to Supabase's Auth server to confirm the token's still valid. Use
  `getUser()` anywhere the result decides what gets rendered or returned
  (like the gate in `app/page.tsx`) — `getSession()` is only fine for cheap
  optimistic checks where being wrong isn't a security issue.
- `router.refresh()` after a client-side auth change: `supabase.auth.signOut()`
  clears the session cookie in the browser, but the Server Component in
  `app/page.tsx` only re-runs `getUser()` on an actual navigation/refresh —
  it doesn't watch client state. `router.refresh()` (from
  `next/navigation`) re-runs the current route's Server Components against
  the new cookie and re-renders, without a full page reload. Same
  server/client split as the rest of auth, just triggered manually instead
  of by a URL change.

## Immediate next step
Auth is now fully round-tripped: `SignInButton` starts the OAuth redirect,
`/auth/callback` exchanges the code for a session, `app/page.tsx` gates the
PR list behind `supabase.auth.getUser()`, and `SignOutButton` clears the
session and refreshes back to the sign-in prompt — all verified end-to-end
in a real browser. No open auth work remains from the original plan.

Still open from earlier sessions: (1) request-changes' happy path (a
successful `REQUEST_CHANGES` review actually filed) is still unverified solo
— GitHub blocks that review type on your own PR, needs a PR from another
account to test; (2) no in-app comment delete built (intentionally out of
scope — only add if asked); (3) real Claude vs Gemini decision for the AI
summary backend, deferred until the rest of the project is done (see Stack
and Current progress notes above).

## SDLC pipeline (not yet built)
Planned 8 slash commands in `.claude/commands/`:
`/requirements` → `/grill-requirements` → `/plan` → `/code` → `/review` →
`/optimize` → `/qa` → `/teach`, each stage saving artifacts to `.claude/sdlc/`.
Both directories are currently empty — this is a deferred track, worth setting
up once more ad-hoc feature cycles have surfaced what process is actually
needed, not before.
