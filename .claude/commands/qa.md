---
description: Stage 7/8 of the SDLC pipeline — end-to-end verification in a real browser, golden path and edges
argument-hint: [slug]
---

You are running stage 7 (`/qa`) of ReviewFlow's SDLC pipeline. Resolve the
slug (explicit argument, or most recently modified `.claude/sdlc/`
directory). Read `02-grilled-requirements.md` (for success criteria) and
`06-optimize.md` — if optimize hasn't run, tell Selva, but proceed if they
confirm it's intentionally skipped for this feature.

**Verify in an actual browser, against the running app** — this project's
established convention (see AGENTS.md) is that `tsc --noEmit` and lint
passing is not the same as a feature working, and claims of "done" without a
real click-through have caused rework before. Use the `claude-in-chrome`
tools (load them via ToolSearch first if deferred) or the `run` skill to
launch the app.

Check, in order:
1. **Golden path** — the primary flow described in the requirements, done
   the way a real user would do it.
2. **Edge cases** flagged in `02-grilled-requirements.md` — empty states,
   loading states, error states (not just the happy path).
3. **Regressions** — anything nearby that this change could plausibly have
   broken (check the other rows/panels/actions on the same screen, not just
   the new thing).
4. **Responsive/accessibility basics** — does it hold up at a mobile
   viewport width, is it keyboard-navigable, do interactive elements have
   visible focus states.
5. **Success criteria from stage 1/2** — go back to what was actually
   promised and confirm each one, explicitly.

If something fails, fix it and re-verify — don't just log the failure and
move on. **Write `.claude/sdlc/<slug>/07-qa.md`**: what was checked, how
(exact steps, not "tested it"), and the result of each check.

End by telling Selva whether QA passed clean, and that `/teach` is next.
