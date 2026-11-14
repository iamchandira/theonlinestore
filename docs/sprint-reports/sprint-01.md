# Sprint 1 Report: Catalogue Live

**Date:** 15 Nov 2026 (started early, planned 16–27 Nov) · **Status:** ✅ Complete · **Points delivered:** 52 / 55 (TOS-109 moved to Sprint 2)

## Goal
Staff manage the real catalogue in the admin, and shoppers browse real category, brand and product pages.

## Delivered
| Story | What shipped |
|---|---|
| TOS-101 Products | `products` collection in Payload: name, brand, categories, short and rich description, benefits, how to use, ingredients, gallery, badge, tags, concerns, SEO fields, "price to be confirmed" flag. Drafts and version history. Store-page preview link from the admin. |
| TOS-102 Variants | Up to one option type per product (Size, Shade, Scent, Flavour, Pack, Set, Colour, Shoe size). Each variant has its own SKU (unique across the store), barcode, price, "was" price, staff-only cost, weight, stock, low-stock threshold and photo. |
| TOS-103 Taxonomy | Nested `categories` (breadcrumbs like `/skincare/serums`, mood tint, order), `brands` (grouped K-Beauty / Derm / Everyday), `tags`, `concerns`. |
| TOS-104 Inventory | Every stock change is written to `stock-movements` with who, when, how much and why, and history can't be edited. Low stock is flagged on the product and logged. Inventory managers can change stock but not prices. |
| TOS-105 Listing pages | `/c/…` (including the virtual Beauty department), `/brands/…`, `/brands`, `/categories`, `/offers`, `/search`. Sort (recommended, bestsellers, newest, price, rating), numbered pagination, sub-category chips, removable filter chips (`?concern=`, `?tag=`, `?max=`), friendly empty states. |
| TOS-106 Product page | See "Product page features" below. |
| TOS-107 Import | `pnpm seed:catalog`: 88 products, 99 SKUs, 18 brands, 28 categories, 27 concerns, 9 tags, 99 photos. Safe to re-run (verified: 0 new records on a re-run). |
| TOS-108 Home page CMS | `Home page` global: hero products (up to 4) and product rails (hand-picked, on sale, bestsellers, newest, by tag, by category, under a price), each with placement, style and countdown. Falls back automatically when empty. |
| TOS-110 Scheduling | Drafts with scheduled publish and unpublish (Payload jobs). |

**Product page features (TOS-106):**
- **Gallery:** swipe with dots on phones; thumbnails and hover zoom on desktop.
- **Variants:** pills with thumbnails for shades and scents, synced to `?variant=`.
- **Buying:** live stock status, quantity, add to bag, wishlist, and reassurance details.
- **Information:** accordions, with empty ones hidden.
- **Sticky add-to-bag bar on phones.**
- **Related products:** "Pairs well with" and "You may also like".
- **SEO:** BreadcrumbList and Product JSON-LD.

**Technical changes behind the scenes:**
- **Server-only catalogue layer** (`src/lib/catalog/server.ts`): the storefront reads Payload through its Local API, and the browser never downloads the catalogue.
- **Bag snapshots:** each bag line stores what the shopper saw (name, photo, price). Prices are re-checked at checkout in Sprint 4.
- **Search suggestions** come from a public endpoint, `GET /api/products/suggest`.
- **Instant updates:** admin edits refresh cached pages immediately.

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean. 88 product pages pre-rendered. |
| Integration tests (Vitest) | ✅ 6 of 6. Covers computed fields, stock log with user, inventory manager can't change prices, drafts hidden from the public, duplicate SKU rejected. |
| End-to-end tests (Playwright) | ✅ 11 of 11. Covers category sort order, variant from URL then change then add to bag, search, empty category, admin, plus the Sprint 0 regressions (scroll stability, smooth scroll, quick add). |
| Speed (production build) | Home 4 ms · product page 2 ms · filtered listings about 20 ms (server response time) |
| Instant revalidation | ✅ On the production build, an admin edit of a description showed on the pre-rendered product page straight away, then was reverted. |
| Visual QA | Home, category, product page (desktop, phone, sticky bar), admin products list and variant editor reviewed. |

## Bugs found and fixed during the sprint
| Bug | Cause | Fix |
|---|---|---|
| Sticky add-to-bag bar didn't appear after a fast scroll | IntersectionObserver only fires on crossings, so a jump past the button never "intersects" | Frame-throttled scroll check of the button position |
| Re-running the seed duplicated all 99 photos | Payload stores uploads as WebP, so `foo.png` never matched `foo.webp` | Match either name. Added `pnpm prune:media`, then cleaned the local data. |
| Pages crashed on product photos | Payload returns absolute media URLs, which `next/image` rejects as an unknown host | Same-site media URLs are made relative (works on every environment) |
| Template admin e2e test failed | Its user was created without an acting admin, so the RBAC hook (correctly) made it a customer | The test helper creates the user as the seeded super-admin |

## Demo checklist
1. Run `pnpm seed:admin && pnpm seed:catalog`, then `pnpm dev`.
2. Admin → **Catalogue › Products**: open Madagascar Centella Ampoule, then the **Variants & stock** tab. Change a stock number and save.
3. Open **Catalogue › Stock movements** to see the change with your name and the reason "Manual adjustment".
4. Admin → **Content › Home page**: reorder a rail or swap a hero product, save, and refresh the home page.
5. Storefront:
   - `/c/beauty`, then the **Skincare** chip, **Serums**, and sort by **Price: low to high**.
   - Search "centella", then open a product and pick a size. The URL updates.
   - **Add to bag.** On a phone, scroll down and use the sticky bar.
   - Open `/c/fragrances` to see the "coming soon" state with a WhatsApp request.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| Ratings and review counts are placeholders | Real reviews in Sprint 2 (TOS-206). They're excluded from structured data until then. |
| Product descriptions are short templated lines; benefits, how to use and ingredients are empty | Content entry by the store team (the admin is ready). Empty sections are hidden on the page. |
| Photos: low-resolution, and some are screenshots of other listings | Client to supply high-resolution photos |
| Prices are still placeholders (`priceTBC`) | Owner confirms them, then unticks "Price to be confirmed" |
| Dev server: first page compile can take 60–110 s and warm pages 2–4 s | Dev mode only. Production responses are 2–25 ms. |
| Low-stock alerts are logged but not sent | Email and SMS delivery in Sprint 7 |
| CSV import and export (TOS-109) | Moved to Sprint 2 |

## Retro
- **Went well:** keeping the storefront types stable (`Product`) made the switch from JSON to Payload a data-layer change rather than a UI rewrite. Testing business rules at the Payload level caught real issues (RBAC on the template test user).
- **To improve:** test fast-scroll behaviour for any scroll-triggered UI from the start (this is the second scroll-related fix). Added to the working agreement.

## Next sprint (Sprint 2, 16–27 Nov 2026)
**Goal:** find it fast. Covers:
- Typo-tolerant search.
- Filters with counts (sidebar on desktop, bottom sheet on mobile).
- The wishlist page.
- Upsells.
- Recently viewed products.
- Real reviews.
- CSV import and export.
