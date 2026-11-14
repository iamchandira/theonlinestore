# 05 · Brand & Design System

Live reference: **`/styleguide`** on the running site. Tokens: `src/app/(frontend)/globals.css`. Components: `src/components/ui/`.

## 1. Brand foundation
| | |
|---|---|
| **Name** | The Online Store (theonlinestore.lk) |
| **Tagline** | Shop more. Live better. |
| **Personality** | Warm · joyful · trustworthy · effortless. A friendly beauty-and-gifts boutique, never a cluttered discount warehouse. |
| **Voice** | Short, warm and helpful. Talk like a knowledgeable friend: "Your bag is feeling light", "Gifts they'll *actually* love". Avoid ALL CAPS shouting and jargon. Use Sri Lankan English spellings (colour, favourites, moisturiser). |
| **Logo** | Kept as supplied (the smiling, speeding bag). The system is *inspired by* the logo without copying it literally. |

### Brand motifs derived from the logo
1. **The smile curve.** A gradient underline drawn under section titles as they scroll into view (`SmileUnderline`).
2. **The speed lines.** Used in the `BrandLoader`: the bag bobs while its speed lines move, for loading states and the 404 page.
3. **The sunset gradient.** Orange → coral → pink, used sparingly for celebration: the hero blob, flash-sale banners, progress bars and the logo.

## 2. Colour
| Token | Hex | Use |
|---|---|---|
| `ink-900` | #0E1A33 | Primary text, dark buttons, footer. A deep navy that is calmer than black. |
| `ink-500` | #5B6B85 | Muted text (5.1:1 on the canvas) |
| `sunset-500` | #FF5A1F | **Brand orange**: icons, decoration, large display only |
| `sunset-600` | #D9390A | **Primary buttons and links** (white text 4.63:1) |
| `sunset-700` | #B52E08 | Hover and pressed |
| `rose-600` | #E0115A | Sale price, sale badge, wishlist heart |
| `canvas` | #FAF8F6 | Page background: a warm off-white that is easier on the eyes than pure white |
| `surface` | #FFFFFF | Cards, drawers |
| `line` | #ECE7E2 | Warm hairline borders |
| Sunset gradient | #FF8A00 → #FF4D2E → #FF2D6F | **Decorative only** (fails contrast behind small text) |
| Sunset *deep* | #D9390A → #D4204A → #C8104F | Gradient **behind text** and gradient buttons (every stop ≥ 4.6:1) |

**Category mood tints** help shoppers recognise each department at a glance:

| Department | Tint |
|---|---|
| Skincare / Beauty | #FCEDEE (blush) |
| Hair | #EEF4EC (sage) |
| Body | #FFF3E3 (apricot) |
| Lips | #FDE8EF (petal) |
| Fragrance | #F1ECFA (lilac) |
| Chocolate | #F6EDE4 (cocoa cream) |
| Footwear | #F2F0EC (sand) |
| Gifts | #FFF1E6 (peach) |

**Semantic colours:**
- success #0F7B55
- warning #B45309
- danger #D92D20
- info #1D5FD1
- star #F5A524 (rating stars)

### Accessible colour pairs
Run `pnpm check:contrast`. All **24 pairs pass WCAG 2.2 AA**. Rules:
- Never put body-size white text on `sunset-500` or the bright gradient. Use `sunset-600` or `bg-sunset-deep`.
- Placeholder text uses `ink-500` (not 400), so it stays readable.

## 3. Typography
| Role | Font | Weights | Notes |
|---|---|---|---|
| Display and headings | **Outfit** | 400–800 | Geometric and rounded, echoing the logo wordmark. Letter-spacing −0.02em. |
| UI and body | **Plus Jakarta Sans** | 400–700 | 16 px minimum body size, 1.6 line height |
| Accent | **Fraunces** italic | 500–600 | Only for one or two words in beauty headlines ("*everyday joy*", "*loves* you back") |

**Type scale (desktop / mobile):**
- Display: 66 / 38
- H1: 48 / 32
- H2 (section): 32 / 26
- H3: 20
- Body: 16
- Small: 14
- Caption: 12
- Eyebrow: 12, uppercase, tracking 0.14em, sunset-600

All fonts load through `next/font` (self-hosted, `display: swap`, no layout shift).

## 4. Shape, space and elevation
**Radius:**
- 8: chips, small elements
- 12: cards, inputs
- 16: large cards
- 24: banners and hero panels
- 999: pills and buttons

**Shadows:** soft and low-spread.
- `shadow-soft`: resting state
- `shadow-card`: hover
- `shadow-lift`: popovers, drawers, floating cards
- `shadow-glow`: brand CTAs

**Spacing:**
- 4-point grid.
- Section padding: 40 px on mobile, 56 px on desktop.
- Container: 1320 px max, with 16 / 24 / 32 px gutters.

