# Sprint 4 Report: Checkout

**Date:** 15 Nov 2026 (started early, planned 4–15 Jan 2027) · **Status:** ✅ Complete · **Version:** 0.6.0

## Goal
A shopper can go from bag to placed order in one page, as a guest or signed in, with coupons, district delivery fees, gift options and recorded terms acceptance. Every rupee is calculated on the server, stock can't be oversold, and the shopper gets a confirmation page and email.

## Delivered
| Story | What shipped |
|---|---|
| TOS-501 Server bag | The bag is saved to the account. At sign-in the device bag and account bag merge, keeping the larger quantity of each item. Lines are re-priced and clamped to stock by the server, and the bag empties after an order (on every tab). |
| TOS-502 One-page checkout | `/checkout`, as a guest or signed in. See "Checkout" below. |
| TOS-503 Coupons | **Sales › Discounts:** percent, fixed amount, free delivery and buy-X-get-Y. Automatic or by code, with start and end dates, total and per-customer limits, minimum spend, maximum discount, first order only, exclude sale items, and scope by products, categories (including sub-categories) or brands. |
| TOS-504 Discount engine | See "Pricing" below. |
| TOS-505 Delivery fees | **Settings › Checkout & delivery:** zones by district (Colombo Rs 350; Gampaha and Kalutara Rs 400; elsewhere Rs 450), Rs 100 per extra kg over 1 kg, free above Rs 10,000 after discounts. Same-day delivery in Colombo for Rs 650 when ordered before 12 noon (not on Sundays). |
| TOS-506 Notes & gift options | Gift wrap (Rs 250), a handwritten message, "hide prices" for gifts, and a note for the store or courier. |
| TOS-507 Terms acceptance | Orders can't be placed without ticking the terms. The time and the terms version are stored on the order. Summary `/terms`, `/returns` and `/privacy` pages are live. |
| TOS-508 Confirmation | "Order confirmed" page with next steps (bank details with the order number as reference, or the COD reminder), address, items and totals, plus a branded email. |
| TOS-509 Address helpers | Signed-in shoppers pick a saved address; anyone gets the 25-district picker with town suggestions for that district. |
| TOS-307 Account from a guest order | On the confirmation page a guest adds a password. After confirming the email and signing in, the order is in Account › Orders. |

**Checkout:**
- Numbered sections: contact → delivery address → delivery → payment → gift & notes, with a coupon box in the summary.
- Payment: **cash on delivery** (up to Rs 50,000) and **bank transfer** (items held 48 hours). Card, Koko and Mintpay show as "coming soon" until Sprint 5.
- Every fee is in the summary before the button, and the button repeats the total ("Place order · Rs 3,535").
- Errors appear next to each field, with a banner, and the page scrolls to the first one.
- The summary is sticky on desktop and a collapsible bar on phones.

