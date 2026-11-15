# 03 · Sprint Plan & Release Roadmap

- **Cadence:** 2-week sprints (Mon → Fri of the following week).
- **Ceremonies:** planning (Mon), async daily notes, review and demo (last Fri), retro (last Fri).
- **Velocity assumption:** about 45–55 points per sprint, recalibrated after Sprints 1–2.
- **Release target:** **Fri 9 Apr 2027**, launching ahead of Sinhala & Tamil New Year (13–14 Apr), the biggest gifting season of the year.

## Roadmap
| Sprint | Dates | Goal | Key stories | Demo at review |
|---|---|---|---|---|
| **0** ✅ | 15 Nov 2026 | Foundation, brand and UX system, storefront shell, catalogue extraction, docs | TOS-001 → 008 | Home page, styleguide, branded admin |
| **1** ✅ | 15 Nov 2026 (started early) | **Catalogue live**: products, variants, categories, brands, inventory; listing and product pages | TOS-101 → 110 | Staff add a product; shoppers browse real listing and product pages |
| **1.5** ✅ | 15 Nov 2026 (inserted) | **Lifestyle store & custom admin**: product types, two-option variants, gift shop, demo products; custom dashboard, products list, inventory, ⌘K | TOS-131 → 142 | Footwear size × colour picker; gift shop; admin dashboard and bulk stock update |
| **2** ✅ | 15 Nov 2026 (started early) | **Find it fast**: search, filters, wishlist, cross-sell and upsell, reviews, CSV import/export | TOS-201 → 208, TOS-109 | Search "centella", filter by concern, save to wishlist |
| **3** ✅ | 15 Nov 2026 (started early) | **Accounts & security**: register, login, reset, addresses, order history shell; RBAC enforced; audit log | TOS-301 → 307, 401 → 404 | A customer signs up; each staff role sees the right admin |
| — | 25 Dec – 1 Jan | Holiday buffer (bug fixes, content entry) | | |
| **4** | 4 – 15 Jan 2027 | **Checkout**: server bag, coupons, discount engine, delivery fees, notes, T&C, gift options, confirmation | TOS-501 → 509 | Full COD order with a coupon and district delivery fee |
| **5** | 18 – 29 Jan | **Payments**: payment settings; PayHere, Koko and Mintpay (sandbox); bank slip; COD rules; transactions | TOS-601 → 607 | Pay with PayHere sandbox; verify a bank slip |
| **6** | 1 – 12 Feb | **Orders & delivery**: lifecycle, fulfilment, invoices, courier tracking, returns and refunds | TOS-701 → 708 | Order goes Processing → Shipped → Delivered; customer tracks it |
| **7** | 15 – 26 Feb | **Notifications**: email, SMS and WhatsApp templates and triggers; staff alerts; back-in-stock | TOS-801 → 806 | Placing an order triggers email + SMS + WhatsApp |
| **8** | 1 – 12 Mar | **Insights**: dashboard, reports, CSV export, GA4 and Pixel | TOS-901 → 905 | Owner dashboard with real test data |
| **9** | 15 – 26 Mar | **Be found**: SEO fields, JSON-LD, sitemaps, `llms.txt`, FAQ/AEO, blog, legal pages | TOS-1001 → 1007 | Rich Results Test passes; journal post live |
| **10** | 29 Mar – 9 Apr | **Launch**: performance, accessibility audit, security review, E2E tests, hosting, UAT, go-live | TOS-1101 → 1106 | Production launch 🚀 |
| Post-MVP | from Apr 2027 | Growth: gift-box builder, COD OTP, abandoned cart, quiz, loyalty, PWA, i18n | TOS-1201 → 1209 | |

## Sprint 0 (complete): foundation
**Goal:** a running project with the brand and design system, a storefront shell that sells real catalogue products (client-side), and full project documentation.

| Story | Result |
|---|---|
| TOS-001 Project setup | Next.js 16.4 + Payload 3.93 + Postgres 16 (Docker, port 5434), TypeScript strict, ESLint flat config, Vitest, Playwright |
| TOS-002 Brand system | Tokens in `globals.css`, three fonts, motion system, 24 contrast pairs pass AA |
| TOS-003 Navigation | Announcement marquee, sticky header with search autosuggest, mega-menus, mobile drawer and bottom nav |
| TOS-004 Home page | 14 sections (hero, categories, USPs, deals, K-beauty, concerns, promos, bestsellers, derm, brands, gifts, under Rs 2,999, new arrivals, newsletter) |
| TOS-005 Quick add | Variant picker sheet, fly-to-bag, bag drawer with free-delivery progress and cross-sell |
| TOS-006 Catalogue | 88 products, 99 variants, 18 brands extracted from 4 PDFs, with photos |
| TOS-007 Admin | Branded Payload admin, 8 roles, access helpers, dev admin seed |
| TOS-008 Docs | This folder |

## Sprint 1 (complete): catalogue live
All Must stories done (52 of 55 points). TOS-109 (CSV import/export) moved to Sprint 2. See `sprint-reports/sprint-01.md`.

