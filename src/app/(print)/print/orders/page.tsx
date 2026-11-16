import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import type { Courier, Order } from '@/payload-types'

import { isStaff } from '@/access/roles'
import { PrintButton } from '@/components/admin/PrintButton'
import { site } from '@/config/site'
import { getPayloadClient } from '@/lib/catalog/server'

export const metadata = { title: 'Print orders' }

type Props = { searchParams: Promise<Record<string, string | undefined>> }

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const day = new Intl.DateTimeFormat('en-GB', {
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

/**
 * Invoices and packing slips (Sprint 6, TOS-703), ready to print or "Save as PDF".
 *   Staff:    /print/orders?ids=1,2,3&doc=invoice|slip   (from the Orders list or an order)
 *   Shoppers: /print/orders?n=TOS-…&t=…&doc=invoice      (their own invoice, from the order page)
 */
export default async function PrintOrders({ searchParams }: Props) {
  const sp = await searchParams
  const doc = sp.doc === 'slip' ? 'slip' : 'invoice'
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const staff = isStaff(user)
  let orders: Order[] = []
  if (staff && sp.ids) {
    const ids = sp.ids
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 100)
    const res = await payload.find({
      collection: 'orders',
      where: { id: { in: ids } },
      depth: 1,
      limit: ids.length,
      overrideAccess: true,
      sort: 'createdAt',
    })
    orders = res.docs as Order[]
  } else if (sp.n && doc === 'invoice') {
    const o = (
      await payload.find({
        collection: 'orders',
        where: { orderNumber: { equals: sp.n } },
        depth: 1,
        limit: 1,
        overrideAccess: true,
        showHiddenFields: true,
      })
    ).docs[0] as Order | undefined
    const owner = Boolean(o && user && typeof o.customer === 'number' && o.customer === user.id)
    if (o && (staff || owner || (sp.t && sp.t === o.accessToken))) orders = [o]
  }
  if (!orders.length) notFound()

  return (
    <>
      <div className="toolbar">
        <span>
          {orders.length} {doc === 'slip' ? 'packing slip' : 'invoice'}
          {orders.length > 1 ? 's' : ''} · A4
        </span>
        <PrintButton />
      </div>
      {orders.map((o) =>
        doc === 'slip' ? <PackingSlip key={o.id} o={o} /> : <Invoice key={o.id} o={o} />,
      )}
    </>
  )
}

function Head({ title, o }: { title: string; o: Order }) {
  return (
    <div className="head">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-header.png" alt={site.name} />
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {site.contact.address} · {site.contact.phone} · {site.contact.email}
          <br />
          {site.domain}
        </p>
      </div>
      <div className="meta">
        <p className="doc-title">{title}</p>
        <p style={{ margin: '4px 0 0' }}>
          <strong>{o.orderNumber}</strong>
          <br />
          <span className="muted">{day.format(new Date(o.createdAt))}</span>
        </p>
      </div>
    </div>
  )
}

function Address({ o }: { o: Order }) {
  const a = o.shippingAddress
  return (
    <>
      {a.recipientName}
      <br />
      {a.line1}
      {a.line2 ? `, ${a.line2}` : ''}
      <br />
      {a.city}, {a.district} District{a.postalCode ? ` ${a.postalCode}` : ''}
      <br />
      {a.phone}
      {a.landmark ? (
        <>
          <br />
          <span className="muted">Landmark: {a.landmark}</span>
        </>
      ) : null}
    </>
  )
}

function Invoice({ o }: { o: Order }) {
  const t = o.totals ?? {}
  const paid = o.paymentStatus === 'paid' || o.paymentStatus === 'partially-refunded'
  return (
    <section className="sheet">
      <Head title="Invoice" o={o} />
      <div className="cols">
        <div>
          <h3>Billed to</h3>
          {o.contact.fullName}
          <br />
          {o.contact.email}
          <br />
          {o.contact.phone}
        </div>
        <div>
          <h3>Delivered to</h3>
          <Address o={o} />
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id ?? i.sku}>
              <td>
                <strong>{i.name}</strong>
                <br />
                <span className="muted">
                  {[i.brand, i.variant, i.sku].filter(Boolean).join(' · ')}
                </span>
              </td>
              <td className="num">{i.quantity}</td>
              <td className="num">{lkr(i.unitPrice ?? 0)}</td>
              <td className="num">{lkr(i.lineSubtotal ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="totals">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td className="num">{lkr(t.subtotal ?? 0)}</td>
          </tr>
          {(o.discounts ?? []).map((d) => (
            <tr key={d.id ?? d.label}>
              <td>{d.label}</td>
              <td className="num">− {lkr(d.amount ?? 0)}</td>
            </tr>
          ))}
          <tr>
            <td>Delivery{o.delivery?.method === 'same-day' ? ' (same-day)' : ''}</td>
            <td className="num">{t.delivery ? lkr(t.delivery) : 'Free'}</td>
          </tr>
          {t.giftWrap ? (
            <tr>
              <td>Gift wrap</td>
              <td className="num">{lkr(t.giftWrap)}</td>
            </tr>
          ) : null}
          <tr className="grand">
            <td>Total</td>
            <td className="num">{lkr(t.total ?? 0)}</td>
          </tr>
          {o.refundedTotal ? (
            <tr>
              <td>Refunded</td>
              <td className="num">− {lkr(o.refundedTotal)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p style={{ textAlign: 'right' }}>
        {PAY[o.paymentMethod] ?? o.paymentMethod}
        <br />
        <span className={`stamp ${paid ? 'paid' : 'unpaid'}`}>
          {o.paymentStatus === 'refunded'
            ? 'Refunded'
            : paid
              ? 'Paid'
              : o.paymentMethod === 'cod'
                ? 'Pay on delivery'
                : 'Unpaid'}
        </span>
      </p>
      <p className="foot">
        Thank you for shopping with {site.name}. Returns: unopened items within 7 days of delivery;
        food can’t be returned. Questions? {site.contact.email} · WhatsApp {site.contact.phone}
      </p>
    </section>
  )
}

function PackingSlip({ o }: { o: Order }) {
  const courier = typeof o.shipment?.courier === 'object' ? (o.shipment.courier as Courier) : null
  const hide = Boolean(o.gift?.hidePrices)
  return (
    <section className="sheet">
      <Head title="Packing slip" o={o} />
      <div className="cols">
        <div className="ship-to">
          <h3>Ship to</h3>
          <strong>{o.shippingAddress.recipientName}</strong>
          <br />
          <Address o={o} />
        </div>
        <div>
          <h3>Delivery</h3>
          {o.delivery?.method === 'same-day' ? <strong>SAME-DAY · </strong> : null}
          {o.delivery?.zone ?? 'Standard'} · {o.delivery?.eta}
          <br />
          {courier
            ? `${courier.name}${o.shipment?.trackingNumber ? ` · ${o.shipment.trackingNumber}` : ''}`
            : 'Courier: ____________'}
          <h3 style={{ marginTop: 12 }}>Payment</h3>
          {o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' ? (
            <strong style={{ fontSize: 16 }}>COLLECT {lkr(o.totals?.total ?? 0)} CASH</strong>
          ) : (
            'Paid. Nothing to collect.'
          )}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 30 }} />
            <th>Item</th>
            <th>SKU</th>
            <th className="num">Qty</th>
            {!hide && <th className="num">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id ?? i.sku}>
              <td>
                <div className="check" />
              </td>
              <td>
                <strong>{i.name}</strong>
                <br />
                <span className="muted">{[i.brand, i.variant].filter(Boolean).join(' · ')}</span>
              </td>
              <td>{i.sku}</td>
              <td className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                {i.quantity}
              </td>
              {!hide && <td className="num">{lkr(i.lineTotal ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {o.gift?.wrap || o.gift?.message ? (
        <div className="gift">
          <h3>{o.gift?.wrap ? 'Gift wrap this order' : 'Gift message'}</h3>
          {o.gift?.message ? (
            <p style={{ margin: 0, fontSize: 15, fontStyle: 'italic' }}>“{o.gift.message}”</p>
          ) : null}
          {hide ? (
            <p className="muted" style={{ margin: '6px 0 0' }}>
              It’s a gift: no prices in the parcel.
            </p>
          ) : null}
        </div>
      ) : null}
      {o.customerNote ? (
        <div className="gift" style={{ borderColor: 'var(--ink)' }}>
          <h3>Customer note</h3>
          {o.customerNote}
        </div>
      ) : null}
      <p className="foot">Packed by: ____________ · Checked by: ____________ · {site.name}</p>
    </section>
  )
}
