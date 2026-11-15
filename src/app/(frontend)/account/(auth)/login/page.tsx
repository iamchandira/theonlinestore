import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthLayout } from '@/components/account/AuthLayout'
import { LoginForm } from '@/components/account/AuthForms'
import { getCurrentUser, safeNext } from '@/lib/auth/server'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

type Props = { searchParams: Promise<Record<string, string | undefined>> }

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams
  const next = safeNext(sp.next, '/account')
  if (await getCurrentUser()) redirect(next)
  const notice = sp.verified ? 'Email confirmed. Sign in to continue.' : undefined
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to track orders, use saved addresses and keep your wishlist.">
      <LoginForm next={next} notice={notice} />
    </AuthLayout>
  )
}
