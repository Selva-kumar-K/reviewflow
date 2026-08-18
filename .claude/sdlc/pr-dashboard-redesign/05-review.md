# Frontend redesign: PR dashboard — review

Reviewed the actual working-tree diff (`git diff` / new files under
`components/pr-list/`, `components/ui/`) against `02-grilled-requirements.md`
and `03-plan.md`'s 7-step plan, plus this codebase's established conventions
and `vercel:react-best-practices`.

## Blocking — found and fixed

**Dark mode was completely broken by `shadcn init`, contradicting an
explicit Goal.** `02-grilled-requirements.md` locked "Dark mode continues to
follow OS preference (no new toggle UI)" as a resolved product call, and
`03-plan.md` never listed dark-mode strategy as something in scope to
change. But `npx shadcn@latest init -d` (step 1) added
`@custom-variant dark (&:is(.dark *));` to `app/globals.css` and rewrote the
dark palette under a `.dark { ... }` class selector — switching Tailwind's
`dark:` variant from its v4 default (`prefers-color-scheme` media query) to
a **class-based** strategy. Nothing in the codebase ever adds a `.dark`
class to `<html>`/`<body>` — no `next-themes`, no `ThemeProvider`, no manual
`classList` toggle, confirmed by grep. The result: every `dark:` utility in
the app — the new shadcn component internals (`button.tsx`, `badge.tsx`,
`select.tsx`, `textarea.tsx`, etc.) *and* the pre-existing hand-written ones
in `SignInButton.tsx`/`SignOutButton.tsx`/the four action components — is
now dead code. Dark mode would never activate regardless of OS setting, a
silent visual regression on top of not delivering the stated goal.

This slipped through because every one of the 7 plan steps in
`04-code-log.md` was verified only via `tsc`/`eslint`/curl — never in an
actual browser with `prefers-color-scheme: dark` — so nothing would have
surfaced this until a human looked at the page in dark mode.

**Fixed in `app/globals.css`**: removed the `@custom-variant dark` line
(restoring Tailwind v4's default `prefers-color-scheme`-based `dark:`
variant) and changed the `.dark { ... }` class-selector block to
`@media (prefers-color-scheme: dark) { :root { ... } }`, keeping every
token value shadcn generated — only the activation mechanism changed, not
the palette. Verified `tsc --noEmit` and `eslint` still clean after the
edit. **Still needs a real-browser check** (OS set to dark, or DevTools
"Emulate CSS media feature prefers-color-scheme") before this can be called
fully confirmed — flagging for `/qa`.

## Correctness vs. plan/requirements

Everything else matches `03-plan.md`'s file list and sequencing exactly, and
none of the locked non-goals were touched:
- `components/PrList.tsx` → `components/pr-list/*` split is a clean,
  logic-preserving move (confirmed by diffing state machines against
  `git show HEAD:components/PrList.tsx` — identical shape, only identifiers
  renamed to match the plan).
- Card/Badge/Avatar/Tabs/Button/AlertDialog/Select/Textarea/Skeleton usage
  matches the locked component list in `03-plan.md`; no `Dialog`/
  `DropdownMenu`/other components snuck in, consistent with the "toolbar,
  not a menu" non-goal.
- `MergeAction`'s inline-expand → `AlertDialog` is the one deliberate
  interaction-shape change the plan called out — implementation matches: the
  toggle button stays in the toolbar, the dialog is fully controlled by the
  existing state machine (`dialogOpen = state.status !== 'idle'`), so a
  request in flight can't be dismissed mid-merge. `AlertDialogCancel`
  disabled during `loading`, matches the original's implicit guarantee.
- `app/layout.tsx` metadata and `app/globals.css`'s original `Arial`
  override both fixed as planned (the latter turned out already resolved by
  `shadcn init`'s own rewrite, correctly noted as "found free" rather than
  claimed as a deliberate fix).
- No mutating API route (`comment`, `request-changes`, `merge`, `summary`)
  was touched — `requireUser()` gating, error-handling `try/catch` →
  `{ error }` pattern, and the Gemini cache/rate-limit all remain exactly as
  before. This pass is genuinely presentation-only on the server side.
- `CommentsAction`'s generic (message-less) error states are **not** a
  regression — diffed against `git show HEAD:components/PrList.tsx`'s
  `CommentsSection`, which never read `data.error` either; this was already
  the pattern pre-redesign, just carried over unchanged.

## Convention consistency

- Server/Client boundary preserved: `PrList`/action components stay
  `'use client'` leaves; `PrCard`, `FilterTabs`'s pure helpers, `StatusBadge`
  are plain (no unnecessary `'use client'` added).
- `PrAvatar`'s decision to compose `Avatar`'s shell with `next/image`
  directly (skipping `AvatarImage`) rather than editing shadcn's generated
  source is reasonable and documented inline with a real reason (GitHub
  avatar URLs are never absent, so no fallback case is being dropped) — not
  a speculative workaround.
- `Badge`'s `open`/`merged`/`closed` variants extend `badgeVariants`
  directly in the shadcn-generated file, matching shadcn's "you own the
  source" model rather than layering ad-hoc classes on top.
- Icon convention (`data-icon="inline-start"` before text) verified against
  shadcn's own example source per the code log, and applied consistently
  across all four action triggers — checked `button.tsx`'s
  `has-data-[icon=inline-start]` selectors and confirmed they key off
  exactly that attribute.

## Frontend quality (`vercel:react-best-practices` lens)

- No inline component definitions, no barrel imports, hooks called
  unconditionally before any early return (`MergeAction`'s
  `if (pr.state !== 'open' || pr.isMerged) return null` correctly sits after
  both `useState` calls).
- `aria-live="polite"` on `PrList`'s `<ul>` is correctly scoped to the one
  region that actually mutates outside user action (realtime updates).
- Minor, non-blocking: the `Textarea` inputs in `RequestChangesAction` and
  `CommentsAction` have no associated `<label>` (placeholder-only) — this
  predates the redesign (same in the original hand-rolled version) and
  `04-code-log.md` already flagged one comparable gap (the merge dialog's
  unlabeled `Select`) as deferred to `/optimize`'s real Lighthouse audit
  rather than guessed at here. Consistent with that call — not fixing
  speculatively, but noting so `/optimize` doesn't miss it if the audit
  flags Accessibility.

## What was fixed vs. left as follow-up
- **Fixed**: dark-mode class/media-query mismatch in `app/globals.css` (see
  above) — this one was a genuine correctness bug, not a style call, so it
  was corrected now rather than deferred.
- **Left for `/qa`**: actual browser verification of every flow noted as
  "not yet visually verified" in `04-code-log.md` (all 7 steps, plus the
  dark-mode fix above) — nothing in this review pass substitutes for a real
  click-through, especially `MergeAction`'s dialog (highest-stakes, only
  interaction-shape change) and the dark-mode fix (can't be confirmed by
  `tsc`/`eslint` alone).
- **Left for `/optimize`**: `Select`/`Textarea` label gaps, Server/Client
  boundary restructuring, any bundle/caching work — per the plan's own
  "data-driven, not speculative" deferral.

## Verdict
One blocking issue was found (dark mode silently broken) and has been fixed
in `app/globals.css`; `tsc --noEmit` and `eslint` are clean after the fix.
Everything else — scope, conventions, and component usage — is review-clean:
matches the plan and grilled requirements with no drift, and no other
correctness or consistency issues surfaced. `/optimize` is next, but the
dark-mode fix above should get a real-browser look (OS dark mode or
DevTools emulation) before or during `/qa`, since it's the one change in
this pass that couldn't be verified by type-checking alone.
