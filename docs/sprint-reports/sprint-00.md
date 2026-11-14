# Sprint 0 Report: Foundation, Brand System & Storefront Shell

**Date:** 15 Nov 2026 · **Status:** ✅ Complete · **Points delivered:** 34 / 34

## Goal
Set up the project, create the brand and UX system, build an animated storefront shell that uses real catalogue products, and write all project documents.

## Delivered
| Story | What shipped |
|---|---|
| TOS-001 Project setup | Next.js 16.4 + Payload 3.93 + Postgres 16 (Docker, port 5434), TypeScript strict, ESLint flat config, Vitest, Playwright |
| TOS-002 Brand system | Colour scales (ink, sunset, rose), category mood tints, accessible "deep" gradient, Outfit + Plus Jakarta Sans + Fraunces, radius, shadows, motion tokens |
| TOS-003 Navigation | GSAP announcement marquee, sticky shrinking header, search autosuggest (combobox), Beauty and Brands mega-menus, mobile menu drawer, mobile bottom nav, WhatsApp button |
| TOS-004 Home page | 14 sections: GSAP hero with parallax, category tiles, USP strip, Deals with countdown, K-Beauty rail, Shop by concern, promo banners, Bestsellers with animated tabs, Derm spotlight, brand marquee, Gift Finder, Under Rs 2,999, New arrivals, Newsletter |
| TOS-005 Quick add & bag | Product card quick add, variant picker (bottom sheet / drawer), fly-to-bag animation, bag drawer with free-delivery progress, quantity stepper, cross-sell, toasts, screen-reader announcements |
| TOS-006 Catalogue | 4 PDFs → 88 products / 99 variants / 18 brands, with photos (`seed/catalogue/products.json`, `public/catalogue/`) |
| TOS-007 Admin | Branded login and navigation, orange admin accent, `users` with 8 roles + phone + marketing consent, RBAC helpers, `media` image sizes (WebP), `pnpm seed:admin` |
| TOS-008 Docs | Charter, SRS, backlog (12 epics, 94 stories), sprint plan, architecture, design system, RBAC matrix, working agreement, UX guidelines, catalogue |
| Extra | `/styleguide` living design system, branded 404, `pnpm check:contrast`, `scripts/screenshots.mjs` for visual QA |

## Verification
| Check | Result |
|---|---|
| `pnpm lint` | ✅ clean |
| `pnpm typecheck` | ✅ clean |
| `pnpm build` | ✅ success (home and styleguide pre-rendered as static pages) |
| `pnpm check:contrast` | ✅ 24 / 24 pairs pass WCAG 2.2 AA |
| Playwright `tests/e2e/frontend.e2e.spec.ts` | ✅ 2 / 2 pass (home renders; quick add → bag) |
| Visual QA (1440 px and 390 px) | ✅ Reviewed: home, mega-menu, search autosuggest, quick add, bag drawer, mobile menu, admin login, user form |
| Reduced motion | ✅ All hero and section content visible with `prefers-reduced-motion: reduce` |

## Demo checklist
1. `docker compose up -d && pnpm dev`, then open http://localhost:3000.
2. Watch the hero intro, then scroll: parallax, section reveals, and the smile underlines drawing in.
3. Hover **Beauty** for the mega-menu. Type "centella" in search.
4. Click **Choose options** on the SKIN1004 Madagascar ampoule → pick 100 ml → **Add to bag**. Watch it fly to the bag.
5. Open the bag: free-delivery progress, change quantity, add a cross-sell item.
6. Resize to a phone width: bottom nav, menu drawer, bottom-sheet picker.
7. Open http://localhost:3000/styleguide.
8. Open http://localhost:3000/admin and sign in with the `SEED_ADMIN_*` values in `.env`. See the roles on a user.

## Decisions and changes during the sprint
- **Mobile bottom nav** uses Home · Categories · Wishlist · **Bag** · Account rather than a Search tab, because search is permanently visible in the mobile header.
- **Product card images** sit on white (not category tints). The catalogue photos have white backgrounds, so white avoids visible rectangles. Tints are kept for category tiles and banners.
- **Gradient behind text** uses the new `bg-sunset-deep` because the bright brand gradient fails contrast.
- **Local Postgres runs on port 5434**, because port 5433 is already used by another local project.
- **ESLint** switched to Next 16 native flat configs (the template's `FlatCompat` dependency was missing).
- Catalogue photos are stored in `public/catalogue/` (not only `seed/`) so the storefront can show them before the Sprint 1 import.

## Post-review fix (v0.1.1)
| Issue (reported with screen recordings) | Root cause | Fix | Verified |
|---|---|---|---|
| Page jumped and jittered while scrolling; Quick add clicks sometimes did nothing | The sticky header changed its **layout height** on scroll (compact padding and logo, collapsing category row). Scroll anchoring then moved the page, which flipped the scroll direction and toggled the header back: a feedback loop. Clicks were lost because cards moved under the cursor between mouse-down and mouse-up. | Constant header height. The category row is out of flow and slides with `transform`, an in-flow spacer reserves its space, and direction changes need a 12 px threshold. | New Playwright test `Header scroll stability` passes at 1280 px and 390 px (0 px drift, 1 header height). It fails against the old header (9 px drift, 5 heights). Quick add verified straight after scrolling. |

**Lesson, added to the motion rules:** never animate or toggle the *layout* size of sticky or fixed UI in response to scroll. Use transforms, opacity or shadows.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| Some PDF photos are low-resolution (about 150 px) or contain third-party marks ("Amazon's Choice", carousel dots) | Client to supply high-res photos. Tracked in `09-product-catalogue.md`. |
| Prices, ratings and stock are placeholders | Owner confirms prices in Sprint 1 (`priceTBC` flag) |
| Navigation links (categories, brands, account, checkout) currently go to the branded 404 | Built in Sprints 1–6 per the roadmap |
| Bag and wishlist live in `localStorage` | Server-side carts in Sprint 4 |
| Contact phone, WhatsApp and social links are placeholders | Owner to provide them (`src/config/site.ts`) |
| No email adapter configured (Payload logs emails to the console) | Sprint 7 |

## Retro
- **Went well:** the PDF → structured catalogue extraction (matching photos to names by page position) gave the design real content from day one.
- **To improve:** confirm brand content (prices, contacts, photos) early in Sprint 1 so placeholder data doesn't leak into later sprints.

## Next sprint (Sprint 1, 16–27 Nov 2026)
**Goal:** Catalogue live. Payload collections for products, variants, categories, brands and inventory; seed import; listing and product pages. See `03-sprint-plan.md`.
