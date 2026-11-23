'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Payload's list wrapper writes its own defaults into the address (…?limit=10&depth=1&sort=-createdAt),
 * including a sort it remembered that our custom lists don't use. This puts back the address the page was
 * actually built from, e.g. /admin/collections/orders?tab=to-process: short, readable and shareable.
 */
export function CleanListURL({ href }: { href: string }) {
  // Re-runs whenever the address changes, so a rewrite by Payload (on load or after a tab change) is undone
  const current = useSearchParams().toString()
  useEffect(() => {
    // Payload's wrapper writes its address in an effect that runs after ours, so tidy up on the next tick
    const t = window.setTimeout(() => {
      if (`${window.location.pathname}${window.location.search}` !== href) window.history.replaceState(window.history.state, '', href)
    }, 0)
    return () => window.clearTimeout(t)
  }, [href, current])
  return null
}
