import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthLayout } from '@/components/account/AuthLayout'
import { RegisterForm } from '@/components/account/AuthForms'
import { getCurrentUser } from '@/lib/auth/server'

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } }

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/account')
  return (
    <AuthLayout title="Create your account" subtitle="It takes a minute. Guest checkout stays available whenever you prefer.">
      <RegisterForm />
    </AuthLayout>
  )
}
