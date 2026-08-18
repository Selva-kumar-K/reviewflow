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
- Gemini API (`gemini-3.5-flash`) — PR diff summarization. Decided over
  Claude since Selva doesn't have a card on file for Anthropic billing and
  Gemini's free tier needs none. Real call is gated behind an env flag,
  mock is the default — see Current progress below.
- Vercel — deployment. Live at https://reviewflow-azure.vercel.app (project
  `selva-kumar-ks-projects/reviewflow`), see Current progress below.

## Current progress (as of 2026-07-26)
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
- **Decision**: Gemini chosen over Claude as the real summarizer backend —
  Selva doesn't have a card on file for Anthropic billing; Google AI Studio's
  free tier needs none.
- `lib/summarize.ts` — wired up the real call. `summarizePR`'s signature is
  unchanged (still `(diff: string): Promise<string>`, still the only thing
  `app/api/prs/[number]/summary/route.ts` calls), so nothing outside this
  file changed. Internally it now branches: `summarizePRMock` (the original
  canned-summary logic, untouched) is the default; `summarizePRReal` (new)
  calls the Gemini API via `@google/genai`'s `GoogleGenAI` client and is
  only used when `process.env.USE_REAL_SUMMARIZER === 'true'`. New env vars
  in `.env.local`: `GEMINI_API_KEY`, `USE_REAL_SUMMARIZER`. Mock stays the
  default even with the real path wired up, per the original plan — a
  deployed public demo won't rack up API cost unless the flag is flipped on
  deliberately.
- `app/api/prs/[number]/summary/route.ts` — had the same bug the
  comment/request-changes routes originally had (see above): no
  `try/catch`, so a Gemini-side failure surfaced as an opaque 500. Fixed
  with the same pattern — `try/catch` around the diff fetch + summarize
  call, returns `{ error: message }` with a `502` on failure.
  `components/PrList.tsx`'s `SummaryPanel` was also still on the old
  generic-error pattern (`{status: 'error'}` with no message) while
  `RequestChangesSection`/`MergeSection` already read `data.error` from the
  response body — brought `SummaryPanel` in line with that pattern so the
  real error text renders instead of a generic "Couldn't summarize."
- **Gotcha, hit immediately**: `gemini-2.5-flash` returned a 404 —
  "This model models/gemini-2.5-flash is no longer available to new users."
  Google had moved the stable/recommended flash model on to
  `gemini-3.5-flash` by the time this key was created. Confirmed fix:
  switched the model string in `summarizePRReal` to `gemini-3.5-flash`.
  Worth a quick check of `ai.google.dev/gemini-api/docs/models` if this
  breaks again later — Google rotates which model IDs are available to new
  keys.
- Verified end-to-end in a real browser with `USE_REAL_SUMMARIZER=true`: a
  real Gemini-generated summary rendered for a real PR diff (not a canned
  one).
- **Constraint to design around next session**: Selva's Gemini key is on
  the free tier — 10 requests/minute, under 250 requests/day. Nothing in
  the current code prevents duplicate calls (e.g. clicking "Summarize" on
  the same PR twice re-hits the API both times, no caching of the result).
  Before this feature is used more than a handful of times per session,
  needs: (1) some form of caching so re-viewing a PR's summary doesn't
  re-call Gemini, (2) a guard against rapid repeat clicks. Not built yet —
  flagged so it isn't forgotten, not solved this session.
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
- **Verified: request-changes happy path.** Opened a PR from a second GitHub
  account (Selva as reviewer, not author) —
  https://github.com/Selva-kumar-K/reviewflow/pull/2 — then clicked "Request
  changes" on it from the dashboard while signed in as the primary account.
  Got "Changes requested on GitHub." (success state), confirming
  `requestChangesOnPullRequest`/`RequestChangesSection` work end-to-end now
  that the same-author restriction (see earlier gotcha) doesn't apply. This
  closes the last unverified mutating action — comment, request-changes, and
  merge have all now been confirmed against the real GitHub API.
