# HBA Website — Project Context for Claude

This file gives you (Claude) the context you need to work on this project effectively. Read it at the start of every session.

## What this project is

The website for High Bluff Academy (HBA), a private school. It replaces an aging WordPress + Elementor site that was hosted on DreamHost. The redesign is being led by Ethan, who is the school's tech lead. He's a capable learner but new to modern frontend tooling — explain things briefly when introducing new concepts, but don't over-explain things he's already shown he understands.

The visual reference for the design is Chapel Hill Chauncy Hall's website. The goal is a modern, editorial, polished private-school feel.

## Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS, written inline in JSX (utility-first)
- **Hosting:** Vercel (auto-deploys from GitHub `main` branch)
- **Domain & email:** DreamHost handles DNS and the highbluffacademy.com domain; email is on Microsoft 365 (Outlook/Teams). Nothing about the website rebuild should touch DNS or email.
- **Repo:** GitHub, synced via VS Code's source control panel
- **TypeScript:** strict mode
- **Editor:** VS Code on Windows, PowerShell terminal

## Component conventions

The working component layer lives under `components/`:

- `components/ui/` — primitives: `Section`, `Container`, `PageHero`, `CTA`, `Breadcrumbs`, etc.
- `components/header/` — `TopBar`, `Navbar`
- `components/footer/` — `Footer`
- `components/layout/` — `PageLayout`

Pages live under `app/` following the Next.js App Router convention (`app/about/page.tsx`, `app/admissions/page.tsx`, etc.).

`Section` accepts a `background` prop (e.g. `background="gray"`). `Container` accepts a `className` prop for width and alignment overrides like `max-w-3xl text-center`. Cards on the homepage are written as plain Tailwind divs, not as a separate `<Card>` component.

## How to work with Ethan

**Verify before claiming.** When you change something, run the build (`npm run build`) or at least `tsc --noEmit` to confirm it compiles. Don't say "this should work" — say "I ran the build, it passed."

**Use git as a safety net.** Before any non-trivial change, check `git status` and confirm the working tree is clean or that uncommitted changes are intentional. Suggest commits at natural stopping points so Ethan can revert easily.

**Be honest about uncertainty.** If you're not sure whether a change is right, say so. Don't paper over doubt with confident-sounding paragraphs of reassurance — that pattern is exactly what got the previous rebuild into trouble.

**Sentence-case everything.** Page titles, headings, button labels — sentence case, not Title Case. Match the existing site.

## Things Ethan cares about

- The site staying easy to extend (new pages, new dropdown items) without architectural rework.
- Build passing on Vercel before changes are considered "done."
- Pages feeling visually cohesive — same rhythm, same typography, same spacing — without enforcing that with a heavyweight token system.
- Accessibility (semantic HTML, alt text, keyboard nav) and reasonable performance.

## Contact/admin handoff

If you are working on the contact page, contact form, Turnstile verification, Supabase contact submissions, Microsoft Graph email notifications, or the `/admin` contact-submissions dashboard, read `docs/contact-admin-rollout.md` first.

That file documents the current architecture, rollout history, environment gotchas, and recent UX decisions so future sessions do not need to reconstruct them from git history.

## Useful commands

```
npm run dev          # local dev server, http://localhost:3000
npm run build        # production build (run this before declaring a change done)
npm run lint         # eslint
git status           # see what's changed
git diff             # see the actual changes
git log --oneline -20  # recent history
```

## When in doubt

Ask. A two-line clarifying question is much cheaper than a 200-line wrong rewrite.
