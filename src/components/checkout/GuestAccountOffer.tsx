'use client'

import { IconMailCheck, IconUserPlus } from '@tabler/icons-react'
import Link from 'next/link'
import { useActionState } from 'react'

import { createAccountFromOrderAction } from '@/app/(frontend)/account/actions'
import { FormAlert, PasswordField, SubmitButton } from '@/components/account/Form'

/** TOS-307: guests turn their order into an account with just a password. */
export function GuestAccountOffer({ orderNumber, token, email, hasAccount }: { orderNumber: string; token: string; email: string; hasAccount: boolean }) {
  const [state, action] = useActionState(createAccountFromOrderAction, null)
  if (hasAccount)
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-center text-sm text-ink-700 sm:p-6">
        You already have an account with {email}.{' '}
        <Link href="/account/login?next=/account/orders" className="font-semibold text-sunset-700 underline underline-offset-4">
          Sign in
        </Link>{' '}
        to see this order with your others.
      </div>
    )
  if (state?.ok)
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-6 text-center">
        <IconMailCheck size={30} className="text-success-600" />
        <p className="font-bold">Almost there</p>
        <p className="max-w-md text-sm text-ink-600">We sent a confirmation link to {email}. Once you confirm, this order appears in your account, ready to track.</p>
      </div>
    )
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-line bg-tint-gifts p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-sunset-600">
          <IconUserPlus size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Save your details for next time</h2>
          <p className="text-sm text-ink-700">Add a password to track this order, reuse your address and keep your wishlist. Your details are already filled in.</p>
        </div>
      </div>
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <PasswordField label={`Password for ${email}`} name="password" autoComplete="new-password" error={state?.fields?.password} hint="At least 8 characters." />
        <SubmitButton variant="dark" className="sm:w-auto">
          Create account
        </SubmitButton>
      </div>
    </form>
  )
}
