'use client'

import Link from 'next/link'
import { useRef } from 'react'

import { SectionHeader } from '@/components/ui/SectionHeader'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/motion/gsap'

/**
 * Two counter-scrolling rows of brand "wordmark" chips. Speed eases down on hover so links stay clickable.
 * With reduced motion the rows become a static, wrapping list.
 */
export function BrandMarquee({ brands }: { brands: { name: string; slug: string }[] }) {
  const root = useRef<HTMLElement>(null)
  const half = Math.ceil(brands.length / 2)
  const rows = [brands.slice(0, half), brands.slice(half)]

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const tracks = gsap.utils.toArray<HTMLElement>('[data-marquee]', root.current)
      tracks.forEach((el, i) => {
        const tween = gsap.fromTo(el, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, ease: 'none', duration: 32 + i * 6, repeat: -1 })
        el.addEventListener('mouseenter', () => gsap.to(tween, { timeScale: 0.15, duration: 0.5 }))
        el.addEventListener('mouseleave', () => gsap.to(tween, { timeScale: 1, duration: 0.5 }))
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-labelledby="brands-title" className="overflow-hidden py-10 md:py-14">
      <div className="container-site">
        <SectionHeader eyebrow="Authorised & genuine" title={<span id="brands-title">Shop by brand</span>} action={{ label: 'All brands', href: '/brands' }} />
      </div>
      <div className="flex flex-col gap-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {rows.map((row, i) => (
          <div key={i} data-marquee className="flex w-max gap-3 motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:px-4">
            {[...row, ...row].map((b, j) => (
              <Link
                key={`${b.slug}-${j}`}
                href={`/brands/${b.slug}`}
                tabIndex={j >= row.length ? -1 : undefined}
                aria-hidden={j >= row.length ? true : undefined}
                className="flex h-16 shrink-0 items-center rounded-xl border border-line bg-surface px-7 font-display text-lg font-bold tracking-tight text-ink-800 transition-[color,border-color,box-shadow] hover:border-ink-900 hover:text-sunset-600 hover:shadow-card md:h-20 md:px-9 md:text-xl"
              >
                {b.name}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
