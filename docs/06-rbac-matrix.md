# 06 · Role-Based Access Control (RBAC) Matrix

Implementation: `src/access/roles.ts`. The roles field on `users` is saved to the JWT, and a user may hold several roles.
**Super Admin** implicitly holds every permission. **Customers can never open `/admin`.**

**Legend:**
- **C R U D** = Create, Read, Update, Delete.
- **Own** = only their own records.
- **—** = no access.
- **R\*** = read without sensitive fields (cost price, credentials).

## Roles
| Role | Who | Purpose |
|---|---|---|
| `super-admin` | Owner | Everything, including payment credentials, role management and destructive actions |
| `admin` | Trusted manager | Day-to-day administration of everything except super-admin-only settings |
| `store-manager` | Store lead | Catalogue, pricing, orders, customers, content |
| `inventory-manager` | Stock controller | Stock levels, stock movements, suppliers, low-stock reports |
| `order-fulfillment` | Packing / dispatch | Process orders, shipments, tracking, packing slips |
| `marketing` | Marketing & content | Coupons, campaigns, home page, blog, SEO, notification templates |
| `support` | Customer service | View customers and orders, add notes, start returns, resend notifications |
| `customer` | Shoppers | Storefront only: own profile, addresses, orders, wishlist, reviews |

## Permissions
| Resource | super-admin | admin | store-manager | inventory-manager | order-fulfillment | marketing | support | customer |
|---|---|---|---|---|---|---|---|---|
| Admin panel access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Users: staff accounts & roles | CRUD | CRU (no super-admin) | — | — | — | — | — | — |
| Users: customers | CRUD | CRUD | RU | — | R | R | RU | Own RU |
| Products / variants | CRUD | CRUD | CRUD | R, U stock | R | CRU (no price, cost or stock) | R | R (published) |
| Cost price field | RU | RU | RU | R | — | — | — | — |
| Categories / brands / tags / taxonomies | CRUD | CRUD | CRUD | R | R | CRU | R | R |
| Stock movements | CRUD | CRUD | CR | CR | R | — | R | — |
| Media | CRUD | CRUD | CRUD | CRU | R | CRU | R | R |
| Orders | RUD | RUD | RU | R | RU (status, shipment) | R | RU (notes) | Own R |
| Refunds / returns | All steps | All steps | All steps (refund: store manager only) | — | R, receive | — | R, approve/reject, receive | Own request (7 days after delivery) |
| Couriers | CRUD | CRUD | CRUD | R | R | R | R | — |
| COD reconciliation | R, record | R, record | R, record | — | R | — | R | — |
| Transactions (payment log) | R | R | R | — | — | — | R | — |
| Bank slips: view, verify / reject | R, verify | R, verify | R, verify | — | R | — | R, verify | Own upload (private link) |
| Coupons & promotions (`discounts`) | CRUD | CRUD | CRUD | — | — | CRUD | R | — |
| Checkout settings (delivery zones & rates, COD/bank rules, gift wrap, terms version) | RU | RU | RU | R | R | R | R | R (fees only, via checkout) |
| **Payment settings & credentials** | RU | RU\* (no credentials) | R\* | — | — | — | R\* | — |
| Notification templates & toggles | CRUD | CRUD | R | — | — | CRU | R | — |
| Pages / blog / home page | CRUD | CRUD | CRU | — | — | CRUD | R | R (published) |
| Reviews moderation | CRUD | CRUD | RUD | — | — | RU | RU | Own C (review form) |
| Reports & analytics | ✅ all | ✅ all | ✅ sales, products | inventory only | fulfilment only | marketing, coupons | — | — |
| Audit log | R | R | — | — | — | — | — | — |
| Store settings | RU | RU | R | — | — | RU (announcements) | R | — |

## Rules implemented in Sprint 0
- `users.access.admin`: only staff roles can sign in to `/admin`.
- `users.read` / `users.update`: admins and support see everyone. Everyone else sees only themselves (row-level `where`).
- `users.roles` field: only admins can set roles. Public sign-ups are forced to `customer`. Only a super-admin can grant `super-admin`.
- Bootstrap: the very first user becomes `super-admin`.
- `media`: anyone can read. Store manager, inventory and marketing can create and update. Store manager (and admin) can delete.

## Rules implemented in Sprint 1 (catalogue)
- `products`: the public reads **published** products only; staff read drafts too.
  - Create and delete: store-manager, marketing (and admin).
  - Update: store-manager, inventory-manager, marketing.
  - **Field level:**
    - `price`: store-manager only.
    - `compareAtPrice`: store-manager and marketing.
    - `cost`: read by store-manager and inventory-manager, edited by store-manager only.
    - `stock` and `lowStockThreshold`: store-manager and inventory-manager.
  - Edits a role isn't allowed to make are ignored, not saved.
- `categories`, `brands`, `tags`, `concerns`: public read. Store-manager and marketing edit.
- `stock-movements`: read by store-manager, inventory-manager, order-fulfillment and support. Nobody can edit or delete history.
- `home-page` global: store-manager and marketing.
- Covered by integration tests (`tests/int/catalog.int.spec.ts`): an inventory manager changing stock is logged with their user, and their price edits are ignored; drafts are hidden from the public.

## Rules implemented in Sprint 1.5 (admin & lifestyle)
- `recipients`, `occasions`: public read. Store-manager and marketing edit.
- `POST /api/products/adjust-stock` (Inventory screen): admin, store-manager and inventory-manager only. It runs with the caller's own access (`overrideAccess: false`), so field rules still apply. Each change is logged with the reason and note.
- The custom admin sidebar and ⌘K palette only show sections the signed-in role can read. Bulk actions in the products list go through the REST API, so collection and field access are enforced on the server.

