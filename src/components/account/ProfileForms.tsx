'use client'

import { useActionState, useTransition } from 'react'

import { cancelDeletionAction, changePasswordAction, requestDeletionAction, updateConsentAction, updateProfileAction } from '@/app/(frontend)/account/actions'
import { Button } from '@/components/ui/Button'

import { Checkbox, Field, FormAlert, PasswordField, SubmitButton } from './Form'

const card = 'flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6'

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, null)
  return (
    <form action={action} className={card} noValidate>
      <h2 className="text-lg font-bold">Your details</h2>
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={state?.values?.fullName ?? fullName} error={state?.fields?.fullName} />
      <Field label="Email" name="email" defaultValue={email} readOnly disabled hint="Contact us on WhatsApp if you need to change your email." />
      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        optional
        placeholder="077 123 4567"
        defaultValue={state?.values?.phone ?? phone}
        error={state?.fields?.phone}
        hint="For delivery updates by SMS or WhatsApp."
      />
      <SubmitButton variant="dark" className="sm:w-auto sm:self-start">
        Save details
      </SubmitButton>
    </form>
  )
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null)
  return (
    <form action={action} className={card} noValidate key={state?.ok ? 'done' : 'form'}>
      <h2 className="text-lg font-bold">Change password</h2>
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <PasswordField label="Current password" name="current" error={state?.fields?.current} />
      <PasswordField label="New password" name="password" autoComplete="new-password" error={state?.fields?.password} hint="At least 8 characters." />
      <SubmitButton variant="dark" className="sm:w-auto sm:self-start">
        Change password
      </SubmitButton>
    </form>
  )
}

export function ConsentForm({ channels }: { channels: string[] }) {
  const [state, action] = useActionState(updateConsentAction, null)
  return (
    <form action={action} className={card}>
      <div>
        <h2 className="text-lg font-bold">Offers &amp; news</h2>
        <p className="mt-1 text-sm text-ink-600">Choose how we may send you offers. Order and delivery updates always arrive, whatever you pick.</p>
      </div>
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Marketing channels</legend>
        <Checkbox name="email" defaultChecked={channels.includes('email')}>
          Email
        </Checkbox>
        <Checkbox name="sms" defaultChecked={channels.includes('sms')}>
          SMS
        </Checkbox>
        <Checkbox name="whatsapp" defaultChecked={channels.includes('whatsapp')}>
          WhatsApp
        </Checkbox>
      </fieldset>
      <SubmitButton variant="dark" className="sm:w-auto sm:self-start">
        Save preferences
      </SubmitButton>
    </form>
  )
}

export function DeletionForm({ requestedAt }: { requestedAt: string | null }) {
  const [state, action] = useActionState(requestDeletionAction, null)
  const [pending, start] = useTransition()
  if (requestedAt)
    return (
      <div className={card}>
        <h2 className="text-lg font-bold">Account deletion requested</h2>
        <p className="text-sm text-ink-600">
          You asked us on {new Date(requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' })}. We’ll delete your
          account and personal data within 14 days.
        </p>
        <Button variant="outline" className="sm:self-start" loading={pending} onClick={() => start(() => cancelDeletionAction())}>
          Cancel the request
        </Button>
      </div>
    )
  return (
    <form action={action} className={card} noValidate>
      <div>
        <h2 className="text-lg font-bold">Delete my account</h2>
        <p className="mt-1 text-sm text-ink-600">
          We’ll delete your account, addresses, wishlist and marketing preferences within 14 days, under Sri Lanka’s Personal Data Protection Act. Order records we
          must keep for tax purposes are anonymised. Reviews you wrote stay, shown without your name.
        </p>
      </div>
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field label={<>Type <strong>DELETE</strong> to confirm</>} name="confirm" autoComplete="off" error={state?.fields?.confirm} className="sm:max-w-xs" />
      <SubmitButton variant="outline" className="border-danger-600 text-danger-600 sm:w-auto sm:self-start">
        Request deletion
      </SubmitButton>
    </form>
  )
}
