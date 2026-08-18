---
description: Stage 1/8 of the SDLC pipeline — gather and document requirements for a ReviewFlow feature
argument-hint: [feature description, or existing slug to resume]
---

You are running stage 1 (`/requirements`) of ReviewFlow's SDLC pipeline. Read
`.claude/sdlc/README.md` first if you haven't already this session, for the
directory/stage convention.

**Resolve the feature slug.** If `$ARGUMENTS` matches an existing directory
under `.claude/sdlc/`, resume it. Otherwise treat `$ARGUMENTS` as a feature
description, derive a short kebab-case slug from it, and create
`.claude/sdlc/<slug>/`. If `$ARGUMENTS` is empty, ask what the feature is.

**Gather requirements like a colleague, not a form.** Do not write the
requirements doc from assumptions. Ask Selva real clarifying questions —
use AskUserQuestion where the choice is genuinely theirs to make (scope,
priority, what "done" looks like). At minimum, get clear on:

- **Problem**: what's actually wrong or missing right now, concretely (screen,
  component, or metric — not "it looks plain").
- **Goal**: what should be true once this is done, in terms Selva could say
  out loud to a recruiter.
- **Non-goals**: what this explicitly does NOT try to fix this round —
  important in a portfolio project where scope creep eats weekend sessions.
- **Constraints**: this is a solo, weekends + 30-min-daily project; Selva
  must understand every line (no vibe coding); stack is Next.js App Router +
  TypeScript + Tailwind v4 + Supabase, deployed on Vercel. Note any other
  hard constraints (budget, existing components that must not break).
- **Success criteria**: how will this be verified as actually done? Prefer
  measurable ones (a Lighthouse score, a click-tested flow) over vibes.

Push back gently on anything vague ("modern," "clean," "optimized") by asking
what it would look like concretely, but don't block on getting it perfect —
that's `/grill-requirements`'s job, not this stage's.

**Write `.claude/sdlc/<slug>/01-requirements.md`** with sections: Problem,
Goal, Non-goals, Constraints, Success criteria, Open questions (anything
still unresolved — carry these forward rather than guessing).

End by telling Selva the file is written and that `/grill-requirements` is
the next stage.
