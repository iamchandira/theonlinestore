# Changelog

All notable changes to The Online Store. Format: [Keep a Changelog](https://keepachangelog.com). Versions follow sprints.

## [0.9.4] · 2026-11-24 · Product page redesign
### Changed
- **Edit / create product page redesigned:**
  - Five tabs: Product, Variants & pricing, Details, Merchandising, SEO.
  - Each tab holds titled section cards with a one-line hint.
  - Extra photos now sit in the Product tab, next to the name and description.
  - A tab shows a red count when it has an error.
- **Summary card** at the top of the sidebar: price range (with "On sale"), stock (with low / sold-out warnings), units sold and rating, plus links to the store page and stock history. It replaces eight greyed-out read-only inputs, and the sidebar scrolls with the page.
- **Action bar:** a coloured status pill (Published / Draft / New) and an "Unsaved changes" note next to Save Draft and Publish. The developer-only API tab and the repeated collection note are gone.
- "Price to be confirmed" shows as an amber warning when ticked.
- No data changes: field names and stored values are the same (no migration).

### Fixed
- **Admin on phones and tablets:** pages were squeezed into a narrow strip because the content fell into the closed sidebar's column. The top bar and action bar now fit the screen, and on the product page Save / Publish stay pinned while scrolling.

## [0.9.3] · 2026-11-24 · Admin polish
### Changed
- Sidebar sub menus open and close with a smooth animation (instant when reduced motion is on).
- The sidebar footer (View store, your name and role) stays pinned at the bottom while the menu scrolls; **Log out** is now an icon to the right of your name.

### Fixed
- **Publish changes ▾** (and other split buttons): the orange square behind the grey button is gone. Both halves now form one pill that is orange when it can be used and grey when it can't.
- Read-only text boxes (e.g. an order's "Note from the customer") no longer show a square tinted box behind their rounded corners or a resize grip.

## [0.9.2] · 2026-11-24 · Admin tidy-up
### Added
- **Announcement bar icons:** pick an icon (or none) for each message in Settings › Store details, from a grid of 18. Messages saved before keep the icons they had. Needs the database migration `20261123_210038_announcement_icons` (run by `deploy.sh`).

### Changed
- **Sidebar sub menus:** Orders, Products, Catalogue setup, Content, Insights and Settings open into their pages. The area you're in opens by itself, your choices are remembered, and a closed area shows a red dot when something needs attention.
- **Customers and Staff & roles** have their own page with tabs, search and a clean address (`/admin/collections/users`, `?view=staff`) instead of `?where[roles][contains]=customer&limit=10&depth=1`. Customers show email confirmation and order count; staff show their roles.
- Orders, Products, Reviews and Customers keep short addresses (Payload's `limit`, `depth` and remembered `sort` are no longer added).
- **Product SEO** (title, description, image, preview) moved to its own **SEO** tab when creating or editing a product. Stored data is unchanged.

### Removed
- The unused demo/sample columns (`is_demo`, `is_sample`) from the database, in the same migration.

## [0.9.1] · 2026-11-19 · Security update
### Changed
- Next.js 16.4.1 → 16.4.6 (and eslint-config-next) for a known security vulnerability reported at build time. Builds no longer stop on the first attempt.

## [0.9.0] · 2026-11-18 · Launch preparation
### Added
- **Settings › Store details:** store name, description, phone, WhatsApp, email, hours, address, business registration, social links and the announcement bar, used across the store, emails and invoices.
- **Settings › Policies:** terms & conditions (with version, recorded on every order), returns & refunds (return window and non-returnable product types, used by Returns) and privacy, written in the admin and shown at /terms, /returns, /privacy.
- **Free delivery on/off** in Checkout & delivery; every free-delivery message follows it.
- **Bank accounts** (any number: bank, branch, account name and number, branch code, SWIFT) shown after ordering, on the order page and in emails. Bank transfer stays hidden until one is added.
- **Instalment display controls:** "3 × Rs X" only shows when Koko/Mintpay is switched on, connected and set to show; an optional instalment fee is added at checkout and included in the "3 × Rs X".
- **Home page banners & messages** in the admin: hero badge, sale banner (with end date), gift banner, gift finder text, newsletter text; each can be switched off.
- **Production deployment kit** (`deploy/`): database compose file, Caddy (HTTPS), systemd service, deploy and backup scripts, production env template; runbook `docs/10-go-live.md`.
- **Database migrations** (`src/migrations`), applied by `pnpm payload migrate` on deploy.
- Sitemap and robots.txt; security headers; standalone build; upload folders outside the build (`UPLOADS_DIR`).
- `production` branch built by `scripts/make-production.sh` (no tests, seed/demo scripts, test gateway or styleguide).

### Changed
- Menus, category tiles, search suggestions, the 404 page and the footer show only categories that exist in the admin; footer links to pages that don't exist yet were removed.
- Payment names on product pages, the footer and home page follow Settings › Payments (no Koko/Mintpay/card claims unless they're available).
- Seed scripts refuse to run against anything but a local database.
- The test gateway can never run on a real domain, and its option is hidden in production builds.
- Dev image optimisation uses WebP only (AVIF in production), which makes first image loads in development much faster.

### Removed
- Demo/sample product and review flags and labels from the code (local demo data is identified by `DEMO-` SKUs).
- Hard-coded promises: "Rs 500 off your first order", "Up to 25% off body care" countdown, "Free gift wrapping", "Koko & Mintpay" USP.
- The unused template Dockerfile.

### Fixed
- Uploads would have been lost on every deploy (they were saved inside the build folder).

## [0.8.0] · 2026-11-16 · Sprint 6: Orders & delivery
### Added
- **Order lifecycle** (TOS-702): staff can only move orders along the allowed steps; packing and shipping need payment (COD excepted); shipping needs a courier and tracking number; each step's date is kept.
- **Orders list** (TOS-701): filters by payment status, method, delivery and dates; search by tracking number; tick orders to change status in bulk (each order checked, failures listed) or print them.
- **Invoices and packing slips** (TOS-703): printable A4 pages (print or Save as PDF), many at once; packing slips show COD cash to collect, gift message, and hide prices for gifts.
- **Couriers** (TOS-704): Settings › Couriers with tracking links; starter list from `pnpm seed:demo` (Koombiyo, Domex, Pronto, own rider). "On its way" email with the tracking link.
- **Order tracking** (TOS-705): `/track-order` with order number and mobile; **order page** `/orders/…` with progress, courier link, payment, invoice and **Buy again** (TOS-305). Account › Orders opens it.
- **Returns and refunds** (TOS-706): shoppers request returns within 7 days of delivery (not food); staff approve/reject, mark received (back into stock), refund. Refunds: PayHere Refund API (partial supported), test gateway, or recorded bank refunds. Emails at each step.
- **COD reconciliation** (TOS-707): cash with each courier, and "Record payment" for the orders a courier remittance covers.
- Tests: `orders.int.spec.ts` (10), `orders.e2e.spec.ts` (2); e2e teardown releases test orders.

### Fixed
- The tracking form cleared what the shopper typed after an error.
- e2e runs gradually sold out the demo product they buy; test orders are now cancelled (stock back) and removed after each run.

## [0.7.0] · 2026-11-15 · Sprint 5: Payments
### Added
- **Settings › Payments** (TOS-601): each method on or off, its position at checkout, minimum and maximum order, label; Test or Live mode; how long unpaid online orders are held. Gateway credentials are Super Admin only, and environment variables override them.
- **Card payments with PayHere** (TOS-602): signed checkout form, signed server notification (`/api/transactions/notify/payhere`) checked for merchant, signature and exact amount; repeats are ignored and a late failure never un-pays an order.
- **Koko and Mintpay** (TOS-603/604): shown with "3 × Rs X"; the full flow runs on the built-in test gateway until each provider's merchant guide arrives.
- **Built-in test gateway** with Approve / Decline / Cancel, signed like the real gateway; Test mode only, never on the live site.
- **Pay page** (`/checkout/pay/…`): continues to the gateway, explains a cancelled or failed payment and offers Try again; the order page waits for confirmation instead of claiming success.
- **Bank slips** (TOS-605): shoppers upload a photo or PDF on their order page; staff Verify or Reject it in the order's new Payment panel; the shopper is emailed either way.
- **COD rules** (TOS-606): excluded districts, on top of the maximum and fee.
- **Transactions** (TOS-607): every attempt, gateway message (with its signature result), slip decision and cash collection, read-only. "Cash collected" for COD orders.
- **Unpaid orders are released** automatically after their pay-by time (60 min online, 48 h bank transfer) and the stock goes back.
- Sidebar: Transactions (with slips waiting) and Settings › Payments.
- Tests: `payments.int.spec.ts` (15), `payments.e2e.spec.ts` (3).

### Changed
- Cash on delivery and bank transfer settings moved from Checkout settings to Settings › Payments.
- Online orders send their confirmation email once payment is confirmed; bank transfer emails ask for the slip.
- Order payment status is no longer edited by hand; payment actions keep the log.
- Place-order limit raised to 30 per 10 minutes per connection (mobile networks share addresses).

### Fixed
- Opening any order page emptied the shopper's current bag; now only right after ordering.

## [0.6.0] · 2026-11-15 · Sprint 4: Checkout
### Added
- **One-page checkout** (`/checkout`), guest or signed in: contact, address (saved addresses or new, all 25 districts with town suggestions), delivery (standard or same-day in Colombo before noon), payment (cash on delivery or bank transfer; card, Koko and Mintpay marked "coming soon"), gift wrap and message, notes and a coupon box. The summary is sticky on desktop and folds away on phones.
- **Pricing on the server** (`src/lib/checkout/pricing.ts`): line totals, automatic promotions by priority, one coupon (best of when not combinable), delivery by zone and weight with a free-delivery threshold, gift wrap. Rounded to the rupee per line. 27 tested scenarios.
- **Discounts** collection (Sales › Discounts): percent, fixed, free delivery and buy-X-get-Y; automatic or by code; date windows, total and per-customer limits, minimum spend, first order only, exclude sale items, scope by products, categories or brands. The list shows a plain-language summary ("Buy 2, get 1 free").
- **Checkout settings** global (Settings › Checkout & delivery): free-delivery threshold, weight rules, delivery zones by district, same-day fee and cut-off, COD maximum and fee, bank transfer instructions and hold time, gift wrap fee, terms version.
- **Orders** collection with 12 statuses, a timeline, staff notes, restock once on cancellation, and order numbers like `TOS-261115-J7MT`. Admin Orders screen with today's numbers, status tabs and search; open orders badge in the sidebar; 14-day sales card on the dashboard.
- `POST /api/orders/quote` and `POST /api/orders/place`: validates every field, re-prices, refuses a changed total, then locks the products, re-checks stock and creates the order in one transaction.
- **Order confirmed** page and email (Mailpit locally), with bank transfer or COD instructions. Guests can add a password to turn the order into an account (TOS-307); the order links at first sign-in.
- **Bag sync:** the bag is saved to the account, merged at sign-in (keeping the larger quantity) and emptied after an order. Account › Orders lists orders.
- Summary policy pages: `/terms`, `/returns`, `/privacy`.
- Demo codes from `pnpm seed:demo`: WELCOME10, FREEDEL, CHOC3FOR2.
- Tests: `checkout.int.spec.ts` (14), 4 more RBAC checks, `checkout.e2e.spec.ts` (2).

### Fixed
- Products with stock history could not be deleted (the history's product link was required, but the database clears it on delete). History is now kept with the SKU and variant.
- Reopening the admin sidebar before the saved preference loaded was not remembered, and a slow answer closed it again.
- The WhatsApp button covered the order total on the phone checkout; it is hidden on `/checkout`.

## [0.5.0] - 2026-11-15 · Sprint 3: Accounts & security
### Added
- **Customer accounts:**
  - Register with email confirmation, sign in with "Keep me signed in" (30 days, or the browser session), sign out.
  - Single-use, 1-hour password reset links, with the same answer for unknown emails.
  - A 15-minute lockout after 5 wrong passwords. Rate limits on sign-up, sign-in, reset and resend.
- **Account area:**
  - Overview, orders (ready for Sprint 6), profile and password.
  - Address book with all 25 districts and town suggestions.
  - Privacy & data: consent per channel with a timestamp, JSON data download, and an account deletion request that can be cancelled (PDPA).
- **Wishlist sync:** merges into the account at sign-in and is available on every device. The review form is prefilled and linked for signed-in shoppers.
- **Branded emails** (confirm email, reset password, deletion request) sent over SMTP. Mailpit is added to docker-compose for local email (inbox at http://localhost:8026).
- **Audit log** (admins): role changes, new staff accounts, price/cost changes per SKU, deletions, review moderation, home page edits, CSV imports, deletion requests.
- **Role-relevant admin dashboard:** inventory, marketing and support each see their own KPIs, cards and quick actions.
- **Tests:** 16 RBAC integration checks and 5 account e2e tests with real emails (29 integration and 28 e2e tests in total).
### Changed
- **Access aligned with the RBAC matrix:**
  - Only store managers delete catalogue items.
  - Reviews are moderated by store manager, marketing and support, and deleted by store managers.
  - Customer records are scoped per role.
  - The Inventory screen is read-only for fulfilment and support and hidden for marketing.
- Existing staff accounts were marked as verified. Staff created by an admin are verified automatically.
- The header shows your initial when signed in.
### Fixed
- Rate limits no longer trust the client-controlled first `X-Forwarded-For` value.
- Granting Super Admin as an admin now fails with a clear message instead of "Roles is invalid".
- The confirmation toast no longer disappears when an action empties the current tab.

## [0.4.0] - 2026-11-15 · Sprint 2: Find it fast
### Added
- **Typo-tolerant search** (Postgres trigram + edit distance):
  - "cerave", "cera ve", "cerav" and misspellings like "sereum" all match.
  - Zero-result searches are corrected automatically ("Showing results for cerave").
  - The header dropdown now suggests products, brands and categories, with a result count.
- **Filters with counts on every listing:**
  - Category, department, brand, price, concern, recipient, occasion, shoe size, colour, scent family, dietary, rating, in stock, on sale.
  - Sticky sidebar on desktop; bottom sheet with live counts and "Show n results" on phones.
  - Kept in the URL, with removable chips and "Clear all".
- **Wishlist page** (`/wishlist`): works for guests, shareable link, "Save all to my wishlist".
- **Recently viewed** rail on product pages, the wishlist and empty search results.
- **Upsells:** "Upgrade your pick" rail on product pages. The bag suggests "Pairs well with" the item just added.
- **Reviews:**
  - Moderated reviews with photos, star histogram filter, sort, helpful votes, store replies and a write-a-review drawer.
  - Admin Reviews moderation queue, with a dashboard card and a sidebar badge.
  - Clearly-labelled sample reviews on demo products only.
- **Search insights** (`/admin/search-insights`): searches, unique terms, the found-nothing rate, top searches and zero-result searches.
- **CSV import/export** (`/admin/import-export`): export every SKU; import price and stock updates with a full preview and per-role permissions.
- New collections: `reviews`, `review-media`, `search-queries`.
- **Tests:** 6 integration tests and 5 e2e tests (13 integration and 23 e2e tests in total).
### Changed
- Ratings now come only from approved reviews. The placeholder ratings from the catalogue import were removed, and products without reviews show "Be the first to review".
- Rating structured data (AggregateRating, Review) is published only from genuine reviews.
- Listings are 3 columns beside the filter sidebar on desktop.
- The admin "Import / export" button is live, and "Stock movements" is shown as "Stock history".
### Fixed
- Recently viewed could lose the first product viewed.
- The size + colour filter matched sold-out combinations.
- A collapsed admin sidebar could reopen when its saved preference loaded late.

## [0.3.1] - 2026-11-15 · Admin polish (before Sprint 2)
### Changed
- **Admin sidebar layout:**
  - Spacing and alignment redone: one 12 px inset for the logo row, search, links and footer; even group spacing; links no longer wrap.
  - Payload's extra header-height padding removed.
  - "Occasions & recipients" split into two links.
- **Sidebar toggle:**
  - The collapse button now sits in the logo row. Payload's floating "<" toggle no longer covers the logo.
  - When collapsed, a centred menu button in the header reopens it.
  - The choice is remembered, and the sidebar stays open by default on 1025–1440 px laptops, where Payload used to close it.
  - On phones and tablets it slides over the page, and closes on an outside tap or Esc.
- **Sidebar search:** redesigned as a field with a search icon and separate ⌘ / K key caps.
- **Every remaining admin screen now uses the new design:**
  - Screens: Categories, Brands, Tags, Occasions, Recipients, Beauty concerns, Media, Users, Stock history, every edit screen (including the product editor), the Home page global and Account.
  - Shared look: section eyebrow, display title, subtitle, primary "+ Create New" pill, toolbar/table/pager card, white field cards, clean tabs and repeatable rows.
- "Stock movements" is renamed **Stock history** (as in the sidebar). Its manual "Create New" button is hidden, because stock is changed from Inventory.
### Fixed
- Select dropdowns (products toolbar) showed the browser's arrow squeezed against the pill edge. They now have an evenly spaced chevron and hover and focus states.
- Status pills ("Active" + "Price TBC") stack left-aligned.
- Inventory SKUs no longer break across lines.

## [0.3.0] - 2026-11-15 · Sprint 1.5: Lifestyle store & custom admin
### Added
- **Lifestyle catalogue:**
  - Product types (beauty, fragrance, footwear, gift, chocolate, accessory, home), with a type-specific **Details** tab: fragrance notes, footwear fit and material, gift contents, chocolate allergens and storage.
  - Two-option variants (e.g. Shoe size × Colour).
  - New option types: Weight and Style.
- **Gifting:**
  - `recipients` and `occasions` collections.
  - A `/gifts` shop across every department, with recipient and occasion filters on all listings.
  - "Perfect for" chips on product pages.
- **Shopping experience:**
  - Colour-swatch + size-grid variant picker on product pages and in quick add.
  - Department mega-menus.
  - New sub-categories for fragrances, footwear, gifts and chocolates.
  - Home: occasion chips, best-seller tabs by department, and lifestyle rails (gifts, fragrances, footwear, chocolates).
- **Demo products:** `pnpm seed:demo` adds 20 clearly-marked demo products with illustrated photos; `--remove` deletes them. They carry a "Sample" badge and are `noindex`.
- **Custom admin:**
  - Grouped, role-aware sidebar with live badges.
  - ⌘K command palette.
  - Dashboard with KPIs, attention list, activity, launch checklist and catalogue mix.
  - Shopify-style products list with tabs, search, type filter and bulk actions.
  - `/admin/inventory` bulk stock screen with reasons and notes.
  - Labelled variant rows and a branded login.
- `POST /api/products/adjust-stock` endpoint.
- **Tests:** e2e tests for the two-option picker, the gift shop and the custom admin (16 e2e tests in total).
### Changed
- The storefront copy, search placeholder and hero speak to the whole lifestyle range, not only beauty.
- Concerns only appear for beauty products.
- The bag shows both options on a line ("EU 40 / Black").
### Fixed
- Admin header actions overlapped the avatar on phones. They are now icon-only below 768 px.

## [0.2.1] - 2026-11-15
### Fixed
- WhatsApp button rendered as an oval on tablet and desktop: the hidden "Chat with us" label still reserved a gap. It is now a 56 px circle, and the label is a tooltip bubble that doesn't change its shape.

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
