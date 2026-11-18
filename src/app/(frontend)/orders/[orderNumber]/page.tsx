import {
  IconExternalLink,
  IconFileInvoice,
  IconMapPin,
  IconTruckDelivery,
} from '@tabler/icons-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { Courier } from '@/payload-types'

import { BankAccounts } from '@/components/checkout/BankAccounts'
import { SlipUpload } from '@/components/checkout/PaymentWidgets'
import { ReorderButton, ReturnRequest } from '@/components/orders/OrderActions'
import { ButtonLink } from '@/components/ui/Button'
import { trackingLink } from '@/collections/Couriers'
import { ORDER_STATUSES } from '@/collections/Orders'
import { RETURN_STATUSES } from '@/collections/Returns'
import { isOnline } from '@/collections/Transactions'
import { returnableItems } from '@/endpoints/returns'
import { formatLKR } from '@/lib/format'
import { progress, type Status } from '@/lib/orders/lifecycle'
import { loadPaymentConfig } from '@/lib/payments/config'
import { getShopperOrder } from '@/lib/payments/shopperOrder'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } }

type Props = {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

const day = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Colombo',
})
const dayLong = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
})
const PAY: Record<string, string> = {
  cod: 'Cash on delivery',
  'bank-transfer': 'Bank transfer',
  payhere: 'Card (PayHere)',
  koko: 'Koko',
  mintpay: 'Mintpay',
}
const PAY_STATE: Record<string, string> = {
  unpaid: 'Not paid yet',
  pending: 'Payment processing',
  'slip-uploaded': 'Slip received, checking',
  paid: 'Paid',
  failed: 'Payment didn’t go through',
  'partially-refunded': 'Partly refunded',
  refunded: 'Refunded',
}

