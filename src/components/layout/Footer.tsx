import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandMastercard,
  IconBrandTiktok,
  IconBrandVisa,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconClock,
  IconMail,
  IconPhone,
} from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'

import { footerNav, linkIsLive } from '@/config/navigation'
import { site } from '@/config/site'
import type { StorePublic } from '@/lib/store/settings'


/** Contact, social links and payment names come from Admin › Settings (Store details, Payments). */
export function Footer({ store }: { store: StorePublic }) {
  const c = store.contact
  const social = [
    { href: store.social.facebook, label: 'Facebook', Icon: IconBrandFacebook },
    { href: store.social.instagram, label: 'Instagram', Icon: IconBrandInstagram },
    { href: store.social.tiktok, label: 'TikTok', Icon: IconBrandTiktok },
    { href: store.social.youtube, label: 'YouTube', Icon: IconBrandYoutube },
    { href: c.whatsapp ? `https://wa.me/${c.whatsapp}` : '', label: 'WhatsApp', Icon: IconBrandWhatsapp },
  ].filter((x) => x.href)
  return (
    <footer className="bg-ink-900 pb-24 text-ink-200 md:pb-0">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit rounded-xl bg-white px-4 py-3">
            <Image src="/brand/logo-header.png" alt="The Online Store" width={740} height={176} className="h-10 w-auto" />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-300">
            Genuine beauty, fragrances, footwear, gifts and chocolates, delivered with care to every corner of Sri Lanka.
          </p>
          <ul className="flex flex-col gap-2.5 text-sm">
            {c.phone && (
              <li>
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2.5 hover:text-white">
                  <IconPhone size={18} className="text-sunset-400" /> {c.phone}
                </a>
              </li>
            )}
            {c.email && (
              <li>
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2.5 hover:text-white">
                  <IconMail size={18} className="text-sunset-400" /> {c.email}
                </a>
              </li>
            )}
            {c.hours && (
              <li className="inline-flex items-center gap-2.5">
                <IconClock size={18} className="text-sunset-400" /> {c.hours}
              </li>
            )}
            {c.address && <li className="whitespace-pre-line text-ink-300">{c.address}</li>}
          </ul>
          <div className="flex gap-2">
            {social.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className="grid size-11 place-items-center rounded-full bg-white/8 transition-colors hover:bg-sunset-600 hover:text-white">
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {(
          [
            ['Shop', footerNav.shop.filter((l) => linkIsLive(l.href, new Set(store.categories)))],
            ['Help', footerNav.help],
            ['The Online Store', footerNav.company],
          ] as const
        ).map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="mb-4 font-display text-base font-semibold text-white">{title}</h2>
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-1.5 text-sm text-ink-300 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-400">We accept</span>
            <span className="grid h-8 w-12 place-items-center rounded bg-white text-[#1a1f71]" aria-label="Visa">
              <IconBrandVisa size={30} />
            </span>
            <span className="grid h-8 w-12 place-items-center rounded bg-white text-[#eb001b]" aria-label="Mastercard">
              <IconBrandMastercard size={26} />
            </span>
            {store.paymentMethods.map((p) => (
              <span key={p} className="inline-flex h-8 items-center rounded bg-white/8 px-2.5 text-xs font-semibold text-ink-100">
                {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} {store.name} ({site.domain}). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
