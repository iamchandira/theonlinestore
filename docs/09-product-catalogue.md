# 09 · Product Catalogue (seed data)

Generated from `seed/catalogue/products.json`, which was extracted in Sprint 0 from the client PDFs in `cosmetic-products/`:
- Beauty_Product_Catalogue.pdf
- Complete_Skincare_Product_Catalogue.pdf
- Product_Catalogue.pdf
- Product_Catalogue_27_Items.pdf

> ⚠️ **Prices, ratings, review counts and stock levels are realistic placeholders** (`priceTBC: true`) so the UI can be designed and tested. The owner must confirm prices before launch. Product photos were extracted at the resolution they appear in the PDFs (some are about 150 px tall). Replace them with high-resolution photos (1200 px or larger, white background) before launch.

## Summary
| Metric | Count |
|---|---|
| Products | 88 |
| Variants (SKUs) | 99 |
| Products with multiple variants | 9 |
| Brands | 18 |

### How the catalogue was cleaned up
- **Duplicates merged.** Products that appeared in more than one PDF were merged, keeping the higher-resolution photo. Examples: Medicube Kojic Acid serum, Celimax Retinal Shot, SKIN1004 Poremizing and Tea-Trica ampoules.
- **Variants grouped:**
  - Sizes: Madagascar Centella 55/100 ml, Color Vive 400/600 ml, Vaseline Cocoa Butter jelly 100/450 ml, Mielle oil single/twin pack.
  - Shades: Emily in Paris lip oil and lip balm.
  - Scents: the four Dove body polishes.
  - Flavours: Esse and Vaseline lip balms.
- **Categories and concerns** were assigned so that products can be filtered by skin concern from Sprint 2.

## Products by category

