# 02 · Product Backlog

Version 1.4 · 15 Nov 2026 (after Sprint 3) · Owner: Product Owner. Ordered by priority within each epic.

**Priority (MoSCoW):** M = Must, S = Should, C = Could, Sug = Suggested (an idea from the delivery team, needs PO approval).
**Points:** Fibonacci (1, 2, 3, 5, 8, 13). **Status:** ✅ Done · 🔄 In progress · ⬜ To do.
Each story uses the format: *As a [role], I want [goal] so that [benefit].* Acceptance criteria (AC) are written so they can be tested.

## Summary by epic
| Epic | Name | Stories | Points | Sprint(s) |
|---|---|---|---|---|
| E00 | Foundation & design system | 8 | 34 | 0 ✅ |
| E01 | Catalogue, variants & inventory | 10 | 55 | 1 ✅ (TOS-109 done in Sprint 2) |
| E13 | Lifestyle catalogue & custom admin | 12 | 47 | 1.5 ✅ |
| E02 | Discovery: search, filters, wishlist, recommendations | 8 | 42 | 2 ✅ (+TOS-109 carried over, done) |
| E03 | Customer accounts | 7 | 29 | 3 ✅ (TOS-305 history → Sprint 6, TOS-307 done in Sprint 4) |
| E04 | RBAC & admin security | 4 | 18 | 3 ✅ (TOS-403 2FA → Sprint 10) |
| E05 | Bag & checkout | 9 | 52 | 4 ✅ |
| E06 | Payments | 7 | 47 | 5 ✅ (Koko/Mintpay live adapters wait for merchant guides; gateway refunds → Sprint 6) |
| E07 | Orders & delivery | 8 | 44 | 6 |
| E08 | Notifications | 6 | 34 | 7 |
| E09 | Analytics & reporting | 5 | 29 | 8 |
| E10 | SEO, GEO & AEO + content | 7 | 34 | 9 |
| E11 | Quality, performance & launch | 6 | 34 | 10 |
| E12 | Suggested growth features | 9 | 63 | Post-MVP / when capacity allows |

---

## E00 · Foundation & design system (Sprint 0) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-001 | As a developer, I want a Next.js + Payload + Postgres project with linting, types and tests so that we build on a solid base. | M | 5 | ✅ |
| TOS-002 | As the owner, I want a brand system (colours, type, shape, motion) inspired by the logo so that the site feels distinctive and trustworthy. | M | 5 | ✅ |
| TOS-003 | As a shopper, I want an always-visible search, clear category navigation and a bag I can reach in one tap on any device. | M | 5 | ✅ |
| TOS-004 | As a shopper, I want an inviting home page that shows categories, deals, bestsellers and gifts so that I can find something quickly. | M | 8 | ✅ |
| TOS-005 | As a shopper, I want to add to my bag without leaving the page (quick add, variant picker, bag drawer). | M | 5 | ✅ |
| TOS-006 | As the owner, I want the client catalogues turned into structured seed data (brands, variants, images) so that real products appear from day one. | M | 3 | ✅ |
| TOS-007 | As staff, I want a branded admin with user roles defined. | M | 2 | ✅ |
| TOS-008 | As the team, I want a charter, SRS, backlog, sprint plan, architecture, design system, RBAC matrix and UX guidelines. | M | 1 | ✅ |

## E01 · Catalogue, variants & inventory (Sprint 1) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-101 | As a store manager, I want to create and publish products with rich content and images so that customers see complete information. | M | 8 | ✅ |
| TOS-102 | As a store manager, I want variants (size, shade, scent, pack) with their own SKU, price, compare-at price, image and stock. | M | 8 | ✅ |
| TOS-103 | As a store manager, I want hierarchical categories, brands, tags and concerns so that products are organised and filterable. | M | 5 | ✅ |
| TOS-104 | As an inventory manager, I want stock tracked per variant with low-stock thresholds and a movement log. | M | 8 | ✅ (alerts are logged now; email/SMS delivery in Sprint 7) |
| TOS-105 | As a shopper, I want category and brand listing pages (PLP) with sort and pagination. | M | 5 | ✅ |
| TOS-106 | As a shopper, I want a product page (PDP) with a gallery and zoom, variant selector, stock status, delivery estimate, BNPL line, accordions and a sticky add-to-bag bar on mobile. | M | 8 | ✅ (district-specific delivery estimate comes with shipping zones in Sprint 4) |
| TOS-107 | As the owner, I want the 88 catalogue products imported automatically from `seed/catalogue/products.json`. | M | 3 | ✅ |
| TOS-108 | As marketing, I want the home page sections (hero, banners, product rails) managed from the CMS. | S | 5 | ✅ (hero products and product rails; banner copy stays in code until Sprint 9 CMS blocks) |
| TOS-109 | As a store manager, I want CSV import and export for products and stock. | S | 3 | ✅ Sprint 2 (updates existing SKUs; new products are created in the admin) |
| TOS-110 | As a store manager, I want to schedule product publishing and sale prices. | C | 2 | ✅ (drafts + scheduled publish) |

