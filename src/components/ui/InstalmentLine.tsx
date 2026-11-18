'use client'

import { formatLKR } from '@/lib/format'
import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'
import { cn } from '@/lib/utils/cn'

/**
 * "or 3 × Rs 1,317 with Koko" (launch prep). Shown only when an instalment provider is switched on,
 * connected, and set to show on products (Settings › Payments). Includes the provider's fee, if any,
 * so the amount matches what the shopper pays at checkout.
 */
export function InstalmentLine({ price, compact, className }: { price: number; compact?: boolean; className?: string }) {
  const { instalments } = useStoreSettings()
  if (!instalments || !(price > 0)) return null
  const each = Math.ceil((price * (1 + instalments.feePercent / 100)) / 3)
  const who = instalments.providers.join(' / ')
  const fee = instalments.feePercent > 0 ? ` (includes ${instalments.feePercent}% instalment fee)` : ' interest-free'
  if (compact)
    return (
      <p className={cn('text-xs text-ink-500', className)} title={`Pay in 3 with ${who}${fee}`}>
        or 3 × <span className="font-semibold text-ink-700">{formatLKR(each)}</span>
        <span className="hidden sm:inline"> with {instalments.providers[0]}</span>
      </p>
    )
  return (
    <p className={cn('text-xs text-ink-500', className)}>
      or 3 × <span className="font-semibold text-ink-700">{formatLKR(each)}</span> with <span className="font-semibold text-ink-700">{who}</span>
      {instalments.feePercent > 0 ? <span> (incl. {instalments.feePercent}% fee)</span> : null}
    </p>
  )
}
