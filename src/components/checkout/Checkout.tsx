'use client'

import {
  IconBuildingBank,
  IconCash,
  IconChevronDown,
  IconGift,
  IconLock,
  IconShieldCheck,
  IconShoppingBag,
  IconTag,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { Field, FormAlert, inputClass } from '@/components/account/Form'
import { categoryTint } from '@/components/product/ProductCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { DISTRICTS } from '@/config/districts'
import type { Quote } from '@/lib/checkout/pricing'
import type { Issue, LineView, PaymentOption } from '@/lib/checkout/server'
import { formatLKR } from '@/lib/format'
import { useShop, type CartLine } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

type SavedAddress = { id: string; label: string; recipientName: string; phone: string; line1: string; line2: string; city: string; district: string; postalCode: string; landmark: string; isDefault: boolean }
type Props = {
  user: { fullName: string; email: string; phone: string; addresses: SavedAddress[] } | null
  giftWrapFee: number
  freeThreshold: number
  sameDayDistricts: string[]
}
type QuoteResponse = { quote: Quote; views: LineView[]; issues: Issue[]; couponError: string | null; payments: PaymentOption[]; codFee: number }
type Errors = Partial<Record<'fullName' | 'email' | 'phone' | 'line1' | 'city' | 'district' | 'postalCode' | 'addressPhone' | 'payment' | 'terms' | 'coupon' | 'method', string>>

const PHONE = /^(\+94|0)?7\d{8}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6b85' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6 -6'/%3E%3C/svg%3E\")"

/**
 * One-page checkout (TOS-502): contact → address → delivery → payment → gift & notes, with a live,
 * server-priced summary. Every total shown comes from POST /api/orders/quote; placing the order
 * re-prices on the server and refuses if the total changed in the meantime.
 */
export function Checkout({ user, giftWrapFee, freeThreshold, sameDayDistricts }: Props) {
  const router = useRouter()
  const { lines, hydrated, setLinesFromServer, setCartOpen } = useShop()
  const defaultAddress = user?.addresses.find((a) => a.isDefault) ?? user?.addresses[0]

  const [contact, setContact] = useState({ fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' })
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? 'new')
  const [address, setAddress] = useState({ recipientName: '', phone: '', line1: '', line2: '', city: '', district: '', postalCode: '', landmark: '' })
  const [method, setMethod] = useState<'standard' | 'same-day'>('standard')
  const [chosenPayment, setPayment] = useState<'cod' | 'bank-transfer' | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<string | null>(null)
  const [gift, setGift] = useState({ wrap: false, message: '', hidePrices: false })
  const [note, setNote] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [banner, setBanner] = useState<{ tone: 'error' | 'info'; text: ReactNode } | null>(null)
  const [data, setData] = useState<QuoteResponse | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  // The chosen payment method if it's available, otherwise the first available one
  const payment: 'cod' | 'bank-transfer' | null =
    data?.payments.find((p) => p.id === chosenPayment && p.available)?.id ?? data?.payments.find((p) => p.available)?.id ?? chosenPayment
  const saved = user?.addresses.find((a) => a.id === addressId)
  const district = saved?.district ?? address.district
  const items = useMemo(() => lines.map((l) => ({ sku: l.sku, qty: l.qty })), [lines])
  const itemsKey = JSON.stringify(items)

  // Live, server-priced quote (debounced)
  const reqId = useRef(0)
  useEffect(() => {
    if (!hydrated || !items.length) return
    const id = ++reqId.current
    const t = window.setTimeout(async () => {
      setQuoting(true)
      try {
        const res = await fetch('/api/orders/quote', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, district, method, couponCode: coupon, giftWrap: gift.wrap, payment, email: contact.email, phone: contact.phone }),
        })
        const json = (await res.json()) as QuoteResponse
        if (id !== reqId.current) return
        setData(json)
        if (json.issues.length) {
          setBanner({ tone: 'info', text: json.issues.map((i) => i.message).join(' ') })
          setLinesFromServer(json.views as unknown as CartLine[])
        }
        if (coupon && json.couponError) setErrors((e) => ({ ...e, coupon: json.couponError ?? undefined }))
        if (method === 'same-day' && json.quote.delivery.method !== 'same-day') setMethod('standard')
      } finally {
        if (id === reqId.current) setQuoting(false)
      }
    }, 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemsKey, district, method, coupon, gift.wrap, payment, contact.email.length > 5 ? contact.email : '', contact.phone.length >= 10 ? contact.phone : ''])

  const q = data?.quote
  const payments = useMemo(() => data?.payments ?? [], [data])

  if (hydrated && !lines.length) {
    return (
      <div className="container-site flex flex-col items-center gap-4 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-sunset-50 text-sunset-600">
          <IconShoppingBag size={30} />
        </span>
        <h1 className="text-2xl font-bold">Your bag is empty</h1>
        <p className="text-ink-600">Add something you love, then come back to check out.</p>
        <ButtonLink href="/c/beauty?sort=bestsellers" variant="dark">
          Shop bestsellers
        </ButtonLink>
      </div>
    )
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (contact.fullName.trim().length < 2) e.fullName = 'Enter your name.'
    if (!EMAIL.test(contact.email.trim())) e.email = 'Enter a valid email for your receipt.'
    if (!PHONE.test(contact.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a Sri Lankan mobile number, e.g. 077 123 4567.'
    if (!saved) {
      if (address.line1.trim().length < 3) e.line1 = 'Enter the house number and street.'
      if (address.city.trim().length < 2) e.city = 'Enter the town or city.'
      if (!address.district) e.district = 'Choose a district.'
      if (address.postalCode && !/^\d{5}$/.test(address.postalCode)) e.postalCode = 'Postal codes have 5 digits.'
      if (address.phone && !PHONE.test(address.phone.replace(/[\s-]/g, ''))) e.addressPhone = 'Enter a Sri Lankan mobile number.'
    }
    if (!payment) e.payment = 'Choose how you’d like to pay.'
    if (!terms) e.terms = 'Please accept the terms and conditions.'
    return e
  }

  const focusFirstError = (e: Errors) => {
    const first = Object.keys(e)[0]
    if (!first) return
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"]`)?.focus())
  }

  const place = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      setBanner({ tone: 'error', text: 'Please check the highlighted fields.' })
      focusFirstError(e)
      return
    }
    if (!q) return
    setPlacing(true)
    setBanner(null)
    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          contact,
          addressId: saved ? saved.id : undefined,
          address: saved ? undefined : { ...address, recipientName: address.recipientName || contact.fullName, phone: address.phone || contact.phone },
          method,
          payment,
          couponCode: coupon,
          gift,
          note,
          acceptTerms: terms,
          expectedTotal: q.total,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; redirect?: string; error?: string; fields?: Errors; issues?: Issue[]; quote?: Quote; views?: LineView[]; priceChanged?: boolean }
      if (res.ok && json.redirect) {
        window.dispatchEvent(new Event('tos:order-placed'))
        router.push(json.redirect)
        return
      }
      if (json.fields) {
        setErrors(json.fields)
        focusFirstError(json.fields)
      }
      if (json.views) setLinesFromServer(json.views as unknown as CartLine[])
      if (json.quote && data) setData({ ...data, quote: json.quote })
      setBanner({ tone: 'error', text: [json.error, ...(json.issues ?? []).map((i) => i.message)].filter(Boolean).join(' ') || 'Something went wrong. Please try again.' })
      setPlacing(false)
    } catch {
      setBanner({ tone: 'error', text: 'We couldn’t reach the store. Check your connection and try again. You haven’t been charged.' })
      setPlacing(false)
    }
  }

  const sameDayPossible = district ? sameDayDistricts.includes(district) : false
  const towns = DISTRICTS.find((d) => d.name === address.district)?.towns ?? []

  const summary = (
    <OrderSummary
      lines={lines}
      quote={q}
      quoting={quoting}
      couponInput={couponInput}
      setCouponInput={setCouponInput}
      coupon={coupon}
      couponError={errors.coupon}
      applyCoupon={() => {
        setErrors((e) => ({ ...e, coupon: undefined }))
        setCoupon(couponInput.trim().toUpperCase() || null)
      }}
      removeCoupon={() => {
        setCoupon(null)
        setCouponInput('')
        setErrors((e) => ({ ...e, coupon: undefined }))
      }}
      onEditBag={() => setCartOpen(true)}
      freeThreshold={freeThreshold}
    />
  )

  const placeOrder = <PlaceOrder terms={terms} setTerms={setTerms} termsError={errors.terms} placing={placing} disabled={!q || quoting} total={q?.total} onPlace={place} />

  return (
    <div className="container-site py-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl">Checkout</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
            <IconLock size={15} /> Secure checkout · Prices include all taxes
          </p>
        </div>
        {!user && (
          <p className="text-sm text-ink-600">
            Have an account?{' '}
            <Link href="/account/login?next=/checkout" className="font-semibold text-sunset-700 underline underline-offset-4">
              Sign in
            </Link>{' '}
            for saved addresses.
          </p>
        )}
      </div>

      {/* Phones: collapsible summary first */}
      <div className="mb-5 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 font-semibold">
            <IconShoppingBag size={19} /> {summaryOpen ? 'Hide' : 'Show'} order summary
            <IconChevronDown size={17} className={cn('transition-transform', summaryOpen && 'rotate-180')} />
          </span>
          <span className="font-bold tabular-nums">{q ? formatLKR(q.total) : '…'}</span>
        </button>
        {summaryOpen && <div className="mt-3">{summary}</div>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-5">
          {banner && <FormAlert tone={banner.tone === 'error' ? 'error' : 'info'}>{banner.text}</FormAlert>}

          <Section n={1} title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <div data-field="fullName" className="sm:col-span-2">
                <Field label="Full name" name="fullName" autoComplete="name" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} error={errors.fullName} />
              </div>
              <div data-field="email">
                <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={errors.email} hint="For your receipt and updates." />
              </div>
              <div data-field="phone">
                <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} error={errors.phone} hint="The courier calls before delivery." />
              </div>
            </div>
          </Section>

          <Section n={2} title="Delivery address">
            {user && user.addresses.length > 0 && (
              <fieldset className="mb-4 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Saved addresses</legend>
                {user.addresses.map((a) => (
                  <RadioCard key={a.id} name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)}>
                    <span className="text-sm font-bold">{a.label}</span>
                    <span className="text-sm text-ink-600">
                      {a.recipientName}, {a.line1}, {a.city}, {a.district}
                    </span>
                  </RadioCard>
                ))}
                <RadioCard name="address" checked={addressId === 'new'} onChange={() => setAddressId('new')}>
                  <span className="text-sm font-bold">A new address</span>
                  <span className="text-sm text-ink-600">Deliver somewhere else</span>
                </RadioCard>
              </fieldset>
            )}
            {!saved && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-field="line1" className="sm:col-span-2">
                  <Field label="Address line 1" name="line1" autoComplete="address-line1" placeholder="House number and street" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} error={errors.line1} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 2" name="line2" autoComplete="address-line2" optional placeholder="Apartment, lane, area" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                </div>
                <div data-field="district">
                  <label className="text-sm font-semibold text-ink-800" htmlFor="co-district">
                    District
                  </label>
                  <select
                    id="co-district"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    aria-invalid={Boolean(errors.district)}
                    className={cn(inputClass, 'cursor-pointer appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10')}
                    style={{ backgroundImage: chevron }}
                  >
                    <option value="">Choose a district</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {errors.district && <p className="mt-1.5 text-sm text-danger-600">{errors.district}</p>}
                </div>
                <div data-field="city">
                  <Field label="Town / city" name="city" autoComplete="address-level2" list="co-towns" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} error={errors.city} placeholder={towns[0] ?? 'e.g. Nugegoda'} />
                  <datalist id="co-towns">
                    {towns.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div data-field="postalCode">
                  <Field label="Postal code" name="postalCode" inputMode="numeric" autoComplete="postal-code" optional value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} error={errors.postalCode} />
                </div>
                <Field label="Landmark" name="landmark" optional placeholder="e.g. Opposite the temple" value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
                <details className="sm:col-span-2">
                  <summary className="cursor-pointer text-sm font-semibold text-sunset-700">Sending to someone else?</summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Recipient name" name="recipientName" optional value={address.recipientName} onChange={(e) => setAddress({ ...address, recipientName: e.target.value })} />
                    <div data-field="addressPhone">
                      <Field label="Recipient mobile" name="recipientPhone" type="tel" optional value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} error={errors.addressPhone} />
                    </div>
                  </div>
                </details>
              </div>
            )}
          </Section>

          <Section n={3} title="Delivery">
            <fieldset className="grid gap-3 sm:grid-cols-2" data-field="method">
              <legend className="sr-only">Delivery method</legend>
              <RadioCard name="method" checked={method === 'standard'} onChange={() => setMethod('standard')}>
                <span className="flex w-full items-center justify-between gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <IconTruckDelivery size={18} /> Standard
                  </span>
                  <span className="tabular-nums">{q && method === 'standard' ? (q.delivery.free ? 'Free' : formatLKR(q.delivery.fee)) : district ? '' : '—'}</span>
                </span>
                <span className="text-sm text-ink-600">{district ? (q?.delivery.method === 'standard' ? q.delivery.eta : 'Island-wide') : 'Choose a district to see the fee'}</span>
              </RadioCard>
              <RadioCard name="method" checked={method === 'same-day'} onChange={() => setMethod('same-day')} disabled={!q?.delivery.sameDayAvailable}>
                <span className="flex w-full items-center justify-between gap-2 text-sm font-bold">
                  <span>Same-day</span>
                  <span className="tabular-nums">{q ? formatLKR(q.delivery.sameDayFee) : ''}</span>
                </span>
                <span className="text-sm text-ink-600">
                  {q?.delivery.sameDayAvailable ? 'Order before noon, delivered tonight' : sameDayPossible ? 'Closed for today (order before noon)' : `Only in ${sameDayDistricts.join(', ') || 'selected areas'}`}
                </span>
              </RadioCard>
            </fieldset>
            {q && !q.delivery.free && q.freeDeliveryRemaining > 0 && method === 'standard' && (
              <p className="mt-3 text-sm text-ink-600">
                Add <strong className="text-ink-900">{formatLKR(q.freeDeliveryRemaining)}</strong> more for free delivery (over {formatLKR(freeThreshold)}).
              </p>
            )}
          </Section>

          <Section n={4} title="Payment">
            <fieldset className="grid gap-3" data-field="payment">
              <legend className="sr-only">Payment method</legend>
              {payments.map((p) => (
                <RadioCard key={p.id} name="payment" checked={payment === p.id} onChange={() => setPayment(p.id)} disabled={!p.available}>
                  <span className="flex w-full items-center justify-between gap-2 text-sm font-bold">
                    <span className="flex items-center gap-2">
                      {p.id === 'cod' ? <IconCash size={18} /> : <IconBuildingBank size={18} />} {p.label}
                    </span>
                    {p.fee > 0 && <span className="text-xs font-semibold text-ink-600">+ {formatLKR(p.fee)}</span>}
                  </span>
                  <span className="text-sm text-ink-600">{p.note}</span>
                </RadioCard>
              ))}
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-500">
                <IconLock size={18} className="mt-0.5 shrink-0" />
                <span>Card payments (PayHere) and 3 interest-free instalments with Koko or Mintpay are coming very soon.</span>
              </div>
              {errors.payment && <p className="text-sm text-danger-600">{errors.payment}</p>}
            </fieldset>
          </Section>

          <Section n={5} title="Gift options & notes" optional>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={gift.wrap} onChange={(e) => setGift({ ...gift, wrap: e.target.checked })} className="mt-0.5 size-[18px] accent-ink-900" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <IconGift size={17} /> Gift wrap it {giftWrapFee > 0 ? `(+ ${formatLKR(giftWrapFee)})` : '(free)'}
                </span>
                <span className="text-ink-600">Wrapped by hand in our signature paper.</span>
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={gift.hidePrices} onChange={(e) => setGift({ ...gift, hidePrices: e.target.checked })} className="mt-0.5 size-[18px] accent-ink-900" />
              <span>
                <span className="font-semibold">Hide prices on the packing slip</span>
                <span className="block text-ink-600">Handy when it’s a gift.</span>
              </span>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextArea label="Gift message" optional max={300} value={gift.message} onChange={(v) => setGift({ ...gift, message: v })} placeholder="We’ll handwrite it on a card." />
              <TextArea label="Note for us or the courier" optional max={500} value={note} onChange={setNote} placeholder="e.g. Call before delivery; leave with the security guard." />
            </div>
          </Section>

          {/* Phones: totals, terms and the button come after the form */}
          <div className="flex flex-col gap-5 lg:hidden">
            {summary}
            {placeOrder}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 flex flex-col gap-4">
            {summary}
            {placeOrder}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ parts */