**Breakpoints** (Tailwind defaults + `xs` = 416 px):
- `sm` 640
- `md` 768: desktop header and search appear
- `lg` 1024: category nav and mega-menus appear
- `xl` 1280

## 5. Components (`src/components/ui`)
| Component | Variants and notes |
|---|---|
| `Button` / `ButtonLink` | Variants: primary, dark, gradient, outline, soft, ghost, light, link. Sizes: sm, md (44 px), lg (52 px). Loading state keeps the button's width. |
| `IconButton` | Requires `label` (accessible name). Optional count badge. |
| `Badge` | Tones: sale, new, bestseller, trending, gift, limited, bnpl, success, warning, outline |
| `Chip` / `ChipLink` / `VariantPill` | Chips are filters and concerns. `VariantPill` uses `role="radio"`. |
| `Input` | Visible label, hint, inline error wired with `aria-describedby`, leading and trailing slots |
| `Price` / `InstalmentLine` | Selling price, struck-through "was" price (with screen-reader "Was"), % off, "or 3 × Rs X" BNPL line |
| `Rating` | Half stars, with a screen-reader text alternative |
| `Countdown` | Accepts a date, `'midnight'` or `'end-of-week'` (resolved in the browser) |
| `ProgressBar` | Spring-animated, with `role="progressbar"` |
| `Drawer` | Right side, left side or bottom sheet. Focus trap, Escape to close, scroll lock, swipe down to close the sheet. |
| `SectionHeader` | Eyebrow, title, smile underline, description, action link, extra slot |
| `ProductCard` | White 4:5 image area. **Card inset `--ci` (12 px on phones, 14 px from 640 px) is shared by every overlay and the text block, so all edges align:**<br>• Badges sit top-left.<br>• The wishlist heart sits top-right.<br>• Quick add is bottom-right on touch, or a full-width centered bar on desktop hover.<br>• Round actions are 36 px circles inside 44 px tap targets.<br>• Text order: brand → 2-line name → rating → price → BNPL or variant count.<br>• The whole card shows a focus ring when its link is keyboard-focused. |
| `BrandLoader` | Pure SVG and CSS (works in Suspense fallbacks) |

## 6. Motion
| Principle | Rule |
|---|---|
| Purposeful | Motion explains a change: something appears, moves to the bag, or confirms an action. It is never decoration that delays the shopper. |
| Fast | Micro-interactions 150–250 ms. Entrances 400–700 ms. Ease-out `cubic-bezier(.22,1,.36,1)`. |
| Non-blocking | Content is never hidden behind an animation the shopper must wait for. Inputs work during animations. |
| Stable | Only transform and opacity are animated (no layout shift). CLS stays under 0.1. **Never change the layout size of sticky or fixed UI in response to scroll** (it causes a scroll-anchoring feedback loop where the page jumps). Use transform, opacity or shadow instead. |
| Respectful | `prefers-reduced-motion`: CSS durations collapse, Framer runs with `reducedMotion="user"`, GSAP intros and marquees are skipped. The hero intro is also skipped when the page loads in a background tab. |

**Smooth scrolling (Lenis):**
- Desktop wheel and trackpad glide with `lerp 0.1`. Touch devices keep native momentum. Off for reduced motion.
- Lenis runs on GSAP's ticker, so ScrollTrigger effects move in lockstep with the scroll.
- Any custom scrollable panel needs `data-lenis-prevent`.
- Any modal must call `lockScroll()` / `unlockScroll()` (the shared `Drawer` already does).
- Use `scrollToTarget()` for programmatic scrolling.

**Which library does what:**
- **GSAP** (`src/lib/motion/gsap.ts`): the hero intro timeline, idle float, ScrollTrigger parallax, announcement and brand marquees.
- **Framer Motion** (`src/lib/motion/variants.ts`, `Reveal`):
  - Scroll reveals.
  - Drawers and bottom sheets.
  - Dropdowns.
  - The cart badge bump.
  - Fly-to-bag.
  - Layout animations: bestseller tabs, bag line items, bottom-nav indicator.

## 7. Imagery guidelines
- **Product photos:** white or very light background, product centred, 1200 × 1500 px (4:5) or larger, no watermarks or third-party badges (some PDF images include "Amazon's Choice" or carousel dots, which must be replaced).
- **Lifestyle and campaign images:** warm natural light, Sri Lankan models and settings where possible, with room for the headline on the left.
- **Alt text:** describe brand + product + size ("CeraVe Hydrating Facial Cleanser 236 ml bottle").

## 8. Admin theme
The Payload admin uses the brand orange for its primary actions, Plus Jakarta Sans, the logo on the login screen and the bag icon in navigation (`src/app/(payload)/custom.scss`, `src/components/admin/Graphics.tsx`).
