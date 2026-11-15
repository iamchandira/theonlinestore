import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthLayout } from '@/components/account/AuthLayout'
import { ResetPasswordForm } from '@/components/account/AuthForms'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const token = (await searchParams).token ?? ''
  return (
    <AuthLayout aside={false} title="Choose a new password" subtitle="You’ll be signed in straight after.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-ink-600">
          This link is incomplete.{' '}
          <Link href="/account/forgot-password" className="font-semibold text-sunset-700 underline underline-offset-4">
            Ask for a new reset link
          </Link>
          .
        </p>
      )}
    </AuthLayout>
  )
}