**AC (TOS-102):**
- The admin can add up to 3 option types.
- Each variant combination has a unique SKU.
- The storefront shows "From Rs X" when variant prices differ.
- Selecting a variant updates the price, image and stock.
- Out-of-stock variants are shown but disabled.

**AC (TOS-104):**
- Stock decreases when an order is paid (or when a COD order is confirmed).
- Stock is restored when an order is cancelled or refunded.
- Every change records who, when, how much and why.
- A low-stock alert is created when stock ≤ threshold.

**AC (TOS-106):**
- LCP image is prioritised.
- JSON-LD Product/Offer is valid.
- The add-to-bag bar stays fixed on mobile once the main button scrolls out of view.
- The variant is reflected in the URL (`?variant=sku`).

## E13 · Lifestyle catalogue & custom admin (Sprint 1.5) ✅
Added after Sprint 1 at the owner's request: the store is a lifestyle store, not only cosmetics, and the admin should feel custom-built (Shopify/WooCommerce level).

| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-131 | As a store manager, I want to set a product type (beauty, fragrance, footwear, gift, chocolate, accessory, home) and fill only the details that type needs. | M | 5 | ✅ |
| TOS-132 | As a store manager, I want two-option variants (e.g. Shoe size × Colour), each combination with its own SKU, price, stock and photo. | M | 5 | ✅ |
| TOS-133 | As a shopper, I want to pick a colour and then a size, with unavailable sizes clearly disabled. | M | 3 | ✅ |
| TOS-134 | As marketing, I want recipients and occasions so that products can be merchandised as gifts. | M | 3 | ✅ |
| TOS-135 | As a gift buyer, I want a gift shop across all departments, filterable by who it's for and the occasion. | M | 5 | ✅ |
| TOS-136 | As a shopper, I want navigation, home page and product pages that fit every department, not only beauty. | M | 5 | ✅ |
| TOS-137 | As the owner, I want clearly-marked demo products for the empty departments that can be removed with one command. | S | 2 | ✅ |
| TOS-138 | As staff, I want a custom admin sidebar, header and ⌘K command palette grouped like a commerce admin and aware of my role. | M | 5 | ✅ |
| TOS-139 | As the owner, I want an admin dashboard with KPIs, items needing attention, recent activity and a launch checklist. | M | 5 | ✅ |
| TOS-140 | As a store manager, I want a products list with status tabs, search, type filter and bulk actions. | M | 5 | ✅ |
| TOS-141 | As an inventory manager, I want one screen to adjust stock for many SKUs with a reason and note. | M | 3 | ✅ |
| TOS-142 | As a shopper, I want the WhatsApp button to look right on every screen. | M | 1 | ✅ |

**AC (TOS-132/133):**
- Sizes that don't exist in the chosen colour, or are sold out, are disabled and announced as such.
- Changing colour keeps the size if it is available.
- The bag line shows both options ("EU 40 / Black").

**AC (TOS-141):**
- Only admin, store-manager and inventory-manager can adjust stock.
- Every change is logged with the user, reason and note.
- Changes are saved per product in one request.

