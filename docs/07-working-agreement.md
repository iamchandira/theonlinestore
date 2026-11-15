# 07 · Working Agreement

## Definition of Done (every story)
- [ ] All acceptance criteria are met and demoed.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm build` pass with no new warnings.
- [ ] Tests are added or updated: integration tests for business rules (pricing, access, stock), Playwright for user flows.
- [ ] Works at **390 px mobile and 1440 px desktop**. Keyboard-only flow checked. Visible focus. 44 px tap targets.
- [ ] Respects `prefers-reduced-motion`. No layout shift from animations. Sticky and fixed elements never change their layout size on scroll. Scroll-triggered UI is tested with a fast jump/fling, not just slow scrolling.
- [ ] Colour pairs pass `pnpm check:contrast` (add any new pair to the script).
- [ ] RBAC reviewed for any new collection or field (`06-rbac-matrix.md` updated).
- [ ] SEO: title, description and structured data where relevant.
- [ ] No secrets in code. New env vars documented in `.env.example`.
- [ ] Docs updated: backlog status, CHANGELOG, plus architecture or design docs if affected.

## Definition of Done (every sprint)
- Sprint report written (`docs/sprint-reports/sprint-NN.md`).
- Claude Docs copy re-published.
- Git commit: `Sprint NN: <goal>`.

## Conventions
| Area | Convention |
|---|---|
| Branches | `main` is always releasable. Feature branches are `feat/TOS-123-short-name` and fixes are `fix/…` (once GitHub is set up). |
| Commits | Imperative, referencing the story: `TOS-106: add sticky add-to-bag bar on mobile` |
| Code style | Prettier (single quotes, no semicolons, 120 cols), ESLint `next/core-web-vitals` + `next/typescript` |
| Components | Server components by default. `'use client'` only for interactivity. One component per file, PascalCase. |
| Styling | Tailwind utilities with design tokens only (no raw hex values in components, except brand-specific partner colours such as WhatsApp green). Combine classes with `cn()`. |
| Icons | `@tabler/icons-react` only. Icon-only buttons need an accessible label. |
| Motion | Use `src/lib/motion/*`. GSAP for timelines and scroll, Framer for UI state. |
| Data access | Storefront reads through `src/lib/*` helpers, never directly from Payload in components. |
| Money | Integer LKR. Format with `formatLKR()`. Totals are calculated on the server. |
| Copy | Sri Lankan English, friendly tone (see `05-brand-and-design-system.md`) |
| Raw SQL in hooks | Use the request's transaction (see `db()` in `collections/Reviews.ts`), or the hook won't see the row being saved |
| Database extras | Extensions and custom indexes go in the Postgres adapter config (`extensions`, `afterSchemaInit`), never ad-hoc SQL, so schema sync and migrations know about them |
| E2E runs | Run against a production build (`pnpm build && pnpm start`, then `pnpm test:e2e`). The dev server can give false failures after long editing sessions. |

## Quality gates (commands)
```bash
pnpm lint
pnpm typecheck
pnpm check:contrast
pnpm build
pnpm test:int
pnpm test:e2e
node scripts/screenshots.mjs screenshots / /styleguide   # visual QA at desktop + mobile
```
