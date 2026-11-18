import {
  IconBuildingBank,
  IconCash,
  IconCircleCheckFilled,
  IconCircleX,
  IconClockHour4,
  IconCreditCard,
  IconMapPin,
  IconTruckDelivery,
} from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { GuestAccountOffer } from '@/components/checkout/GuestAccountOffer'
import { BankAccounts } from '@/components/checkout/BankAccounts'
import { OrderPlacedEffect } from '@/components/checkout/OrderPlacedEffect'
import { PaymentPoller, SlipUpload } from '@/components/checkout/PaymentWidgets'
import { isOnline } from '@/collections/Transactions'
import { ButtonLink } from '@/components/ui/Button'
import { isStaff } from '@/access/roles'
import { getCurrentUser } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'
import { loadPaymentConfig } from '@/lib/payments/config'
import { formatLKR } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
}

/** Placed in the last 15 minutes (outside render, so the page stays pure). */
const justPlaced = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 15 * 60_000

type Props = {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * Order confirmation (TOS-508). Visible to the shopper with the private link from checkout and the
 * email, to the signed-in owner, and to staff. Guests can create an account from here (TOS-307).
 */
export default async function OrderSuccessPage({ params, searchParams }: Props) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams])
  const payload = await getPayloadClient()
  const order = (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0]
  if (!order) notFound()
  const user = await getCurrentUser()
  const owner = user && typeof order.customer === 'number' ? order.customer === user.id : false
  const tokenOk = Boolean(sp.t && order.accessToken && sp.t === order.accessToken)
  if (!tokenOk && !owner && !(user && isStaff(user))) notFound()

  const pay = await loadPaymentConfig(payload)
  const totals = {
    subtotal: order.totals?.subtotal ?? 0,
    delivery: order.totals?.delivery ?? 0,
    giftWrap: order.totals?.giftWrap ?? 0,
    total: order.totals?.total ?? 0,
  }
  const first = order.contact.fullName.split(' ')[0]
  const a = order.shippingAddress
  const method = order.paymentMethod
  const online = isOnline(method)
  const paid = order.paymentStatus === 'paid'
  const cancelled = order.status === 'cancelled'
  const token = order.accessToken ?? ''
  const payLink = `/checkout/pay/${order.orderNumber}?t=${encodeURIComponent(token)}&retry=1`
  // Online orders aren't confirmed until the gateway says so
  const awaitingGateway =
    online &&
    !paid &&
    !cancelled &&
    (order.paymentStatus === 'pending' ||
      (sp.from === 'gateway' && order.paymentStatus === 'unpaid'))
  const onlineFailed = online && !paid && !cancelled && !awaitingGateway
  const confirmed = !online || paid
  const hasAccount = user
    ? true
    : (
        await payload.count({
          collection: 'users',
          where: { email: { equals: order.contact.email } },
          overrideAccess: true,
        })
      ).totalDocs > 0
  const ONLINE_NAME: Record<string, string> = {
    payhere: 'card (PayHere)',
    koko: 'Koko',
    mintpay: 'Mintpay',
  }

  return (
    <div className="container-site py-8 md:py-12">
      {/* Empty this device's bag only right after ordering, never when an old order is opened */}
      {justPlaced(order.createdAt) && <OrderPlacedEffect />}
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {cancelled ? (
            <IconCircleX size={64} className="text-ink-400" aria-hidden />
          ) : confirmed ? (
            <IconCircleCheckFilled size={64} className="text-success-600" aria-hidden />
          ) : (
            <IconClockHour4 size={64} className="text-sunset-600" aria-hidden />
          )}
          <h1 className="text-3xl font-extrabold md:text-4xl">
            {cancelled
              ? 'This order was cancelled'
              : confirmed
                ? `Thank you, ${first}!`
                : awaitingGateway
                  ? 'Confirming your payment…'
                  : 'Almost done'}
          </h1>
          <p className="text-lg text-ink-700">
            Order <strong className="font-mono text-ink-900">{order.orderNumber}</strong>{' '}
            {cancelled ? 'is cancelled.' : confirmed ? 'is confirmed.' : 'is waiting for payment.'}
          </p>
          {confirmed && !cancelled && (
            <p className="text-sm text-ink-600">We’ve emailed a copy to {order.contact.email}.</p>
          )}
        </header>

        {!cancelled && (
          <section
            className={`flex gap-4 rounded-2xl p-5 sm:p-6 ${paid || method === 'cod' ? 'bg-success-50' : 'bg-sunset-50'}`}
            aria-live="polite"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white">
              {method === 'bank-transfer' ? (
                <IconBuildingBank size={22} />
              ) : method === 'cod' ? (
                <IconCash size={22} />
              ) : (
                <IconCreditCard size={22} />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-ink-800">
              {paid ? (
                <>
                  <h2 className="text-lg font-bold">
                    Paid {online ? `by ${ONLINE_NAME[method]}` : 'by bank transfer'}
                  </h2>
                  <p>
                    We’ve received {formatLKR(totals.total)}. We’re preparing your order and will
                    call you before delivery.
                  </p>
                </>
              ) : method === 'cod' ? (
                <>
                  <h2 className="text-lg font-bold">Pay {formatLKR(totals.total)} on delivery</h2>
                  <p>
                    We’re preparing your order. Please keep the amount ready; most couriers also
                    take cards. We’ll call you before delivery.
                  </p>
                </>
              ) : method === 'bank-transfer' ? (
                <>
                  <h2 className="text-lg font-bold">
                    {order.paymentStatus === 'slip-uploaded'
                      ? 'Slip received: we’re checking it'
                      : `Next: transfer ${formatLKR(totals.total)}`}
                  </h2>
                  {order.paymentStatus === 'slip-uploaded' ? (
                    <p>
                      Thanks! We’ll confirm your payment within one working day and email you. You
                      can send another slip below if needed.
                    </p>
                  ) : (
                    <p>
                      Use <strong className="font-mono">{order.orderNumber}</strong> as the payment
                      reference, then upload a photo of your slip here. We’ll hold your items for{' '}
                      {pay.bankTransfer.holdHours} hours and ship as soon as the payment is
                      confirmed.
                    </p>
                  )}
                  <BankAccounts accounts={pay.bankTransfer.accounts} note={pay.bankTransfer.instructions} />
                  <SlipUpload orderNumber={order.orderNumber} token={token} />
                </>
              ) : awaitingGateway ? (
                <>
                  <h2 className="text-lg font-bold">
                    Waiting for {ONLINE_NAME[method]} to confirm
                  </h2>
                  <p>This usually takes a few seconds. You don’t need to pay again.</p>
                  <PaymentPoller orderNumber={order.orderNumber} token={token} />
                </>
              ) : onlineFailed ? (
                <>
                  <h2 className="text-lg font-bold">
                    {order.paymentStatus === 'failed'
                      ? 'The payment didn’t go through'
                      : 'Payment not completed yet'}
                  </h2>
                  <p>Nothing was charged. Your items are held for a little longer.</p>
                  <ButtonLink href={payLink} className="mt-1 self-start">
                    Try again · {formatLKR(totals.total)}
                  </ButtonLink>
                </>
              ) : null}
            </div>
          </section>
        )}

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
              <p className="font-bold">
                {order.delivery?.method === 'same-day' ? 'Same-day delivery' : 'Standard delivery'}
              </p>
              <p className="text-ink-700">Expected: {order.delivery?.eta ?? '2–4 working days'}</p>
              {order.gift?.wrap && (
                <p className="text-ink-700">
                  Gift wrapped{order.gift.message ? ', with your message' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        <section
          aria-labelledby="items-title"
          className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
        >
          <h2 id="items-title" className="mb-4 text-lg font-bold">
            Your order
          </h2>
          <ul className="flex flex-col gap-3">
            {order.items.map((i) => (
              <li key={i.id ?? i.sku} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                  {i.image && (
                    <Image
                      src={i.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1 mix-blend-multiply"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-1 font-semibold">{i.name}</span>
                  <span className="text-ink-500">
                    {[i.brand, i.variant, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}
                  </span>
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
              <dd className="tabular-nums">
                {totals.delivery ? formatLKR(totals.delivery) : 'Free'}
              </dd>
            </div>
            {totals.giftWrap ? (
              <div className="flex justify-between">
                <dt>Gift wrap</dt>
                <dd className="tabular-nums">{formatLKR(totals.giftWrap)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-base font-bold">Total</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">
                {formatLKR(totals.total)}
              </dd>
            </div>
          </dl>
        </section>

        {!user && (
          <GuestAccountOffer
            orderNumber={order.orderNumber}
            token={token}
            email={order.contact.email}
            hasAccount={hasAccount}
          />
        )}

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
