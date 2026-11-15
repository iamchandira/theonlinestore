# Sprint 2 Report: Find It Fast

**Date:** 15 Nov 2026 (started early, planned 16–27 Nov) · **Status:** ✅ Complete · **Points delivered:** 45 / 45 + TOS-109 (3, carried over) · **Version:** 0.4.0

## Goal
Shoppers find any product by name, brand, category or concern, even with typos, and narrow the results with filters. They can save favourites and see what they viewed, read and write reviews, and staff can see what people search for.

## Delivered
| Story | What shipped |
|---|---|
| TOS-201 Typo-tolerant search | See "Search" below. |
| TOS-202 Filters with counts | See "Filters" below. |
| TOS-203 Wishlist | `/wishlist` page (it was a 404 before). Saved on the device for guests, so no account is needed. **Share my wishlist** creates a link (`/wishlist?items=…`), and anyone opening it can **Save all to my wishlist** in one tap. Merging into the account at sign-in comes with accounts in Sprint 3. |
| TOS-204 Cross-sells & upsells | The product page has **Pairs well with** (cross-sells) and a new **Upgrade your pick** rail. Upgrades are hand-picked, or else best-sellers in the same sub-category priced 15–200% higher. The bag shows **Pairs well with ‹the product you just added›**, falling back to small add-ons. |
| TOS-205 Recently viewed | Remembered on the device (last 16 products). Shown as a rail on product pages, the wishlist and the no-results search page. |
| TOS-206 Reviews | See "Reviews" below. |
| TOS-207 No dead ends | See "Search" below. |
| TOS-208 Search insights | Every search is logged per term per day (Sri Lanka time). **Insights › Search insights** shows searches, distinct terms and the "found nothing" rate for the last 7, 30 or 90 days. It also has a daily chart, top searches and the searches that found nothing, each linking to the storefront result. |
| TOS-109 CSV import/export (carried over) | See "CSV import and export" below. |

**Search (TOS-201 and TOS-207):**
- Works on PostgreSQL trigram matching plus edit distance:
  - "cerave", "cera ve", "cerav" and "CeraVe" all find CeraVe.
  - Misspellings work: "sereum", "niacinimide", "sneakrs", "centela".
  - Swapped letters are corrected automatically: "cervae" shows CeraVe results with the note "Showing results for cerave".
- Results are ranked: name matches first, then overall similarity, then popularity.
- The header dropdown suggests products, brands and categories (typos included) and shows the result count.
- When a search finds nothing, the page still offers:
  - The automatic spelling correction.
  - Popular searches.
  - A "Bestsellers right now" rail.
  - Recently viewed products.
  - A WhatsApp "request a product" link.

**Filters (TOS-202):**
- On every listing: category, brand, gift taxonomies and more.
- Only the filters relevant to a listing appear. For example, Shoe size and Colour show for footwear, Dietary for chocolates and Department in search.
- Size and colour must be available together on one variant: EU 38 + Black finds nothing when that pair is sold out and "In stock only" is on.
- **Desktop:** a sticky sidebar that applies each change instantly.
- **Phones:** a bottom sheet with live counts and a **Show n results** button.
- Counts show what each option would add.
- Everything is kept in the URL, so filtered pages can be shared and Back/Forward restore them.
- Every active filter shows as a removable chip, with **Clear all**.

**Reviews (TOS-206):**
- On the product page:
  - Average rating, star histogram (click to filter), "With photos" filter and sort (recent, helpful, highest, lowest).
  - "Helpful" votes (once per visitor) and store replies.
  - A **Write a review** drawer: stars, headline, text, name, private email and up to 3 photos.
- **Every review is moderated:** nothing appears until staff approve it, and photos stay private until then.
- Ratings on cards, product pages and in search results now come only from approved reviews. The placeholder ratings from the catalogue import are gone, and products without reviews show "Be the first to review".
- Rating structured data is only published from genuine reviews.
- Demo products have a few reviews clearly labelled **Sample review**. They are deleted with the demo products.
- **Admin › Catalogue › Reviews:** a moderation queue (waiting, published, rejected) with approve and reject per row or in bulk, search, and photo previews. The dashboard shows reviews waiting for approval, and the sidebar has a count badge.

