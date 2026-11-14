import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils/cn'

/** Full logo lockup (cropped transparent PNG, 740×176). */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="The Online Store home" className={cn('inline-flex shrink-0 items-center', className)}>
      <Image
        src="/brand/logo-header.png"
        alt="The Online Store"
        width={740}
        height={176}
        priority={priority}
        className="h-full w-auto"
        sizes="200px"
      />
    </Link>
  )
}

/** Bag mark only, for compact spaces. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/icon-transparent.png"
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    />
  )
}
