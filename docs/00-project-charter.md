# 00 · Project Charter: The Online Store (theonlinestore.lk)

| | |
|---|---|
| **Version** | 1.0 (Sprint 0) |
| **Date** | 15 Nov 2026 |
| **Status** | Approved to start Sprint 1 |
| **Product owner** | The Online Store (client) |
| **Delivery** | Claude Code, working with the product owner |

## 1. Vision
> **Shop more. Live better.** The Online Store is Sri Lanka's friendliest online lifestyle boutique. It sells genuine beauty, fragrances, footwear, gifts and chocolates, and makes it effortless to discover, trust and buy them from any corner of the island.

## 2. Problem and opportunity
- Sri Lankan shoppers buy beauty and gifts online mostly through Facebook and Instagram pages and WhatsApp. This brings slow replies, unclear prices, doubts about authenticity, and no order tracking.
- Local stores such as CanadaMart, Omini, SimplyTek, Cyberdeals and AGC show demand for structured eCommerce. Most of them are visually busy, though, and hard to use on phones.
- The opportunity is a **calm, mobile-first, trustworthy** store with the operational depth of WooCommerce or Shopify (inventory, coupons, payments, delivery, notifications, analytics), built for local payment and delivery habits.

## 3. Objectives (measurable)
| # | Objective | Target (first 6 months after launch) |
|---|---|---|
| O1 | Fast, mobile-first experience | LCP < 2.5 s on 4G and CLS < 0.1 for 75% of visits |
| O2 | Accessible to everyone | WCAG 2.2 AA on all customer flows |
| O3 | Easy to buy | Checkout completion ≥ 55% of started checkouts |
| O4 | Trust | ≥ 4.5★ average on store reviews; < 2% COD refusal rate |
| O5 | Self-service operations | Staff run catalogue, orders, coupons and payments with no developer help |
| O6 | Discoverability | Product pages indexed, with rich results (Product, Offer, FAQ) |

## 4. Scope
**In scope (MVP, Sprints 0–10)**
- Storefront: home, categories, search and filters, product pages, wishlist, bag, checkout, account, order tracking, content pages and blog.
- Catalogue: products, variants (size, shade, scent, pack), categories, tags, brands, inventory and stock alerts.
- Commerce: coupons and discounts, delivery fees (district or weight based), order notes, T&C acceptance, gift wrap.
- Payments, all configurable by admins: PayHere (cards and wallets), Koko and Mintpay (BNPL), bank transfer (slip upload and verification), Cash on Delivery.
- Orders: status lifecycle, fulfilment, courier tracking, invoices, returns and refunds.
- Notifications: email, SMS, WhatsApp.
- Role-based access control for staff.
- Analytics, stats and reports.
- SEO, GEO (generative engine optimisation) and AEO (answer engine optimisation).

**Out of scope for MVP (candidates for later phases)**
- Native mobile apps.
- Multi-vendor marketplace.
- Sinhala and Tamil versions of the site.
- Loyalty points.
- POS integration.
- Multi-warehouse inventory.

## 5. Stakeholders
| Role | Responsibility |
|---|---|
| Owner / Product owner | Priorities, approvals, pricing, supplier and brand content |
| Store manager | Catalogue, orders, customer service |
| Fulfilment staff | Picking, packing, courier hand-off |
| Marketing | Campaigns, coupons, content, SEO |
| Customers | Shoppers across Sri Lanka (see personas in `08-ux-guidelines.md`) |
| Development | Architecture, build, QA, deployment, documentation |

## 6. Key decisions (Sprint 0)
| Decision | Choice | Why |
|---|---|---|
| Platform | **Next.js 16 + Payload CMS 3** in one codebase | Admin panel, strong access control, SEO and jobs out of the box; full control over the UX |
| Database | PostgreSQL 16 | Relational integrity for orders and inventory; full-text search |
| UI | Tailwind CSS v4, GSAP, Framer Motion (`motion`), Tabler Icons | Your requirement (no Lucide) |
| Payments | PayHere, Koko, Mintpay, bank transfer, COD | Your selection; all can be switched on or off by admins |
| Docs | Markdown in `/docs`, plus a Claude Docs copy | Versioned with the code, and shareable |
| Version control | Local Git, one commit per sprint or feature | GitHub can be added later |

## 7. Assumptions
- Product photos supplied by the client (the catalogue PDFs) are a starting point. Higher-resolution photos will be provided before launch.
- Prices in the seed data are placeholders (`priceTBC`) until the owner confirms them.
- Merchant accounts for PayHere, Koko and Mintpay will be opened by the business. We build against their sandboxes.
- Hosting will be a managed VPS or cloud provider with Postgres and object storage for media (decided in Sprint 10).

## 8. Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Delays in payment gateway merchant approval | Launch slips | Build in sandbox from Sprint 5; COD and bank transfer work without a gateway |
| Low-quality product images | Lower conversion | Image guidelines in `05-brand-and-design-system.md`; replace before launch |
| COD order refusals | Lost delivery fees | SMS OTP verification for COD (suggested story), COD limits by order value |
| Courier API availability | Manual tracking | Start with manual tracking numbers; add integrations as APIs allow |
| Scope creep | Timeline | MoSCoW backlog; "Suggested" items only after the Must items |

## 9. Milestones
| Milestone | Target |
|---|---|
| Sprint 0: Foundation and design system | 15 Nov 2026 ✅ |
| Catalogue live in admin (Sprint 1) | 27 Nov 2026 |
| Checkout with COD and bank transfer (Sprint 4) | 15 Jan 2027 |
| Online payments (Sprint 5) | 29 Jan 2027 |
| Feature complete (Sprint 9) | 26 Mar 2027 |
| **Go-live, ahead of the Avurudu season** (Sprint 10) | **9 Apr 2027** |