## E02 · Discovery (Sprint 2) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-201 | As a shopper, I want typo-tolerant search with autosuggest (products, brands, categories) so that I find things even if I misspell them. | M | 8 | ✅ |
| TOS-202 | As a shopper, I want filters (category, brand, price, concern, rating, in stock, on sale) with result counts, saved in the URL. | M | 8 | ✅ (plus type-specific: size, colour, scent, dietary, recipient, occasion) |
| TOS-203 | As a shopper, I want a wishlist that works without an account and syncs when I sign in. | M | 5 | ✅ guest + share link; merge at sign-in with Sprint 3 accounts |
| TOS-204 | As a shopper, I want "pairs well with" (cross-sell) and "upgrade to" (upsell) suggestions on the product page and in the bag. | M | 5 | ✅ |
| TOS-205 | As a shopper, I want to see recently viewed products. | S | 3 | ✅ |
| TOS-206 | As a shopper, I want to read and write reviews with photos, and to see a verified-buyer badge. | S | 8 | ✅ (verified badge set by staff until orders exist, Sprint 6) |
| TOS-207 | As a shopper, I want a useful "no results" page with suggestions. | M | 2 | ✅ |
| TOS-208 | As marketing, I want to see what people search for, including searches with zero results. | C | 3 | ✅ |

**AC (TOS-201):**
- "cerave", "cera ve" and "cerav" all find CeraVe.
- Suggestions appear within 150 ms of typing stopping.
- Full keyboard navigation (combobox pattern).

**AC (TOS-202):**
- On mobile, filters open in a bottom sheet with an "Apply (n results)" button.
- On desktop, filters sit in a sticky sidebar.
- Clear-all is available.
- Back/forward restores the filters.

## E03 · Customer accounts (Sprint 3) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-301 | As a shopper, I want to register with my email or mobile and verify it. | M | 5 | ✅ email + optional mobile; mobile-only sign-up with SMS OTP → Sprint 7 |
| TOS-302 | As a customer, I want to log in and out securely, with a "remember me" option. | M | 3 | ✅ |
| TOS-303 | As a customer, I want to reset my password by email (and by SMS OTP). | M | 5 | ✅ email; SMS OTP → Sprint 7 |
| TOS-304 | As a customer, I want an address book with districts and cities. | M | 3 | ✅ |
| TOS-305 | As a customer, I want to see my order history and reorder in one tap. | M | 5 | 🔄 page ready; history + reorder → Sprint 6 (needs orders) |
| TOS-306 | As a customer, I want to manage my marketing consent and request account deletion (PDPA). | M | 3 | ✅ (+ download my data) |
| TOS-307 | As a guest, I want to create an account after checkout using my order details. | S | 5 | ✅ Sprint 4 (password on the confirmation page; the order links at first sign-in) |

**AC (TOS-303):**
- The reset link expires after 1 hour and can be used once.
- The response never reveals whether an email exists.
- Requests are rate-limited (5 per hour per IP).

## E04 · RBAC & admin security (Sprint 3) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-401 | As the owner, I want staff roles enforced on every collection and field according to the RBAC matrix. | M | 8 | ✅ 16 automated checks |
| TOS-402 | As a super admin, I want an audit log of sensitive actions. | M | 5 | ✅ |
| TOS-403 | As a super admin, I want optional two-factor authentication for staff. | S | 3 | ➡️ Sprint 10 (custom admin sign-in) |
| TOS-404 | As the owner, I want the admin dashboard to show only what's relevant to each role. | S | 2 | ✅ |

**AC (TOS-401):**
- Automated tests prove that each role can and cannot perform the actions listed in `06-rbac-matrix.md`.
- Customers get a 403 on /admin.

## E05 · Bag & checkout (Sprint 4) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-501 | As a shopper, I want my bag saved on the server and synced across devices once I sign in. | M | 5 | ✅ merges at sign-in, re-priced from the server |
| TOS-502 | As a shopper, I want a one-page checkout (contact → address → delivery → payment → review) that works as a guest. | M | 13 | ✅ |
| TOS-503 | As marketing, I want coupons (%, fixed, free delivery, BOGO) with limits and validity windows. | M | 8 | ✅ |
| TOS-504 | As the business, I want a discount engine that applies promotions and coupons in a defined order and shows each discount line. | M | 8 | ✅ 27 pricing scenarios tested |
| TOS-505 | As the business, I want delivery fees by district, weight and order value, with a free-delivery threshold. | M | 5 | ✅ zones in Checkout settings; same-day for Colombo |
| TOS-506 | As a shopper, I want to add order notes and gift options (wrap, message, hide prices). | M | 3 | ✅ |
| TOS-507 | As the business, I want customers to accept the T&C before ordering, with the acceptance recorded. | M | 2 | ✅ time and terms version stored on the order |
| TOS-508 | As a shopper, I want an order confirmation page and email. | M | 5 | ✅ |
| TOS-509 | As a shopper, I want my address auto-filled from my account and the city list filtered by district. | S | 3 | ✅ |

