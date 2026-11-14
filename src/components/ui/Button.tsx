import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react'

import { cn } from '@/lib/utils/cn'

export const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold',
    'transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out-soft)]',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Main call to action: Add to bag, Checkout, Shop now */
        primary: 'bg-sunset-600 text-white shadow-soft hover:bg-sunset-700 hover:shadow-glow',
        /** Strong secondary: Quick add, dark banners */
        dark: 'bg-ink-900 text-white hover:bg-ink-800',
        /** Brand gradient: reserve for celebratory or promotional moments */
        gradient: 'bg-sunset-deep text-white shadow-glow hover:brightness-110',
        outline: 'border border-line-strong bg-surface text-ink-900 hover:border-ink-900',
        soft: 'bg-sunset-50 text-sunset-700 hover:bg-sunset-100',
        ghost: 'text-ink-900 hover:bg-ink-50',
        light: 'bg-white text-ink-900 hover:bg-ink-50',
        link: 'h-auto rounded-none px-0 text-sunset-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-[0.9375rem]', // 44px tap target
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    loading?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
    </button>
  )
})

export type ButtonLinkProps = ComponentProps<typeof Link> & ButtonVariantProps

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}
