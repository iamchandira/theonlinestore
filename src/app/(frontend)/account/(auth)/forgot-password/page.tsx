import type { Metadata } from 'next'

import { AuthLayout } from '@/components/account/AuthLayout'
import { ForgotPasswordForm } from '@/components/account/AuthForms'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <AuthLayout aside={false} title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
