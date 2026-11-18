'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { StorePublic } from './settings'

const Ctx = createContext<StorePublic | null>(null)

/** Admin-managed store settings for client components (contact, free delivery, payments, instalments). */
export function StoreSettingsProvider({ value, children }: { value: StorePublic; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStoreSettings(): StorePublic {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStoreSettings must be used inside StoreSettingsProvider')
  return v
}

/** wa.me link, or null when no WhatsApp number is set */
export const whatsappLink = (s: StorePublic, text?: string) => (s.contact.whatsapp ? `https://wa.me/${s.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null)
