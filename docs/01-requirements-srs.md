# 01 · Software Requirements Specification (SRS)

Version 1.0 · 15 Nov 2026. Requirement IDs are referenced by the backlog (`02-product-backlog.md`).

## 1. Functional requirements

### FR-CAT: Catalogue, variants and inventory
| ID | Requirement |
|---|---|
| FR-CAT-01 | Admins create, edit, schedule, publish and archive **products**: name, slug, brand, description (rich text), benefits, how to use, ingredients, images and video, SEO fields. |
| FR-CAT-02 | Products support **variants** across up to 3 option types (Size, Shade, Scent, Flavour, Pack, Set, Colour, Shoe size). Each variant has a SKU, barcode, price, compare-at price, cost, weight, image(s) and stock. |
| FR-CAT-03 | Hierarchical **categories** (e.g. Skincare › Serums), **tags**, **brands** and **concerns** (acne, brightening and so on). A product may belong to several categories. |
| FR-CAT-04 | **Inventory**: per-variant stock, low-stock threshold, an option to allow or deny backorders, stock reserved at checkout and released on cancel or expiry, and an audit log of stock movements. |
| FR-CAT-05 | Low-stock and out-of-stock alerts go to inventory staff. "Notify me when back in stock" for customers. |
| FR-CAT-06 | Bulk CSV import and export of products and variants, plus bulk price and stock edits. |
| FR-CAT-07 | **Upsells** (better alternatives), **cross-sells** ("pairs well with") and **bundles**, all set manually by admins, with an automatic fallback by category and concern. |

### FR-DISC: Discovery
| ID | Requirement |
|---|---|
| FR-DISC-01 | Full-text **search** across product name, brand, category, tags and concerns. Typo tolerant, with autosuggest for products, brands and categories, plus popular and recent searches. |
| FR-DISC-02 | Faceted **filtering**: category, brand, price range, concern, skin or hair type, rating, in stock, on sale. Sort by relevance, bestsellers, newest, price and rating. Filters are stored in the URL so results can be shared. |
| FR-DISC-03 | **Wishlist**: works for guests (stored on the device) and is merged into the account at sign-in. Wishlist items can be shared. |
| FR-DISC-04 | Recently viewed products, and "customers also bought". |
| FR-DISC-05 | Product **reviews and ratings**, with a verified-buyer badge, photos, moderation and helpful votes. |

### FR-ACC: Customer accounts
| ID | Requirement |
|---|---|
| FR-ACC-01 | Registration with email and/or mobile, email verification, login, logout and "remember me". |
| FR-ACC-02 | Password reset by emailed link (and SMS OTP, suggested). Login lockout after 5 failed attempts. |
| FR-ACC-03 | Profile, address book (district, city, landmark), marketing consent, account deletion request. |
| FR-ACC-04 | **Order history** with status, invoices and re-order. **Order tracking** for signed-in customers and for guests (order number + phone or email). |

### FR-CART / FR-CHK: Bag and checkout
| ID | Requirement |
|---|---|
| FR-CART-01 | Bag drawer and bag page. Add, update and remove items, with a free-delivery progress bar. The bag persists across devices for signed-in users. |
| FR-CHK-01 | One-page checkout for guests and signed-in customers: contact, delivery address, delivery method, payment, review. |
| FR-CHK-02 | **Coupons**: percentage, fixed amount, free delivery, buy-X-get-Y. Limits: minimum spend, usage per customer and in total, date window, specific products, categories or brands, first order only. |
| FR-CHK-03 | **Discount calculation** engine: automatic promotions plus one coupon (stacking configurable), applied in a defined order and shown line by line. |
| FR-CHK-04 | **Delivery fees** by zone (the 25 districts, Colombo city), weight band and order value. Free-delivery threshold. Same-day option for Colombo (configurable). |
| FR-CHK-05 | **Payment method selection** showing only the methods an admin has enabled, with eligibility rules (e.g. COD max Rs 50,000, BNPL min/max). |
| FR-CHK-06 | **Order notes** and gift options (gift wrap, gift message, hide prices on the invoice). |
| FR-CHK-07 | **Terms and conditions acceptance** (required checkbox, recorded on the order with a timestamp and the T&C version). |
| FR-CHK-08 | **Order confirmation** page, plus confirmation email, SMS and WhatsApp. |

### FR-PAY: Payments (admin-configurable)
| ID | Requirement |
|---|---|
| FR-PAY-01 | Payment settings in the admin: enable or disable each method, set display order, fees or discounts per method, and min/max order value. Sandbox and live credentials are kept as encrypted secrets. |
| FR-PAY-02 | **PayHere** (cards, eZ Cash, mCash, Genie): hosted checkout, server-to-server notify callback, MD5 signature verification, refunds via API. |
| FR-PAY-03 | **Koko** and **Mintpay** (BNPL, 3 instalments): redirect flow, callback verification, status reconciliation. |
| FR-PAY-04 | **Direct bank transfer**: show the bank details, customer uploads a slip, staff verify or reject it, auto-cancel after N hours without payment. |
| FR-PAY-05 | **Cash on Delivery**: optional OTP verification and COD fee, with collection reconciled per courier. |
| FR-PAY-06 | Every payment attempt is recorded as a transaction (method, amount, status, gateway reference, raw callback) for audit. |