### Skincare (44)
| # | Brand | Product | Sub-category | Variants | Price (placeholder) | Concerns |
|---|---|---|---|---|---|---|
| 1 | Dr. Althea | 345 Relief Cream | moisturizers | 50 ml | Rs 6,950 | sensitive, redness |
| 2 | Dr. Althea | 345 Relief Cream Mist | toners-mists | 100 ml | Rs 5,450 | sensitive, hydration |
| 3 | Celimax | The Vita-A Retinal Shot Tightening Booster | serums | 15 ml | Rs 5,250 | anti-aging, pores |
| 4 | COSRX | Advanced Snail 96 Mucin Power Essence | serums | 100 ml | Rs 4,950 | hydration, repair |
| 5 | Medicube | Deep Vita C Capsule Cream | moisturizers | 55 g | Rs 8,450 | brightening, dullness |
| 6 | Medicube | Kojic Acid Turmeric Niacinamide Serum | serums | 30 ml | Rs 7,450 | brightening, dark-spots |
| 7 | Medicube | TXA Niacinamide 15% Serum | serums | 30 ml | Rs 7,950 | dark-spots, brightening |
| 8 | Medicube | Collagen Night Wrapping Mask | masks | 75 ml | Rs 8,950 | anti-aging, firming |
| 9 | Medicube | Turmeric Overnight Wrapping Mask | masks | 75 ml | Rs 8,950 | brightening, dullness |
| 10 | Medicube | Collagen Jelly Cream | moisturizers | 50 ml | Rs 8,750 | firming, hydration |
| 11 | SKIN1004 | Centella Poremizing Fresh Ampoule | serums | 100 ml | Rs 6,450 | pores, oil-control |
| 12 | SKIN1004 | Madagascar Centella Ampoule | serums | 55 ml, 100 ml | Rs 4,950 / Rs 7,250 | sensitive, repair |
| 13 | SKIN1004 | Centella Tea-Trica Relief Ampoule | serums | 100 ml | Rs 6,750 | acne, sensitive |
| 14 | SKIN1004 | Centella Hyalu-Cica Blue Serum | serums | 50 ml | Rs 6,250 | hydration |
| 15 | SKIN1004 | Centella Probio-Cica Intensive Ampoule | serums | 50 ml | Rs 6,650 | repair, anti-aging |
| 16 | SKIN1004 | Centella Tone Brightening Capsule Ampoule | serums | 100 ml | Rs 6,950 | brightening |
| 17 | Anua | Peach 70% Niacinamide Serum | serums | 30 ml | Rs 6,850 | brightening, hydration |
| 18 | Anua | Niacinamide 10% + TXA 4% Dark Spot Serum | serums | 30 ml | Rs 7,250 | dark-spots |
| 19 | La Roche-Posay | Anthelios Ultra Fluid SPF 50+ | sunscreen | 50 ml | Rs 9,850 | sun-protection, sensitive |
| 20 | La Roche-Posay | Effaclar Purifying Foaming Gel | cleansers | 200 ml | Rs 8,450 | acne, oil-control |
| 21 | La Roche-Posay | Hyalu B5 Repulping Gift Set | gift-sets | Gift Set | Rs 18,500 | hydration, anti-aging |
| 22 | La Roche-Posay | Anthelios Mineral Tinted Ultra Fluid SPF 50 | sunscreen | 50 ml | Rs 10,950 | sun-protection |
| 23 | La Roche-Posay | Pure Vitamin C12 Serum | serums | 30 ml | Rs 14,950 | brightening, anti-aging |
| 24 | La Roche-Posay | Cicaplast Baume B5+ SPF50 | moisturizers | 40 ml | Rs 7,950 | repair, sensitive |
| 25 | The Ordinary | Multi-Peptide Lash and Brow Serum | eye-care | 5 ml | Rs 7,450 | lash-brow |
| 26 | The Ordinary | Caffeine 3% + Escin 1% Face Serum | serums | 30 ml | Rs 4,250 | puffiness |
| 27 | The Ordinary | Multi-Peptide + HA Serum | serums | 30 ml | Rs 6,950 | anti-aging, hydration |
| 28 | The Ordinary | Multi-Peptide Eye Serum | eye-care | 15 ml | Rs 5,950 | dark-circles |
| 29 | The Ordinary | Multi-Peptide + Copper Peptides 1% Serum | serums | 30 ml | Rs 11,450 | anti-aging, firming |
| 30 | The Ordinary | Hyaluronic Acid 2% + B5 (with Ceramides) | serums | 30 ml | Rs 3,950 | hydration |
| 31 | The Ordinary | Glycolic Acid 7% Exfoliating Toner | toners-mists | 240 ml | Rs 5,450 | dullness, texture |
| 32 | CeraVe | Brightening Vitamin C Lotion | moisturizers | Standard | Rs 7,950 | brightening |
| 33 | CeraVe | Foaming Facial Cleanser | cleansers | 236 ml | Rs 5,950 | oil-control |
| 34 | CeraVe | Hydrating Facial Cleanser | cleansers | 236 ml | Rs 5,950 | dryness, hydration |
| 35 | CeraVe | Intensive Moisturizing Cream | moisturizers | Standard | Rs 7,450 | dryness |
| 36 | CeraVe | Renewing SA Cleanser | cleansers | 236 ml | Rs 6,450 | texture, acne |
| 37 | CeraVe | Hydrating Mineral Sunscreen SPF 50 Face Lotion | sunscreen | 75 ml | Rs 7,950 | sun-protection, sensitive |
| 38 | Cetaphil | Moisturizing Cream | moisturizers | 453 g | Rs 8,950 | dryness, sensitive |
| 39 | Cetaphil | DermaControl Oil Removing Foam Wash | cleansers | 237 ml | Rs 5,950 | oil-control, acne |
| 40 | Cetaphil | Vitamin C Serum | serums | 30 ml | Rs 8,950 | brightening |
| 41 | Cetaphil | Sheer Mineral Sunscreen Face Drops SPF 50 | sunscreen | 30 ml | Rs 8,450 | sun-protection |
| 42 | Cetaphil | Daily Facial Moisturizer SPF 35 | moisturizers | 88 ml | Rs 6,950 | sun-protection, hydration |
| 43 | Cetaphil | Daily Facial Cleanser | cleansers | 237 ml | Rs 5,250 | oil-control |
| 44 | Cetaphil | Gentle Skin Cleanser | cleansers | 237 ml | Rs 4,950 | sensitive |