function Section({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id={id} className="mb-4 flex items-center gap-3 text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-ink-900 text-sm text-white">{n}</span>
        {title}
        {optional && <span className="text-sm font-normal text-ink-500">(optional)</span>}
      </h2>
      {children}
    </section>
  )
}

function RadioCard({ name, checked, onChange, disabled, children }: { name: string; checked: boolean; onChange: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-[border-color,box-shadow] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sunset-600',
        checked ? 'border-ink-900 shadow-[inset_0_0_0_1px_var(--color-ink-900)]' : 'border-line-strong hover:border-ink-500',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-1 size-[18px] shrink-0 accent-ink-900" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
    </label>
  )
}

function TextArea({ label, optional, max, value, onChange, placeholder }: { label: string; optional?: boolean; max: number; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink-800">
        {label} {optional && <span className="font-normal text-ink-500">(optional)</span>}
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, 'h-auto py-2.5')}
      />
      <p className="mt-1 text-right text-xs text-ink-500">
        {value.length}/{max}
      </p>
    </div>
  )
}

function OrderSummary({
  lines,
  quote: q,
  quoting,
  couponInput,
  setCouponInput,
  coupon,
  couponError,
  applyCoupon,
  removeCoupon,
  onEditBag,
  freeThreshold,
}: {
  lines: CartLine[]
  quote?: Quote
  quoting: boolean
  couponInput: string
  setCouponInput: (v: string) => void
  coupon: string | null
  couponError?: string
  applyCoupon: () => void
  removeCoupon: () => void
  onEditBag: () => void
  freeThreshold: number
}) {
  const bySku = new Map(q?.lines.map((l) => [l.sku, l]))
  const couponApplied = q?.coupon?.applied
  const couponId = useId()
  return (
    <section aria-label="Order summary" className={cn('rounded-2xl border border-line bg-surface p-5 transition-opacity sm:p-6', quoting && 'opacity-70')} aria-busy={quoting}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Order summary</h2>
        <button type="button" onClick={onEditBag} className="text-sm font-semibold text-sunset-700 underline-offset-4 hover:underline">
          Edit bag
        </button>
      </div>
      <ul className="flex max-h-[19rem] flex-col gap-3 overflow-y-auto pr-1" data-lenis-prevent>
        {lines.map((l) => {
          const ql = bySku.get(l.sku)
          return (
            <li key={l.sku} className="flex items-center gap-3">
              <span className={cn('relative size-14 shrink-0 overflow-hidden rounded-lg', categoryTint[l.category] ?? 'bg-ink-50')}>
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1 mix-blend-multiply" />}
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[11px] font-bold text-white">{l.qty}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold">{l.name}</span>
                <span className="block text-xs text-ink-500">{[l.brand, l.multi ? l.label : null].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-right text-sm tabular-nums">
                {ql && ql.discount > 0 && <s className="block text-xs text-ink-400">{formatLKR(ql.lineSubtotal)}</s>}
                {formatLKR(ql?.lineTotal ?? l.price * l.qty)}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        {couponApplied ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-success-600">
            <span className="flex items-center gap-1.5 font-semibold">
              <IconTag size={16} /> {q?.coupon?.code} applied
            </span>
            <button type="button" onClick={removeCoupon} className="grid size-8 place-items-center rounded-full hover:bg-white/60" aria-label={`Remove code ${q?.coupon?.code}`}>
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            data-field="coupon"
            onSubmit={(e) => {
              e.preventDefault()
              applyCoupon()
            }}
          >
            <label className="sr-only" htmlFor={couponId}>
              Discount code
            </label>
            <input
              id={couponId}
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Discount code"
              autoCapitalize="characters"
              aria-invalid={Boolean(couponError)}
              className={cn(inputClass, 'mt-0 uppercase placeholder:normal-case')}
            />
            <Button type="submit" variant="outline" className="h-12 shrink-0" disabled={!couponInput.trim()}>
              Apply
            </Button>
          </form>
        )}
        {couponError && coupon && <p className="mt-2 text-sm text-danger-600">{couponError}</p>}
        {q?.coupon?.applied && q.coupon.message && <p className="mt-2 text-xs text-ink-500">{q.coupon.message}</p>}
      </div>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <Row label="Subtotal" value={q ? formatLKR(q.subtotal) : '…'} />
        {q?.discounts.map((d) => (
          <Row key={`${d.ruleId}-${d.label}`} label={d.label} value={d.freeDelivery && !d.amount ? 'Free delivery' : `− ${formatLKR(d.amount)}`} tone="success" />
        ))}
        <Row
          label={q ? `Delivery · ${q.delivery.zone}` : 'Delivery'}
          value={!q ? '…' : q.delivery.free ? <><s className="mr-1.5 text-ink-400">{formatLKR(q.delivery.baseFee)}</s>Free</> : formatLKR(q.delivery.fee)}
        />
        {q && q.giftWrapFee > 0 && <Row label="Gift wrap" value={formatLKR(q.giftWrapFee)} />}
        {q && q.total > q.subtotal - q.discountTotal + q.delivery.fee + q.giftWrapFee && <Row label="Cash on delivery fee" value={formatLKR(q.total - (q.subtotal - q.discountTotal + q.delivery.fee + q.giftWrapFee))} />}
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-base font-bold">Total</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{q ? formatLKR(q.total) : '…'}</dd>
        </div>
        {q && q.discountTotal > 0 && <p className="text-right text-sm font-semibold text-success-600">You save {formatLKR(q.discountTotal)}</p>}
      </dl>
      {q && q.freeDeliveryRemaining > 0 && q.delivery.method === 'standard' && (
        <p className="mt-3 rounded-lg bg-sunset-50 px-3 py-2 text-xs text-sunset-800">
          {formatLKR(q.freeDeliveryRemaining)} away from free delivery (over {formatLKR(freeThreshold)})
        </p>
      )}
    </section>
  )
}

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: 'success' }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', tone === 'success' && 'text-success-600')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function PlaceOrder({ terms, setTerms, termsError, placing, disabled, total, onPlace }: { terms: boolean; setTerms: (v: boolean) => void; termsError?: string; placing: boolean; disabled: boolean; total?: number; onPlace: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <label className="flex cursor-pointer items-start gap-3 text-sm" data-field="terms">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={Boolean(termsError)} className="mt-0.5 size-[18px] shrink-0 accent-ink-900" />
        <span>
          I accept the{' '}
          <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">
            terms &amp; conditions
          </Link>{' '}
          and{' '}
          <Link href="/returns" target="_blank" className="font-semibold underline underline-offset-2">
            returns policy
          </Link>
          .
        </span>
      </label>
      {termsError && <p className="-mt-2 ml-[30px] text-sm text-danger-600">{termsError}</p>}
      <Button size="lg" block loading={placing} disabled={disabled && !placing} onClick={onPlace}>
        <IconLock size={18} /> Place order{total ? ` · ${formatLKR(total)}` : ''}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-500">
        <IconShieldCheck size={15} /> 100% genuine products · Easy returns · Island-wide delivery
      </p>
    </div>
  )
}
