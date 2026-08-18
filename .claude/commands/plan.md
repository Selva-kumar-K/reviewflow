---
description: Stage 3/8 of the SDLC pipeline — turn grilled requirements into a concrete, sequenced implementation plan
argument-hint: [slug]
---

You are running stage 3 (`/plan`) of ReviewFlow's SDLC pipeline. Resolve the
slug (explicit argument, or most recently modified `.claude/sdlc/`
directory). Read `02-grilled-requirements.md` — if it doesn't exist, tell
Selva to run `/grill-requirements` first.

**Produce an implementation plan**, not code. For frontend/UI work
specifically:

- Check whether `vercel:shadcn` (component system), `vercel:nextjs` (App
  Router patterns), and `vercel:next-cache-components` (PPR/caching) skills
  are relevant to this feature and note where each applies — this project's
  stack is Next.js App Router + TypeScript + Tailwind v4, and shadcn/ui is
  the default modern component foundation on Vercel rather than hand-rolled
  components.
- If the feature touches performance/Lighthouse, plan for it up front
  (image sizing, font strategy, what's Server vs Client Component, bundle
  size) rather than treating `/optimize` as a place to fix things that
  should've been designed right the first time.
- Respect this project's established patterns: Server Components hold
  secrets and do data fetching, Client Components are small leaves fed by
  props, mutations get a confirm step (not native `confirm()`), errors are
  caught and surfaced with real messages, not generic ones.

**The plan should cover:**
- Architecture/design decisions and the alternative(s) considered for each
  (even briefly — "X over Y because Z"). This is the part `/teach` leans on
  hardest later.
- File-level changes: what's new, what's modified, what's deleted.
- Sequencing: broken into small steps, since Selva builds this in
  weekends/30-min sessions and must understand each step before the next —
  no step should be "and then rewrite everything."
- Where a new concept appears (e.g. a new Next.js primitive, a new Tailwind
  pattern, a new shadcn component), flag that it needs a plain-language
  explanation during `/code`, per AGENTS.md's "no vibe coding" rule.

Talk through the plan with Selva before finalizing — this is a good place
for a quick back-and-forth, not a document to hand over unread. Once there's
agreement, **write `.claude/sdlc/<slug>/03-plan.md`**.

End by telling Selva the file is written and `/code` is next.
