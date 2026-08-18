---
description: Stage 4/8 of the SDLC pipeline — implement the plan, one small step at a time, explaining as you go
argument-hint: [slug]
---

You are running stage 4 (`/code`) of ReviewFlow's SDLC pipeline. Resolve the
slug (explicit argument, or most recently modified `.claude/sdlc/`
directory). Read `03-plan.md` — if it doesn't exist, tell Selva to run
`/plan` first. Also read `04-code-log.md` if it already exists (resuming
mid-implementation across a session boundary).

**Implement the plan's steps in order, one at a time.** This is the core
constraint of this project (from AGENTS.md): Selva must understand every
line — no vibe coding. Concretely:

- Before writing code that introduces a concept not already used elsewhere
  in this codebase (a new Next.js primitive, a new Tailwind/shadcn pattern,
  a new hook pattern), explain it in plain terms tied to the actual code
  first, then build it.
- Prefer editing existing files over new ones; keep changes scoped to what
  the plan actually called for — don't drift into adjacent refactors the
  plan didn't cover (if you spot something worth fixing, note it rather than
  doing it).
- After each meaningful chunk of work, pause for Selva to follow along
  rather than pushing through the whole plan silently in one go.
- Run `vercel:react-best-practices` guidance where relevant after editing
  multiple TSX components.

**Append to `.claude/sdlc/<slug>/04-code-log.md`** as you go (create it on
first run) — same style as AGENTS.md's existing "Current progress" entries:
what was built, in which files, key decisions made *during* implementation
that weren't already in the plan, and any gotchas hit. This is a running
log, not a one-shot write — update it incrementally, not just at the end.

Do not mark this stage done until the plan's steps are actually implemented
and at minimum type-checked. Full verification (browser click-through,
Lighthouse) is `/qa` and `/optimize`'s job, not this stage's — but don't
claim something works if you haven't run it at all.

End by telling Selva what's implemented, what (if anything) is left from the
plan, and that `/review` is next once implementation is complete.
