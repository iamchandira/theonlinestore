# Changelog

All notable changes to The Online Store. Format: [Keep a Changelog](https://keepachangelog.com). Versions follow sprints.

## [0.1.0] - 2026-11-15 · Sprint 0: Foundation
### Added
- Next.js 16 + Payload CMS 3 + PostgreSQL 16 project (Docker Compose on port 5434).
- Brand and design system: Tailwind v4 tokens, Outfit / Plus Jakarta Sans / Fraunces, motion tokens, WCAG-checked colour pairs (`pnpm check:contrast`).
- Storefront shell:
  - Announcement marquee.
  - Sticky header with search autosuggest and mega-menus.
  - Mobile menu and bottom nav.
  - Bag drawer, quick-add variant picker and fly-to-bag animation.
  - WhatsApp button and footer.
- Home page with 14 sections, animated with GSAP (hero timeline, parallax, marquees) and Framer Motion (reveals, layout, drawers).
- `/styleguide` living design system and a branded 404 page.
- Seed catalogue: 88 products, 99 variants and 18 brands extracted from the client PDFs, with photos.
- Payload: branded admin, `users` with 8 RBAC roles, access helpers, WebP media sizes, `pnpm seed:admin`.
- Project docs (`/docs`): charter, SRS, backlog, sprint plan, architecture, design system, RBAC, working agreement, UX guidelines, catalogue, Sprint 0 report.
- Playwright storefront tests and `scripts/screenshots.mjs` for visual QA.
