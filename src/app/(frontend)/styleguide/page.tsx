import { IconArrowRight, IconGift, IconHeart, IconSearch, IconShoppingBag, IconShoppingBagPlus, IconTruckDelivery } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BrandLoader } from '@/components/brand/BrandLoader'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip, VariantPill } from '@/components/ui/Chip'
import { Countdown } from '@/components/ui/Countdown'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { InstalmentLine } from '@/components/ui/InstalmentLine'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { listProducts } from '@/lib/catalog/server'

import { MotionDemos } from './MotionDemos'

export const metadata: Metadata = { title: 'Design system', robots: { index: false, follow: false } }

const scales = {
  Ink: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((s) => `ink-${s}`),
  Sunset: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((s) => `sunset-${s}`),
  Rose: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((s) => `rose-${s}`),
}
const swatchClass: Record<string, string> = {
  'ink-50': 'bg-ink-50', 'ink-100': 'bg-ink-100', 'ink-200': 'bg-ink-200', 'ink-300': 'bg-ink-300', 'ink-400': 'bg-ink-400', 'ink-500': 'bg-ink-500', 'ink-600': 'bg-ink-600', 'ink-700': 'bg-ink-700', 'ink-800': 'bg-ink-800', 'ink-900': 'bg-ink-900', 'ink-950': 'bg-ink-950',
  'sunset-50': 'bg-sunset-50', 'sunset-100': 'bg-sunset-100', 'sunset-200': 'bg-sunset-200', 'sunset-300': 'bg-sunset-300', 'sunset-400': 'bg-sunset-400', 'sunset-500': 'bg-sunset-500', 'sunset-600': 'bg-sunset-600', 'sunset-700': 'bg-sunset-700', 'sunset-800': 'bg-sunset-800', 'sunset-900': 'bg-sunset-900',
  'rose-50': 'bg-rose-50', 'rose-100': 'bg-rose-100', 'rose-200': 'bg-rose-200', 'rose-300': 'bg-rose-300', 'rose-400': 'bg-rose-400', 'rose-500': 'bg-rose-500', 'rose-600': 'bg-rose-600', 'rose-700': 'bg-rose-700', 'rose-800': 'bg-rose-800', 'rose-900': 'bg-rose-900',
}
const tints = [
  ['Skincare / Beauty', 'bg-tint-skincare', '#FCEDEE'],
  ['Hair', 'bg-tint-hair', '#EEF4EC'],
  ['Body', 'bg-tint-body', '#FFF3E3'],
  ['Lips', 'bg-tint-lips', '#FDE8EF'],
  ['Fragrance', 'bg-tint-fragrance', '#F1ECFA'],
  ['Chocolate', 'bg-tint-chocolate', '#F6EDE4'],
  ['Footwear', 'bg-tint-footwear', '#F2F0EC'],
  ['Gifts', 'bg-tint-gifts', '#FFF1E6'],
]

