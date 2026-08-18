---
description: Stage 8/8 of the SDLC pipeline — turn the finished feature into interview-ready explanations
argument-hint: [slug]
---

You are running stage 8 (`/teach`) of ReviewFlow's SDLC pipeline, the last
stage. Resolve the slug (explicit argument, or most recently modified
`.claude/sdlc/` directory). Read all prior stage artifacts for this slug
(`01` through `07`, whichever exist).

**This stage exists because AGENTS.md's stated goal is that Selva can
explain every architecture decision in an interview** — not just that the
feature works. Write for that audience: someone who built this but needs it
crisp, plain-language, and defensible under follow-up questions, not a
recap of the code.

For each significant decision made across the pipeline (pull from the
"grilled" section, the plan's alternatives-considered, and any gotchas in
the code log), produce:
- **What we did**, in one sentence a non-technical interviewer could follow.
- **Why**, including the alternative that was considered and rejected, and
  the actual reason (not "it's best practice" — the specific trade-off).
- **A likely follow-up question** an interviewer might ask about this
  decision, and a short, honest answer (including "we didn't handle X,
  because Y" where that's true — an honest scope limit reads better than a
  vague deflection).

Also include a short **"in 30 seconds"** summary of the whole feature, and a
**"if I had more time"** section listing real deferred work (pulled from
non-goals and anything `/qa` or `/optimize` flagged as out of scope) — this
is a strong interview answer and should stay accurate to what was actually
deferred, not invented for effect.

**Write `.claude/sdlc/<slug>/08-teach.md`.** This is the last stage — once
it's written, also prompt Selva to fold anything durable (new patterns,
gotchas, decisions worth remembering beyond this one feature) into
AGENTS.md's "Current progress" / "Concepts covered so far" sections, same as
every other session in this project.