### Hair Care (21)
| # | Brand | Product | Sub-category | Variants | Price (placeholder) | Concerns |
|---|---|---|---|---|---|---|
| 63 | The Ordinary | Multi-Peptide Serum for Hair Density | hair-treatments | 60 ml | Rs 8,950 | hair-fall |
| 64 | Dove | Biotin Strength Hair Serum Cream | hair-treatments | 200 ml | Rs 2,450 | hair-fall |
| 65 | Dove | Hyaluronic Acid Daily Hydration Conditioner | conditioners | 350 ml | Rs 2,350 | dry-hair |
| 66 | Dove | Hyaluronic Acid Daily Hydration Shampoo | shampoos | 350 ml | Rs 2,450 | dry-hair |
| 67 | Dove | Biotin Hair Fall Rescue Conditioner | conditioners | 340 ml | Rs 2,350 | hair-fall |
| 68 | Dove | Biotin Hair Fall Rescue Shampoo | shampoos | 400 ml | Rs 2,450 | hair-fall |
| 69 | Mielle | Rosemary Mint Strengthening Leave-In Conditioner | conditioners | Twin Pack (2 × 355 ml) | Rs 9,950 | hair-fall, growth |
| 70 | Mielle | Rosemary Mint Strengthening Shampoo | shampoos | Twin Pack (2 × 355 ml) | Rs 9,450 | hair-fall, growth |
| 71 | Mielle | Rosemary Mint Scalp & Hair Strengthening Oil | hair-oils | 59 ml, Twin Pack (2 × 59 ml) | Rs 3,950 / Rs 7,450 | hair-fall, growth |
| 72 | L'Oréal Paris | Elvive Extraordinary Oil Nourishing Shampoo | shampoos | 400 ml | Rs 2,650 | dry-hair |
| 73 | L'Oréal Paris | Elvive Extraordinary Oil Nourishing Conditioner | conditioners | 200 ml | Rs 1,950 | dry-hair |
| 74 | L'Oréal Paris | Elvive Extraordinary Oil for Dry & Damaged Hair | hair-oils | 100 ml | Rs 3,950 | dry-hair, frizz |
| 75 | L'Oréal Paris | Elvive Total Repair 5 Repairing Shampoo | shampoos | 400 ml | Rs 2,650 | damage |
| 76 | L'Oréal Paris | Elvive Total Repair 5 Repairing Conditioner | conditioners | 200 ml | Rs 1,950 | damage |
| 77 | L'Oréal Paris | Elvive Fall Resist Oil Replacement Cream | hair-treatments | 300 ml | Rs 2,450 | hair-fall |
| 78 | L'Oréal Paris | Elvive Color Vive Shampoo | shampoos | 400 ml, 600 ml | Rs 2,450 / Rs 3,450 | color-care |
| 79 | L'Oréal Paris | Elnett Satin Normal Hold Hair Spray | styling | 400 ml | Rs 4,450 | styling |
| 80 | Shiseido Fino | Premium Touch Shampoo + Conditioner Set | shampoos | 550 ml + 550 ml | Rs 7,950 | damage, frizz |
| 81 | Shiseido Fino | Premium Touch Hair Mask | hair-treatments | 230 g | Rs 3,950 | frizz, dry-hair |
| 82 | OGX | Argan Oil of Morocco Shampoo | shampoos | 385 ml | Rs 4,250 | dry-hair |
| 83 | OGX | Argan Oil of Morocco Conditioner | conditioners | 385 ml | Rs 4,250 | dry-hair |

