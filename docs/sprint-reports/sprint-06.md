# Sprint 6 Report: Orders & Delivery

**Date:** 16 Nov 2026 (started early, planned 1–12 Feb 2027) · **Status:** ✅ Complete (courier APIs wait for courier accounts) · **Version:** 0.8.0

## Goal
Staff can take every order from paid to delivered with the right checks, print what the warehouse needs, and handle returns, refunds and courier cash. Shoppers can track an order, reorder, and ask for a return without calling.

## Delivered
| Story | What shipped |
|---|---|
| TOS-701 Orders list | Filters by payment status, method, delivery and date range; search by order number, name, phone or **tracking number**; tick orders to change status in bulk or print them. Each order in a bulk change is checked on its own, and the ones that can't move are listed with the reason. |
| TOS-702 Lifecycle | Allowed steps: pending payment → processing → packed → shipped → out for delivery → delivered → completed, with on hold, cancelled (only before shipping), failed delivery and returned. Packing and shipping need payment (COD excepted); shipping needs a courier and a tracking number (own riders excepted). The date of each step is kept. |
| TOS-703 Invoices & packing slips | Printable A4 pages ("Print / Save as PDF"), one or many orders at once. Packing slips show **COLLECT Rs X CASH** for COD, the gift message, a checkbox per item, and no prices when the shopper asked to hide them for a gift. |
| TOS-704 Couriers & tracking | **Settings › Couriers** with tracking links (`{tracking}` placeholder). Courier and tracking number on each order. Shoppers get an "on its way" email with the tracking link. Starter list: Koombiyo, Domex, Pronto, own rider (Colombo). |
| TOS-705 Tracking | **/track-order:** order number + the mobile used at checkout → the **order page** (`/orders/…`) with the five steps and dates, courier link, payment state, items, invoice. |
| TOS-305 Order history | Account › Orders opens the same order page; **Buy again** adds the items at today's prices and opens the bag. |
| TOS-706 Returns & refunds | Shoppers ask from the order page within 7 days of delivery: items and quantities, a reason, a few words. Food can't be returned. Staff approve or reject (emailed), mark items received (back into stock if resellable), then refund. **Refunds** also from the order's Payment panel: PayHere through its Refund API (partial refunds supported), test-gateway payments on the test gateway, bank and cash refunds recorded with the bank reference. Never more than was paid. |
| TOS-707 COD reconciliation | **Sales › COD reconciliation:** cash still with each courier, order by order; tick the orders a courier payment covers, enter its reference, record it. Orders are marked paid and can't be counted twice. |

## Re-planned
| Item | Why | Now in |
|---|---|---|
| Courier API integration (TOS-708, Could) | Needs business accounts and API access with Koombiyo / Domex | When the owner has courier accounts |
| SMS / WhatsApp for shipped and delivered | Notifications sprint | Sprint 7 |

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean |
| Integration tests | ✅ 99 of 99. New (10): lifecycle rules; staff must follow the steps and shipping needs courier + tracking (dates kept); unpaid bank orders can't be packed; cancel and failed-delivery returns restock; bulk status with per-order failures and marketing refused; returns only after delivery, no food, not more than bought, private link required; request → approve → receive (restock) → refund with role checks, the order becomes returned; test-gateway refund within limits; the PayHere Refund API calls (token, then refund with amount); COD remittance for delivered orders only, store managers only, never twice. |
| End-to-end tests (production build) | ✅ 35 of 35 on two fresh-server runs. New: tracking with a wrong then right mobile → order page → Buy again; the shopper's invoice. |
| Visual QA | Orders list with filters and bulk bar; packing slip and invoice; tracking page and order page on a phone |

## Bugs found and fixed
| Bug | Fix |
|---|---|
| The lifecycle check compared the new status with itself, so every step was allowed (caught by the first integration run) | It checks from the order's current status |
| The tracking form cleared what the shopper typed after an error (React resets forms after each submit) | The form is refilled from the last attempt |
| Repeated e2e runs sold out the demo product they buy (each test order reserves stock) | A Playwright teardown cancels test orders (stock back) and deletes them; 44 old test orders released |
| e2e runs back to back hit the per-connection limits (tracking 10 / 10 min) | Documented: run the suite against a freshly started server. The limits stay, as they protect shoppers' order numbers |

## Demo checklist
1. `pnpm seed:demo` (adds the couriers). Place a COD order.
2. **Admin › Orders:** filter by Cash on delivery, tick the order, set **Packed**. Try **Shipped** without a courier: it explains why not.
3. Open the order, choose the courier and tracking number, set **Shipped**: the "on its way" email arrives in Mailpit.
4. Tick a few orders → **Packing slips** / **Invoices**.
5. **/track-order:** order number + mobile → the order page. Try **Buy again**.
6. Mark it **Delivered**, then from the order page **Return items**. In **Sales › Returns**: Approve → Items received → Refund.
7. **Sales › COD reconciliation:** tick the delivered COD orders and record a courier payment.

## Before going live (owner)
- Add each courier's tracking link in Settings › Couriers (the format comes with your courier account).
- For card refunds from the admin: create a PayHere Business App with the Payment Refund permission and give the App ID and secret (server environment).

## Retro
- **Went well:**
  - One set of lifecycle rules serves single edits, bulk edits and tests, and explains itself to staff in plain sentences.
  - The integration tests caught the lifecycle bug before anyone saw it.
- **To improve:**
  - End-to-end tests that place real orders must give their stock back; the teardown now does that. Tests that reshape shared data need cleanup from the start.

## Next sprint (Sprint 7): notifications
Editable email templates, SMS (Notify.lk or Text.lk), WhatsApp order updates with opt-in, staff alerts, back-in-stock alerts, and per-event switches with a sent-message log.
