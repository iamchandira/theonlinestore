import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AccountNav } from '@/components/account/AccountNav'
import { getCurrentUser } from '@/lib/auth/server'

export const metadata: Metadata = { title: 'My account', robots: { index: false } }

/** Signed-in account area (TOS-302 → 306). */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  // Each page redirects signed-out visitors itself, so sign-in returns them to the right page
  if (!user) return <>{children}</>
  const first = (user.fullName || user.email).split(/[\s@]/)[0]
  return (
    <div className="container-site py-6 md:py-10">
      <div className="mb-6 flex items-center gap-4 md:mb-8">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-sunset-deep text-xl font-bold text-white">
          {first.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-600">Signed in as {user.email}</p>
          <p className="truncate font-display text-2xl font-bold md:text-3xl">Hi, {first}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
        <aside className="min-w-0 md:sticky md:top-28 md:self-start">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