**AC (TOS-504):**
- All totals are calculated on the server. The client never sets prices.
- Rounding happens to the rupee per line.
- Unit tests cover at least 20 pricing scenarios.

**AC (TOS-502):**
- Inline validation.
- Sri Lankan phone format check.
- No surprise fees: the delivery fee is visible before payment.
- Works without JavaScript errors on Android Chrome and iOS Safari.

## E06 · Payments (Sprint 5) ✅
| ID | Story | P | Pts | Status |
|---|---|---|---|---|
| TOS-601 | As an admin, I want to enable, disable, order and configure each payment method (with sandbox and live credentials). | M | 8 | ✅ Settings › Payments: on/off, order, limits, Test/Live; credentials Super Admin only, env vars override |
| TOS-602 | As a shopper, I want to pay by card or wallet via PayHere. | M | 8 | ✅ PayHere checkout form + signed notify; tested with the published formulas and the test gateway (sandbox account needed for a live sandbox run) |
| TOS-603 | As a shopper, I want to pay in 3 instalments with Koko. | M | 8 | 🔄 full flow on the test gateway; live adapter waits for Koko's merchant guide |
| TOS-604 | As a shopper, I want to pay in 3 instalments with Mintpay. | M | 8 | 🔄 full flow on the test gateway; live adapter waits for Mintpay's merchant guide |
| TOS-605 | As a shopper, I want to pay by bank transfer and upload my slip, and staff want to verify it. | M | 5 | ✅ slip upload on the order page; Verify / Reject in the order's Payment panel; emails |
| TOS-606 | As a shopper, I want Cash on Delivery, with eligibility rules (maximum order value, excluded districts). | M | 5 | ✅ max order, fee, excluded districts |
| TOS-607 | As finance, I want every payment attempt and callback stored and reconcilable. | M | 5 | ✅ Transactions log: every attempt, callback (signature result), slip decision and cash collection |

