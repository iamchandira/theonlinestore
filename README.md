# The Online Store · theonlinestore.lk

> **Shop more. Live better.** Sri Lanka's online lifestyle store for beauty, fragrances, footwear, gifts and chocolates.

Built with **Next.js 16**, **Payload CMS 3**, **PostgreSQL 16**, **Tailwind CSS v4**, **GSAP**, **Framer Motion** and **Tabler Icons**.

## Quick start
```bash
docker compose up -d          # Postgres 16 on localhost:5434 + Mailpit (emails) at http://localhost:8026
pnpm install
cp .env.example .env          # set PAYLOAD_SECRET (openssl rand -hex 32) and the SEED_ADMIN_* values
pnpm dev                      # storefront http://localhost:3000 · admin http://localhost:3000/admin
pnpm seed:admin               # create the local super-admin from .env
pnpm seed:catalog             # import the 88-product seed catalogue into Payload
```

## Useful scripts
| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Develop, build, serve |
| `pnpm lint` · `pnpm typecheck` | Code quality |
| `pnpm check:contrast` | WCAG AA check of the brand colour pairs |
| `pnpm test:int` · `pnpm test:e2e` | Vitest integration tests · Playwright end-to-end tests (run e2e against a freshly started `pnpm build && pnpm start`; test orders are cleaned up afterwards) |
| `pnpm seed:catalog` | Import / refresh the seed catalogue (products, brands, categories, photos, home rails) |
| `pnpm seed:demo` | Add 20 clearly-marked demo products for fragrance, footwear, gifts and chocolates, sample reviews and the demo codes WELCOME10, FREEDEL and CHOC3FOR2 (`--remove` deletes them; **remove before launch**) |
| `pnpm prune:media` | List unused media (`--apply` deletes them) |
| `node scripts/screenshots.mjs screenshots /` | Desktop + mobile full-page screenshots for visual QA |
| `pnpm generate:types` · `pnpm generate:importmap` | Regenerate Payload types and the admin import map |

## Where things are
- **Design tokens:** `src/app/(frontend)/globals.css`. Live design system at `/styleguide`.
- **Components:** `src/components/{ui,layout,home,product,brand}`
- **Store config:** `src/config/site.ts` (contact, delivery threshold, announcements) and `src/config/navigation.ts` (IA)
- **Catalogue seed:** `seed/catalogue/products.json` + `public/catalogue/`
- **Custom admin:** `src/components/admin/` + `src/app/(payload)/custom.scss`
- **Checkout:** pricing `src/lib/checkout/pricing.ts`, server `src/lib/checkout/server.ts`, endpoints `src/endpoints/checkout.ts`, page `src/components/checkout/`; fees in Admin › Settings › Checkout & delivery
- **Payments:** `src/lib/payments/` (config, PayHere signing, service), `src/endpoints/payments.ts`, pay pages under `src/app/(frontend)/checkout/pay/`; credentials via `PAYHERE_*`, `KOKO_*`, `MINTPAY_*` env vars or Settings › Payments (Super Admin)
- **RBAC:** `src/access/roles.ts`
- **Docs:** [`docs/`](docs/README.md): charter, SRS, backlog, sprint plan, architecture, design system, RBAC, UX

## Status
Sprints 0 to 6 are complete (v0.8.0, orders & delivery: lifecycle, bulk actions, invoices, couriers, tracking, returns, refunds, COD reconciliation). Before that, v0.7.0 added payments. Shoppers pay by card (PayHere), Koko, Mintpay, cash on delivery or bank transfer with a slip upload. Locally, card and instalment payments go through a built-in test gateway (Approve / Decline) until gateway credentials are added in Admin › Settings › Payments or in `.env`. Orders, slips and transactions are in Admin › Sales; emails appear in Mailpit. The admin dashboard is at `/admin`, and bulk stock is at `/admin/inventory`. See [`docs/03-sprint-plan.md`](docs/03-sprint-plan.md) for the roadmap to go-live on 9 Apr 2027.