## Rules implemented in Sprint 2 (discovery)
- **`reviews`:**
  - The public reads **approved** reviews only. `authorEmail`, `user` and `moderationNote` are readable by staff only.
  - Create and update: store-manager, marketing, support. Delete: store-manager, marketing (and admin).
  - Shoppers submit through `POST /api/reviews/submit`, which is rate-limited (5 per hour per IP), has a honeypot, and always creates the review as *pending*.
- **`review-media`:** staff read everything; the public reads only photos whose review is approved (`public` flag set by the review hook). Moderators manage them.
- **`search-queries`:** read by store-manager and marketing (and admin). Written only by the server.
- **CSV:**
  - Export: admin, store-manager, inventory-manager, marketing. Cost is included only for price roles.
  - Import: prices and cost need store-manager; stock and the low-stock threshold need inventory-manager or store-manager. Fields a role can't change are reported as skipped, and the update runs with the caller's access.

## Rules implemented in Sprint 3 (accounts & security)
- **Users:**
  - Admins read and edit everyone.
  - Store managers and support read and edit customers (and themselves).
  - Fulfilment and marketing read customers.
  - Everyone else, customers included, reads and edits only their own account. Non-admin staff never see other staff accounts.
  - Only admins change roles. Only a Super Admin grants Super Admin; anyone else gets a clear error.
  - Public sign-up always creates a customer.
- **Deletes:** products, categories, brands and taxonomies can only be deleted by store managers (and admins). Marketing creates and edits them.
- **Reviews:** created by shoppers through the form (staff can't post reviews). Update by store manager, marketing and support; delete by store manager.
- **Audit log:** read by admins (and super-admins). Nobody can create, edit or delete entries through the API.
- **Inventory screen:** stock changes need store manager or inventory manager. Fulfilment and support see it read-only, and marketing doesn't see it.
- **Customers:** blocked from `/admin` (403). A customer API call only ever returns their own user record.

## Rules implemented in Sprint 4 (checkout)
- **Orders:**
  - **Nobody creates an order directly**, staff included. Orders are only made by `POST /api/orders/place`, which prices everything on the server.
  - Every staff role reads orders. Customers read only their own (`customer = me`); guests see theirs only on the confirmation page, with the private link token.
  - Update: store manager, fulfilment and support (and admin). Delete: admins only. Field-level limits for fulfilment (status, shipment) and support (notes) arrive with the fulfilment screens in Sprint 6.
  - `accessToken` (the guest link) is never readable through the API. `staffNotes` and the client IP are staff only.
  - Money fields (prices, discounts, totals) are read-only in the admin.
- **Discounts:** read by store manager, marketing and support; created, edited and deleted by store manager and marketing. Each create or change of value or status is audited.
- **Checkout settings:** anyone can read (the checkout needs the fees); only store managers (and admins) change them, and each change is audited.
- **Checkout endpoints:** `quote` is rate-limited to 120 per minute per IP and `place` to 10 orders per 10 minutes per IP.

## Rules implemented in Sprint 5 (payments)
- **Payment settings:** read by store manager and support (and admins); changed by admins. Gateway credentials (merchant IDs, secrets, API keys, keys) are read and changed by **Super Admins only**, and an environment variable always overrides the stored value.
- **Transactions:** read by store manager and support (and admins). Nobody creates, edits or deletes them through the API; the server writes them. Raw gateway data on each event is admin-only, and card details are never stored.
- **Bank slips:** never public. Uploaded only with the order's private link or by the signed-in owner (`POST /api/orders/slip`, 10 per hour per IP, photo or PDF up to 8 MB). Read by store manager, support and fulfilment.
- **Payment actions** (`POST /api/orders/:id/payment`): verify or reject a slip: store manager and support; mark a bank transfer received: store manager; cash collected: store manager and fulfilment (admins can do all). Each is audited (`payment`) and logged as a transaction.
- **Order payment status** can no longer be edited by hand: only gateways, slip decisions and the actions above change it, so the transactions log always explains it.
- **Gateway notifications** are accepted only with a valid signature and the exact order amount; anything else is recorded and changes nothing.

## Rules implemented in Sprint 6 (orders & delivery)
- **Order status:** staff (store manager, fulfilment, support) can only move an order along the allowed steps (`lib/orders/lifecycle.ts`): e.g. it can't be packed or shipped before it's paid (COD excepted), can't be shipped without a courier and tracking number (unless the courier needs none), and can't be cancelled once shipped. Gateways and scheduled jobs (no user) are trusted. Bulk changes run each order through the same rules and report failures.
- **Returns:** shoppers request with the private link or signed in, within 7 days of delivery; food can't be returned. Approve or reject: store manager and support. Mark received (and restock): store manager, support, fulfilment. Refund and close: store manager. Each step is audited and emailed.
- **Refunds** (order Payment panel or a return): store manager (and admins) only, never more than was paid. PayHere refunds use the Refund API with a separate App ID/secret (Super Admin only); bank and cash refunds need the bank reference.
- **COD remittance:** recorded by store managers (and admins) for delivered COD orders only, never twice; read by support and fulfilment.
- **Couriers:** read by staff; managed by store managers.
- **Invoices and packing slips** (`/print/orders`): staff for any order; a shopper only their own invoice (private link or signed in).
- **Order tracking:** order number + the mobile used at checkout (10 lookups per 10 minutes per IP; the same answer for a wrong number or an unknown order).

## Testing
`tests/int/rbac.int.spec.ts` (TOS-401) signs in as every role and checks the allowed and denied operations above through the same access rules the API uses (20 checks, including orders, discounts and checkout settings). `tests/int/checkout.int.spec.ts` covers order privacy (customers see only their own, the token is never exposed). Any access change must update this matrix and that test together.
