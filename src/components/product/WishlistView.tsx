'use client'

import { IconCheck, IconHeart, IconShare2 } from '@tabler/icons-react'
import Link from 'next/link'
import { useState } from 'react'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { Button, ButtonLink } from '@/components/ui/Button'
import { SmileUnderline } from '@/components/ui/SectionHeader'
import { useShop } from '@/lib/store/shop'
import { useProductCards } from '@/lib/store/useProductCards'

import { ProductCard } from './ProductCard'
import { RecentlyViewed } from './RecentlyViewed'

export function WishlistView({ shared }: { shared: string[] | null }) {
  const { wishlist, hydrated, addManyToWishlist } = useShop()
  const slugs = shared ?? wishlist
  const { products, loading } = useProductCards(slugs, shared ? true : hydrated)
  const [copied, setCopied] = useState(false)
  const allSaved = shared ? shared.every((s) => wishlist.includes(s)) : false

  const share = async () => {
    const url = `${window.location.origin}/wishlist?items=${wishlist.join(',')}`
    try {
      if (navigator.share) await navigator.share({ title: 'My wishlist · The Online Store', url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  const waiting = (!shared && !hydrated) || loading
  return (
    <>
      <header className="border-b border-line bg-tint-lips">
        <div className="container-site flex flex-col gap-3 pb-6 pt-5 md:pb-8 md:pt-6">
          <Breadcrumbs items={[{ name: shared ? 'Shared wishlist' : 'Wishlist', href: '/wishlist' }]} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold md:text-[2.75rem]">{shared ? 'A wishlist for you' : 'Your wishlist'}</h1>
              <SmileUnderline className="mt-0.5" />
              <p className="mt-2 max-w-xl text-ink-600">
                {shared
                  ? 'Someone shared their favourites with you. Save them to your own wishlist, or treat them to a gift.'
                  : 'Saved on this device. Signing in to keep it on every device arrives with accounts soon.'}
              </p>
            </div>
            {shared ? (
              <Button onClick={() => addManyToWishlist(shared)} disabled={allSaved || !products.length} variant={allSaved ? 'outline' : 'primary'}>
                {allSaved ? <IconCheck size={18} /> : <IconHeart size={18} />} {allSaved ? 'Saved to your wishlist' : 'Save all to my wishlist'}
              </Button>
            ) : (
              wishlist.length > 0 && (
                <Button variant="outline" onClick={share}>
                  {copied ? <IconCheck size={18} /> : <IconShare2 size={18} />} {copied ? 'Link copied' : 'Share my wishlist'}
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <section className="container-site py-6 md:py-8" aria-label="Wishlist products" aria-busy={waiting}>
        {waiting ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: Math.min(Math.max(slugs.length, 4), 8) }, (_, i) => (
              <li key={i} className="skeleton aspect-[4/6] rounded-xl" />
            ))}
          </ul>
        ) : products.length ? (
          <>
            <p className="mb-4 text-sm text-ink-600" aria-live="polite">
              <strong className="font-semibold text-ink-900">{products.length}</strong> {products.length === 1 ? 'product' : 'products'}
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <li key={p.slug}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-rose-50 text-rose-600">
              <IconHeart size={30} />
            </span>
            <h2 className="text-2xl font-bold">{shared ? 'These products are no longer available' : 'Nothing saved yet'}</h2>
            <p className="max-w-md text-ink-600">Tap the heart on any product to save it here for later, or to share a gift list with family and friends.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/c/beauty?sort=bestsellers" variant="dark">
                Shop bestsellers
              </ButtonLink>
              <ButtonLink href="/gifts" variant="outline">
                Browse gift ideas
              </ButtonLink>
            </div>
          </div>
        )}
        {shared && (
          <p className="mt-6 text-sm text-ink-600">
            <Link href="/wishlist" className="font-semibold text-sunset-700 underline underline-offset-4">
              See my own wishlist
            </Link>
          </p>
        )}
      </section>
      <RecentlyViewed />
    </>
  )
}
