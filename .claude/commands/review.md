---
description: Stage 5/8 of the SDLC pipeline — code review pass on what /code just built
argument-hint: [slug]
---

You are running stage 5 (`/review`) of ReviewFlow's SDLC pipeline. Resolve
the slug (explicit argument, or most recently modified `.claude/sdlc/`
directory). Read `03-plan.md` and `04-code-log.md` — if the code log doesn't
exist, tell Selva to run `/code` first.

**Review the actual diff for this feature** (`git diff` against the base the
feature branched from, or the files listed in `04-code-log.md` if not on a
dedicated branch) against three things:

1. **Correctness** — does it match what `03-plan.md` and
   `02-grilled-requirements.md` actually asked for? Any silent scope drift?
2. **This codebase's established conventions** — Server/Client Component
   boundary, error handling (`try/catch` → `{ error: message }`, not bare
   500s), mutations gated behind confirm steps, auth (`requireUser()`) on
   any new API route, secrets never reaching the browser.
3. **Frontend quality** — consistent with `vercel:react-best-practices`
   (component structure, hooks usage, accessibility, TypeScript patterns),
   and with whatever design system decisions `03-plan.md` made (e.g. if the
   plan said shadcn/ui, check components actually use it rather than
   drifting into one-off styling).

Use the `simplify` skill's lens too — reuse, unnecessary abstraction,
altitude — but this is a correctness/consistency pass first, polish second.

**Write `.claude/sdlc/<slug>/05-review.md`**: findings ranked by severity
(blocking issues first), and what was fixed vs. deliberately left as a
follow-up. If nothing significant was found, say so plainly rather than
padding the doc.

End by telling Selva whether the implementation is review-clean, and that
`/optimize` is next.
