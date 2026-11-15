'use client'

import { IconAlertCircle, IconCircleCheck, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

export const inputClass =
  'mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base text-ink-900 outline-none transition-[border-color,box-shadow] placeholder:text-ink-400 focus:border-ink-900 focus:shadow-[0_0_0_4px_var(--color-sunset-100)] aria-[invalid=true]:border-danger-600'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; name: string; error?: string; hint?: ReactNode; optional?: boolean }

/** Labelled input with hint and inline error (wired with aria-describedby / aria-invalid). */
export function Field({ label, name, error, hint, optional, className, ...props }: FieldProps) {
  const id = useId()
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-800">
        {label} {optional && <span className="font-normal text-ink-500">(optional)</span>}
      </label>
      <input id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={inputClass} {...props} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, name, error, hint, autoComplete = 'current-password', ...props }: Omit<FieldProps, 'type'>) {
  const id = useId()
  const [show, setShow] = useState(false)
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(inputClass, 'pr-12')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1.5 top-[calc(50%+3px)] grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          {show ? <IconEyeOff size={19} /> : <IconEye size={19} />}
        </button>
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** Submit button that shows a spinner while its form's server action runs. */
export function SubmitButton({ children, className, variant = 'primary' }: { children: ReactNode; className?: string; variant?: 'primary' | 'dark' | 'outline' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" variant={variant} loading={pending} className={cn('w-full', className)}>
      {children}
    </Button>
  )
}

export function FormAlert({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = { error: 'bg-danger-50 text-danger-600', success: 'bg-success-50 text-success-600', info: 'bg-ink-50 text-ink-700' }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm', styles)}>
      {tone === 'error' ? <IconAlertCircle size={18} className="mt-px shrink-0" /> : <IconCircleCheck size={18} className="mt-px shrink-0" />}
      <span>{children}</span>
    </div>
  )
}

export function Checkbox({ name, children, defaultChecked, error }: { name: string; children: ReactNode; defaultChecked?: boolean; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} aria-invalid={Boolean(error)} className="mt-0.5 size-[18px] shrink-0 accent-ink-900" />
        <span>{children}</span>
      </label>
      {error && <p className="ml-[30px] mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  )
}
