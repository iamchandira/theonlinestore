'use client'

import { IconArrowsSort, IconChevronDown } from '@tabler/icons-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { SORT_OPTIONS, type SortKey } from '@/lib/catalog'
import { cn } from '@/lib/utils/cn'

/** Native <select> (best on phones, fully accessible). Changing sort resets to page 1 and keeps other filters. */
export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  return (
    <label className={cn('relative inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface pl-3.5 pr-9 text-sm font-semibold transition-opacity hover:border-ink-900', pending && 'opacity-60')}>
      <IconArrowsSort size={17} className="text-ink-500" aria-hidden />
      <span className="sr-only">Sort products by</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString())
          if (e.target.value === 'recommended') next.delete('sort')
          else next.set('sort', e.target.value)
          next.delete('page')
          start(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }))
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden>{SORT_OPTIONS.find((o) => o.value === value)?.label}</span>
      <IconChevronDown size={16} className="pointer-events-none absolute right-3 text-ink-500" aria-hidden />
    </label>
  )
}
