'use client'

import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'

export function ProgressBar({ value, max = 100, label, className }: { value: number; max?: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}
    >
      <motion.div
        className="h-full rounded-full bg-sunset-gradient"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 24 }}
      />
    </div>
  )
}
