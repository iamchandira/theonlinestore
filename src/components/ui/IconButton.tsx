import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: icon-only buttons must have an accessible name. */
  label: string
  icon: ReactNode
  /** Small numeric badge (cart/wishlist counts). */
  count?: number
  tone?: 'ghost' | 'surface' | 'dark'
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, count, tone = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={count ? `${label} (${count})` : label}
      title={label}
      className={cn(
        'relative inline-grid shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-95',
        size === 'md' ? 'size-11' : 'size-9',
        tone === 'ghost' && 'text-ink-900 hover:bg-ink-50',
        tone === 'surface' && 'bg-surface text-ink-900 shadow-soft hover:bg-ink-50',
        tone === 'dark' && 'bg-ink-900 text-white hover:bg-ink-800',
        className,
      )}
      {...props}
    >
      {icon}
      {count ? <CountBadge count={count} /> : null}
    </button>
  )
})

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sunset-600 px-1 text-[0.6875rem] font-bold leading-none text-white ring-2 ring-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
