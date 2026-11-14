'use client'

import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

/** The bag's smile curve, drawn on scroll as a brand underline. */
export function SmileUnderline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 16" fill="none" aria-hidden className={cn('h-3 w-24', className)}>
      <defs>
        <linearGradient id="smile-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#ff8a00" />
          <stop offset="0.55" stopColor="#ff4d2e" />
          <stop offset="1" stopColor="#ff2d6f" />
        </linearGradient>
      </defs>
      <motion.path
        d="M4 4 C 30 16, 80 16, 116 3"
        stroke="url(#smile-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </svg>
  )
}

type SectionHeaderProps = {
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: { label: string; href: string }
  align?: 'left' | 'center'
  smile?: boolean
  className?: string
  children?: ReactNode
}

export function SectionHeader({ eyebrow, title, description, action, align = 'left', smile = true, className, children }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex gap-4 md:mb-8',
        align === 'center' ? 'flex-col items-center text-center' : 'flex-col sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-1.5', align === 'center' && 'items-center')}>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">{eyebrow}</p>}
        <h2 className="text-[1.625rem] font-bold md:text-[2rem]">{title}</h2>
        {smile && <SmileUnderline className="-mt-0.5" />}
        {description && <p className="max-w-xl text-ink-500">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 whitespace-nowrap">
        {children}
        {action && (
          <Link
            href={action.href}
            className="group inline-flex h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-ink-900 hover:text-sunset-600"
          >
            {action.label}
            <IconArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  )
}
