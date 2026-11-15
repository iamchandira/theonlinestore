'use client'

import { IconMapPin, IconPencil, IconPlus, IconStarFilled, IconTrash } from '@tabler/icons-react'
import { useActionState, useEffect, useId, useState, useTransition } from 'react'

import { deleteAddressAction, makeDefaultAddressAction, saveAddressAction } from '@/app/(frontend)/account/actions'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { DISTRICTS } from '@/config/districts'
import { cn } from '@/lib/utils/cn'
import type { User } from '@/payload-types'

import { Checkbox, Field, FormAlert, inputClass, SubmitButton } from './Form'

type Address = NonNullable<User['addresses']>[number]

/** Address book (TOS-304): cards with default / edit / remove, and an add-edit form in a drawer. */
export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [pending, start] = useTransition()
  return (
    <section aria-labelledby="addr-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="addr-title" className="text-2xl font-bold">
          Addresses
        </h2>
        {addresses.length < 10 && (
          <Button variant="dark" onClick={() => setEditing('new')}>
            <IconPlus size={18} /> Add address
          </Button>
        )}
      </div>
      {addresses.length ? (
        <ul className={cn('grid gap-4 sm:grid-cols-2', pending && 'opacity-60')}>
          {addresses.map((a) => (
            <li key={a.id} className={cn('flex flex-col gap-3 rounded-2xl border bg-surface p-5', a.isDefault ? 'border-ink-900' : 'border-line')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-ink-600">{a.label || 'Address'}</span>
                {a.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                    <IconStarFilled size={11} /> Default
                  </span>
                )}
              </div>
              <address className="not-italic leading-relaxed text-ink-800">
                <strong className="font-semibold">{a.recipientName}</strong> · {a.phone}
                <br />
                {a.line1}
                {a.line2 && (
                  <>
                    <br />
                    {a.line2}
                  </>
                )}
                <br />
                {a.city}, {a.district} District{a.postalCode ? ` ${a.postalCode}` : ''}
                {a.landmark && <span className="mt-1 block text-sm text-ink-500">Near: {a.landmark}</span>}
              </address>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)} aria-label={`Edit ${a.label} address`}>
                  <IconPencil size={15} /> Edit
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => makeDefaultAddressAction(a.id!))}>
                    Make default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Remove ${a.label} address`}
                  onClick={() => window.confirm('Remove this address?') && start(() => deleteAddressAction(a.id!))}
                  className="ml-auto text-danger-600 hover:bg-danger-50"
                >
                  <IconTrash size={15} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-sunset-50 text-sunset-600">
            <IconMapPin size={26} />
          </span>
          <p className="text-lg font-bold">No saved addresses</p>
          <p className="max-w-sm text-sm text-ink-600">Save your home or office so checkout takes seconds. We deliver to all 25 districts.</p>
          <Button variant="outline" onClick={() => setEditing('new')}>
            <IconPlus size={16} /> Add your first address
          </Button>
        </div>
      )}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? 'Add an address' : 'Edit address'}>
        {editing !== null && <AddressForm key={editing === 'new' ? 'new' : editing.id} address={editing === 'new' ? null : editing} first={!addresses.length} onDone={() => setEditing(null)} />}
      </Drawer>
    </section>
  )
}

function AddressForm({ address, first, onDone }: { address: Address | null; first: boolean; onDone: () => void }) {
  const [state, action] = useActionState(saveAddressAction, null)
  const v = state?.values ?? {}
  const f = state?.fields ?? {}
  const [district, setDistrict] = useState(v.district ?? address?.district ?? '')
  const listId = useId()
  const towns = DISTRICTS.find((d) => d.name === district)?.towns ?? []
  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])
  const val = (k: keyof Address & string) => v[k] ?? (address?.[k] as string | undefined) ?? ''
  return (
    <form action={action} className="flex flex-col gap-4 p-5" noValidate>
      {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <input type="hidden" name="id" value={address?.id ?? ''} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
        <Field label="Label" name="label" defaultValue={val('label') || 'Home'} placeholder="Home, Work…" maxLength={30} />
        <Field label="Recipient name" name="recipientName" autoComplete="name" defaultValue={val('recipientName')} error={f.recipientName} />
      </div>
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" defaultValue={val('phone')} error={f.phone} hint="The courier calls this number." />
      <Field label="Address line 1" name="line1" autoComplete="address-line1" placeholder="House number and street" defaultValue={val('line1')} error={f.line1} />
      <Field label="Address line 2" name="line2" autoComplete="address-line2" optional placeholder="Apartment, lane, area" defaultValue={val('line2')} />
      <div>
        <label htmlFor={`${listId}-district`} className="text-sm font-semibold text-ink-800">
          District
        </label>
        <select
          id={`${listId}-district`}
          name="district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          aria-invalid={Boolean(f.district)}
          className={cn(inputClass, 'cursor-pointer appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10')}
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6b85' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6 -6'/%3E%3C/svg%3E\")" }}
        >
          <option value="">Choose a district</option>
          {['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'].map((p) => (
            <optgroup key={p} label={`${p} Province`}>
              {DISTRICTS.filter((d) => d.province === p).map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {f.district && <p className="mt-1.5 text-sm text-danger-600">{f.district}</p>}
      </div>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
        <Field label="Town / city" name="city" autoComplete="address-level2" list={`${listId}-towns`} defaultValue={val('city')} error={f.city} placeholder={towns[0] ?? 'e.g. Nugegoda'} />
        <Field label="Postal code" name="postalCode" inputMode="numeric" autoComplete="postal-code" optional defaultValue={val('postalCode')} error={f.postalCode} />
      </div>
      <datalist id={`${listId}-towns`}>
        {towns.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Field label="Landmark" name="landmark" optional placeholder="e.g. Opposite the Cargills Food City" defaultValue={val('landmark')} />
      <Checkbox name="isDefault" defaultChecked={address ? Boolean(address.isDefault) : first}>
        Use as my default delivery address
      </Checkbox>
      <SubmitButton variant="dark">{address ? 'Save changes' : 'Save address'}</SubmitButton>
    </form>
  )
}
