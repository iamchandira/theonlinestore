'use client'

import { useEffect } from 'react'

/** Empties the bag on this device once the confirmation page is shown (covers a refresh mid-redirect). */
export function OrderPlacedEffect() {
  useEffect(() => {
    window.dispatchEvent(new Event('tos:order-placed'))
  }, [])
  return null
}
