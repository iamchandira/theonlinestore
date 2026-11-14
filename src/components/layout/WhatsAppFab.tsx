'use client'

import { IconBrandWhatsapp } from '@tabler/icons-react'
import { motion } from 'motion/react'

import { site } from '@/config/site'

/** Floating WhatsApp chat (the dominant support channel in Sri Lanka). Sits above the mobile bottom nav. */
export function WhatsAppFab() {
  const text = encodeURIComponent('Hi The Online Store! I have a question about a product.')
  return (
    <motion.a
      href={`https://wa.me/${site.contact.whatsapp}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 18 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="wa-fab group fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[50] flex h-13 items-center gap-2 rounded-full bg-[#1fa855] pl-3.5 pr-3.5 text-white shadow-lift md:bottom-6 md:right-6"
    >
      <IconBrandWhatsapp size={26} />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width] duration-300 group-hover:max-w-40 md:inline">
        Chat with us
      </span>
    </motion.a>
  )
}
