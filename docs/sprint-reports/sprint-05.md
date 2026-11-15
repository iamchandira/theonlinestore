# Sprint 5 Report: Payments

**Date:** 15 Nov 2026 (started early, planned 18–29 Jan 2027) · **Status:** ✅ Complete (Koko and Mintpay live adapters wait for the providers' merchant guides) · **Version:** 0.7.0

## Goal
Shoppers can pay by card, in instalments, by bank transfer with a slip, or cash on delivery. Every payment is verified by the server, logged, and reconcilable; staff can switch methods and set limits without a developer.

## Delivered
| Story | What shipped |
|---|---|
| TOS-601 Payment settings | **Settings › Payments:** each method on or off, its position at checkout, minimum and maximum order, label; Test or Live mode; how long unpaid online orders are held (60 min). Gateway credentials are Super Admin only; `PAYHERE_*`, `KOKO_*`, `MINTPAY_*` environment variables override them. |
| TOS-602 PayHere | Signed checkout form to PayHere's sandbox or live page; signed server notification checked for merchant, signature and the exact amount. Repeats are ignored, a late failure never un-pays an order, card details are never stored. |
| TOS-603 Koko · TOS-604 Mintpay | Shown with "3 × Rs X, today and over the next 2 months" and their own limits (Rs 1,000 to 100,000 / 150,000). The full flow runs on the test gateway. **Live adapters are not built yet:** both APIs are shared only with signed-up merchants. Until their guides arrive, both stay hidden on the live site. |
| TOS-605 Bank slips | Shoppers upload a photo or PDF on their order page (private link or account). Staff Verify or Reject it in the new **Payment panel** on each order, and the shopper gets a "payment received" or "couldn't confirm" email. |
| TOS-606 COD rules | Excluded districts, on top of the maximum order and fee. |
| TOS-607 Transactions | **Sales › Transactions:** every attempt, gateway message (with whether its signature passed), slip decision and cash collection, read-only. The sidebar shows how many slips are waiting. |

**Also shipped:**
- **Built-in test gateway** with Approve / Decline / Cancel. It signs its answer like the real gateway and goes through the same checks, so the whole flow can be tried locally. It runs in Test mode only and never on the live site.
- **Pay page:** continues to the gateway; after a cancel or failure it says nothing was charged, shows how long the items are held, and offers Try again. The order page waits for the gateway ("Confirming your payment…") instead of claiming success.
- **Unpaid orders are released** every 5 minutes after their pay-by time (60 min online, 48 h bank transfer) and the stock goes back. Orders with a slip waiting, or still processing at a gateway, are kept.
- **Cash collected** button for COD orders (the start of COD reconciliation, TOS-707).
- Online orders get their confirmation email once payment is confirmed.

## Re-planned
| Item | Why | Now in |
|---|---|---|
| Koko and Mintpay live adapters | Their APIs are private to signed-up merchants | As soon as the owner forwards the merchant guides and sandbox keys |
| A live PayHere sandbox run | Needs a PayHere sandbox account and a public HTTPS address for the notification | Staging deployment (Sprint 10), or earlier with a tunnel |
| Refunds from the admin (TOS-602 AC) | Belongs with returns; needs PayHere's refund API | Sprint 6 (TOS-706) |

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean |
| Integration tests | ✅ 89 of 89. New (15): PayHere hash and md5sig against the published formulas; payment options (limits, instalments, COD districts, switched-off methods); card order holds stock and sets a pay-by time; test gateway without credentials; bad signature changes nothing; decline then retry; pay once (repeats and late failures ignored); wrong amount refused and order on hold; PayHere form and signed notification through the real endpoint (forged one refused, card details not stored); unpaid release with stock back; slip upload with private link only; only payment roles verify, reject needs a reason; cash collected; who can read transactions and gateway secrets. |
| End-to-end tests (production build) | ✅ 33 of 33, two runs in a row. New: card declined → Try again → approved → confirmation email; Koko on a phone with 3 instalments; bank transfer slip upload. |
| Manual checks | Card decline and retry in the browser; slip upload (wrong link, wrong file type refused); slip, transactions and settings return 403 to the public; Verify in the admin Payment panel; emails in Mailpit |

## Bugs found and fixed
| Bug | Fix |
|---|---|
| The pay page never left for the gateway in development: React runs effects twice and the "start once" guard cancelled the only start | The guard is set when the start actually runs |
| Opening any order page emptied the shopper's current bag (Sprint 4) | Only within 15 minutes of ordering |
| The place-order limit (10 per 10 min per address) would block shoppers behind shared mobile addresses, and tripped the test suite | 30 per 10 minutes |
| The browser tab said "Order confirmed" on unpaid orders | "Your order" |

## Demo checklist
1. `docker compose up -d`, `pnpm dev`. Check out with **Card**: you land on the test gateway. Decline, then Try again and Approve: the order is paid and the email arrives in Mailpit (http://localhost:8026).
2. Check out with **Koko**: see 3 × Rs X at checkout and on the gateway.
3. Check out with **Bank transfer**, then upload any photo as the slip on the order page.
4. **Admin › Sales › Transactions:** the attempts, with "Signature checked". Open the bank order: Verify the slip in the Payment panel.
5. **Admin › Settings › Payments:** turn Mintpay off, set COD "Not available in" Jaffna, and check the checkout.
6. Leave a card order unpaid for over an hour (or change its Pay by time): it's cancelled and the stock returns.

## Before going live (owner)
- Create a PayHere merchant account, add the domain, and put the Merchant ID and secret in the server's environment.
- Ask Koko and Mintpay for their merchant integration guides and sandbox keys.
- Fill in the real bank details in Settings › Payments › Bank transfer.
- Switch Settings › Payments to **Live** only after a successful sandbox payment on staging.

## Retro
- **Went well:**
  - One function applies every gateway result (real or test), so the signature, amount and repeat checks are tested once and protect every path.
  - The test gateway made the whole flow testable end to end without accounts.
- **To improve:**
  - The rate limit counted test traffic like shoppers. Limits now account for shared mobile addresses, and the test suite runs against a fresh server.
  - Writing to a provider's private API without its guide would have been guesswork. It's better to say so and build the shared flow it plugs into.

## Next sprint (Sprint 6): orders & delivery
Bulk status changes, lifecycle rules, packing slips and invoices, courier tracking, a shopper tracking page, returns and refunds (including PayHere refunds), COD reconciliation per courier, and order history in the account.
