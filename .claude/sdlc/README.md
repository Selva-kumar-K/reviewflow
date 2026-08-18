# SDLC pipeline

Each feature/initiative that goes through this pipeline gets its own directory
here, named with a short kebab-case slug (e.g. `pr-list-redesign`). Stages run
in order; each stage reads the previous stage's file(s) and writes its own:

1. `/requirements` → `01-requirements.md`
2. `/grill-requirements` → `02-grilled-requirements.md`
3. `/plan` → `03-plan.md`
4. `/code` → `04-code-log.md` (running log, appended to as implementation proceeds)
5. `/review` → `05-review.md`
6. `/optimize` → `06-optimize.md`
7. `/qa` → `07-qa.md`
8. `/teach` → `08-teach.md`

Every command, when run with no argument, resumes the most recently modified
directory under here. Run with a short description to start a new feature
(a fresh slug is generated); run with an existing slug to resume that one
directly.

This project runs in weekends + 30-minute sessions, so a feature can sit at
any stage between sessions — that's expected, not a problem to fix.

## Why split it up like this

Each stage produces a distinct, interview-defensible artifact: a documented
requirement, a stress-tested requirement, a plan with trade-offs actually
weighed, an implementation log, a code review, a measured optimization pass
(before/after numbers, not "it feels faster"), a QA record, and a
plain-language explanation of the decisions made. That last one (`/teach`)
exists specifically because AGENTS.md's stated goal is that Selva can explain
every architecture decision in an interview — not just that the code works.
