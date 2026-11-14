import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'

import { cn } from '@/lib/utils/cn'

const chipBase =
  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color] duration-200 [&_svg]:size-4'

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        chipBase,
        active ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-surface text-ink-800 hover:border-ink-900',
        className,
      )}
      {...props}
    />
  )
}

export function ChipLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(chipBase, 'border-line-strong bg-surface text-ink-800 hover:border-ink-900 hover:bg-ink-50', className)}
      {...props}
    />
  )
}

/** Variant selector pill (size / pack / set). */
export function VariantPill({
  selected,
  disabled,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        'min-h-11 rounded-md border px-3.5 py-2 text-left text-sm font-medium transition-[border-color,background-color,box-shadow] duration-200',
        selected
          ? 'border-ink-900 bg-ink-900 text-white shadow-soft'
          : 'border-line-strong bg-surface text-ink-800 hover:border-ink-900',
        disabled && 'cursor-not-allowed text-ink-400 line-through opacity-60',
        className,
      )}
      {...props}
    />
  )
}