### Body Care (18)
| # | Brand | Product | Sub-category | Variants | Price (placeholder) | Concerns |
|---|---|---|---|---|---|---|
| 45 | CeraVe | SA Body Wash for Rough & Bumpy Skin | body-wash | 296 ml | Rs 6,950 | texture |
| 46 | CeraVe | SA Lotion for Rough & Bumpy Skin | body-lotion | 237 ml | Rs 7,450 | texture, dryness |
| 47 | CeraVe | SA Cream for Rough & Bumpy Skin | body-lotion | 340 g | Rs 8,450 | texture, dryness |
| 48 | CeraVe | Daily Moisturizing Lotion | body-lotion | 236 ml | Rs 6,250 | dryness |
| 49 | Cetaphil | Moisturizing Lotion | body-lotion | 591 ml | Rs 7,950 | dryness, sensitive |
| 50 | Vaseline | Original Petroleum Jelly | petroleum-jelly | 100 ml | Rs 1,250 | dryness |
| 51 | Vaseline | Aloe Fresh Petroleum Jelly | petroleum-jelly | 100 ml | Rs 1,350 | dryness |
| 52 | Vaseline | Cocoa Butter Petroleum Jelly | petroleum-jelly | 100 ml, 450 ml | Rs 1,350 / Rs 3,450 | dryness |
| 53 | Dove | Exfoliating Body Polish | body-scrubs | Brown Sugar & Coconut Butter, Pomegranate & Shea Butter, Crushed Almond & Mango Butter, Crushed Lavender & Coconut Milk | Rs 3,950 / Rs 3,950 / Rs 3,950 / Rs 3,950 | texture, glow |
| 54 | Dove | Nourishing Body Care Intensive Body Cream | body-lotion | 150 ml | Rs 2,250 | dryness |
| 55 | NIVEA | Rich Nourishing Body Lotion | body-lotion | 400 ml | Rs 2,650 | dryness |
| 56 | NIVEA | Express Hydration Body Lotion | body-lotion | 400 ml | Rs 2,650 | hydration |
| 57 | NIVEA | Aloe & Hydration Body Lotion | body-lotion | 400 ml | Rs 2,650 | hydration |
| 58 | NIVEA | Natural Glow Body Lotion | body-lotion | 400 ml | Rs 2,750 | glow |
| 59 | NIVEA | Cocoa Nourish Body Lotion | body-lotion | 400 ml | Rs 2,750 | dryness |
| 60 | NIVEA | Super 10 Glow Body Serum | body-lotion | 200 ml | Rs 3,450 | glow |
| 61 | NIVEA | Fresh Natural Deodorant | deodorants | 150 ml | Rs 1,450 | – |
| 62 | NIVEA | Natural Radiance Deodorant | deodorants | 150 ml | Rs 1,450 | – |

### Lips (5)
| # | Brand | Product | Sub-category | Variants | Price (placeholder) | Concerns |
|---|---|---|---|---|---|---|
| 84 | Esse Naturals | Lip Balm | lip-balm | Strawberry Glow, Cherry Blossom | Rs 950 / Rs 950 | dry-lips |
| 85 | Vaseline | Emily in Paris Tinted Lip Oil | lip-oil | Nude Crème, Rose Amour | Rs 2,450 / Rs 2,450 | dry-lips |
| 86 | Vaseline | Emily in Paris Tinted Lip Balm | lip-balm | Nude Nouveau, Parisian Pink | Rs 1,950 / Rs 1,950 | dry-lips |
| 87 | Vaseline | Lip Therapy Lip Balm | lip-balm | Aloe Vera, Cocoa Butter | Rs 1,150 / Rs 1,150 | dry-lips |
| 88 | La Roche-Posay | Cicaplast Lèvres Lip Balm | lip-balm | 7.5 ml | Rs 3,450 | dry-lips, repair |

## Demo products (Sprint 1.5)
Fragrances, Footwear, Gifts and Chocolates have no client products yet. To design and test those departments, `pnpm seed:demo` adds **20 clearly-marked demo products** under four fictional brands:
- Ceylon Scent Co.
- Stride Lanka
- Gift Studio
- Kandy Cocoa Co.

Each brand description starts with "Demo brand", and the photos are illustrations.

| Department | Demo products | Variants |
|---|---|---|
| Fragrance | Velvet Jasmine EDP, Oud Monsoon EDP, Sea Breeze EDT, Pink Petal Body Mist, Cinnamon & Tea Discovery Set | Size or set |
| Footwear | Cloud Runner Sneakers, Urban Court Sneakers, Island Comfort Slides, Pearl Strap Flats, Little Steps Sneakers | Shoe size × Colour (one sold-out combination to show the disabled state) |
| Gifts | Ceylon Tea & Treats Hamper, Celebration Hamper, Self-Care Spa Box, Gentleman's Grooming Kit, Personalised Keepsake Box | Set or size |
| Chocolates | Single-Origin Dark Chocolate 70%, Milk Chocolate Sea Salt Caramel, Assorted Pralines Box, Heart Truffles Gift Box, Kithul & Coconut Sweet Bites | Weight or size |

**How demo products are kept apart from real ones:**
- They are flagged `isDemo`, and the storefront shows a "Sample" badge.
- Their pages are `noindex`.
- The admin has a **Demo** tab in the products list.
- SKUs start with `DEMO-`.

**Before launch:** run `pnpm seed:demo --remove`. It deletes the demo products, their stock history, their photos and the demo brands.

The 88 client products are now also typed as `beauty`. Lip and gift-set items are tagged with recipients and occasions, so they appear in the gift shop.
