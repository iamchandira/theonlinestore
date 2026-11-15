import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { getPayloadClient } from '@/lib/catalog/server'
import { clientIp } from '@/lib/server/rateLimit'
import type { User } from '@/payload-types'

/** The signed-in storefront user (customer or staff), or null. One lookup per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user && user.collection === 'users' ? (user as User) : null
})

/** For account pages: the user, or a redirect to sign-in that comes back here afterwards. */
export async function requireUser(next: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`)
  return user
}

export async function requestIp() {
  return clientIp(await headers())
}

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
export const safeNext = (next: unknown, fallback = '/account') => (typeof next === 'string' && /^\/(?!\/)[\w\-/?=&%.#]*$/.test(next) ? next : fallback)