- **Real-time PR updates, built end-to-end.** The PR list moved from
  "fetch live from GitHub on every page load" to "GitHub webhook feeds a
  Supabase table, which the browser subscribes to via Supabase Realtime" —
  closing the last two items ("webhooks", "real-time updates") from the
  original project goals list.
  - New `pull_requests` table in Supabase (SQL run by hand in the dashboard
    SQL editor — no CLI/migrations in this project): `number` (PK, GitHub's
    own PR number — safe since this is single-repo), `title`, `author`,
    `author_avatar_url`, `state`, `is_merged`, `created_at`, `url`. RLS
    enabled with a single `select` policy for the `authenticated` role — no
    write policy, since the only writer bypasses RLS entirely (next point).
  - `lib/supabase/admin.ts` — a **third** Supabase client, `createAdminClient()`,
    built from `@supabase/supabase-js`'s plain `createClient` (not the
    `@supabase/ssr` browser/server pair already in `lib/supabase/`) using a
    new `SUPABASE_SERVICE_ROLE_KEY` env var. Bypasses RLS entirely — server-only,
    never imported from a Client Component. Named differently from the other
    two files' `createClient` exports on purpose, so it can't be grabbed by
    accident in place of the session-bound ones.
  - `lib/pull-requests.ts` — new `PullRequestRow` type (the table's snake_case
    shape) plus `mapRowToPullRequest()`, converting a row into the existing
    camelCase `PullRequest` type from `lib/github.ts`. Shared by both the
    server read (`page.tsx`) and the client-side realtime handler
    (`PrList.tsx`) so the mapping isn't duplicated.
  - `app/api/webhooks/github/route.ts` — new `POST` handler. Reads the raw
    request body via `request.text()` *before* any JSON parsing (required —
    HMAC verification has to run over the exact bytes GitHub signed), verifies
    GitHub's `X-Hub-Signature-256` header with `crypto.createHmac` +
    `crypto.timingSafeEqual` against a new `GITHUB_WEBHOOK_SECRET` env var,
    checks `X-GitHub-Event === 'pull_request'`, then upserts one row via the
    admin client. No `action`-based filtering — every `pull_request` event
    (opened/synchronize/closed/edited/etc.) carries the full object, so a
    blanket upsert stays correct. Returns 401 on a bad signature (not this
    codebase's usual 502-for-everything — that convention means "GitHub, as
    *callee*, failed"; here GitHub is the *caller*, so a bad signature is an
    unauthorized request, not an upstream failure).
  - `app/page.tsx` — swapped from `getPullRequests()` (live GitHub) to
    `supabase.from('pull_requests').select('*')`, so the table is now the one
    source of truth both the first paint *and* the realtime subscription
    agree on. `getPullRequests()` itself is kept (unused for the main list
    now, but still needed for backfill/future resync tooling) — deliberately
    not deleted.
  - `components/PrList.tsx` — `prs` is now local `useState`, seeded once from
    the server-rendered prop (no resync effect — see inline comment on why
    that's deliberate), kept fresh by a `useEffect` that subscribes to
    `supabase.channel(...).on('postgres_changes', { event: '*', schema:
    'public', table: 'pull_requests' }, ...)` and merges each changed row in
    by `number`. Unsubscribes via `supabase.removeChannel()` on cleanup.
  - Backfill: a temporary `app/api/admin/backfill/route.ts` (auth-gated GET,
    reused `getPullRequests()` + the admin client to seed the table with the
    12 PRs that already existed before any webhook could have fired for
    them), hit once, confirmed via the Supabase table editor, then deleted —
    not left in the codebase.
  - **Gotcha, found the hard way**: after wiring the subscription, the
    dashboard only ever picked up changes on a manual refresh — never live.
    First suspect was a realtime-auth timing race (subscribing before the
    browser client finishes async-loading the session from cookies would
    join the channel as `anon`, which the RLS `select` policy would then
    silently block forever — no error, events just never arrive). Added an
    explicit `await supabase.auth.getSession()` + `supabase.realtime.setAuth()`
    before subscribing as a real defensive fix (kept), but it didn't fix this
    specific symptom — console logging showed the session *was* found and the
    channel *did* report `SUBSCRIBED`, yet zero `postgres_changes` payloads
    ever arrived. Actual root cause: the `alter publication supabase_realtime
    add table public.pull_requests` line from the setup SQL hadn't actually
    taken effect — checking **Database → Publications → `supabase_realtime`**
    in the dashboard showed `pull_requests` toggled *off*. Toggling it on
    there (equivalent to re-running that SQL line) fixed it immediately —
    confirmed live in the browser with a real GitHub-triggered update.
    Lesson: don't just trust that a multi-statement SQL block fully applied —
    check the Publications page directly if realtime events don't show up
    despite `SUBSCRIBED` + a valid session.
  - **Local testing**: GitHub webhooks need a public URL; this project isn't
    deployed yet. Used `cloudflared tunnel --url http://localhost:3000` (via
    `winget install Cloudflare.cloudflared`) instead of ngrok — no account/
    signup needed for a quick tunnel, unlike ngrok's current free tier.
    Registered a real webhook on the repo pointed at the tunnel's
    `*.trycloudflare.com` URL, content type `application/json`, secret =
    `GITHUB_WEBHOOK_SECRET`, event = "Pull requests" only. Verified via
    GitHub's own Recent Deliveries log (confirmed the `ping` event landed
    first, as GitHub always sends on webhook creation, correctly returning
    `{ skipped: true }` since it's not a `pull_request` event) and then a
    real test PR open + edit, both of which correctly upserted into the
    table and pushed live to the browser tab with no refresh. Tunnel closed
    and stopped after verification — the webhook on GitHub still points at
    that now-dead URL, so it'll just fail silently until either a fresh
    tunnel is stood up or the app is deployed to a real domain (whichever
    happens first should replace this webhook's payload URL).

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
- Caching a slow/rate-limited external call by keying on its own input,
  not an ID that points at it: `summarizePR`'s cache is keyed by the diff
  string itself, not by PR number. A PR number is a proxy for "which diff"
  and goes stale the moment new commits land; the diff text *is* the
  content being summarized, so caching on it can't ever serve a stale
  summary for a changed PR, and needs no invalidation logic.
- Caching in-flight promises, not just resolved values: `summaryCache`
  stores the `Promise<string>` from `summarizePRReal`/`summarizePRMock`
  immediately, before it resolves. Two near-simultaneous requests for the
  same diff (double-click, two browser tabs) both get the same in-flight
  promise instead of firing two Gemini calls — the second caller just
  awaits the first caller's request. A cache keyed on the resolved value
  only would still race during that window.

- `lib/summarize.ts` — added an in-memory `summaryCache` (module-level
  `Map<string, Promise<string>>`, keyed by the diff string) inside
  `summarizePR`. A rejected promise deletes its own cache entry via
  `.catch()` before rethrowing, so a failed Gemini call doesn't permanently
  poison the cache — clicking "Retry" genuinely retries instead of
  replaying the same error forever. Verified end-to-end against the
  running dev server with `USE_REAL_SUMMARIZER=true`: first call to
  `/api/prs/1/summary` took ~8.7s (real Gemini round trip), second call for
  the same PR returned the identical summary in ~0.8s with no second
  Gemini call.
- `components/PrList.tsx` — added a client-side rate-limit guard for
  "Summarize", closing the other half of the constraint flagged last
  session (caching handled duplicate calls on the *same* diff; this
  handles bursts across *different* PRs). A module-level
  `requestTimestamps: number[]` (not component state — shared across every
  `SummaryPanel` instance in the list, same file-scope pattern as
  `summaryCache` in `lib/summarize.ts`) tracks a sliding 60s window;
  `checkRateLimit()` blocks and returns a `retryAfterSeconds` once 10
  requests (Gemini's free-tier req/min ceiling) land in that window.
  `handleSummarize` checks this before fetching and, if blocked, sets the
  existing `error` state with a `Rate limit reached — try again in Ns`
  message — no new UI needed, it reuses `SummaryPanel`'s error/Retry
  rendering. Deliberately conservative: it counts every fetch attempt, not
  confirmed Gemini calls, so a few requests that would've been server-side
  cache hits still consume budget. Getting that precise would mean the API
  route reporting back whether it was a cache hit; not worth the extra
  moving parts unless the conservative version turns out to actually pinch.
  Verified via `tsc --noEmit` only — not yet exercised in a real browser,
  since tripping it needs 10+ distinct open PRs clicked within a minute,
  which isn't practical on the current demo repo.
- **Verified: rate-limit guard in a real browser.** Opened 10 throwaway PRs
  against `master` (via the GitHub API, using the same token `lib/github.ts`
  already uses — trivial one-line diffs to a scratch `RATE_LIMIT_TEST.md`
  file) to get past the "not enough distinct PRs" blocker noted above.
  Clicked "Summarize" across 10+ of them within 60 seconds from the
  dashboard; the guard kicked in and showed `Rate limit reached — try again
  in Ns` instead of firing an 11th Gemini call. Confirms `checkRateLimit`'s
  module-level `requestTimestamps` genuinely gates across different
  `SummaryPanel` instances, not just within one row. All 10 demo PRs closed
  and their branches deleted afterward — no lasting trace on the repo.
- Supabase Realtime only watches **your own Postgres tables** (via
  `postgres_changes` on a publication) or broadcast channels — it has no
  built-in awareness of GitHub. "Real-time PR updates" therefore isn't a
  single feature, it's a pipeline: GitHub webhook → Postgres table → realtime
  subscription. Nothing about Realtime itself talks to GitHub; the webhook is
  the only thing that does, and the table is what decouples the two.
- Two independent gates control whether a realtime event reaches the
  browser, and both have to be right: (1) RLS on the table (does this row's
  `select` policy allow the connecting role to read it?) and (2) publication
  membership (`alter publication supabase_realtime add table ...`, or the
  equivalent toggle in Database → Publications — is this table's WAL activity
  being streamed to Realtime at all?). A channel can report `SUBSCRIBED` with
  zero errors even when one of these is missing — the failure is silent, not
  an exception, which is what made this session's bug hard to find.
- A service-role client is a *third* kind of Supabase client, distinct from
  the browser/server pair used for user sessions. The two session-bound
  clients (`lib/supabase/client.ts`, `lib/supabase/server.ts`) answer "is
  this particular signed-in user allowed to do this," gated by RLS. The
  admin client (`lib/supabase/admin.ts`) answers nothing — it bypasses RLS
  outright, which is correct for a webhook handler (no user is signed in
  when GitHub calls it) but means it must never be reachable from browser
  code.
- Verifying a webhook signature has to happen against the *raw bytes* the
  sender signed, not a re-serialized version of the parsed body — which is
  why the handler calls `request.text()` and holds onto that exact string
  for both the HMAC check and the later `JSON.parse`, rather than parsing
  JSON first and re-stringifying for verification.
- Why a Server Component can read but not write cookies, and what closes the
  gap: Next only allows setting cookies from a Route Handler, Server Action,
  or `proxy.ts` — not from a Server Component mid-render (that's what the
  `try/catch` around `setAll` in `lib/supabase/server.ts` is silently
  swallowing). `proxy.ts` runs before every request and is allowed to write
  the response, which is what lets it refresh a near-expiry Supabase session
  cookie on a long-lived tab without any Server Component needing to do it.

## Current progress, continued (2026-07-26 session)
- **Security fix, found while prepping to deploy publicly**: every route
  under `app/api/prs/**` (`comment`, `request-changes`, `merge`, `summary`,
  `comments`, and the plain `prs` list) had no auth check of its own.
  `app/page.tsx` gates the *page view* with `supabase.auth.getUser()`, but
  the API routes it and `PrList.tsx`'s client-side fetches call were reachable
  directly by anyone — meaning an unauthenticated visitor to a public URL
  could merge/comment/request-changes on the real repo via `GITHUB_TOKEN`, or
  burn Gemini quota through `summary`, without ever signing in. Harmless
  while the app only existed on localhost; a real hole the moment it's
  public. Fixed by adding a shared `requireUser()` helper (in
  `lib/supabase/server.ts`, same `getUser()` call `page.tsx` already used)
  and calling it at the top of all six routes, returning 401 if there's no
  session. `app/api/webhooks/github/route.ts` deliberately excluded — it's
  gated by HMAC signature verification instead, since GitHub (not a signed-in
  user) is the caller. Verified both locally (curl with no cookies → 401,
  signed-in browser click-through → still works) and again against the live
  Vercel deployment below.
- **Deployed to Vercel — the last item from the original project goals
  list.** Linked via `vercel link` to project
  `selva-kumar-ks-projects/reviewflow` (Vercel's automatic GitHub-repo
  connection failed silently — not investigated, not blocking, CLI deploys
  work fine without it). Pushed the six required secrets
  (`GITHUB_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`,
  `GITHUB_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) to the Production
  environment via `vercel env add`. Deliberately did **not** set
  `USE_REAL_SUMMARIZER` on Vercel — mock summarizer stays the default on the
  public deployment, per the original cost-avoidance decision. Deployed with
  `vercel --prod`; build succeeded, live at
  https://reviewflow-azure.vercel.app. Verified with curl: page loads (200),
  `/api/prs` correctly 401s with no session.
- Closed the webhook loose end flagged last session: updated the GitHub
  webhook's payload URL (Settings → Webhooks, done manually since the fine-
  grained PAT lacks the separate `Webhooks` permission category — same
  "permissions are siloed per category" pattern as the `Issues`/`Contents`
  gotchas above, not worth widening the token's scope for a one-time URL
  edit) from the dead cloudflared tunnel to
  `https://reviewflow-azure.vercel.app/api/webhooks/github`. Verified live:
  edited a real PR on GitHub, confirmed `POST /api/webhooks/github` in
  `vercel logs` immediately after, confirmed the row upserted in the
  Supabase `pull_requests` table.
- Added the production URL (`https://reviewflow-azure.vercel.app/auth/callback`)
  to Supabase's Auth → URL Configuration → Redirect URLs allow-list (it only
  had `localhost` before). Without this, `signInWithOAuth`'s
  `redirectTo: window.location.origin + '/auth/callback'` would resolve to
  the production domain but Supabase would reject the callback as an
  unrecognized redirect. Verified: signed in with GitHub on the live URL,
  landed back on the PR list.

## Current progress, continued (2026-08-02 session)
- **Gotcha, quick diagnosis**: "Sign in with GitHub" started showing "site
  can't be reached" — the browser was redirecting to
  `https://hsnlaozzjkdgrivltiiz.supabase.co/auth/v1/authorize?...` and that
  host wasn't resolving at all (`nslookup` → `NXDOMAIN`, even against
  1.1.1.1). Root cause: the Supabase project had auto-paused (free tier
  pauses after a week of inactivity), and a paused project's hostname drops
  out of DNS entirely rather than serving a "paused" page — confirmed by
  hitting Cloudflare's edge directly with `curl --resolve` and an explicit
  IP, which returned `Project paused. Please unpause the project before
  proceeding.` (HTTP 540) instead of a DNS error. Fixed by clicking
  Restore/Unpause in the Supabase dashboard — no code changes involved, and
  now confirmed working again by Selva in the browser.
- **Closed the middleware gap flagged last session.** Added `proxy.ts` at
  the project root — the file that refreshes the Supabase session cookie on
  every request, so a Server Component read (which can't itself write a
  refreshed cookie, see the `try/catch` in `lib/supabase/server.ts`) doesn't
  end up looking at a stale one. **Gotcha, confirmed from the installed
  docs, not training data**: this Next version (16.2.10) renamed
  `middleware.ts` → `proxy.ts` (`export function proxy(request)` instead of
  `export function middleware(request)`) — found in
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, since
  Next 16 postdates training data. Same mechanism otherwise: standard
  `@supabase/ssr` cookie-relay pattern (`createServerClient` reading from
  `request.cookies`, writing to a fresh `NextResponse`), `matcher` excludes
  `_next/static`, `_next/image`, `favicon.ico`. Updated the stale comment in
  `lib/supabase/server.ts` ("Middleware (added later)...") to point at
  `proxy.ts` instead.
  - Verified: `tsc --noEmit` clean; dev server log confirms `proxy.ts` runs
    on every request (`GET / 200 ... proxy.ts: 19ms`); behavior unchanged —
    `/` still 200s, `/api/prs` still 401s when signed out.
  - **Not yet verified**: an actual cookie refresh in a real signed-in
    session (only observable near token expiry, not on a fresh sign-in) —
    the Chrome extension wasn't connected this session, so no click-through
    was possible. Selva is verifying this manually before it's committed.
  - Update: click-testing wrapped up and the `proxy.ts` commit landed
    (`f2c47c6`). Middleware gap treated as closed.
- **Fixed: Vercel's automatic GitHub-repo connection**, unresolved since
  2026-07-26. Root cause (per Vercel's own docs/community threads, confirmed
  by reproducing the failure with `vercel git connect` after installing the
  Vercel CLI locally): the Vercel GitHub App's repository access on the
  GitHub side didn't include `reviewflow` — `vercel link`/`vercel git
  connect` can authenticate fine but still can't see a repo the App wasn't
  granted access to, and that failure mode looks identical to a typo'd repo
  name. Fixed manually at
  https://github.com/settings/installations → Vercel → Configure →
  added `reviewflow` under repository access. `vercel git connect` then
  succeeded (`Connected`). Verified end-to-end: pushed the pending
  `proxy.ts` commit to `origin/day-3`, `vercel ls` showed a new Preview
  deployment start building ~7s later — push-to-deploy is now live, no
  `vercel --prod` needed for preview builds going forward (production
  promotion is still a deliberate call, per this project's "mutations are
  deliberate" pattern).

## Immediate next step
No open threads from prior sessions remain. No in-app comment delete built
(intentionally out of scope — only add if asked). Next session can pick
fresh feature work or the SDLC pipeline track below.

## SDLC pipeline (built 2026-08-02)
8 slash commands live in `.claude/commands/`: `/requirements` →
`/grill-requirements` → `/plan` → `/code` → `/review` → `/optimize` →
`/qa` → `/teach`. Each feature gets a kebab-case-slug directory under
`.claude/sdlc/<slug>/` with one artifact per stage (`01-requirements.md`
through `08-teach.md`) — see `.claude/sdlc/README.md` for the convention.
Commands resume the most-recently-modified slug directory when run with no
argument.

Built specifically to drive the frontend redesign (current plain UI →
modern, Lighthouse-optimized) as its first real workload, per Selva's
framing: backend is solid, but presentation is what a recruiter actually
sees, and the pipeline itself doubles as a second portfolio talking point
("I built my own SDLC process") alongside giving `/teach` real material to
work from for interview prep. `/optimize` specifically runs real Lighthouse
audits against a production build (not dev-mode numbers) and records
before/after scores — "Lighthouse score perfect" is meant to be a measured
claim, not a vibe.

Not yet run end-to-end on a real feature — next session should kick off
`/requirements` for the frontend redesign.