## Sprint 1.5 (complete): lifestyle store & custom admin
Inserted at the owner's request after Sprint 1 (47 points, all done). The store now models every department, not only beauty, and staff work in a purpose-built admin. Sprint 2 dates are unchanged. See `sprint-reports/sprint-01-5.md`.

## Sprint 2 (complete): find it fast
All 8 stories done (45 points), plus TOS-109 (CSV import/export) carried over from Sprint 1. See `sprint-reports/sprint-02.md`.

## Sprint 3 (complete): accounts & security
Delivered TOS-301 → 304, 306, 401, 402 and 404, plus wishlist sync and account-linked reviews. Re-planned: TOS-305 history/reorder → Sprint 6, TOS-307 → Sprint 4, TOS-403 2FA → Sprint 10, SMS OTP → Sprint 7. See `sprint-reports/sprint-03.md`.

## Sprint 4 plan (next, 4 – 15 Jan 2027)
**Goal:** checkout. A shopper can place a cash-on-delivery order with a coupon and the right delivery fee for their district.

| # | Task | Story |
|---|---|---|
| 1 | Server-side bag synced across devices (re-priced lines, stock checks) and the `orders` collection | TOS-501 |
| 2 | One-page checkout (guest or signed in), address auto-filled from the account, city list by district | TOS-502, 509 |
| 3 | Coupons and the discount engine | TOS-503, 504 |
| 4 | Delivery fees by district, weight and order value; free-delivery threshold | TOS-505 |
| 5 | Order notes, gift options, recorded T&C acceptance | TOS-506, 507 |
| 6 | Order confirmation page and email | TOS-508 |
| 7 | Create an account after a guest order | TOS-307 |

## Sprint 3 plan (as planned)
**Goal:** accounts and security. Customers can register, sign in, reset a password, keep addresses and see orders. Staff roles are enforced and tested.

| # | Task | Story |
|---|---|---|
| 1 | Customer registration, login/logout, password reset, email verification (Payload auth) | TOS-301 → 303 |
| 2 | Account area: profile, address book (district/city pickers), order history shell | TOS-304 → 306 |
| 3 | Wishlist sync: the device wishlist merges into the account at sign-in; reviews linked to the signed-in customer | TOS-307 (from TOS-203/206) |
| 4 | RBAC enforced on every collection and endpoint, with an automated test per role | TOS-401 → 403 |
| 5 | Audit log for staff actions | TOS-404 |

## Sprint 2 plan (as planned)
**Goal:** find it fast. Shoppers can find any product by name, brand or concern, even with typos, narrow results with filters, and save favourites.

| # | Task | Story |
|---|---|---|
| 1 | Postgres full-text search with trigram typo tolerance, behind `/api/products/suggest` and `/search` | TOS-201, 207 |
| 2 | Faceted filters with counts (category, brand, price, concern, recipient, occasion, size, colour, scent family, dietary, rating, in stock, on sale), sticky sidebar on desktop, bottom sheet on mobile, kept in the URL | TOS-202 |
| 3 | Wishlist page, plus a server-side wishlist that merges at sign-in (account sign-in itself lands in Sprint 3; the guest wishlist ships now) | TOS-203 |
| 4 | Upsells on the product page (cross-sells shipped in Sprint 1) | TOS-204 |
| 5 | Recently viewed products | TOS-205 |
| 6 | Reviews: collection, moderation, verified buyer, photos; replace placeholder ratings | TOS-206 |
| 7 | Search analytics, including zero-result searches | TOS-208 |
| 8 | CSV import and export for products and stock (carried over) | TOS-109 |

## Sprint 1 plan (as planned)
**Goal:** staff can manage the real catalogue in the admin, and shoppers can browse real category and product pages.

| # | Task | Story |
|---|---|---|
| 1 | Collections: `products` (with variants array), `categories` (nested), `brands`, `tags`, `concerns` | TOS-101/102/103 |
| 2 | Inventory: variant stock, `stock-movements` collection, low-stock hook | TOS-104 |
| 3 | Seed script: import `seed/catalogue/products.json` and its images into Payload media | TOS-107 |
| 4 | Swap `src/lib/catalog.ts` to the Payload Local API, keeping the same return types | TOS-105 |
| 5 | Listing pages `/c/[...slug]` and `/brands/[slug]`: grid, sort, pagination, breadcrumbs | TOS-105 |
| 6 | Product page `/p/[slug]`: gallery, variants, sticky add-to-bag bar, accordions, JSON-LD | TOS-106 |
| 7 | Home page CMS global with blocks (hero, rails, banners) | TOS-108 |
| 8 | CSV import/export (if capacity allows) | TOS-109 |
| 9 | Docs: update backlog statuses, architecture (data model), sprint report 01 | — |

**Risks:** final product photos and prices aren't confirmed yet. Mitigation: the `priceTBC` flag shows an admin warning until a price is confirmed.

## Documentation cadence
At the end of **every sprint**:
1. Update `02-product-backlog.md` statuses.
2. Add `sprint-reports/sprint-NN.md` (delivered, demo checklist, metrics, retro, next goal).
3. Update `CHANGELOG.md` and any affected design or architecture docs.
4. Re-publish the Claude Docs copy ("The Online Store: Project Docs").
5. Commit with the message `Sprint NN: <goal>`.
