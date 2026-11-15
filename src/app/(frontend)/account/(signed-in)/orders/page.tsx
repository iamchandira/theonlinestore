import { IconChevronRight, IconPackage } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'

import { ButtonLink } from '@/components/ui/Button'
import { ORDER_STATUSES } from '@/collections/Orders'
import { requireUser } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'
import { formatLKR } from '@/lib/format'

const TONE: Record<string, string> = {
  'pending-payment': 'bg-warning-50 text-warning-600',
  processing: 'bg-info-50 text-info-600',
  delivered: 'bg-success-50 text-success-600',
  completed: 'bg-success-50 text-success-600',
  cancelled: 'bg-ink-100 text-ink-600',
}
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' })

/** Order history (TOS-305): newest first. Tracking timeline and one-tap reorder arrive with Sprint 6. */
export default async function OrdersPage() {
  const user = await requireUser('/account/orders')
  const payload = await getPayloadClient()
  const orders = await payload.find({ collection: 'orders', where: { customer: { equals: user.id } }, sort: '-createdAt', limit: 50, depth: 0, user, overrideAccess: false, showHiddenFields: true })
  return (
    <section aria-labelledby="orders-title" className="flex flex-col gap-4">
      <h2 id="orders-title" className="text-2xl font-bold">
        Orders
      </h2>
      {orders.docs.length ? (
        <ul className="flex flex-col gap-3">
          {orders.docs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/checkout/success/${o.orderNumber}`}
                className="group flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-card sm:p-5"
              >
                <span className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <span key={i.id ?? i.sku} className="relative size-12 overflow-hidden rounded-lg border-2 border-white bg-ink-50">
                      {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-contain p-0.5 mix-blend-multiply" />}
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-bold">{o.orderNumber}</span>
                  <span className="text-sm text-ink-600">
                    {dateFmt.format(new Date(o.createdAt))} · {o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.length === 1 && o.items[0].quantity === 1 ? '' : 's'} · {formatLKR(o.totals?.total ?? 0)}
                  </span>
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE[o.status] ?? 'bg-ink-50 text-ink-700'}`}>{ORDER_STATUSES.find((s) => s.value === o.status)?.label}</span>
                <IconChevronRight size={18} className="text-ink-400 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-sunset-50 text-sunset-600">
            <IconPackage size={30} />
          </span>
          <p className="text-xl font-bold">No orders yet</p>
          <p className="max-w-md text-ink-600">When you place an order, it appears here with its status. Guest orders placed with your email join your account when you sign in.</p>
          <ButtonLink href="/c/beauty?sort=bestsellers" variant="dark">
            Start shopping
          </ButtonLink>
        </div>
      )}
    </section>
  )
}
