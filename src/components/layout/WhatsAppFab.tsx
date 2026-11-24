'use client'

import { IconBrandWhatsapp } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'

import { useStoreSettings, whatsappLink } from '@/lib/store/StoreSettingsProvider'
import { cn } from '@/lib/utils/cn'

/**
 * Floating WhatsApp chat (the dominant support channel in Sri Lanka). Sits above the mobile bottom nav.
 * Always a perfect circle: the "Chat with us" label is a separate tooltip bubble (desktop hover/focus),
 * so it never changes the button's shape. Hidden on /checkout (still shown on the order-confirmed page).
 * With the shopping assistant on, the chat button takes this spot: WhatsApp moves above it on desktop, and
 * on phones it lives inside the chat (header button and "Continue on WhatsApp"), so two buttons don't
 * stack over the bottom nav.
 */
export function WhatsAppFab() {
  const pathname = usePathname()
  const store = useStoreSettings()
  // Hidden on the checkout form so it never covers the order total or the Place order button.
  const href = whatsappLink(store, `Hi ${store.name}! I have a question about a product.`)
  if (pathname === '/checkout' || !href) return null
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 18 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'wa-fab group fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[50] grid size-14 place-items-center rounded-full bg-[#1fa855] text-white shadow-[0_10px_28px_-8px_rgb(31_168_85/0.6)] ring-4 ring-white/70 md:bottom-6 md:right-6',
        store.assistant && 'max-md:hidden md:bottom-[6.25rem] md:size-12',
      )}
    >
      <IconBrandWhatsapp size={30} stroke={1.75} aria-hidden />
      {/* Tooltip label: absolutely positioned, so the button stays round */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white opacity-0 shadow-lift transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block"
      >
        Chat with us
      </span>
    </motion.a>
  )
}
