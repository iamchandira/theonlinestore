import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import type { Metadata } from 'next'

import { AuthLayout } from '@/components/account/AuthLayout'
import { ButtonLink } from '@/components/ui/Button'
import { getPayloadClient } from '@/lib/catalog/server'

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } }

/** Confirms an email address from the link in the welcome email (TOS-301). */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const token = (await searchParams).token ?? ''
  let ok = false
  if (token) {
    const payload = await getPayloadClient()
    ok = await payload.verifyEmail({ collection: 'users', token }).catch(() => false)
  }
  return (
    <AuthLayout aside={false} title={ok ? 'Email confirmed' : 'This link has expired'}>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className={`grid size-16 place-items-center rounded-full ${ok ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
          {ok ? <IconCircleCheck size={32} /> : <IconCircleX size={32} />}
        </span>
        <p className="text-ink-600">
          {ok ? 'Thanks! Your account is ready.' : 'The link was already used or is no longer valid. Try signing in. If your email still needs confirming, we can send a new link.'}
        </p>
        <ButtonLink href={ok ? '/account/login?verified=1' : '/account/login'} variant="dark">
          Sign in
        </ButtonLink>
      </div>
    </AuthLayout>
  )
}
