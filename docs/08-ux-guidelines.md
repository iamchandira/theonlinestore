# 08 · UX Guidelines, Personas & Information Architecture

## 1. UX principles
1. **Mobile first, thumb first.** Most Sri Lankan shoppers browse on Android phones. Primary actions sit in the thumb zone: the bottom nav, sticky add-to-bag bar and bottom sheets.
2. **Search is always one tap away.** It is visible in the header on every screen, never hidden behind an icon.
3. **Never lose the shopper.** Quick add and the bag drawer keep people on the page they were browsing. No forced page jumps.
4. **Trust before the first scroll.** Genuine brands, COD, island-wide delivery and BNPL are visible in the announcement bar, hero and USP strip.
5. **No surprises.** Show the delivery fee, the instalment amount and the "was" price upfront. Stock warnings are honest ("Only a few left" appears only when it's true).
6. **No dead ends.** Empty bag, zero search results and 404 pages always offer a next step.
7. **Calm, not cluttered.** Generous white space, one primary action per view, and colour used to guide, not to shout.
8. **Inclusive by default.** WCAG 2.2 AA, 44 px targets, visible focus, screen-reader announcements for bag changes, reduced motion respected.

## 2. Personas
### Nadeesha, 27: the Colombo skincare regular
- Marketing executive in Colombo 05. Follows K-beauty creators on TikTok.
- **Goals:** genuine products (fakes are her biggest fear), quick delivery, trying new launches.
- **Behaviour:** browses on her phone during commutes, compares ingredients, searches by concern ("niacinamide", "dark spots").
- **Needs from us:** concern filters, ingredient info, "100% genuine" assurance, Koko instalments for bigger baskets, fast reorders.

### Ruwan, 34: the occasion gift buyer
- Engineer in Kandy. Buys gifts for his wife, mother and colleagues for birthdays, Avurudu and Christmas.
- **Goals:** a thoughtful gift in under 10 minutes, delivered on time, nicely wrapped.
- **Behaviour:** starts from "who is it for" and a budget, not a product name.
- **Needs from us:** Gift Finder (for her / for him / under Rs 5,000), gift sets, gift wrap and message, delivery date clarity, chocolates as add-ons.

### Fathima, 45: the COD-first shopper outside Colombo
- Teacher in Batticaloa. Shops for family haircare and body care. Wary of paying online.
- **Goals:** fair prices, pay on delivery, clear communication.
- **Behaviour:** uses WhatsApp heavily. Prefers simple language and large text.
- **Needs from us:** COD visible early, SMS/WhatsApp order updates, WhatsApp chat button, a simple checkout with phone-first contact and district/city pickers.

## 3. Key journeys
| Journey | Steps | Where it's designed |
|---|---|---|
| **Find by concern** | Home → "Shop by concern" chip (or search "dark spots") → filtered list → product → add | ConcernChips, SearchBox, PLP (S2) |
| **Quick restock** | Search "CeraVe" → autosuggest product → quick add → bag drawer → checkout | SearchBox, ProductCard, CartDrawer |
| **Gift in 10 minutes** | Home → Gift Finder "For her" → gift sets → add gift wrap + message → checkout with a delivery note | GiftFinder, PromoBanners, checkout (S4) |
| **COD order** | Browse → bag → checkout as guest → COD → SMS confirmation → track by order no. + phone | Checkout (S4), Payments (S5), Tracking (S6), SMS (S7) |
| **Instalment purchase** | Product page shows "3 × Rs X with Koko" → checkout → Koko → callback → confirmation | InstalmentLine, Payments (S5) |

## 4. Information architecture (sitemap)
```
/                                  Home
├─ /c/beauty                       Beauty (all)  ?concern= ?tag= ?sort= ?max=
│  ├─ /c/skincare/{cleansers|serums|moisturizers|sunscreen|masks|toners-mists|eye-care|gift-sets}
│  ├─ /c/hair-care/{shampoos|conditioners|hair-oils|hair-treatments|styling}
│  ├─ /c/body-care/{body-lotion|body-scrubs|body-wash|petroleum-jelly|deodorants}
│  └─ /c/lips/{lip-balm|lip-oil}
├─ /c/fragrances/{womens-perfume|mens-cologne|unisex-fragrance|body-mists}
├─ /c/footwear/{sneakers|sandals-slides|heels-flats|kids-shoes}
├─ /c/gifts/{gift-hampers|gift-boxes|personalised-gifts}
├─ /c/chocolates/{chocolate-boxes|chocolate-bars|sweet-treats}
├─ /gifts                          Gift shop (all departments)  ?recipient= ?occasion= ?max=
├─ /brands  →  /brands/{brand}
├─ /offers
├─ /p/{product-slug}               Product page (?variant=sku)
├─ /search?q=
├─ /wishlist   /categories
├─ /account  (overview, orders, addresses, profile, privacy) · /account/{login|register|forgot-password|reset-password|verify}
├─ /checkout  →  /checkout/success/{order}
├─ /track-order
├─ /blog  →  /blog/{post}
└─ /about /contact /faq /delivery /returns /payments /authenticity /terms /privacy
/admin                             Payload admin (staff only)
```

**Navigation:**
- Every department has a mega-menu with sub-categories, shortcuts (e.g. "For him", "Under Rs 5,000") and a featured product (Sprint 1.5).
- Every listing accepts `?recipient=` and `?occasion=` as well as `?concern=` (beauty), `?tag=` and `?max=`.
- 7 top-level items: Beauty ▾ · Fragrances · Footwear · Gifts · Chocolates · Brands ▾ · Offers.
- Mobile bottom nav: Home · Categories · Wishlist · Bag · Account. Search is not in the bottom nav because it is already always visible at the top.

## 5. Page patterns
**Lifestyle product pages (Sprint 1.5):**
- **Variant picking follows the product:** a single option uses pills (with photo thumbnails for shades and scents). Two options pick the colour first using photo swatches, then the size from a grid. Unavailable sizes are disabled with a spoken reason.
- **Details follow the type:** a notes pyramid for fragrance, fit advice for footwear, "What's inside" for gifts, allergens and storage for chocolates. Delivery and returns text also changes by type, e.g. unworn footwear can be exchanged, food can't be returned.
- **"Perfect for" chips** link to the gift shop for that recipient or occasion.

| Page | Must-haves |
|---|---|
| Home | Section order answers the shopper's questions: what do you sell → can I trust you → what's a good deal → what's popular → help me choose → stay in touch |
| Listing (PLP) | Breadcrumbs, result count, sort, filter chips, sticky filter bar, bottom-sheet filters on mobile, 2-column mobile grid, "load more" button that keeps the scroll position |
| Product (PDP) | Gallery (swipe + zoom), brand, name, rating, price, BNPL, variant pills or swatches, stock status, delivery estimate by district, add to bag + wishlist, sticky add-to-bag bar on mobile, Benefits / How to use / Ingredients accordions, FAQ, "Pairs well with", reviews |
| Bag | Drawer first. Free-delivery progress, quantity stepper, remove with undo (toast), cross-sell, totals, one primary CTA |
| Checkout | One page with numbered sections: contact → address → delivery → payment → gift & notes. Guest by default with an optional sign-in; signed-in shoppers pick a saved address. Phone-first, district → town suggestions. Every fee (delivery, COD, gift wrap) is in the summary before the Place order button, and the button repeats the total. Errors are shown inline and the page scrolls to the first one. If the total changes (price, stock, same-day cut-off) the order is not placed and the shopper is told why. The summary is sticky on desktop and a collapsible bar on phones; the WhatsApp button is hidden so nothing covers the total. |
| Payment | Card and instalment orders go from "Continue to payment · Rs X" straight to the gateway, then back to the order page, which waits for the gateway's confirmation ("Confirming your payment…") instead of claiming success. A failed or abandoned payment says nothing was charged, shows how long the items are held, and offers "Try again". Instalment methods show "3 × Rs X" before the shopper chooses. Bank transfer shoppers upload the slip on the same page and see "Slip received: we're checking it". The test gateway is clearly labelled "no real money". |
| Order page & tracking | `/track-order` asks for the order number and mobile only; a wrong pair gets one calm message (and the form keeps what was typed). The order page shows five steps (Placed, Paid/Confirmed, Packed, Shipped, Delivered) with dates, the courier and a tracking link, payment state, items, Invoice and Buy again. Returns open for 7 days after delivery: pick items and quantities, a reason, a few words; food is shown as not returnable. |
| Order confirmed | "Thank you, <first name>!", the order number, what happens next (bank transfer details with the order number as reference, or COD reminder), address, items and totals. Guests can add a password to keep the order in an account. |
| Account | Orders first (tracking, reorder), then addresses, profile and consents |

**Search & discovery (Sprint 2):**
- **Search never dead-ends.** Typos are tolerated, and a zero-result query is corrected automatically ("Showing results for cerave"). If nothing at all matches, show popular searches, bestsellers, recently viewed and a WhatsApp request.
- **Filters:**
  - Desktop: a sticky sidebar that applies instantly.
  - Phone: a bottom sheet with live counts and one "Show n results" button.
  - Both: counts on every option, active filters as removable chips with "Clear all", state in the URL so Back works and links can be shared.
  - Show only the filters that matter for the listing (Shoe size for footwear, Dietary for chocolates).
- **Reviews:**
  - Summary first: the average and a star histogram you can tap to filter.
  - Then "With photos", sort, "helpful" and store replies.
  - The write-a-review form is short (stars, text, name, private email, optional photos) and promises moderation up front.
- **Wishlist:** works without an account, can be shared as a link, and "Save all" adds a shared list in one tap.

**Accounts (Sprint 3):**
- Guest checkout always stays available; an account is a convenience, not a gate.
- Sign-in returns you to where you were.
- "Keep me signed in" is on by default and can be unticked on shared devices.
- Forms validate on the server and show errors next to the field (`aria-invalid` plus a message), with a summary at the top.
- Password fields have a show/hide toggle.
- Addresses: pick the district first, then the town (with suggestions for that district). A landmark field helps couriers. One address is the default.
- Privacy is self-service: consent per channel, data download, and a deletion request that can be cancelled.
- Copy never reveals whether an email has an account, except at sign-up where saying so is the kinder answer.

## 6. Microcopy examples
| Situation | Copy |
|---|---|
| Empty bag | "Your bag is feeling light" + suggestions |
| Free-delivery nudge | "You're Rs 2,550 away from free delivery" → "You've unlocked free island-wide delivery 🎉" |
| No search results | "No matches for 'xyz' yet. Try one of these:" |
| 404 | "This page took a little detour" |
| Low stock | "Only a few left" (shown only when stock ≤ 8) |

## 7. Seasonal campaign calendar (Sri Lanka)
| Season | Timing | Campaign idea |
|---|---|---|
| Valentine's Day | 1–14 Feb | Couples' gift sets, chocolates, fragrance |
| Sinhala & Tamil New Year (Avurudu) | Late Mar – 14 Apr | Family gift hampers, home and self-care bundles **(launch target)** |
| Vesak | May | Calm, minimal gifting; donation tie-in |
| Mother's Day | 2nd Sun of May | Skincare and body-care sets for mum |
| Mid-year sale | June – July | Clearance, "Deals under Rs 2,999" |
| Deepavali | Oct – Nov | Fragrances, sweets and chocolates |
| 11.11 / Black Friday | Nov | Flash deals with countdowns |
| Christmas & New Year | December | Gift Finder, hampers, party-ready beauty |