**AC (TOS-602):**
- The notify callback is verified with an MD5 signature using the merchant secret.
- Callbacks are idempotent.
- Order status updates only after a verified callback.
- Refunds can be issued from the admin. *(Moved to Sprint 6 with returns, TOS-706: needs PayHere's refund API.)*

## E07 · Orders & delivery (Sprint 6)
| ID | Story | P | Pts | Notes |
|---|---|---|---|---|
| TOS-701 | As fulfilment staff, I want an order list with filters, search and bulk status changes. | M | 8 | (list, status tabs and search shipped early in Sprint 4; bulk changes to come) |
| TOS-702 | As the business, I want a defined order status lifecycle with timestamps and history. | M | 5 |
| TOS-703 | As fulfilment staff, I want to print packing slips and invoices (PDF). | M | 5 |
| TOS-704 | As fulfilment staff, I want to assign a courier and tracking number. | M | 5 |
| TOS-705 | As a shopper, I want to track my order (signed in, or as a guest with order number + phone). | M | 5 |
| TOS-706 | As support, I want to process returns and refunds with stock restocked automatically. | M | 8 |
| TOS-707 | As finance, I want a COD reconciliation per courier. | S | 5 | ("Cash collected" per order shipped in Sprint 5; per-courier report to come) |
| TOS-708 | As fulfilment staff, I want courier API integration (Koombiyo, Domex) to create shipments. | C | 3 |

## E08 · Notifications (Sprint 7)
| ID | Story | P | Pts |
|---|---|---|---|
| TOS-801 | As a shopper, I want an order confirmation email with a summary and next steps. | M | 5 |
| TOS-802 | As a shopper, I want SMS updates when my order is confirmed, shipped and out for delivery. | M | 8 |
| TOS-803 | As a shopper, I want WhatsApp updates (using approved templates). | M | 8 |
| TOS-804 | As an admin, I want to edit templates and switch each trigger and channel on or off. | M | 5 |
| TOS-805 | As staff, I want alerts for new orders, slips uploaded and low stock. | M | 3 |
| TOS-806 | As a shopper, I want back-in-stock alerts. | S | 5 |

## E09 · Analytics & reporting (Sprint 8)
| ID | Story | P | Pts |
|---|---|---|---|
| TOS-901 | As the owner, I want a dashboard showing revenue, orders, AOV, conversion and top products for any date range. | M | 8 |
| TOS-902 | As the owner, I want sales reports by day, product, category, brand, district and payment method, with CSV export. | M | 8 |
| TOS-903 | As an inventory manager, I want inventory valuation and low-stock reports. | M | 5 |
| TOS-904 | As marketing, I want coupon performance and customer cohort reports. | S | 5 |
| TOS-905 | As marketing, I want GA4 and Meta Pixel ecommerce events, loaded only after consent. | M | 3 |

## E10 · SEO, GEO & AEO + content (Sprint 9)
| ID | Story | P | Pts |
|---|---|---|---|
| TOS-1001 | As marketing, I want SEO fields (title, description, OG image, canonical, noindex) on every product, category, brand and page. | M | 5 |
| TOS-1002 | As the business, I want valid JSON-LD (Organization, WebSite, Breadcrumb, Product, Offer, AggregateRating, FAQ, Article). | M | 5 |
| TOS-1003 | As the business, I want XML sitemaps, `robots.txt` and a redirect manager. | M | 3 |
| TOS-1004 | As the business, I want `llms.txt` and AI-friendly product facts (GEO) so that assistants can cite us. | M | 3 |
| TOS-1005 | As marketing, I want FAQ and "quick answer" blocks on products and categories (AEO). | M | 5 |
| TOS-1006 | As marketing, I want a Beauty Journal (blog) and CMS pages built from blocks. | M | 8 |
| TOS-1007 | As the business, I want legal pages (Terms, Privacy, Returns, Delivery) editable in the CMS. | M | 5 |

## E11 · Quality, performance & launch (Sprint 10)
| ID | Story | P | Pts |
|---|---|---|---|
| TOS-1101 | As a shopper, I want fast pages (Core Web Vitals pass on mobile). | M | 5 |
| TOS-1102 | As a shopper using assistive technology, I want every flow to meet WCAG 2.2 AA (audit and fixes). | M | 8 |
| TOS-1103 | As the owner, I want a security review (OWASP, payment flows, rate limits, headers). | M | 5 |
| TOS-1104 | As the team, I want Playwright end-to-end tests for browse → bag → checkout → pay → track. | M | 8 |
| TOS-1105 | As the owner, I want production hosting, backups, monitoring and a deployment pipeline. | M | 5 |
| TOS-1106 | As the owner, I want UAT sign-off and a launch checklist. | M | 3 |

## E12 · Suggested growth features (Post-MVP)
| ID | Story | P | Pts |
|---|---|---|---|
| TOS-1201 | As a gift buyer, I want to **build a gift box** (choose box, products, card) so that I can send a personal hamper. | Sug | 13 |
| TOS-1202 | As the business, I want **SMS OTP verification for COD** to reduce fake orders. | Sug | 5 |
| TOS-1203 | As marketing, I want **abandoned-cart reminders on WhatsApp/SMS** to recover sales. | Sug | 8 |
| TOS-1204 | As a shopper, I want a **skin-type / concern quiz** that recommends a routine. | Sug | 8 |
| TOS-1205 | As a loyal customer, I want **loyalty points** I can redeem. | Sug | 8 |
| TOS-1206 | As a mobile shopper, I want to **install the store as an app** (PWA, offline browsing of viewed items). | Sug | 5 |
| TOS-1207 | As a shopper, I want the site in **Sinhala and Tamil**. | Sug | 8 |
| TOS-1208 | As the business, I want **seasonal campaign landing pages** (Avurudu, Vesak, Christmas, Valentine's) built from CMS blocks. | Sug | 3 |
| TOS-1209 | As the business, I want **"ask on WhatsApp"** product enquiries prefilled with the product link. | Sug | 5 |

## Definition of Ready
- Story has a clear user, goal and benefit.
- AC written and testable.
- Designs or behaviour agreed.
- Dependencies identified.
- Estimated.

## Definition of Done
See `07-working-agreement.md`.
