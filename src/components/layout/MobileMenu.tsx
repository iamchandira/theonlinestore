'use client'

import { IconBrandWhatsapp, IconChevronDown, IconPackage, IconPhone, IconUser } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { LogoMark } from '@/components/brand/Logo'
import { Drawer } from '@/components/ui/Drawer'
import { categories } from '@/config/navigation'
import { site } from '@/config/site'
import { cn } from '@/lib/utils/cn'

/** Mobile navigation drawer: accordion categories, account shortcuts, help contacts. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('skincare')
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title={
        <span className="flex items-center gap-2">
          <LogoMark size={28} /> Menu
        </span>
      }
      footer={
        <div className="flex flex-col gap-2 text-sm">
          <a href={`https://wa.me/${site.contact.whatsapp}`} className="flex h-11 items-center gap-2 font-semibold text-[#128c4a]">
            <IconBrandWhatsapp size={20} /> Chat with us on WhatsApp
          </a>
          <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`} className="flex h-11 items-center gap-2 text-ink-700">
            <IconPhone size={20} /> {site.contact.phone}
          </a>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 p-4">
        <Link href="/account" onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-md bg-ink-50 text-sm font-semibold">
          <IconUser size={19} /> Sign in
        </Link>
        <Link href="/track-order" onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-md bg-ink-50 text-sm font-semibold">
          <IconPackage size={19} /> Track order
        </Link>
      </div>
      <nav aria-label="Categories" className="px-2 pb-4">
        <ul>
          {categories.map((c) => (
            <li key={c.slug} className="border-b border-line last:border-0">
              {c.children ? (
                <>
                  <button
                    type="button"
                    aria-expanded={expanded === c.slug}
                    onClick={() => setExpanded(expanded === c.slug ? null : c.slug)}
                    className="flex h-13 w-full items-center justify-between px-3 text-left font-semibold"
                  >
                    {c.name}
                    <IconChevronDown size={18} className={cn('transition-transform', expanded === c.slug && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded === c.slug && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <li>
                          <Link href={c.href} onClick={onClose} className="block px-6 py-2.5 text-sm font-semibold text-sunset-700">
                            Shop all {c.name}
                          </Link>
                        </li>
                        {c.children.map((s) => (
                          <li key={s.href}>
                            <Link href={s.href} onClick={onClose} className="block px-6 py-2.5 text-sm text-ink-700">
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link href={c.href} onClick={onClose} className="flex h-13 items-center px-3 font-semibold">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
          <li>
            <Link href="/brands" onClick={onClose} className="flex h-13 items-center px-3 font-semibold">
              Brands
            </Link>
          </li>
          <li>
            <Link href="/offers" onClick={onClose} className="flex h-13 items-center gap-2 px-3 font-semibold text-rose-600">
              Offers <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-white">Sale</span>
            </Link>
          </li>
        </ul>
      </nav>
    </Drawer>
  )
}
