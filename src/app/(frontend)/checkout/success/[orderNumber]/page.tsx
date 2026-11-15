import { IconBuildingBank, IconCash, IconCircleCheckFilled, IconMapPin, IconTruckDelivery } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { GuestAccountOffer } from '@/components/checkout/GuestAccountOffer'
import { OrderPlacedEffect } from '@/components/checkout/OrderPlacedEffect'
import { ButtonLink } from '@/components/ui/Button'
import { isStaff } from '@/access/roles'
import { getCurrentUser } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'
import { loadCheckoutConfig } from '@/lib/checkout/server'
import { formatLKR } from '@/lib/format'

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false, follow: false } }

type Props = { params: Promise<{ orderNumber: string }>; searchParams: Promise<Record<string, string | undefined>> }

/**
 * Order confirmation (TOS-508). Visible to the shopper with the private link from checkout and the
 * email, to the signed-in owner, and to staff. Guests can create an account from here (TOS-307).
 */
export default async function OrderSuccessPage({ params, searchParams }: Props) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams])
  const payload = await getPayloadClient()
  const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: orderNumber } }, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true })).docs[0]
  if (!order) notFound()
  const user = await getCurrentUser()
  const owner = user && typeof order.customer === 'number' ? order.customer === user.id : false
  const tokenOk = Boolean(sp.t && order.accessToken && sp.t === order.accessToken)
  if (!tokenOk && !owner && !(user && isStaff(user))) notFound()

  const config = await loadCheckoutConfig(payload)
  const totals = { subtotal: order.totals?.subtotal ?? 0, delivery: order.totals?.delivery ?? 0, giftWrap: order.totals?.giftWrap ?? 0, total: order.totals?.total ?? 0 }
  const first = order.contact.fullName.split(' ')[0]
  const a = order.shippingAddress
  const isBank = order.paymentMethod === 'bank-transfer'
  const hasAccount = user
    ? true
    : (await payload.count({ collection: 'users', where: { email: { equals: order.contact.email } }, overrideAccess: true })).totalDocs > 0

  return (
    <div className="container-site py-8 md:py-12">
      <OrderPlacedEffect />
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <IconCircleCheckFilled size={64} className="text-success-600" aria-hidden />
          <h1 className="text-3xl font-extrabold md:text-4xl">Thank you, {first}!</h1>
          <p className="text-lg text-ink-700">
            Your order <strong className="font-mono text-ink-900">{order.orderNumber}</strong> is confirmed.
          </p>
          <p className="text-sm text-ink-600">We’ve emailed a copy to {order.contact.email}.</p>
        </header>

        <section className={`flex gap-4 rounded-2xl p-5 sm:p-6 ${isBank ? 'bg-sunset-50' : 'bg-success-50'}`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white">{isBank ? <IconBuildingBank size={22} /> : <IconCash size={22} />}</span>
          <div className="flex flex-col gap-1.5 text-ink-800">
            {isBank ? (
              <>
                <h2 className="text-lg font-bold">Next: transfer {formatLKR(totals.total)}</h2>
                <p>
                  Use <strong className="font-mono">{order.orderNumber}</strong> as the payment reference. We’ll hold your items for {config.bankTransfer.holdHours} hours and ship as soon as
                  the payment arrives.
                </p>
                {config.bankTransfer.instructions && <p className="whitespace-pre-line rounded-lg bg-white/70 px-3 py-2 text-sm">{config.bankTransfer.instructions}</p>}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">Pay {formatLKR(totals.total)} on delivery</h2>
                <p>We’re preparing your order. Please keep the amount ready; most couriers also take cards. We’ll call you before delivery.</p>
              </>
            )}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
            <IconMapPin size={22} className="shrink-0 text-sunset-600" aria-hidden />
            <div className="text-sm leading-relaxed">
              <p className="font-bold">Delivering to</p>
              <p className="text-ink-700">
                {a.recipientName} · {a.phone}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}
                <br />
                {a.city}, {a.district} District
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
            <IconTruckDelivery size={22} className="shrink-0 text-sunset-600" aria-hidden />
            <div className="text-sm leading-relaxed">
              <p className="font-bold">{order.delivery?.method === 'same-day' ? 'Same-day delivery' : 'Standard delivery'}</p>
              <p className="text-ink-700">Expected: {order.delivery?.eta ?? '2–4 working days'}</p>
              {order.gift?.wrap && <p className="text-ink-700">Gift wrapped{order.gift.message ? ', with your message' : ''}</p>}
            </div>
          </div>
        </div>

        <section aria-labelledby="items-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="items-title" className="mb-4 text-lg font-bold">
            Your order
          </h2>
          <ul className="flex flex-col gap-3">
            {order.items.map((i) => (
              <li key={i.id ?? i.sku} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                  {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain p-1 mix-blend-multiply" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-1 font-semibold">{i.name}</span>
                  <span className="text-ink-500">{[i.brand, i.variant, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="text-sm tabular-nums">{formatLKR(i.lineTotal ?? 0)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatLKR(totals.subtotal)}</dd>
            </div>
            {(order.discounts ?? []).map((d) => (
              <div key={d.id ?? d.label} className="flex justify-between text-success-600">
                <dt>{d.label}</dt>
                <dd className="tabular-nums">− {formatLKR(d.amount ?? 0)}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{totals.delivery ? formatLKR(totals.delivery) : 'Free'}</dd>
            </div>
            {totals.giftWrap ? (
              <div className="flex justify-between">
                <dt>Gift wrap</dt>
                <dd className="tabular-nums">{formatLKR(totals.giftWrap)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-base font-bold">Total</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{formatLKR(totals.total)}</dd>
            </div>
          </dl>
        </section>

        {!user && <GuestAccountOffer orderNumber={order.orderNumber} token={sp.t ?? ''} email={order.contact.email} hasAccount={hasAccount} />}

        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="dark">
            Continue shopping
          </ButtonLink>
          {user && (
            <ButtonLink href="/account/orders" variant="outline">
              View my orders
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  )
}
