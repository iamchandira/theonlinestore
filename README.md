# The Online Store · theonlinestore.lk

> **Shop more. Live better.** Sri Lanka's online lifestyle store for beauty, fragrances, footwear, gifts and chocolates.

Built with **Next.js 16**, **Payload CMS 3**, **PostgreSQL 16**, **Tailwind CSS v4**, **GSAP**, **Framer Motion** and **Tabler Icons**.

## Quick start
```bash
docker compose up -d          # Postgres 16 on localhost:5434
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
| `pnpm test:int` · `pnpm test:e2e` | Vitest integration tests · Playwright end-to-end tests (run e2e against `pnpm build && pnpm start` for reliable results) |
| `pnpm seed:catalog` | Import / refresh the seed catalogue (products, brands, categories, photos, home rails) |
| `pnpm seed:demo` | Add 20 clearly-marked demo products for fragrance, footwear, gifts and chocolates (`--remove` deletes them; **remove before launch**) |
| `pnpm prune:media` | List unused media (`--apply` deletes them) |
| `node scripts/screenshots.mjs screenshots /` | Desktop + mobile full-page screenshots for visual QA |
| `pnpm generate:types` · `pnpm generate:importmap` | Regenerate Payload types and the admin import map |

## Where things are
- **Design tokens:** `src/app/(frontend)/globals.css`. Live design system at `/styleguide`.
- **Components:** `src/components/{ui,layout,home,product,brand}`
- **Store config:** `src/config/site.ts` (contact, delivery threshold, announcements) and `src/config/navigation.ts` (IA)
- **Catalogue seed:** `seed/catalogue/products.json` + `public/catalogue/`
- **Custom admin:** `src/components/admin/` + `src/app/(payload)/custom.scss`
- **RBAC:** `src/access/roles.ts`
- **Docs:** [`docs/`](docs/README.md): charter, SRS, backlog, sprint plan, architecture, design system, RBAC, UX

## Status
Sprints 0, 1, 1.5 and 2 (find it fast: search, filters, wishlist, reviews, CSV) are complete. The admin dashboard is at `/admin`, and bulk stock is at `/admin/inventory`. See [`docs/03-sprint-plan.md`](docs/03-sprint-plan.md) for the roadmap to go-live on 9 Apr 2027.
