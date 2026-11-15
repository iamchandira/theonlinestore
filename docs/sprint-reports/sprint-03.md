# Sprint 3 Report: Accounts & Security

**Date:** 15 Nov 2026 (started early, planned 14–24 Dec) · **Status:** ✅ Complete (with three stories re-planned, see below) · **Version:** 0.5.0

## Goal
Customers can create an account, confirm their email, sign in, reset a password, keep addresses, control their marketing consent and personal data. Every staff role is enforced and tested against the RBAC matrix, sensitive actions are audited, and each role's dashboard shows what matters to it.

## Delivered
| Story | What shipped |
|---|---|
| TOS-301 Register & verify | See "Accounts" below. |
| TOS-302 Sign in / out, remember me | See "Accounts" below. |
| TOS-303 Password reset | See "Accounts" below. |
| TOS-304 Address book | See "Accounts" below. |
| TOS-306 Consent & deletion (PDPA) | See "Accounts" below. |
| TOS-203/206 follow-ups | **The wishlist syncs to the account:** the device list merges at sign-in, every change is saved, and the list is there on any device. Signing out clears it from the device. The review form fills in a signed-in shopper's name and email, and the review is linked to their account. |
| TOS-401 RBAC enforced & tested | See "Security" below. |
| TOS-402 Audit log | See "Security" below. |
| TOS-404 Role-relevant dashboard | See "Security" below. |

