'use client'

import { IconMailCheck } from '@tabler/icons-react'
import Link from 'next/link'
import { useActionState } from 'react'

import { forgotPasswordAction, loginAction, registerAction, resendVerificationAction, resetPasswordAction, type FormState } from '@/app/(frontend)/account/actions'

import { Checkbox, Field, FormAlert, PasswordField, SubmitButton } from './Form'

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, null)
  return (
    <div className="flex flex-col gap-5">
      {notice && !state?.error && <FormAlert tone="success">{notice}</FormAlert>}
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next ?? ''} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} />
        <PasswordField label="Password" name="password" required />
        <div className="flex items-center justify-between gap-3">
          <Checkbox name="remember" defaultChecked>
            Keep me signed in
          </Checkbox>
          <Link href="/account/forgot-password" className="text-sm font-semibold text-sunset-700 underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton>Sign in</SubmitButton>
      </form>
      {state?.values?.unverified && <ResendVerification email={state.values.email} />}
      <p className="text-center text-sm text-ink-600">
        New here?{' '}
        <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-sunset-700 underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  )
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null)
  if (state?.ok) return <CheckInbox email={state.message ?? ''} />
  const f = state?.fields ?? {}
  return (
    <div className="flex flex-col gap-5">
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={state?.values?.fullName} error={f.fullName} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} error={f.email} />
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          optional
          placeholder="077 123 4567"
          defaultValue={state?.values?.phone}
          error={f.phone}
          hint="For delivery updates by SMS or WhatsApp."
        />
        <PasswordField label="Password" name="password" autoComplete="new-password" required error={f.password} hint="At least 8 characters." />
        {/* Honeypot: hidden from people and assistive tech */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
        <Checkbox name="marketing">Send me offers and new arrivals (you can change this any time)</Checkbox>
        <Checkbox name="terms" error={f.terms}>
          I agree to the{' '}
          <Link href="/terms" className="font-semibold underline underline-offset-2">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold underline underline-offset-2">
            privacy policy
          </Link>
          .
        </Checkbox>
        <SubmitButton>Create account</SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/account/login" className="font-semibold text-sunset-700 underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function CheckInbox({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success-50 text-success-600">
        <IconMailCheck size={32} />
      </span>
      <h2 className="text-xl font-bold">Check your inbox</h2>
      <p className="text-ink-600">
        We sent a confirmation link to <strong className="text-ink-900">{email}</strong>. Open it to activate your account, then sign in.
      </p>
      <ResendVerification email={email} />
    </div>
  )
}

function ResendVerification({ email }: { email?: string }) {
  const [state, action] = useActionState(resendVerificationAction, null)
  if (state?.ok) return <FormAlert tone="info">{state.message}</FormAlert>
  return (
    <form action={action} className="text-center text-sm text-ink-600">
      <input type="hidden" name="email" value={email ?? ''} />
      Didn’t get it?{' '}
      <button type="submit" className="font-semibold text-sunset-700 underline underline-offset-4">
        Send the link again
      </button>
      {state?.error && <p className="mt-2 text-danger-600">{state.error}</p>}
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, null)
  if (state?.ok)
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="success">
          If <strong>{state.message}</strong> has an account, we’ve emailed a link to reset the password. It works once and expires in 1 hour.
        </FormAlert>
        <Link href="/account/login" className="text-center text-sm font-semibold text-sunset-700 underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    )
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} />
      <SubmitButton>Email me a reset link</SubmitButton>
      <Link href="/account/login" className="text-center text-sm font-semibold text-sunset-700 underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, null)
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" name="password" autoComplete="new-password" required error={state?.fields?.password} hint="At least 8 characters." />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" required error={state?.fields?.confirm} />
      <SubmitButton>Save new password</SubmitButton>
      {state?.values?.expired && (
        <Link href="/account/forgot-password" className="text-center text-sm font-semibold text-sunset-700 underline underline-offset-4">
          Send me a new link
        </Link>
      )}
    </form>
  )
}
