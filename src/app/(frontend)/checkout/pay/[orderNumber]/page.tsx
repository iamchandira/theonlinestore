import { IconAlertTriangle, IconClockHour4, IconShieldLock } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PayLauncher } from '@/components/checkout/PayLauncher'
import { ButtonLink } from '@/components/ui/Button'
import { isOnline } from '@/collections/Transactions'
import { formatLKR } from '@/lib/format'
import { cancelOpenAttempts } from '@/lib/payments/service'
import { getShopperOrder, payable } from '@/lib/payments/shopperOrder'

export const metadata: Metadata = {
  title: 'Pay for your order',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

const NAMES: Record<string, string> = { payhere: 'PayHere', koko: 'Koko', mintpay: 'Mintpay' }
const when = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Colombo',
})

/**
 * Pay for a card or instalment order (Sprint 5). Reached straight after Place order (starts the gateway
 * automatically), from the gateway's cancel link, and from "Try again" on the order page.
 */
export default async function PayPage({ params, searchParams }: Props) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams])
  const found = await getShopperOrder(orderNumber, sp.t)
  if (!found) notFound()
  const { order, payload, token } = found
  const back = `/checkout/success/${order.orderNumber}?t=${encodeURIComponent(token)}`
  if (!isOnline(order.paymentMethod)) redirect(back)
  const p = payable(order)
  if (!p.ok && p.reason !== 'expired') redirect(back)

  const cancelled = sp.cancelled === '1'
  if (cancelled) await cancelOpenAttempts(payload, order.id)
  const retry = cancelled || order.paymentStatus === 'failed' || sp.retry === '1'
  const total = order.totals?.total ?? 0
  const name = NAMES[order.paymentMethod] ?? 'the payment page'

  return (
    <div className="container-site py-10 md:py-16">
      <div className="mx-auto flex max-w-lg flex-col gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <header className="flex flex-col gap-2 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-sunset-50 text-sunset-600">
            {retry || !p.ok ? <IconAlertTriangle size={28} /> : <IconShieldLock size={28} />}
          </span>
          <h1 className="text-2xl font-extrabold">
            {!p.ok
              ? 'Time to pay has passed'
              : retry
                ? 'Payment not completed'
                : `Paying with ${name}`}
          </h1>
          <p className="text-ink-700">
            Order <strong className="font-mono text-ink-900">{order.orderNumber}</strong> ·{' '}
            {formatLKR(total)}
          </p>
        </header>

        {!p.ok ? (
          <>
            <p className="text-center text-ink-700">
              We couldn’t keep your items any longer, so this order was released. Nothing was
              charged.
            </p>
            <ButtonLink href="/" size="lg" block>
              Back to the shop
            </ButtonLink>
          </>
        ) : (
          <>
            {retry && (
              <p className="text-center text-ink-700">
                {cancelled
                  ? 'You left the payment page before paying.'
                  : 'The payment didn’t go through.'}{' '}
                Nothing was charged. You can try again.
              </p>
            )}
            <PayLauncher
              orderNumber={order.orderNumber}
              token={token}
              label={
                retry ? `Try again · ${formatLKR(total)}` : `Pay ${formatLKR(total)} with ${name}`
              }
              autoStart={!retry}
            />
            {order.paymentDueAt && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-ink-600">
                <IconClockHour4 size={16} /> We’re holding your items until{' '}
                {when.format(new Date(order.paymentDueAt))}.
              </p>
            )}
            <p className="text-center text-sm text-ink-600">
              Want to pay another way? Message us on WhatsApp with your order number and we’ll
              switch it to cash on delivery or bank transfer.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
