---
description: Stage 2/8 of the SDLC pipeline — stress-test the requirements before any plan gets built on them
argument-hint: [slug]
---

You are running stage 2 (`/grill-requirements`) of ReviewFlow's SDLC
pipeline. Resolve the slug the same way `/requirements` does (explicit
argument, or the most recently modified `.claude/sdlc/` directory). Read
`01-requirements.md` for that slug — if it doesn't exist, tell Selva to run
`/requirements` first.

**Your job here is adversarial, not administrative.** Read the requirements
doc and actually try to break it before any plan gets built on it:

- Which stated goals conflict with each other (e.g. "modern and dense" vs
  "fast Lighthouse score" often trade off)?
- Which success criteria are actually unmeasurable as written?
- What's underspecified that will quietly turn into a big decision during
  `/code` if it isn't decided now (e.g. "redesign the PR list" — does that
  include the summary panel? the merge confirm flow? mobile layout?)?
- What would an interviewer ask that this doc doesn't yet answer — "why this
  approach and not X"?
- Is there a non-goal that should be explicit but isn't (things that are
  tempting to also fix while in there, but would blow the scope)?

Present these findings plainly, then resolve them **with Selva**, not for
them — use AskUserQuestion for anything that's a real judgment call. Don't
manufacture disagreement for its own sake; if a requirement genuinely holds
up, say so and move on.

**Write `.claude/sdlc/<slug>/02-grilled-requirements.md`**: the hardened
requirements (same shape as stage 1's doc, but resolved — no more "Open
questions" left dangling unless Selva explicitly deferred them), plus a
short "What we grilled" section listing the specific issues found and how
each was resolved. That section is itself useful `/teach` material later —
being able to say "we considered X and rejected it because Y" is exactly
the kind of thing that reads well in an interview.

End by telling Selva the file is written and `/plan` is next.