### FR-ORD: Orders and delivery
| ID | Requirement |
|---|---|
| FR-ORD-01 | Order status lifecycle: Pending payment → Processing → Packed → Shipped → Out for delivery → Delivered → Completed, plus On hold, Cancelled, Refunded, Returned and Failed delivery. |
| FR-ORD-02 | Staff order management: filters, search, bulk status updates, internal notes, timeline, packing slip and invoice PDF. |
| FR-ORD-03 | Courier assignment (e.g. Domex, Koombiyo, Pronto, Citypak) with tracking number and link. API integrations where available. |
| FR-ORD-04 | Customer-facing tracking timeline. |
| FR-ORD-05 | Returns and refunds: request, approve, receive, refund (to the original method or as store credit), with stock restocked automatically. |

### FR-RBAC: Role-based access control
| ID | Requirement |
|---|---|
| FR-RBAC-01 | Staff roles: Super Admin, Admin, Store Manager, Inventory Manager, Order Fulfilment, Marketing & Content, Customer Support. Customers can't access the admin. |
| FR-RBAC-02 | Permissions are enforced at collection, row and field level (see `06-rbac-matrix.md`). |
| FR-RBAC-03 | Audit log of sensitive actions (payment settings, refunds, role changes, price changes). |

### FR-NOTIF: Notifications
| ID | Requirement |
|---|---|
| FR-NOTIF-01 | Channels: **email** (SMTP or Resend), **SMS** (Notify.lk, Text.lk or Dialog eSMS), **WhatsApp** (Meta Cloud API, approved templates). |
| FR-NOTIF-02 | Triggers: order placed, payment received or failed, slip verified, shipped (with tracking), out for delivery, delivered, cancelled, refund issued, password reset, welcome, back in stock, abandoned cart. |
| FR-NOTIF-03 | Admins can edit templates and switch each trigger and channel on or off. Customers manage their consent. |
| FR-NOTIF-04 | Staff alerts: new order, low stock, slip uploaded, payment failure. |

### FR-ANL: Analytics, stats and reporting
| ID | Requirement |
|---|---|
| FR-ANL-01 | Dashboard: revenue, orders, AOV, conversion, top products, top categories and brands, sales by payment method, sales by district, new vs returning customers. |
| FR-ANL-02 | Reports: sales by day, week or month, product performance, inventory valuation, low stock, coupon performance, refunds, COD reconciliation. CSV export. |
| FR-ANL-03 | GA4 and Meta Pixel ecommerce events, using consent-aware loading. |

### FR-SEO: SEO, GEO and AEO
| ID | Requirement |
|---|---|
| FR-SEO-01 | Per page and product: meta title, description, canonical, OG and Twitter images, noindex controls. Clean URLs (`/p/{slug}`, `/c/{category}`, `/brands/{brand}`). |
| FR-SEO-02 | JSON-LD for Organization, WebSite (search box), BreadcrumbList, Product, Offer, AggregateRating, FAQPage and Article. |
| FR-SEO-03 | XML sitemaps (products, categories, brands, pages, blog), `robots.txt`, 301 redirect manager. |
| FR-SEO-04 | **GEO**: `llms.txt`, clean semantic HTML, factual product specs and comparison tables, so AI assistants can cite the store. |
| FR-SEO-05 | **AEO**: FAQ and "quick answer" blocks on products, categories and guides; How-to content for routines. |
| FR-SEO-06 | Blog / Beauty Journal and CMS pages built from content blocks. |

## 2. Non-functional requirements
| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | LCP < 2.5 s and INP < 200 ms (p75, 4G mid-range Android); CLS < 0.1. Images in AVIF or WebP, lazy-loaded below the fold. |
| NFR-02 | Accessibility | WCAG 2.2 AA: contrast (checked with `pnpm check:contrast`), keyboard access, focus visible, 44 px targets, reduced motion respected. |
| NFR-03 | Security | OWASP Top 10. HTTPS only, secure cookies, rate limits on auth and checkout, payment callbacks verified by signature, secrets never sent to the client, no card data stored (PCI SAQ-A). |
| NFR-04 | Privacy | Complies with the Sri Lanka Personal Data Protection Act (No. 9 of 2022): consent, purpose limitation, data export and deletion on request. |
| NFR-05 | Reliability | 99.5% uptime. Daily database backups kept for 14 days. Payment callbacks idempotent. |
| NFR-06 | Scalability | 5,000 products and 500 orders a day without architecture changes. |
| NFR-07 | Maintainability | TypeScript strict mode, lint clean, documented, with tests for pricing, discounts and access rules. |
| NFR-08 | Localisation | LKR currency, Asia/Colombo time, Sri Lankan phone and address formats. Ready for Sinhala and Tamil later. |
| NFR-09 | Browser support | Last 2 versions of Chrome, Safari (iOS 16+), Firefox, Edge, and Samsung Internet. |