function Block({ id, title, children, note }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-40 border-t border-line py-10">
      <h2 id={`${id}-h`} className="text-2xl font-bold">
        {title}
      </h2>
      {note && <p className="mt-1 max-w-2xl text-sm text-ink-500">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

/** Living design system: every token and component rendered from the real source. */
export default async function StyleguidePage() {
  // Design reference for the team only: not part of the live store
  if (process.env.NODE_ENV === 'production') notFound()
  const { products: sample } = await listProducts({
    slugs: ['skin1004-madagascar-centella-ampoule', 'cerave-hydrating-facial-cleanser', 'vaseline-emily-in-paris-tinted-lip-oil', 'lrp-pure-vitamin-c12-serum'],
    limit: 4,
  })
  return (
    <div className="container-site py-10">
      <header className="mb-6 flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">The Online Store · Design system v0.1</p>
        <h1 className="text-4xl font-extrabold md:text-6xl">
          Shop more. <span className="text-sunset-gradient">Live better.</span>
        </h1>
        <p className="max-w-2xl text-ink-600">
          Tokens live in <code className="rounded bg-ink-50 px-1.5 py-0.5 text-sm">src/app/(frontend)/globals.css</code>; components in{' '}
          <code className="rounded bg-ink-50 px-1.5 py-0.5 text-sm">src/components/ui</code>. Guidelines: <code className="rounded bg-ink-50 px-1.5 py-0.5 text-sm">docs/05-brand-and-design-system.md</code>.
        </p>
        <nav aria-label="Sections" className="mt-2 flex flex-wrap gap-2">
          {['colour', 'type', 'buttons', 'badges', 'forms', 'commerce', 'cards', 'motion', 'shape'].map((s) => (
            <a key={s} href={`#${s}`} className="h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium capitalize leading-9 hover:border-ink-900">
              {s}
            </a>
          ))}
        </nav>
      </header>

      <Block id="colour" title="Colour" note="Sunset-500 is the brand colour for decoration and large display. Text and buttons use sunset-600/700 so they pass WCAG AA (run pnpm check:contrast).">
        <div className="flex flex-col gap-5">
          {Object.entries(scales).map(([name, list]) => (
            <div key={name}>
              <p className="mb-2 text-sm font-semibold">{name}</p>
              <div className="grid grid-cols-6 overflow-hidden rounded-lg border border-line sm:grid-cols-11">
                {list.map((t) => (
                  <div key={t} className={`${swatchClass[t]} flex h-16 items-end p-1.5`}>
                    <span className={`text-[0.625rem] font-semibold ${/-(50|100|200|300|400)$/.test(t) ? 'text-ink-900' : 'text-white'}`}>{t.split('-')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex h-24 items-end rounded-lg bg-sunset-gradient p-3 text-sm font-semibold text-ink-950">Sunset gradient · decorative</div>
            <div className="flex h-24 items-end rounded-lg bg-sunset-deep p-3 text-sm font-semibold text-white">Sunset deep · behind text</div>
            <div className="flex h-24 items-end rounded-lg border border-line bg-canvas p-3 text-sm font-semibold">Canvas #FAF8F6 · page</div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Category mood tints</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {tints.map(([n, c, hex]) => (
                <div key={n} className={`${c} rounded-lg p-3`}>
                  <p className="text-sm font-semibold">{n}</p>
                  <p className="text-xs text-ink-600">{hex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Block>

      <Block id="type" title="Typography" note="Outfit for display and headings, Plus Jakarta Sans for UI and body (16px minimum, 1.6 line height), Fraunces italic for occasional beauty accents.">
        <div className="flex flex-col gap-4">
          <p className="font-display text-6xl font-extrabold tracking-tight">Display 60 / 800</p>
          <h1 className="text-5xl font-bold">H1 Heading 48</h1>
          <h2 className="text-3xl font-bold">H2 Section title 32</h2>
          <h3 className="text-xl font-bold">H3 Card title 20</h3>
          <p className="max-w-2xl">Body 16: Genuine skincare, haircare and lifestyle favourites from brands you trust, delivered to your door anywhere in Sri Lanka.</p>
          <p className="text-sm text-ink-500">Small 14 / muted: delivery and discount codes are applied at checkout.</p>
          <p className="font-serif text-4xl font-medium italic text-rose-700">Fraunces italic accent</p>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">Eyebrow label 12 / caps</p>
        </div>
      </Block>

      <Block id="buttons" title="Buttons" note="One primary action per view. Minimum 44px tap target (md). Loading state keeps the width stable.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <IconShoppingBagPlus size={19} /> Add to bag
            </Button>
            <Button variant="dark">Quick add</Button>
            <Button variant="gradient">
              <IconGift size={18} /> Explore gifts
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Text link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">
              Large <IconArrowRight size={18} />
            </Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Search" icon={<IconSearch size={22} />} />
            <IconButton label="Wishlist" icon={<IconHeart size={22} />} tone="surface" count={3} />
            <IconButton label="Bag" icon={<IconShoppingBag size={22} />} tone="dark" count={12} />
          </div>
        </div>
      </Block>

      <Block id="badges" title="Badges, chips & selectors">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="sale">-20%</Badge>
            <Badge tone="new">New</Badge>
            <Badge tone="bestseller">Bestseller</Badge>
            <Badge tone="trending">Trending</Badge>
            <Badge tone="gift">Gift idea</Badge>
            <Badge tone="limited">Limited</Badge>
            <Badge tone="bnpl">Koko · Mintpay</Badge>
            <Badge tone="success">In stock</Badge>
            <Badge tone="warning">Only 3 left</Badge>
            <Badge tone="outline">Outline</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active>All</Chip>
            <Chip>Brightening</Chip>
            <Chip>Hydration</Chip>
            <Chip>Sensitive skin</Chip>
          </div>
          <div role="radiogroup" aria-label="Size" className="flex flex-wrap gap-2">
            <VariantPill selected>55 ml</VariantPill>
            <VariantPill>100 ml</VariantPill>
            <VariantPill disabled>200 ml</VariantPill>
          </div>
        </div>
      </Block>

      <Block id="forms" title="Forms" note="Labels are always visible, errors appear inline with aria-describedby, inputs use 16px text so iOS doesn't zoom in.">
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <Input label="Full name" placeholder="e.g. Nadeesha Perera" autoComplete="name" />
          <Input label="Mobile number" placeholder="07X XXX XXXX" inputMode="tel" hint="We’ll SMS your delivery updates" />
          <Input label="Email" defaultValue="nadeesha@" error="Please enter a valid email address." />
          <Input label="Search" hideLabel placeholder="Search products" leading={<IconSearch />} />
        </div>
      </Block>

      <Block id="commerce" title="Commerce elements">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-8">
            <Price price={7250} compareAt={8450} size="lg" />
            <Price price={4950} prefix="From" />
            <Price price={1150} size="sm" />
          </div>
          <InstalmentLine price={7250} />
          <Rating value={4.6} count={128} />
          <Countdown endsAt="2026-12-31T23:59:59+05:30" tone="dark" />
          <p className="flex w-fit items-center gap-2 rounded-md bg-success-50 px-3 py-2.5 text-sm text-success-600">
            <IconTruckDelivery size={18} /> Island-wide delivery in 2–4 working days
          </p>
          <SectionHeader eyebrow="Section eyebrow" title="Section header with smile underline" action={{ label: 'View all', href: '#' }} />
          <div className="flex items-center gap-6">
            <BrandLoader />
            <BrandLoader size={80} />
          </div>
        </div>
      </Block>

      <Block id="cards" title="Product cards" note="Single-variant cards add straight to the bag (with the fly-to-bag animation); multi-variant cards open the option picker.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {sample.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
          <ProductCardSkeleton />
        </div>
      </Block>

      <Block id="motion" title="Motion" note="Micro-interactions 150–250ms, entrances 400–700ms with ease-out. All motion respects prefers-reduced-motion.">
        <MotionDemos />
      </Block>

      <Block id="shape" title="Radius & elevation">
        <div className="flex flex-wrap gap-4">
          {[
            ['rounded-sm · 8', 'rounded-sm shadow-xs'],
            ['rounded-md · 12', 'rounded-md shadow-soft'],
            ['rounded-lg · 16', 'rounded-lg shadow-card'],
            ['rounded-xl · 24', 'rounded-xl shadow-lift'],
            ['glow', 'rounded-xl shadow-glow'],
          ].map(([label, cls]) => (
            <div key={label} className={`grid h-28 w-40 place-items-center bg-surface text-sm font-medium ${cls}`}>
              {label}
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}
