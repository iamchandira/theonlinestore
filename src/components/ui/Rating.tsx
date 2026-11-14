import { IconStarFilled, IconStarHalfFilled, IconStar } from '@tabler/icons-react'

import { cn } from '@/lib/utils/cn'

export function Rating({ value, count, size = 14, className }: { value: number; count?: number; size?: number; className?: string }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = value - i
    if (diff >= 0.75) return 'full'
    if (diff >= 0.25) return 'half'
    return 'empty'
  })
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">
        Rated {value} out of 5{count ? ` from ${count} reviews` : ''}
      </span>
      <span className="flex text-star" aria-hidden>
        {stars.map((s, i) =>
          s === 'full' ? (
            <IconStarFilled key={i} size={size} />
          ) : s === 'half' ? (
            <IconStarHalfFilled key={i} size={size} />
          ) : (
            <IconStar key={i} size={size} className="text-ink-200" />
          ),
        )}
      </span>
      {count !== undefined && (
        <span className="text-xs text-ink-500" aria-hidden>
          ({count})
        </span>
      )}
    </div>
  )
}
