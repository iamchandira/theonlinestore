import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
  /** Visually hide the label (it is still read by screen readers). */
  hideLabel?: boolean
}

/** Text input with label, hint and inline error (aria-describedby wired automatically). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, hideLabel, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={cn('text-sm font-semibold text-ink-800', hideLabel && 'sr-only')}>
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-md border bg-surface px-3.5 transition-[border-color,box-shadow] duration-200',
          'focus-within:border-ink-900 focus-within:shadow-[0_0_0_4px_var(--color-sunset-100)]',
          error ? 'border-danger-600' : 'border-line-strong hover:border-ink-300',
          className,
        )}
      >
        {leading && <span className="text-ink-500 [&_svg]:size-5">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full w-full min-w-0 bg-transparent text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-none"
          {...props}
        />
        {trailing}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
})