**CSV import and export (TOS-109):**
- **Admin › Catalogue › Import / export.**
- **Export:** one row per SKU, including cost if your role can see it.
- **Import:**
  - Updates prices and stock by SKU, with a preview of every change, its old and new values, and the problem rows (unknown or duplicate SKUs, bad numbers) before anything is saved.
  - Stock changes are logged as "Stock count · CSV import".
  - Role permissions apply: prices need Store Manager, and stock needs Inventory Manager.
  - Spreadsheet formula injection is blocked on export.

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean. 144 pages, `/wishlist` added. |
| Integration tests (Vitest) | ✅ 13 of 13. New: search across spellings, typo correction, filter counts and price sort, review moderation, rating aggregate and email privacy, CSV parser. |
| End-to-end tests (Playwright, production build) | ✅ 23 of 23 in 12 s. New: typo correction in dropdown and results, desktop filters + URL + Back, wishlist + shared list + recently viewed, review submit → moderation → published, CSV import preview. |
| API checks | Pending reviews and photos hidden from the public; email never exposed; approval updates the rating; duplicate "helpful" votes ignored; review form validation messages |
| Speed (production) | Suggestions 9 ms (target: within 150 ms). Filtered listings 26–44 ms. Product page 50 ms. |
| Visual QA | Listings with sidebar (desktop) and filter sheet (phone), footwear size grid, search correction, reviews section, wishlist (phone), admin Reviews, Import / export, Search insights |

## Bugs found and fixed during the sprint
| Bug | Cause | Fix |
|---|---|---|
| Review counts were one short | The rating update ran outside the database transaction that saved the review | The update runs inside the same transaction |
| "Recently viewed" could forget the first product | The product page recorded the view before saved history loaded, and the history load overwrote it | History is merged, not replaced |
| Size + colour filter matched a sold-out combination | Size and colour were matched separately | They're matched on the same variant |
| Dev schema sync tried to drop the search index (tests raced on it) | The index was created in raw SQL, outside Payload's schema | The extensions and index are declared in the Postgres adapter config |
| Review photos would fail to load in production | `next/image` only allows listed paths | Added `/api/review-media/file/**` |
| A collapsed admin sidebar could reopen after a slow load | A late-arriving saved preference overrode the user's click | Late answers are ignored once the user has toggled |

## Demo checklist
1. Type **cervae** in the header search: CeraVe products appear with "Showing results for cerave". Press Enter.
2. Open **Skincare**:
   - Tick **CeraVe**, then **COSRX**, and set **Rs 1,000–5,000**. The counts and URL update.
   - Remove a chip, then press Back.
   - On a phone, use **Filters** and **Show n results**.
3. Open **Footwear** and pick **EU 38** + **Black**, then turn on **In stock only**.
4. Open a product and tap the heart. Open another product to see **Recently viewed**. Then open **Wishlist**, then **Share my wishlist**.
5. On a product page, **Write a review**. In the admin, go to **Catalogue › Reviews**, then **Approve**, and refresh the product page.
6. **Admin › Import / export:**
   - **Download CSV**.
   - Change a price, upload it, and check the preview before applying.
7. Open **Admin › Search insights**.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| Wishlist and reviews aren't linked to accounts yet | Sprint 3 (accounts): the wishlist merges at sign-in, and reviews are linked to the signed-in customer |
| "Verified buyer" is set by staff for now | Set automatically from delivered orders in Sprint 6 |
| CSV import updates existing SKUs only | New products are added in the admin. Bulk product creation can be added if the owner needs it. |
| Rate limits for reviews and "helpful" votes are per server | Move to a shared store (Redis/Upstash) when running more than one server |
| The dev server (Turbopack) can get stuck after many edits ("useShop must be used inside ShopProvider", "module factory is not available") | Dev only, cleared by a restart. The production build has none of it. E2E tests are now run against a production build. |
| Production migrations must include the `pg_trgm` and `fuzzystrmatch` extensions and the trigram index | Sprint 10 deployment (they're declared in config, so migrations generate them) |

## Retro
- **Went well:** one faceted engine powers every listing (category, brand, offers, gift shop, search) plus the phone sheet's live counts. Search typo tolerance needed no extra service: Postgres trigram matching plus a small edit-distance pass was enough, and it answers in about 10 ms.
- **To improve:**
  - Run e2e against a production build by default. The dev server's instability after long editing sessions produced false failures.
  - Raw SQL in hooks must use the request's transaction. This is now in the working agreement.

## Next sprint (Sprint 3, 14–24 Dec 2026)
Accounts and security:
- Register, log in and reset a password.
- Address book and order history shell.
- Wishlist merges at sign-in.
- RBAC enforced and tested per role.
- Audit log.
