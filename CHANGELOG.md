# Changelog

All notable changes to The Online Store. Format: [Keep a Changelog](https://keepachangelog.com). Versions follow sprints.

## [0.2.0] - 2026-11-15 · Sprint 1: Catalogue live
### Added
- **Catalogue in Payload:**
  - Collections: `products` (variants with SKU, price, compare-at price, staff-only cost, weight, stock, low-stock threshold and photo; drafts, versions and scheduled publishing), nested `categories` with breadcrumbs, `brands`, `tags`, `concerns`.
  - **Computed fields:** price range, total stock, low-stock and on-sale flags, search text.
  - **Checks:** SKUs must be unique; SEO fields on products, categories and brands.
- **Inventory:**
  - Every stock change is written to `stock-movements` with who and why. Low stock is flagged and logged.
  - Field-level roles: inventory managers can change stock but not prices.
- **Import:** `pnpm seed:catalog` imports the 88 products, 99 SKUs, 18 brands, 28 categories and 99 photos. It is idempotent. `pnpm prune:media` removes unused photos.
- **Home page CMS (global):** marketing picks the hero products and configures product rails (hand-picked, on sale, bestsellers, newest, by tag, by category, under a price).
- **Storefront pages:**
  - Category (`/c/…`, including the virtual Beauty department), brand (`/brands/…`), brands directory, category directory, offers and search.
  - Sort, pagination, sub-category chips, removable filter chips, and friendly empty states with a WhatsApp product request.
- **Product page:**
  - Swipe gallery with dots on phones; thumbnails with hover zoom on desktop.
  - Variant pills synced to `?variant=`, live stock status, quantity, add to bag, wishlist, and reassurance details.
  - Accordions with empty sections hidden.
  - A sticky add-to-bag bar on phones. The WhatsApp button slides clear of it.
  - "Pairs well with" (hand-picked, or matched by concern) and "You may also like".
- **SEO:**
  - Per-page metadata and canonicals.
  - BreadcrumbList and Product JSON-LD. Offers are published only once prices are confirmed.
  - All 88 product pages pre-rendered, with instant revalidation on admin edits.
- **Header search:** autosuggest now comes from the server (`/api/products/suggest`).
- **Tests:**
  - 5 integration tests for catalogue rules: computed fields, stock log, RBAC field access, draft visibility, duplicate SKUs.
  - 3 e2e tests for catalogue flows.
### Changed
- The bag stores a snapshot per line (storage key `tos.cart.v2`). Sprint 0 bags are discarded.
- Home sections and the header receive their data as props from server components (no catalogue bundled in the browser).
- Same-site media URLs are made relative so `next/image` accepts them on every environment.
### Fixed
- The sticky add-to-bag bar didn't appear after a fast fling. IntersectionObserver misses jumps, so a frame-throttled scroll check is used instead.
- The seed duplicated photos on re-run, because uploads are stored as WebP and the filename check didn't match. It now matches either name.
- The template admin test created its user without an acting admin. It is now created by the seeded super-admin (RBAC hook).

## [0.1.3] - 2026-11-15 · Smooth scrolling
### Added
- **Butter-smooth scrolling with Lenis 1.3** (`src/lib/motion/SmoothScroll.tsx`), driven by GSAP's ticker so ScrollTrigger effects (hero parallax, marquees) stay in sync with the scroll. A 600 px wheel tick now eases in over about 0.7 s instead of jumping.
  - Desktop wheel and trackpad only. Phones and tablets keep native momentum scrolling.
  - Off for `prefers-reduced-motion`.
  - Page is locked while drawers or sheets are open (`lockScroll` / `unlockScroll`).
  - Panels scroll on their own (`data-lenis-prevent`, `allowNestedScroll`). In-page anchors glide and clear the sticky header.
  - New pages start at the top. Reload and back/forward keep the browser's scroll restoration.
- Playwright test: smooth scrolling is on for desktop and off for reduced motion. The header-stability test now waits for the glide to settle.
### Changed
- Removed CSS `scroll-behavior: smooth` (two smoothers fight each other) and added the Lenis base styles.

## [0.1.2] - 2026-11-15 · Product card polish
### Fixed
- **Product card action buttons: margins, padding and alignment.**
  - The desktop "Quick add" / "Choose options" bar had lost its centering and padding, so its icon and label were jammed against the left edge. It is now centered.
  - Badges, the wishlist heart and quick add each used a different inset (11 px and 13 px). Now one card inset (`--ci`: 12 px on phones, 14 px from 640 px) is shared by every overlay **and** the text block, so badges, buttons, brand and name all line up on the same edges.
  - On touch screens the "+" button was a heavier 44 px circle next to a 36 px heart. Both are now 36 px circles inside 44 px tap targets, on the same right edge.
### Added
- A visible keyboard focus ring around the whole product card.

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