**Pricing (TOS-504):**
- One pure function (`quote()`) in `src/lib/checkout/pricing.ts`, used by the checkout page, the quote endpoint and order placement.
- Order: line totals → automatic promotions by priority → one coupon (the better of coupon or promotions when they don't combine) → delivery → gift wrap.
- Discounts are spread across lines and rounded to the rupee per line.
- 27 tested scenarios (the backlog asked for 20).

**Placing an order:**
- The server re-checks everything. If the total isn't the one the shopper saw (a price change, stock, a coupon running out, same-day closing), nothing is placed and the shopper is told why.
- Stock is reserved inside one database transaction that locks the products. Two shoppers racing for the last units can't both get them; this is tested.
- The order, stock decrease (logged as a sale in Stock history), coupon count and bag clear all succeed or all roll back.
- The email is sent after the order is saved and never blocks it.

**For staff (early parts of Sprint 6):**
- **Sales › Orders:** today's orders and sales, to-process and awaiting-payment counts, status tabs, and search by order number, name, email or phone. A badge in the sidebar counts open orders.
- Each order shows the items, totals, timeline and staff notes. Cancelling an order puts its stock back once.
- **Dashboard:** a 14-day sales card (revenue, orders, average order, daily bars, recent orders).

## Re-planned
| Item | Why | Now in |
|---|---|---|
| Card, Koko and Mintpay | Payment gateways are the Sprint 5 goal | Sprint 5 |
| Bank slip upload and verification | Belongs with payment verification | Sprint 5 (TOS-605) |
| Packing, couriers, tracking, invoices; field-level limits for fulfilment and support | Fulfilment screens | Sprint 6 |
| Releasing unpaid bank-transfer orders after 48 h | Needs a scheduled job | Sprint 5 |

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean |
| Integration tests | ✅ 74 of 74. New: 27 pricing scenarios; 14 checkout checks (database prices, unknown coupons, the COD limit, form errors, changed totals, a COD order with stock/coupon/totals, a used-up coupon, the race for the last units, sold-out items, bank transfer linked to the account, order privacy, no direct order creation, restock once on cancel); 4 RBAC checks (orders, discounts, checkout settings). |
| End-to-end tests (production build, real emails) | ✅ 30 of 30, on two runs in a row. New: missing fields are pointed out on a phone; guest checkout with WELCOME10, bank transfer and gift wrap → confirmation page → email → account from the order → confirm email → sign in → the order is in Account › Orders. |
| Manual API checks | Quote maths (3,150 − 315 + 450 + 250 = 3,535), price-change 409, first-order coupon reuse refused, stock clamp, FREEDEL on bank transfer, validation messages, confirmation emails in Mailpit |
| Visual QA | Checkout and confirmation on a phone; admin Orders, order detail, Discounts, Checkout settings and dashboard on desktop |

## Bugs found and fixed
| Bug | Fix |
|---|---|
| A product with any stock history could not be deleted, by staff or by tests: the history's product link was required, but the database clears it when the product goes | The link is optional; history stays readable by SKU and variant |
| Reopening the admin sidebar before the saved preference loaded wasn't remembered, and the late preference closed it again (seen on slow connections and in the full test run) | The click itself saves the choice |
| On phones, the WhatsApp button covered the trust line next to Place order | Hidden on `/checkout` (still on the confirmation page) |
| The Discounts list showed "<No Value>" for free-delivery and buy-X-get-Y codes | A plain-language Offer column ("Buy 2, get 1 free", "Free delivery over Rs 5,000") |

## Demo checklist
1. `docker compose up -d`, `pnpm dev`, and `pnpm seed:demo` for the demo codes.
2. Add two items to the bag and open `/checkout`. Pick district **Kandy**: the delivery fee shows before anything is placed.
3. Apply **WELCOME10**, tick gift wrap, choose **Bank transfer**, accept the terms and place the order.
4. On the confirmation page, check the bank details. Open Mailpit (http://localhost:8026) for the email. Add a password to create an account.
5. Try **WELCOME10** again with the same email or phone: "for first orders only".
6. Pick **Colombo** before noon to see same-day delivery. Add over Rs 10,000 to see free delivery.
7. **Admin:**
   - Sales › Orders shows the new order. Open it, change the status, and see the timeline.
   - Cancel an order and check that the stock comes back in Inventory.
   - **Settings › Checkout & delivery:** change the free-delivery threshold and see it on the checkout.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| Policy pages are summaries | The full legal text needs the owner's approval (Sprint 9) |
| Bank account details are placeholders in Checkout settings | The owner fills them in before launch |
| No SMS or WhatsApp confirmation yet | Sprint 7 |
| Rate limits are per server | Shared store when scaling out (Sprint 10) |

## Retro
- **Went well:**
  - Keeping pricing as one pure function made it easy to test thoroughly, and the page, the quote and the order can never disagree.
  - Calling the endpoints directly from integration tests covered the race and rollback cases that a browser test can't reach.
- **To improve:**
  - Test cleanup was swallowing errors, which hid a real bug: stock history blocked deleting products. Cleanup failures are now worth reading.
  - Test fixtures should never share contact details with manual QA data, because first-order rules key on email and phone.

## Next sprint (Sprint 5): payments
Payment settings, PayHere, Koko and Mintpay (sandbox), bank slip upload and verification, COD district rules, and a transactions log. See `03-sprint-plan.md`.
