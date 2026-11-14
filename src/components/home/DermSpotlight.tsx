import { IconArrowRight, IconFlask, IconHeartHandshake, IconShieldCheck } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'

import { ButtonLink } from '@/components/ui/Button'
import { minPrice, productHref, type Product } from '@/lib/catalog'
import { formatLKR } from '@/lib/format'
import { Reveal, RevealItem } from '@/lib/motion/Reveal'

/** Glowora-inspired editorial panel: serif accent, soft blush surface, curated derm picks. */
export function DermSpotlight({ products }: { products: Product[] }) {
  if (!products.length) return null
  return (
    <section aria-labelledby="derm-title" className="container-site py-10 md:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#fdeef0_0%,#fbe4e9_45%,#fff3ea_100%)] p-6 md:p-10 lg:p-12">
        <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-white/50 blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <Reveal className="flex flex-col items-start gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">Derm-approved skincare</p>
            <h2 id="derm-title" className="text-3xl font-bold md:text-[2.6rem]">
              Skincare that <span className="font-serif font-medium italic text-rose-700">loves</span> you back
            </h2>
            <p className="max-w-md text-ink-600">
              Gentle, proven formulas from CeraVe, La Roche-Posay, Cetaphil and The Ordinary, recommended by dermatologists for every skin type.
            </p>
            <ul className="grid gap-2.5 text-sm font-medium text-ink-800">
              <li className="flex items-center gap-2.5">
                <IconShieldCheck size={20} className="text-rose-600" /> Suitable for sensitive skin
              </li>
              <li className="flex items-center gap-2.5">
                <IconFlask size={20} className="text-rose-600" /> Ceramides, niacinamide and hyaluronic acid
              </li>
              <li className="flex items-center gap-2.5">
                <IconHeartHandshake size={20} className="text-rose-600" /> Not sure what to pick? Ask us on WhatsApp
              </li>
            </ul>
            <ButtonLink href="/c/skincare?tag=derm" variant="dark" className="mt-2">
              Shop derm skincare <IconArrowRight size={18} />
            </ButtonLink>
          </Reveal>
          <Reveal staggerChildren={0.08} className="grid grid-cols-2 gap-3 md:gap-4">
            {products.map((p) => (
              <RevealItem key={p.slug}>
                <Link href={productHref(p)} className="group flex h-full flex-col rounded-xl bg-white/85 p-3 shadow-soft backdrop-blur transition-shadow hover:shadow-card md:p-4">
                  <span className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-white">
                    <Image src={p.variants[0].image} alt={`${p.brand} ${p.name}`} fill sizes="(min-width:1024px) 220px, 45vw" className="object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
                  </span>
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-500">{p.brand}</span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</span>
                  <span className="mt-auto pt-1.5 font-display font-bold">{formatLKR(minPrice(p))}</span>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
