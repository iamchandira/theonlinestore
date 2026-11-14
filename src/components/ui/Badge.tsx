import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold leading-none [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        sale: 'bg-rose-600 text-white',
        new: 'bg-ink-900 text-white',
        bestseller: 'bg-[#ffe7b8] text-[#6b4300]',
        trending: 'bg-sunset-100 text-sunset-800',
        gift: 'bg-tint-gifts text-sunset-800',
        limited: 'bg-[#efe6fb] text-[#5b2a9b]',
        neutral: 'bg-ink-50 text-ink-700',
        success: 'bg-success-50 text-success-600',
        warning: 'bg-warning-50 text-warning-600',
        outline: 'border border-line-strong bg-surface text-ink-700',
        bnpl: 'bg-[#e9f7f1] text-[#0d6b49]',
      },
      size: {
        sm: 'h-5 px-2 text-[0.6875rem]',
        md: 'h-6 px-2.5 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

export const badgeLabel: Record<string, { label: string; tone: NonNullable<BadgeProps['tone']> }> = {
  bestseller: { label: 'Bestseller', tone: 'bestseller' },
  new: { label: 'New', tone: 'new' },
  trending: { label: 'Trending', tone: 'trending' },
  gift: { label: 'Gift idea', tone: 'gift' },
  limited: { label: 'Limited', tone: 'limited' },
}
