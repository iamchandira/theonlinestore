# 04 · Architecture

Version 1.0 · Sprint 0. This document is updated whenever the data model or integrations change.

## 1. Stack
| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack, React Server Components) | 16.4 | Storefront and admin in one app |
| CMS / backend | Payload CMS | 3.93 | Admin UI, REST/GraphQL/Local API, auth, access control, hooks, jobs |
| Database | PostgreSQL (via `@payloadcms/db-postgres` / Drizzle) | 16 | Local: Docker on port **5434** |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) | 4.3 | Scoped to the `(frontend)` route group |
| Motion | GSAP + ScrollTrigger (`@gsap/react`), Motion (Framer Motion), Lenis | 3.15 / 14 / 1.3 | GSAP for timelines and scroll, Motion for UI state, Lenis for smooth wheel scrolling (on GSAP's ticker) |
| Icons | Tabler Icons (`@tabler/icons-react`) | 3.51 | Lucide is not used, per your requirement |
| UI utils | class-variance-authority, clsx, tailwind-merge, Embla Carousel, Sonner (toasts) | | |
| Images | `next/image` (AVIF/WebP) + `sharp` (Payload image sizes) | | |
| Testing | Vitest (integration), Playwright (E2E and visual QA) | | |
| Language | TypeScript (strict) | 5.7 | |

## 2. System context
```mermaid
flowchart LR
  shopper([Shopper<br/>mobile / desktop]) -->|HTTPS| next
  staff([Staff]) -->|/admin| next
  subgraph app[Next.js 16 app]
    next[Storefront routes<br/>src/app/(frontend)]
    admin[Payload Admin + API<br/>src/app/(payload)]
    next -- Local API --> payload[(Payload core<br/>collections · hooks · access · jobs)]
    admin --> payload
  end
  payload --> pg[(PostgreSQL 16)]
  payload --> media[(Object storage<br/>S3-compatible, Sprint 10)]
  payload -->|redirect + notify| payhere[PayHere IPG]
  payload -->|redirect + callback| koko[Koko BNPL]
  payload -->|redirect + callback| mintpay[Mintpay BNPL]
  payload -->|SMTP / API| email[Email: SMTP / Resend]
  payload -->|HTTP API| sms[SMS: Notify.lk / Text.lk]
  payload -->|Cloud API| wa[WhatsApp Business]
  payload -->|API / manual| courier[Couriers: Domex, Koombiyo, Pronto…]
  next -->|consent-gated| ga[GA4 / Meta Pixel]
```

## 3. Code layout
```
theonlinestore/
├─ docs/                       Project documents (this folder)
├─ public/brand/               Logo, icon, OG image
├─ public/catalogue/           Product photos extracted from the client PDFs
├─ seed/catalogue/products.json  Structured seed catalogue (88 products / 99 variants)
├─ scripts/                    check-contrast.ts, screenshots.mjs, seed-admin.ts
├─ src/
│  ├─ app/(frontend)/          Storefront: layout, globals.css (tokens), fonts, pages
│  ├─ app/(payload)/           Payload admin + API routes (generated), custom.scss (admin theme)
│  ├─ access/roles.ts          RBAC roles and access helpers
│  ├─ collections/             Products, Categories, Brands, Tags, Concerns, StockMovements, Media, Users
│  ├─ globals/                 HomePage (hero products + product rails)
│  ├─ components/ui/           Design-system primitives
│  ├─ components/layout/       Header, search, mega-menu, bag drawer, footer, bottom nav
│  ├─ components/home/         Home page sections
│  ├─ components/product/      ProductCard, ProductRail, QuickAddSheet
│  ├─ components/brand/        Logo, BrandLoader
│  ├─ config/                  site.ts (store settings), navigation.ts (IA)
│  ├─ lib/catalog/             types.ts + utils.ts (browser-safe), server.ts (Payload Local API, server-only), params.ts
│  ├─ lib/payload/             revalidate.ts (refresh cached pages after admin edits)
│  ├─ lib/store/shop.tsx       Bag, wishlist and UI state (client)
│  ├─ lib/motion/              Motion tokens, GSAP setup, Reveal helper
│  └─ payload.config.ts
└─ tests/                      int (Vitest) and e2e (Playwright)
```

## 4. Rendering and state strategy
- **Server Components by default.** Interactive pieces (header, bag, cards, carousels) are client components.
- The home page and content pages are **static** (ISR from Sprint 1, revalidated by Payload `afterChange` hooks). Product listing and product pages use ISR. Account, checkout and the bag are dynamic.
- **Prices and totals are always calculated on the server** (Sprint 4). The client bag is optimistic UI only.
- Bag and wishlist: `localStorage` for guests now. From Sprint 4 they are server-side `carts` and `wishlists`, merged at sign-in.
- Relative timers (deal countdowns) are resolved in the browser so static pages never show stale times.

## 5. Data model

### Built in Sprint 1
| Collection / global | Purpose | Key fields |
|---|---|---|
| `products` | Sellable products (drafts, versions, scheduled publish) | **productType** (beauty, fragrance, footwear, gift, chocolate, accessory, home), **isDemo**, name, slug, brand, categories, short description, rich description, benefits, how to use, ingredients, optionName, option2Name, **variants[]** (label, option2, sku, barcode, price, compareAtPrice, cost, weight, stock, lowStockThreshold, image), gallery, badge, tags, concerns, recipients, occasions, **details** (type-specific group: fragrance notes and concentration; footwear style, material, size system, fit; chocolate weight, cocoa %, origin, dietary, allergens, storage; gift contents, wrapping, personalisation; gender), crossSells, upsells, priceTBC, SEO meta; **computed:** minPrice, maxPrice, totalStock, lowStock, onSale, searchText, salesCount, rating*, reviewCount* |
| `categories` | Category tree (nested-docs plugin) | name, slug, parent, breadcrumbs (`/skincare/serums`), blurb, description, tint, image, order, SEO meta |
| `brands` | Brands | name, slug, group (K-Beauty, Derm…), featured, logo, description, SEO meta |
| `tags`, `concerns` | Merchandising tags and shopper concerns (concerns apply to beauty) | name, slug |
| `recipients`, `occasions` | Gift taxonomy (Sprint 1.5) | name, slug |
| `stock-movements` | Inventory audit log, written automatically and never edited | product, sku, variantLabel, change, resultingStock, reason, note, user |
| `home-page` (global) | Home merchandising | heroProducts (≤ 4), rails[] (source: manual, sale, bestsellers, new, tag, category, under price; placement; style; countdown) |

\* rating and reviewCount are calculated from approved reviews (Sprint 2).

**How data reaches pages:**
- Server Components call `src/lib/catalog/server.ts` (Payload Local API, wrapped in React `cache()`), which maps documents into plain `Product` / `ProductDetail` objects.
- Client Components only ever receive those objects as props.
- The bag stores a snapshot per line (name, photo, price), so the browser never loads the catalogue. Prices are re-checked on the server at checkout (Sprint 4).

**Caching:**
- Product pages are pre-rendered for every published product and revalidate hourly. The home page, brands and category directory revalidate every 10 minutes.
- **Admin edits revalidate immediately** through `afterChange` hooks (`lib/payload/revalidate.ts`). Seed scripts pass `context.disableRevalidate`.
- Measured on a production build: home 4 ms, product page 2 ms, filtered listings about 20 ms.

**Endpoints:**
- `GET /api/products/suggest?q=` returns header autosuggest results (published products and brands, cached 60 s at the edge).
- `POST /api/products/adjust-stock` (Sprint 1.5) takes `{ productId, changes: [{ sku, stock }], reason, note }`. It is limited to admin, store-manager and inventory-manager, writes with `overrideAccess: false`, and passes the reason and note to the stock-movement hook. It returns `{ ok, totalStock, lowStock }`.

### Custom admin (Sprint 1.5)
The Payload admin is customised through its component API, without forking Payload. All of it is in `src/components/admin/` and is styled by `src/app/(payload)/custom.scss` (the admin doesn't load Tailwind).

| Slot | Component | What it does |
|---|---|---|
| `admin.components.Nav` | `Nav.tsx` (server) + `NavClient.tsx` | Grouped sidebar (Home, Sales, Catalogue, Content, Insights, Settings), role-aware, with live badges for drafts and low stock |
| `admin.components.actions` | `HeaderActions.tsx` | Search (⌘K) and View store |
| `admin.components.providers` | `CommandPalette.tsx` | ⌘K palette: product search by name or SKU, pages, actions |
| `admin.components.beforeLogin` | `LoginIntro.tsx` | Branded login |
| `views.dashboard` | `views/Dashboard.tsx` | KPIs, needs attention, activity, launch checklist, catalogue mix |
| `views.inventory` (`/admin/inventory`) | `views/Inventory.tsx` + `InventoryTable.tsx` | Bulk stock adjustment. Wraps Payload's `DefaultTemplate`. |
| `products` list view | `views/ProductsList.tsx` + `ProductsToolbar` + `ProductsTable` | Status tabs, search, type filter, sort, bulk actions through the REST API |
| Variant `RowLabel` | `VariantRowLabel.tsx` | Readable collapsed variant rows |

**Demo data:** products with `isDemo` come from `pnpm seed:demo` (SKUs `DEMO-…`, media `demo-*.webp`, four fictional brands). Their pages are `noindex`. `pnpm seed:demo --remove` deletes the products, their stock history, their media and the demo brands.

### Added in Sprint 2 (discovery)
| Collection | Purpose | Key fields |
|---|---|---|
| `reviews` | Shopper reviews, moderated | product, rating 1–5, title, body, photos (≤3), reply, authorName, authorEmail (staff-only read), status (pending/approved/rejected), verifiedBuyer, helpfulCount, isSample, moderationNote (staff-only), user |
| `review-media` | Review photo uploads (kept apart from the product Media library) | file (WebP, thumb + large sizes), `public` (true only while its review is approved) |
| `search-queries` | Search analytics, one row per normalised term per day | term, day (YYYY-MM-DD, Asia/Colombo), count, results; unique (term, day) |

**Search (`src/lib/catalog/search.ts`):**
- PostgreSQL `pg_trgm` + `fuzzystrmatch`, declared in the Postgres adapter (`extensions` and an `afterSchemaInit` GIN index on `products.search_text`), so schema sync and migrations create them.
- A query matches when every word is in the product's search text, either as a substring or by trigram word-similarity, or when the whole query matches with spaces removed.
- Ranking: name matches, then similarity, then popularity.
- Zero results: an edit-distance correction against the store's own vocabulary ("cervae" → "cerave"), which is applied automatically.
- Each search is upserted into `search_queries` after the response (`after()`).

**Facets (`src/lib/catalog/facets.ts`):**
- An in-memory snapshot of the published catalogue (one light record per product), rebuilt when the catalogue changes (`bumpCatalogVersion()` in the revalidate hooks) or after 60 s.
- Filtering, disjunctive counts and sorting run in one pass. Only the current page is loaded in full.
- Every listing uses `getListing(scope, params)`; search uses `getSearchListing`.
- Filters live in the URL (`?brand=a,b&min=&max=&rating=&stock=1&sale=1&size=&colour=&scent=&diet=&cat=&type=&concern=&recipient=&occasion=`).

**Reviews:**
- The approved-review average and count are written straight to the product row inside the review's transaction, with no new product version, and the product page is revalidated.
- The public reads approved reviews only. Field access hides the email, user and moderation note.

**New endpoints:**
| Endpoint | Who | Purpose |
|---|---|---|
| `GET /api/products/suggest?q=` | Public | Typo-tolerant suggestions: products, brands, categories, correction, total (cached 60 s) |
| `GET /api/products/facets?scope=&…filters` | Public | Live count + facets for the phone filter sheet (`scope` is an encoded listing scope, validated on the server; only published products are ever returned) |
| `GET /api/products/cards?slugs=` | Public | Product cards for wishlist and recently viewed |
| `GET /api/products/pairs?slug=` | Public | Cross-sells for the bag drawer |
| `GET /api/products/export` | Admin, store/inventory manager, marketing | CSV of every SKU (cost only for price roles) |
| `POST /api/products/import` `{ csv, apply }` | Price roles / stock roles | Preview or apply price and stock updates by SKU |
| `POST /api/reviews/submit` (multipart) | Public, rate-limited, honeypot | New review (pending) with up to 3 photos |
| `GET /api/reviews/list?product=&sort=&rating=&photos=` | Public | Approved reviews, paginated |
| `POST /api/reviews/:id/helpful` | Public, once per visitor | +1 helpful |
| `POST /api/reviews/moderate` `{ ids, status }` | Moderators | Approve or reject in bulk |

**New admin views:**
- Reviews moderation (list view override).
- `/admin/import-export`.
- `/admin/search-insights`.
- `AdminPage` wraps custom routes in Payload's template.

### Target (Sprints 2–7)
```mermaid
erDiagram
  USERS ||--o{ ADDRESSES : has
  USERS ||--o{ ORDERS : places
  USERS ||--o| CARTS : owns
  USERS ||--o{ WISHLIST_ITEMS : saves
  USERS ||--o{ REVIEWS : writes
  BRANDS ||--o{ PRODUCTS : makes
  CATEGORIES ||--o{ CATEGORIES : parent
  PRODUCTS }o--o{ CATEGORIES : in
  PRODUCTS }o--o{ TAGS : tagged
  PRODUCTS }o--o{ CONCERNS : targets
  PRODUCTS ||--|{ VARIANTS : has
  PRODUCTS }o--o{ PRODUCTS : "upsell / cross-sell"
  VARIANTS ||--o{ STOCK_MOVEMENTS : logs
  ORDERS ||--|{ ORDER_ITEMS : contains
  ORDER_ITEMS }o--|| VARIANTS : of
  ORDERS ||--o{ TRANSACTIONS : paid_by
  ORDERS ||--o{ SHIPMENTS : shipped_by
  ORDERS ||--o{ ORDER_EVENTS : timeline
  ORDERS }o--o{ COUPONS : uses
  SHIPPING_ZONES ||--o{ SHIPPING_RATES : has
  ORDERS ||--o{ RETURNS : may_have
  NOTIFICATION_TEMPLATES ||--o{ NOTIFICATION_LOGS : sends
```

**Collections:**
- Users
- Media
- Products (variants as an array field with stable IDs)
- Categories (nested)
- Brands
- Tags
- Concerns
- StockMovements
- Carts
- Orders
- Transactions
- Shipments
- Returns
- Coupons
- ShippingZones
- Reviews
- Pages
- Posts
- Redirects
- NotificationTemplates
- NotificationLogs
- AuditLogs

**Globals:**
- StoreSettings: contact details, free-delivery threshold, announcements.
- PaymentSettings: methods, credentials, rules.
- NotificationSettings.
- HomePage: blocks.
- Header/Footer navigation.

**Money:** stored as integer rupees (LKR has no common sub-unit use in retail). Fields: `price`, `compareAtPrice` and `cost` per variant.

## 6. Integrations
| Integration | Sprint | Approach |
|---|---|---|
| PayHere | 5 | Hosted checkout form POST. `notify_url` endpoint verifies `md5sig = MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret).upper)`. Idempotent order update. Refund API. |
| Koko | 5 | Create-order API → redirect. Callback with signature verification. Status poll for reconciliation. |
| Mintpay | 5 | Create-order API → redirect. Success/fail callbacks. Status check API. |
| Bank transfer | 5 | Bank details from PaymentSettings. Slip upload to a private media collection. Staff verify. Auto-cancel job. |
| COD | 5 | Eligibility rules (max value, districts). Optional OTP (TOS-1202). |
| Email | 7 | Payload email adapter (Nodemailer SMTP or Resend). React Email templates. |
| SMS | 7 | Notify.lk / Text.lk HTTP API behind a provider interface. |
| WhatsApp | 7 | Meta WhatsApp Cloud API with pre-approved templates. |
| Couriers | 6 | Manual tracking number + URL template first. Koombiyo/Domex APIs where available. |
| Analytics | 8 | GA4 + Meta Pixel, loaded after cookie consent. Server-side purchase event. |
| Search | 2 | Postgres full-text (`tsvector`) + trigram similarity for typo tolerance. Meilisearch optional later. |

## 7. Security
- Payload auth: HTTP-only cookies, 5 failed logins → 15-minute lockout, 7-day sessions.
- RBAC via `src/access/roles.ts`: collection, row and field level, with roles saved to the JWT.
- The first user ever created becomes the super-admin (bootstrap). **In production, create the admin immediately after the first deploy.**
- Secrets live only in environment variables. `.env` is git-ignored; `.env.example` documents the keys.
- Payment callbacks: signature verification, idempotency keys, amount and currency checks against the order.
- Rate limits (Sprint 3/10) on auth, search, checkout and coupons.

## 8. Environments
| Env | URL | DB | Notes |
|---|---|---|---|
| Local | http://localhost:3000 | Docker Postgres :5434 | `docker compose up -d` → `pnpm dev` |
| Staging | staging.theonlinestore.lk (Sprint 10) | Managed Postgres | Payment sandboxes |
| Production | https://theonlinestore.lk | Managed Postgres + daily backups | Live keys |

## 9. Local development
```bash
docker compose up -d            # Postgres 16 on :5434
pnpm install
cp .env.example .env            # then set PAYLOAD_SECRET and the SEED_ADMIN_* values
pnpm dev                        # http://localhost:3000 and /admin
pnpm seed:admin                 # optional: create the local super-admin from .env
pnpm lint && pnpm typecheck && pnpm check:contrast
pnpm test:e2e                   # Playwright (reuses the dev server)
```