/**
 * Order page for shoppers (Sprint 6, TOS-705/305/706): progress, courier tracking, payment, invoice,
 * Buy again and returns. Opened from Account › Orders, the tracking form, or the links in emails.
 */
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams])
  const found = await getShopperOrder(orderNumber, sp.t)
  if (!found) notFound()
  const { order: o, payload, token } = found
  const courier = o.shipment?.courier
    ? ((await payload
        .findByID({
          collection: 'couriers',
          id: typeof o.shipment.courier === 'object' ? o.shipment.courier.id : o.shipment.courier,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null)) as Courier | null)
    : null
  const track = trackingLink(courier, o.shipment?.trackingNumber)
  const { step, stopped } = progress(o.status as Status)
  const pay = await loadPaymentConfig(payload)
  const r = await returnableItems(payload, o)
  const d = o.statusDates ?? {}
  const steps = [
    { label: 'Placed', at: o.createdAt },
    {
      label: o.paymentMethod === 'cod' ? 'Confirmed' : 'Paid',
      at: o.paidAt ?? (o.paymentMethod === 'cod' ? o.createdAt : null),
    },
    { label: 'Packed', at: d.packedAt },
    { label: 'Shipped', at: d.shippedAt },
    { label: 'Delivered', at: d.deliveredAt },
  ]
  const t = o.totals ?? {}
  const statusLabel = ORDER_STATUSES.find((s) => s.value === o.status)?.label ?? o.status
  const q = token ? `?t=${encodeURIComponent(token)}` : ''

  return (
    <div className="container-site py-8 md:py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-600">Placed {dayLong.format(new Date(o.createdAt))}</p>
            <h1 className="font-mono text-2xl font-extrabold md:text-3xl">{o.orderNumber}</h1>
          </div>
          <span className="rounded-full bg-ink-50 px-3 py-1 text-sm font-semibold">
            {statusLabel}
          </span>
        </header>

        <section
          aria-label="Order progress"
          className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
        >
          {stopped ? (
            <p className="mb-4 rounded-lg bg-sunset-50 px-3 py-2 text-sm font-semibold text-sunset-700">
              {stopped}
            </p>
          ) : null}
          <ol className="grid grid-cols-5 gap-1">
            {steps.map((s, i) => {
              const done = i <= step && !(stopped === 'Cancelled')
              return (
                <li key={s.label} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`h-1.5 w-full rounded-full ${done ? 'bg-success-600' : 'bg-ink-100'}`}
                    aria-hidden
                  />
                  <span
                    className={`text-xs font-semibold sm:text-sm ${done ? 'text-ink-900' : 'text-ink-400'}`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[11px] text-ink-500 sm:text-xs">
                    {done && s.at ? day.format(new Date(s.at)) : ''}
                  </span>
                </li>
              )
            })}
          </ol>
          {o.shipment?.trackingNumber || courier ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm">
                <IconTruckDelivery size={20} className="text-sunset-600" aria-hidden />
                <span>
                  {courier?.name ?? 'Courier'}
                  {o.shipment?.trackingNumber ? (
                    <>
                      {' '}
                      · <span className="font-mono">{o.shipment.trackingNumber}</span>
                    </>
                  ) : null}
                </span>
              </span>
              {track && (
                <a
                  href={track}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-sunset-600"
                >
                  Track with {courier?.name} <IconExternalLink size={15} />
                </a>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-600">
              Expected delivery: {o.delivery?.eta ?? '2–4 working days'} after it ships. We’ll email
              you the tracking number.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-5 text-sm">
            <IconMapPin size={22} className="shrink-0 text-sunset-600" aria-hidden />
            <p className="leading-relaxed">
              <span className="font-bold">Delivering to</span>
              <br />
              {o.shippingAddress.recipientName} · {o.shippingAddress.phone}
              <br />
              {o.shippingAddress.line1}
              {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''},{' '}
              {o.shippingAddress.city}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 text-sm">
            <p>
              <span className="font-bold">Payment</span>
              <br />
              {PAY[o.paymentMethod] ?? o.paymentMethod} ·{' '}
              {PAY_STATE[o.paymentStatus] ?? o.paymentStatus}
              {o.refundedTotal ? ` (${formatLKR(o.refundedTotal)} refunded)` : ''}
            </p>
            {isOnline(o.paymentMethod) &&
              o.status === 'pending-payment' &&
              o.paymentStatus !== 'paid' && (
                <ButtonLink
                  href={`/checkout/pay/${o.orderNumber}${q}${q ? '&' : '?'}retry=1`}
                  size="sm"
                  className="self-start"
                >
                  Pay now
                </ButtonLink>
              )}
            {o.paymentMethod === 'bank-transfer' &&
              o.status === 'pending-payment' &&
              ['unpaid', 'slip-uploaded'].includes(o.paymentStatus) && (
                <>
                  <BankAccounts accounts={pay.bankTransfer.accounts} note={pay.bankTransfer.instructions} />
                  <SlipUpload orderNumber={o.orderNumber} token={token} />
                </>
              )}
          </div>
        </section>

        <section
          aria-labelledby="items-title"
          className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
        >
          <h2 id="items-title" className="mb-4 text-lg font-bold">
            Items
          </h2>
          <ul className="flex flex-col gap-3">
            {o.items.map((i) => (
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
          <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold">Total</span>
            <span className="font-display text-xl font-bold tabular-nums">
              {formatLKR(t.total ?? 0)}
            </span>
          </p>
        </section>

        {r.existing.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-2 text-lg font-bold">Returns</h2>
            <ul className="flex flex-col gap-1">
              {r.existing.map((x) => (
                <li key={x.id}>
                  <span className="font-mono">{x.returnNumber}</span> ·{' '}
                  {RETURN_STATUSES.find((s) => s.value === x.status)?.label}
                  {x.refundAmount ? ` · ${formatLKR(x.refundAmount)} refunded` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-start gap-3">
          <ReorderButton orderNumber={o.orderNumber} token={token} />
          <ButtonLink
            href={`/print/orders?n=${o.orderNumber}${token ? `&t=${encodeURIComponent(token)}` : ''}&doc=invoice`}
            variant="outline"
            target="_blank"
          >
            <IconFileInvoice size={18} /> Invoice
          </ButtonLink>
        </div>
        {r.open && (
          <ReturnRequest
            orderNumber={o.orderNumber}
            token={token}
            items={r.items}
            until={r.until ? dayLong.format(r.until) : ''}
          />
        )}

        <p className="text-center text-sm text-ink-600">
          Need help with this order?{' '}
          <Link href="/returns" className="font-semibold underline underline-offset-2">
            Returns policy
          </Link>{' '}
          · message us on WhatsApp with your order number.
        </p>
      </div>
    </div>
  )
}
