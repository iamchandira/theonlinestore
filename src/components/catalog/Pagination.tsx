import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import Link from 'next/link'

import { cn } from '@/lib/utils/cn'

/** Crawlable numbered pagination that keeps the current filters and sort. */
export function Pagination({ page, totalPages, basePath, params }: { page: number; totalPages: number; basePath: string; params: Record<string, string> }) {
  if (totalPages <= 1) return null
  const href = (p: number) => {
    const q = new URLSearchParams(params)
    if (p > 1) q.set('page', String(p))
    else q.delete('page')
    return `${basePath}${q.size ? `?${q}` : ''}`
  }
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
  const item = 'grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-semibold transition-colors'
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(item, 'border border-line-strong hover:border-ink-900')} aria-label="Previous page">
          <IconChevronLeft size={18} />
        </Link>
      ) : null}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-ink-400" aria-hidden>…</span>}
          <Link href={href(p)} aria-current={p === page ? 'page' : undefined} className={cn(item, p === page ? 'bg-ink-900 text-white' : 'hover:bg-ink-50')}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={cn(item, 'border border-line-strong hover:border-ink-900')} aria-label="Next page">
          <IconChevronRight size={18} />
        </Link>
      ) : null}
    </nav>
  )
}
