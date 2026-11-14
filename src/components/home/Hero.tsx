'use client'

import { IconArrowRight, IconCash, IconGift, IconRosetteDiscountCheck, IconStarFilled, IconTruckDelivery } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { collections, minPrice, productHref } from '@/lib/catalog'
import { formatLKR, instalment } from '@/lib/format'
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'

/**
 * Hero: GSAP intro timeline (headline lines rise, products pop, floating cards settle),
 * then gentle idle float + scroll parallax. Content is fully visible without JS / with reduced motion.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)
  const [a, b, c, d] = collections.heroPicks

  useGSAP(
    () => {
      // Skip the intro for reduced motion, or when the page loads in a background tab (content is ready on return)
      if (prefersReducedMotion() || document.visibilityState === 'hidden') return
      const q = gsap.utils.selector(root)
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(q('[data-hero-eyebrow]'), { y: 16, opacity: 0, duration: 0.5 })
        .from(q('[data-hero-line]'), { yPercent: 110, opacity: 0, duration: 0.8, stagger: 0.09 }, '-=0.25')
        .from(q('[data-hero-copy]'), { y: 18, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.45')
        .from(q('[data-hero-blob]'), { scale: 0.6, opacity: 0, rotate: -12, duration: 1.1, ease: 'expo.out' }, 0.1)
        .from(q('[data-hero-product]'), { y: 70, opacity: 0, scale: 0.85, duration: 0.9, stagger: 0.12, ease: 'back.out(1.5)' }, 0.35)
        .from(q('[data-hero-card]'), { y: 24, opacity: 0, scale: 0.9, duration: 0.6, stagger: 0.1, ease: 'back.out(1.8)' }, 0.85)

      // Idle float on the floating cards (desynchronised)
      q('[data-hero-card]').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 8 : -8, duration: 2.6 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 })
      })

      // Scroll parallax: products drift up slower than the page, the blob rotates slightly
      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px)', () => {
        gsap.to(q('[data-hero-blob]'), {
          rotate: 14,
          yPercent: -8,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        q('[data-hero-product]').forEach((el, i) => {
          gsap.to(el, {
            yPercent: -10 - i * 8,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
          })
        })
      })
      return () => {
        mm.revert()
        ScrollTrigger.refresh()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative overflow-hidden bg-sunset-soft">
      {/* soft decorative glows */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-[28rem] rounded-full bg-sunset-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 size-[30rem] rounded-full bg-rose-200/40 blur-3xl" />

      <div className="container-site relative grid items-center gap-6 pb-8 pt-6 md:grid-cols-[1.05fr_1fr] md:gap-6 md:pb-16 md:pt-14 lg:min-h-[560px]">
        {/* Copy */}
        <div className="relative z-10 flex flex-col items-start gap-5">
          <p data-hero-eyebrow className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-ink-800 shadow-soft backdrop-blur">
            <span className="rounded-full bg-sunset-gradient px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">New</span>
            K-beauty edit just landed
          </p>
          <h1 id="hero-title" className="text-[2.35rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-[4.1rem]">
            <span className="block overflow-hidden pb-1">
              <span data-hero-line className="block">Beauty, gifts</span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span data-hero-line className="block">
                &amp; <span className="font-serif font-medium italic tracking-[-0.02em] text-sunset-gradient">everyday joy</span>
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span data-hero-line className="block">delivered.</span>
            </span>
          </h1>
          <p data-hero-copy className="max-w-md text-base text-ink-600 sm:text-[1.0625rem]">
            Genuine skincare, haircare and lifestyle favourites from brands you trust, at your door anywhere in Sri Lanka.
          </p>
          <div data-hero-copy className="flex w-full gap-2.5 sm:w-auto sm:gap-3">
            <ButtonLink href="/c/beauty?sort=bestsellers" size="lg" className="flex-1 px-5 sm:flex-none sm:px-7">
              Shop bestsellers <IconArrowRight size={19} />
            </ButtonLink>
            <ButtonLink href="/c/gifts" size="lg" variant="outline" className="flex-1 px-5 sm:flex-none sm:px-7">
              <IconGift size={19} /> Find a gift
            </ButtonLink>
          </div>
          <ul data-hero-copy className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-[0.8125rem] font-medium text-ink-700 sm:gap-x-5 sm:text-sm">
            <li className="inline-flex items-center gap-1.5">
              <IconRosetteDiscountCheck size={18} className="text-success-600" /> 100% genuine
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconCash size={18} className="text-success-600" /> Cash on delivery
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconTruckDelivery size={18} className="text-success-600" /> Island-wide
            </li>
          </ul>
        </div>

        {/* Visual */}
        <div className="relative mx-auto aspect-[1/0.82] w-full max-w-[400px] sm:aspect-square md:max-w-[520px]" aria-hidden>
          <div data-hero-blob className="absolute inset-[8%] rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-sunset-gradient shadow-glow" />
          <div className="absolute inset-[8%] rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />

          {a && (
            <div data-hero-product className="absolute left-[22%] top-[12%] h-[62%] w-[38%] rounded-[28px] bg-white/95 p-3 shadow-lift">
              <Image src={a.variants[0].image} alt="" fill priority sizes="220px" className="object-contain p-3" />
            </div>
          )}
          {b && (
            <div data-hero-product className="absolute right-[8%] top-[30%] h-[52%] w-[32%] rounded-[26px] bg-white/95 shadow-lift">
              <Image src={b.variants[0].image} alt="" fill priority sizes="180px" className="object-contain p-3" />
            </div>
          )}
          {c && (
            <div data-hero-product className="absolute bottom-[6%] left-[8%] h-[40%] w-[27%] rounded-[24px] bg-white/95 shadow-lift">
              <Image src={c.variants[0].image} alt="" fill sizes="150px" className="object-contain p-3" />
            </div>
          )}

          {/* Floating info cards */}
          {d && (
            <Link
              href={productHref(d)}
              tabIndex={-1}
              data-hero-card
              className="absolute -left-1 top-[6%] flex w-48 items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-lift sm:-left-4"
            >
              <span className="relative size-12 shrink-0 rounded-xl bg-tint-skincare">
                <Image src={d.variants[0].image} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{d.brand} Snail 96</span>
                <span className="flex items-center gap-1 text-[0.6875rem] text-ink-500">
                  <IconStarFilled size={11} className="text-star" /> {d.rating} · {formatLKR(minPrice(d))}
                </span>
              </span>
            </Link>
          )}
          <div data-hero-card className="absolute right-0 top-[8%] rounded-2xl bg-ink-900 px-3.5 py-2.5 text-white shadow-lift sm:-right-2">
            <p className="text-[0.6875rem] font-medium text-ink-300">Pay in 3 with Koko</p>
            <p className="font-display text-base font-bold">{formatLKR(instalment(a ? minPrice(a) : 6850))}<span className="text-xs font-medium text-ink-300"> /mo</span></p>
          </div>
          <div data-hero-card className="absolute bottom-[12%] right-[2%] flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-lift">
            <span className="grid size-8 place-items-center rounded-full bg-success-50 text-success-600">
              <IconTruckDelivery size={18} />
            </span>
            <span className="text-xs font-semibold leading-tight">
              Free delivery
              <span className="block font-medium text-ink-500">over Rs 10,000</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