**Accounts:**
- **Register (TOS-301):** `/account/register` takes name, email, an optional mobile, password, marketing opt-in and terms.
  - Sign-up is protected by a honeypot and a rate limit.
  - A branded email with a confirmation link is sent, and accounts can't sign in until it's clicked. "Send the link again" is available.
  - Local emails land in **Mailpit** (http://localhost:8026).
- **Sign in and out (TOS-302):**
  - `/account/login` keeps you signed in for 30 days by default. Untick **Keep me signed in** and the session ends when the browser closes.
  - After 5 wrong passwords the account is locked for 15 minutes.
  - Sign-in returns you to the page you came from; only same-site addresses are allowed.
  - **Sign out** is in the account menu.
  - The header shows your initial when signed in.
- **Password reset (TOS-303):**
  - The reset link expires after 1 hour and works once.
  - The page says the same thing whether or not the email has an account.
  - Requests are limited to 5 per hour per IP.
  - After a reset you're signed in.
  - Staff reset links open the admin's own reset page.
- **Address book (TOS-304):**
  - Up to 10 addresses: label, recipient, mobile, two address lines, a **district picker for all 25 districts** (grouped by province), a **town field with suggestions** for that district, postal code, landmark and a default flag.
  - You can edit, delete and set the default.
- **Privacy & data (TOS-306):**
  - Marketing consent per channel (email, SMS, WhatsApp), with the time consent was given.
  - **Download my data** (JSON).
  - **Request account deletion:** you type DELETE to confirm, get an email confirmation, see that it's processed within 14 days under Sri Lanka's PDPA, and can cancel it. The request is logged for staff.

**Security:**
- **RBAC enforced & tested (TOS-401):**
  - The code and `06-rbac-matrix.md` now agree:
    - Only store managers (and admins) can delete products, categories, brands and taxonomies.
    - Reviews: store manager, marketing and support moderate; only store managers delete.
    - Customer records: store managers and support edit them; fulfilment and marketing can read them; other staff see only their own account.
    - Only a Super Admin can grant Super Admin, and an admin trying gets a clear error.
  - 16 automated checks cover every role.
  - Customers get a 403 on `/admin`.
- **Audit log (TOS-402):**
  - Records role changes, new staff accounts, price / was-price / cost changes (per SKU), deletions, review moderation, home page edits, CSV imports and account deletion requests.
  - Each entry has who, when, from which IP, and the before/after values.
  - Admins only; entries can't be edited or deleted.
- **Role-relevant dashboard (TOS-404):**
  - Inventory managers see stock: low stock, stock value, activity and **Adjust stock**.
  - Marketing sees content: reviews waiting, demo products, catalogue mix, home page and search insights.
  - Support sees reviews and stock activity.
  - Admins and store managers see everything.
  - The Inventory screen is read-only for fulfilment and support, and hidden for marketing.

## Re-planned (not lost)
| Story | Why | Now in |
|---|---|---|
| TOS-305 Order history & reorder | There are no orders until checkout exists. The account has an Orders page ready to fill. | History in Sprint 6 (orders); reorder with it |
| TOS-307 Create an account after guest checkout | Needs an order to attach to | Sprint 4 (checkout) |
| TOS-403 Two-factor login for staff | Needs a custom admin sign-in flow (TOTP). It fits with the security review. | Sprint 10 (hardening) |
| SMS OTP reset and mobile-only sign-up (parts of TOS-301/303) | Need the SMS provider | Sprint 7 (notifications) |

## Verification
| Check | Result |
|---|---|
| Lint · typecheck · production build | ✅ Clean. 155 pages, including 11 account routes. |
| Integration tests | ✅ 29 of 29. New: 16 RBAC checks (admin access per role, product create/delete, draft visibility, price/stock/cost field rules, categories, stock history, home page, reviews, audit log, search insights, customer records read/edit, role escalation blocked, public sign-up is always a customer, price changes audited). |
| End-to-end tests (production build, real emails via Mailpit) | ✅ 28 of 28. New: register → unverified sign-in blocked → confirm from the email → sign in; address book + wishlist merge + the same wishlist in a second browser; reset from the email, link works once, sign out; same answer for unknown emails; a customer only sees their own user record and can't open the admin. |
| Visual QA | Sign-in (desktop, phone), account overview, address book (phone), privacy page; admin dashboard as Marketing and as Inventory Manager |

## Bugs found and fixed
| Bug | Fix |
|---|---|
| Rate limits trusted the first `X-Forwarded-For` value, which the client controls (it could be spoofed to dodge limits) | Uses `X-Real-IP` (set by the proxy), then the last forwarded entry. Deployment must set `X-Real-IP` (Sprint 10 checklist). |
| An admin granting Super Admin failed with a confusing "Roles is invalid" | Refused with "Only a Super Admin can give someone the Super Admin role" |
| The confirmation toast vanished when the last item left a tab (approve the last review, publish every draft) | The toast is kept when the list is empty |
| Signed-out visitors were always sent back to `/account` after sign-in | Each page passes its own address |
| Enabling email verification would have locked out existing staff | Existing users were marked verified, and staff created by an admin are verified automatically |

## Demo checklist
1. `docker compose up -d`, then open Mailpit at http://localhost:8026.
2. Register at `/account/register`. Try to sign in (it's blocked until confirmed), then click the link in the Mailpit email and sign in.
3. Heart a product before signing in, then sign in: the wishlist is kept. Open the store in another browser, sign in, and the wishlist is there.
4. **Account › Addresses:** add one with district **Kandy**. The town suggestions change to Kandy towns.
5. **Account › Privacy & data:** change consent, download your data, request deletion, then cancel it.
6. Sign out. Use **Forgot password?**, open the email, set a new password, then try the same link again.
7. **Admin:**
   - **Settings › Audit log** shows the entries from the steps above.
   - Change a product price and see it logged.
   - Create staff with different roles and compare their dashboards.

## Known issues and follow-ups
| Item | Plan |
|---|---|
| `/terms` and `/privacy` linked from sign-up are not written yet | Legal pages in Sprint 9 (owner to supply or approve the text) |
| Account deletion is processed by staff | An admin action that anonymises orders and deletes the rest arrives with orders (Sprint 6) |
| Emails go to Mailpit locally | A production SMTP or Resend account is needed before launch (Sprint 7) |
| Rate limits are per server | Shared store when scaling out (Sprint 10) |

## Retro
- **Went well:**
  - Payload's built-in auth (verification, single-use reset tokens, lockout, sessions) covered the security-critical parts. Server actions kept every form validated and rate-limited on the server.
  - Testing with real emails caught issues no mock would have.
  - Encoding the RBAC matrix as tests found real gaps: marketing could delete categories, and support could read every staff account.
- **To improve:** decide the source of truth for permissions before coding. The matrix and code drifted in Sprints 1–2. The matrix is now updated alongside any access change and covered by `rbac.int.spec.ts`.

## Next sprint (Sprint 4, 4–15 Jan 2027)
Checkout:
- A server-side bag with re-priced lines.
- Coupons and the discount engine.
- District-based delivery fees.
- Order notes, terms acceptance, gift wrap and message.
- Confirmation (email).
- Create an account after a guest order (TOS-307).
