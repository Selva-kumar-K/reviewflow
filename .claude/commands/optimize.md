---
description: Stage 6/8 of the SDLC pipeline — measure and improve real performance/Lighthouse numbers, not vibes
argument-hint: [slug]
---

You are running stage 6 (`/optimize`) of ReviewFlow's SDLC pipeline. Resolve
the slug (explicit argument, or most recently modified `.claude/sdlc/`
directory). Read `05-review.md` — if it doesn't exist, tell Selva to run
`/review` first.

**This stage runs against a production build, not `next dev`.** Dev mode
numbers are not representative (no minification, no RSC payload
optimization, HMR overhead) and will produce misleading Lighthouse scores.

1. `npm run build`, then serve the production build locally
   (`npm run start` or the project's equivalent) and confirm it's actually
   up before measuring anything.
2. Get a baseline: run Lighthouse against the affected page(s) — via
   `npx lighthouse http://localhost:3000 <path> --output=json --output=html`
   if the CLI is available, or via Chrome DevTools through the
   `claude-in-chrome` tools if a live browser session is more convenient.
   Capture all four category scores (Performance, Accessibility, Best
   Practices, SEO), not just Performance.
3. Read the specific failing/low-scoring audits, not just the headline
   number — Lighthouse tells you exactly what to fix (LCP element, unsized
   images, unused JS, font loading, color contrast, etc.).
4. Fix what's actually flagged, in this stack's idiomatic way:
   `next/image` for images, checking Server vs Client Component boundaries
   for unnecessary client JS, font loading strategy, checking for
   render-blocking resources. Consult `vercel:performance-optimizer` for
   anything Vercel-platform-specific (caching, edge vs Node runtime, ISR).
5. Re-run Lighthouse after each real change (not just once at the end) to
   confirm it actually moved the number, not just that it plausibly should.
6. Iterate until scores are at or near 100 across all four categories, or
   until a remaining gap is genuinely out of scope for this feature (e.g. a
   third-party embed you don't control) — call that out explicitly rather
   than silently stopping short.

**Write `.claude/sdlc/<slug>/06-optimize.md`**: a before/after table of all
four Lighthouse scores, the specific fixes made and which audit each one
addressed, and anything left unresolved with a stated reason. This doc is
the evidence behind "Lighthouse score perfect" as an actual claim, not a
vibe — treat the numbers as the artifact.

End by telling Selva the before/after scores and that `/qa` is next.
