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
| Products / variants | CRUD | CRUD | CRUD | R, U stock | R | R, U SEO | R | R (published) |
| Cost price field | RU | RU | RU | R | — | — | — | — |
| Categories / brands / tags | CRUD | CRUD | CRUD | R | R | CRU | R | R |
| Stock movements | CRUD | CRUD | CR | CR | R | — | R | — |
| Media | CRUD | CRUD | CRUD | CRU | R | CRU | R | R |
| Orders | CRUD | CRUD | CRU | R | RU (status, shipment) | R | RU (notes) | Own R |
| Refunds / returns | CRUD | CRUD | CRU | R | R | — | CR (request) | Own C (request) |
| Transactions | R | R | R | — | — | — | R | — |
| Coupons & promotions | CRUD | CRUD | CRUD | — | — | CRUD | R | — |
| Shipping zones & rates | CRUD | CRUD | RU | — | R | — | R | — |
| **Payment settings & credentials** | RU | R\* | — | — | — | — | — | — |
| Notification templates & toggles | CRUD | CRUD | R | — | — | CRU | R | — |
| Pages / blog / home page | CRUD | CRUD | CRU | — | — | CRUD | R | R (published) |
| Reviews moderation | CRUD | CRUD | RUD | — | — | RU | RU | Own CRU |
| Reports & analytics | ✅ all | ✅ all | ✅ sales, products | inventory only | fulfilment only | marketing, coupons | — | — |
| Audit log | R | R | — | — | — | — | — | — |
| Store settings | RU | RU | R | — | — | RU (announcements) | R | — |

## Rules implemented in Sprint 0
- `users.access.admin`: only staff roles can sign in to `/admin`.
- `users.read` / `users.update`: admins and support see everyone. Everyone else sees only themselves (row-level `where`).
- `users.roles` field: only admins can set roles. Public sign-ups are forced to `customer`. Only a super-admin can grant `super-admin`.
- Bootstrap: the very first user becomes `super-admin`.
- `media`: anyone can read. Store manager, inventory and marketing can create and update. Store manager (and admin) can delete.

## Testing
From Sprint 3 (TOS-401), each cell in the table above gets an automated integration test (`tests/int/rbac.int.spec.ts`) that logs in as each role and checks the allowed and denied operations.
