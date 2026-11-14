# Sprint 1.5 Report: Lifestyle Store & Custom Admin

**Date:** 15 Nov 2026 (an inserted mini-sprint, before Sprint 2) · **Status:** ✅ Complete · **Points delivered:** 47 / 47 · **Version:** 0.3.0

## Why this sprint
After Sprint 1 the owner pointed out two things:
- The store and its admin read as a cosmetics shop, but The Online Store is a **lifestyle** store.
- The admin should feel custom-built, like Shopify or WooCommerce, rather than a generic CMS.

Both changes touch the data model that every later sprint builds on, so they were done now instead of later.

## Goal
Every department (beauty, fragrance, footwear, gifts, chocolates) has the right product data, shopping experience and demo content. Staff run the store from a purpose-built admin.

## Delivered
| Story | What shipped |
|---|---|
| TOS-131 Product types | Each product has a **type**: Beauty, Fragrance, Footwear, Gift, Chocolate, Accessory or Home. A new **Details** tab shows only the fields that type needs: notes pyramid and concentration for fragrance, material, fit and size system for footwear, contents and personalisation for gifts, cocoa %, origin, dietary, allergens and storage for chocolate. |
| TOS-132 Two-option variants | Variants can have a second option, such as Shoe size × Colour. Each combination keeps its own SKU, price, stock and photo. Option types now include Weight and Style. Variant rows in the admin are collapsed and labelled, for example "EU 38 / Black · SKU · Rs 8,950 · 4 in stock". |
| TOS-133 Shopper variant picker | On the product page and in quick add: colour swatches that use each colour's photo, then a size grid. Sizes that don't exist in a colour or are sold out are disabled, with a screen-reader reason. |
| TOS-134 Gift taxonomy | New **Recipients** (for her, for him, couples, kids, parents, friends) and **Occasions** (birthday, anniversary, Avurudu, Valentine's, Mother's Day, Father's Day, Christmas, wedding, thank you) collections, available as filters on every listing. |
| TOS-135 Gift shop | New `/gifts` page across all departments, with recipient chips and occasion filters. "Perfect for" chips on product pages link back to it. |
| TOS-136 Lifestyle navigation & home | A mega-menu for every department (sub-categories, shortcuts, a featured product). New sub-categories for fragrances, footwear, gifts and chocolates. Home hero copy, occasion chips, best-seller tabs by department, and new rails for gifts, fragrances, footwear and chocolates. Product pages adapt their details and delivery and returns text to the product type. |
| TOS-137 Demo products | `pnpm seed:demo` adds 20 clearly-marked **demo products** (5 each: fragrance, footwear, gifts, chocolates) under four fictional brands, with illustrated photos. They show a "Sample" badge, are hidden from search engines (`noindex`), and `pnpm seed:demo --remove` deletes them all before launch. |
| TOS-138 Admin shell | Custom sidebar grouped like a commerce admin: Home, Sales, Catalogue, Content, Insights, Settings. Live badges for drafts and low stock, items still to come marked "Soon", and it hides what a role can't access. A **⌘K command palette** searches products by name or SKU and jumps to any page or action. The header has Search and View store, icon-only on phones. Branded login. |
| TOS-139 Admin dashboard | Greeting, 6 KPI cards (products live, drafts, low stock, out of stock, prices to confirm, stock value), a "Needs attention" low-stock list, recent stock activity, a launch checklist with progress, catalogue mix by type, and quick actions. The sales chart is ready for Sprint 4 data. |
| TOS-140 Products list | Shopify-style list: status tabs with counts (All, Active, Drafts, Low stock, Out of stock, Price TBC, Demo), search, type filter, sortable columns, and bulk actions (publish, move to draft, confirm prices, delete). |
| TOS-141 Inventory screen | `/admin/inventory`: every SKU in one table, filterable by low or out of stock, with steppers to adjust stock. Changed rows are highlighted and saved together with a reason (restock, count, damaged, return, adjustment) and a note. Each change is written to stock history. Backed by `POST /api/products/adjust-stock`. |
| TOS-142 WhatsApp button | The WhatsApp button is a perfect circle at every width (released as 0.2.1). |

## Verification
| Check | Result |
|---|---|
| Lint · production build | ✅ Clean. `/gifts` and all product pages build. |
| Integration tests (Vitest) | ✅ 6 of 6 |
| End-to-end tests (Playwright) | ✅ 16 of 16, including new tests for the two-option picker, the gift shop, the admin dashboard, products list tabs and filters, and an inventory adjustment checked in stock history and then reverted. |
| Demo data | `seed:demo` is safe to re-run. `--remove` leaves 0 demo products, photos or brands. |
| Gift shop counts | /gifts 28 · For her 20 · For him 8 · Avurudu 4 |
| Visual QA | Admin dashboard, products, inventory, command palette, product editor and sidebar. Storefront home, footwear mega-menu, sneaker and perfume pages, gift shop, phone layouts. |
| Routes after a clean dev-server restart | All storefront routes return 200 with no server errors |

## Bugs found and fixed during the sprint
| Bug | Cause | Fix |
|---|---|---|
| The admin sidebar sometimes started collapsed on desktop | Payload remembers a collapsed preference | Forced open on desktop after hydration |
| The products list crashed on load | A function was passed from a server component to a client component | Sort links are worked out on the server and passed as plain data |
| `/gifts` listed every product | No "giftable" filter | Without a filter it shows products with a recipient or occasion |
| Admin e2e tests failed when run in parallel | Specs shared one test user | Each spec creates its own user (`makeTestUser`) |
| Admin header buttons overlapped the avatar on phones | Text labels were too wide | Icon-only below 768 px, with accessible names |
| Dev server logged `useShop` and `reading 'id'` errors | Stale hot-reload state after collections were added mid-session | Gone after a restart. Not reproducible on a clean server or the build. |

## Post-review polish (v0.3.1)
After reviewing the admin, the owner asked for four changes before Sprint 2. All are done:

| Request | What changed |
|---|---|
| Refactor the sidebar spacing and realign its toggle | One shared inset and even group spacing. The collapse button sits in the logo row, and Payload's floating toggle no longer overlaps the logo. Collapse is remembered, and the sidebar stays open on laptops. On phones it is a drawer. |
| Update the sidebar search bar | Field-style search with a search icon and ⌘ / K key caps |
| Bring the remaining pages to the new design | Every Payload list, edit, global and account screen now has the same eyebrow, header, card toolbar, table, pager and field cards as Products and Inventory |
| Fix the select dropdown icon | Drawn chevron with even spacing, plus hover and focus states |

**Verification:**
- Lint and typecheck are clean.
- The 16 existing e2e tests passed after the redesign.
- Sidebar flows were scripted and passed: open by default at 1280 px, collapse, reload stays collapsed, reopen, reload stays open; on a phone: open, close, close on outside tap.
- Two new e2e tests were added (restyled screens, collapse persistence). The full suite passes 18 of 18 on a clean dev server.
- Docker Desktop stopped once during testing. After Postgres came back, the dev server had to be restarted to clear a stale runtime error; the data was intact.

## Demo checklist
1. Run `pnpm seed:catalog && pnpm seed:demo`, then `pnpm dev`.
2. Admin home: check the KPI cards, the launch checklist and "Needs attention". Press **⌘K**, type "runner" and open the sneaker.
3. **Catalogue › Products**: open the **Low stock** tab, filter by **Footwear**, select two rows and **Publish**.
4. **Catalogue › Inventory**: add 5 to a SKU, pick "Restock", add a note and save. Check it under **Insights › Stock history**.
5. Storefront:
   - Hover **Footwear** to see the mega-menu.
   - Open Cloud Runner Sneakers and pick **Black**: EU 38 is disabled because it is sold out.
   - Open `/gifts` and tap **For him**.
   - Open a perfume to see the notes pyramid, and a chocolate to see allergens and storage.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| **The demo products must be removed before launch** | Run `pnpm seed:demo --remove` when real products are entered (on the Sprint 10 launch checklist) |
| Admin items marked "Soon" (Orders, Discounts, Analytics, Payments, Shipping, Notifications, Pages & blog) | Built in Sprints 4–9, inside the same admin shell |
| Admin hydration warnings in the in-app browser | Caused by a browser extension (Grammarly) that edits the page. Not an app bug. |
| The dashboard sales chart is a placeholder | Real data once orders exist (Sprint 4) |

## Retro
- **Went well:** the type-specific Details tab keeps one `products` collection while every department gets the fields it needs. Payload's custom views gave us a fully branded admin without forking Payload.
- **To improve:** restart the dev server after adding collections, before judging server logs. Hot reload keeps stale modules that produce misleading errors.

## Next sprint (Sprint 2, 16–27 Nov 2026)
Find it fast. Covers:
- Typo-tolerant search.
- Faceted filters, now including type-specific facets: size, colour, scent family, dietary.
- The wishlist page.
- Upsells.
- Recently viewed products.
- Real reviews.
- CSV import and export.
