# Changelog

All notable changes to The Online Store. Format: [Keep a Changelog](https://keepachangelog.com). Versions follow sprints.

## [0.1.1] - 2026-11-15 · Sprint 0 hotfix
### Fixed
- **Page jumped and jittered while scrolling, and Quick add clicks were sometimes lost.** The sticky header changed its layout height on scroll: it shrank padding and the logo, and collapsed the category row. Browser scroll anchoring then shifted the scroll position, which flipped the detected scroll direction and toggled the header back, creating a feedback loop. The header now has a constant layout height. The category row is absolutely positioned and slides with transforms only, a spacer reserves its space, and direction changes need at least 12 px of movement.
### Added
- Playwright regression test `Header scroll stability` (1280 px and 390 px). It fails on the old header (9 px drift, 5 different header heights) and passes on the fix.

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
