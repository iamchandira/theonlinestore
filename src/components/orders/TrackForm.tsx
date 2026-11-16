'use client'

import { useActionState } from 'react'

import { trackOrderAction, type TrackState } from '@/app/(frontend)/orders/actions'
import { Field, FormAlert, SubmitButton } from '@/components/account/Form'

/** Order number + mobile → the order page (TOS-705). */
export function TrackForm() {
  const [state, action] = useActionState<TrackState, FormData>(trackOrderAction, null)
  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <Field
        label="Order number"
        name="orderNumber"
        placeholder="TOS-261115-J7MT"
        autoCapitalize="characters"
        autoComplete="off"
        defaultValue={state?.values?.orderNumber}
        error={state?.fields?.orderNumber}
        required
      />
      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="077 123 4567"
        autoComplete="tel"
        defaultValue={state?.values?.phone}
        error={state?.fields?.phone}
        required
      />
      <SubmitButton>Track order</SubmitButton>
    </form>
  )
}
