import { IconCash, IconTruckDelivery } from '@tabler/icons-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import type { Courier, Order } from '@/payload-types'

import { hasRole } from '@/access/roles'

import { AdminPage } from './AdminPage'
import { CodRemitForm } from './CodRemitForm'

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const day = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Colombo',
})

/**
 * COD reconciliation (Sprint 6, TOS-707) at /admin/cod: cash-on-delivery orders each courier has delivered
 * but not yet paid in, grouped by courier, with "Record payment" for the orders a remittance covers.
 */
export async function CodReconciliation(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  const allowed = hasRole(req.user, 'admin', 'store-manager', 'support', 'order-fulfillment')
  const canRecord = hasRole(req.user, 'admin', 'store-manager')
  const res = allowed
    ? await req.payload.find({
        collection: 'orders',
        where: {
          and: [
            { paymentMethod: { equals: 'cod' } },
            { status: { in: ['delivered', 'completed'] } },
            { 'codRemittance.remittedAt': { exists: false } },
          ],
        },
        depth: 1,
        limit: 500,
        sort: 'statusDates.deliveredAt',
        overrideAccess: true,
      })
    : { docs: [] }
  const groups = new Map<string, { courier: Courier | null; orders: Order[] }>()
  for (const o of res.docs as Order[]) {
    const c = typeof o.shipment?.courier === 'object' ? (o.shipment.courier as Courier) : null
    const key = c ? String(c.id) : 'none'
    if (!groups.has(key)) groups.set(key, { courier: c, orders: [] })
    groups.get(key)!.orders.push(o)
  }
  const outstanding = (res.docs as Order[]).reduce((n, o) => n + (o.totals?.total ?? 0), 0)

  return (
    <AdminPage props={props}>
      <div className="tos-page">
        <header className="tos-page__header">
          <div>
            <p className="tos-page__eyebrow">Sales</p>
            <h1 className="tos-page__title">COD reconciliation</h1>
            <p className="tos-page__subtitle">
              Cash-on-delivery orders delivered but not yet paid in by the courier. When a courier
              pays you, tick the orders it covers and record the payment.
            </p>
          </div>
        </header>
        {!allowed ? (
          <section className="tos-card tos-empty">You don’t have access to payments.</section>
        ) : (
          <>
            <div className="tos-kpis" style={{ marginBottom: 16 }}>
              <div className="tos-card tos-kpi">
                <span className="tos-kpi__icon tos-kpi__icon--warning">
                  <IconCash size={19} />
                </span>
                <span className="tos-kpi__label">Cash with couriers</span>
                <span className="tos-kpi__value">{lkr(outstanding)}</span>
              </div>
              <div className="tos-card tos-kpi">
                <span className="tos-kpi__icon">
                  <IconTruckDelivery size={19} />
                </span>
                <span className="tos-kpi__label">Orders to reconcile</span>
                <span className="tos-kpi__value">{res.docs.length}</span>
              </div>
            </div>
            {groups.size === 0 && (
              <section className="tos-card tos-empty">
                All cash-on-delivery money is in. Nothing to reconcile.
              </section>
            )}
            {[...groups.values()].map((g) => (
              <section
                key={g.courier?.id ?? 'none'}
                className="tos-card"
                style={{ marginBottom: 16 }}
              >
                <div className="tos-card__head">
                  <h2 className="tos-card__title">{g.courier?.name ?? 'No courier set'}</h2>
                  <span className="tos-muted">
                    {g.orders.length} order{g.orders.length === 1 ? '' : 's'} ·{' '}
                    {lkr(g.orders.reduce((n, o) => n + (o.totals?.total ?? 0), 0))}
                  </span>
                </div>
                <CodRemitForm
                  canRecord={canRecord}
                  rows={g.orders.map((o) => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    delivered: o.statusDates?.deliveredAt
                      ? day.format(new Date(o.statusDates.deliveredAt))
                      : '—',
                    tracking: o.shipment?.trackingNumber ?? '',
                    customer: o.contact.fullName,
                    amount: o.totals?.total ?? 0,
                  }))}
                />
              </section>
            ))}
            <p className="tos-muted" style={{ fontSize: 13 }}>
              Paid-in history is on each order (COD remittance) and in{' '}
              <Link href="/admin/collections/transactions">Transactions</Link>.
            </p>
          </>
        )}
      </div>
    </AdminPage>
  )
}
