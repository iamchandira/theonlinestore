'use client'

import { IconArrowRight, IconBolt, IconGift } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Image from 'next/image'

import { ButtonLink } from '@/components/ui/Button'
import { Countdown } from '@/components/ui/Countdown'
import type { Product } from '@/lib/catalog'

/** Two promotional panels (NovaTrend-inspired): flash sale on the brand gradient, gift edit on ink. */
/** A sale past its end date simply isn't shown (checked outside render to keep it pure). */
const notEnded = (endsAt: string) => new Date(endsAt).getTime() > Date.now()

type Sections = {
  sale?: {
    show?: boolean | null
    label?: string | null
    title?: string | null
    buttonLabel?: string | null
    link?: string | null
    endsAt?: string | null
  } | null
  gift?: {
    show?: boolean | null
    title?: string | null
    text?: string | null
    link?: string | null
  } | null
}

/** Sale and gift banners, written in Admin › Content › Home page › Banners & messages. Each can be switched off. */
export function PromoBanners({
  sale,
  gift,
  sections,
}: {
  sale: Product | null
  gift: Product | null
  sections: Sections
}) {
  const s = sections.sale
  const g = sections.gift
  const saleOn = Boolean(s?.show && s.title && (!s.endsAt || notEnded(s.endsAt)))
  const giftOn = g?.show !== false
  if (!saleOn && !giftOn) return null
  return (
    <section
      aria-label="Current promotions"
      className={`container-site grid gap-4 py-4 md:gap-5 ${saleOn && giftOn ? 'md:grid-cols-2' : ''}`}
    >
      {saleOn && (
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="group relative flex min-h-64 overflow-hidden rounded-xl bg-sunset-deep p-6 text-white md:min-h-72 md:p-8"
        >
          <div className="relative z-10 flex max-w-[64%] flex-col items-start gap-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
              <IconBolt size={14} /> {s?.label || 'Sale'}
            </p>
            <h3 className="font-display text-[1.75rem] font-extrabold leading-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.15)] md:text-4xl">
              {s?.title}
            </h3>
            {s?.endsAt && <Countdown endsAt={s.endsAt} compact />}
            <ButtonLink href={s?.link || '/offers'} variant="light" size="sm" className="mt-1">
              {s?.buttonLabel || 'Shop the sale'} <IconArrowRight size={16} />
            </ButtonLink>
          </div>
          {sale && (
            <div
              aria-hidden
              className="absolute -bottom-4 -right-4 h-[70%] w-[36%] sm:-right-2 sm:h-[88%] sm:w-[46%] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-2 group-hover:-rotate-3"
            >
              <Image
                src={sale.variants[0].image}
                alt=""
                fill
                sizes="(min-width:768px) 280px, 45vw"
                className="rounded-2xl object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </motion.article>
      )}

      {giftOn && (
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="group relative flex min-h-64 overflow-hidden rounded-xl bg-ink-900 p-6 text-white md:min-h-72 md:p-8"
        >
          <div
            aria-hidden
            className="absolute -right-16 -top-16 size-72 rounded-full bg-rose-500/25 blur-3xl"
          />
          <div className="relative z-10 flex max-w-[58%] flex-col items-start gap-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <IconGift size={14} /> The gift edit
            </p>
            <h3 className="font-display text-[1.75rem] font-extrabold leading-tight text-white md:text-4xl">
              {g?.title || 'Gifts they’ll actually love'}
            </h3>
            <p className="text-sm text-ink-300">
              {g?.text || 'Gift sets, wrapping and a handwritten note on request.'}
            </p>
            <ButtonLink href={g?.link || '/gifts'} variant="gradient" size="sm" className="mt-1">
              Explore gifts <IconArrowRight size={16} />
            </ButtonLink>
          </div>
          {gift && (
            <div
              aria-hidden
              className="absolute bottom-4 right-3 h-[78%] w-[40%] rounded-2xl bg-white p-3 shadow-lift transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-2 group-hover:rotate-2"
            >
              <div className="relative h-full w-full">
                <Image
                  src={gift.variants[0].image}
                  alt=""
                  fill
                  sizes="240px"
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </motion.article>
      )}
    </section>
  )
}
