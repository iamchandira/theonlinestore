import { formatLKR, percentOff } from '@/lib/format'
import { cn } from '@/lib/utils/cn'

type PriceProps = {
  price: number
  compareAt?: number | null
  /** Prefix such as "From" when variants have different prices. */
  prefix?: string
  size?: 'sm' | 'md' | 'lg'
  showSaving?: boolean
  className?: string
}

/** Selling price, optional struck-through compare-at price and % off. */
export function Price({ price, compareAt, prefix, size = 'md', showSaving = true, className }: PriceProps) {
  const off = percentOff(price, compareAt)
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span
        className={cn(
          'font-display font-bold tracking-tight tabular-nums',
          off ? 'text-rose-600' : 'text-ink-900',
          size === 'sm' && 'text-[0.9375rem]',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-3xl',
        )}
      >
        {prefix && <span className="mr-1 text-[0.8em] font-medium text-ink-500">{prefix}</span>}
        {formatLKR(price)}
      </span>
      {off > 0 && compareAt ? (
        <>
          <span className={cn('text-ink-500 line-through tabular-nums', size === 'lg' ? 'text-lg' : 'text-sm')}>
            <span className="sr-only">Was </span>
            {formatLKR(compareAt)}
          </span>
          {showSaving && <span className="text-xs font-bold text-rose-600">-{off}%</span>}
        </>
      ) : null}
    </div>
  )
}
