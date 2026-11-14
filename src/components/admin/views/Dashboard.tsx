import {
  IconAlertTriangle,
  IconArrowRight,
  IconBox,
  IconCash,
  IconCheck,
  IconCircleDashed,
  IconFlask,
  IconLayoutDashboard,
  IconPackageOff,
  IconPackages,
  IconPlus,
  IconReceipt,
  IconTag,
} from '@tabler/icons-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { site } from '../../../config/site'

const LKR = (n: number) => `Rs ${Math.round(n).toLocaleString('en-LK')}`
/** Compact money for KPI tiles: Rs 16.7M, Rs 845K */
const LKRc = (n: number) =>
  n >= 1_000_000 ? `Rs ${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `Rs ${Math.round(n / 1000)}K` : LKR(n)
const TYPE_LABEL: Record<string, string> = {
  beauty: 'Beauty',
  fragrance: 'Fragrance',
  footwear: 'Footwear',
  gift: 'Gifts',
  chocolate: 'Chocolates',
  accessory: 'Accessories',
  home: 'Home',
}
const REASON: Record<string, string> = {
  initial: 'Opening stock',
  adjustment: 'Adjustment',
  restock: 'Restock',
  sale: 'Sale',
  return: 'Return',
  damaged: 'Damaged',
  count: 'Stock count',
}

function greeting(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Colombo' }).format(d))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Store overview dashboard (replaces Payload's default dashboard). */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user } = req
  const name = ((user as { fullName?: string } | null)?.fullName || user?.email?.split('@')[0] || 'there').split(' ')[0]

  const [all, movements, staff, home] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 0,
      pagination: false,
      depth: 1,
      draft: true,
      select: { name: true, _status: true, productType: true, priceTBC: true, isDemo: true, totalStock: true, lowStock: true, variants: true, optionName: true, option2Name: true },
    }),
    payload.find({ collection: 'stock-movements', sort: '-createdAt', limit: 8, depth: 1 }),
    payload.count({ collection: 'users', where: { roles: { not_in: ['customer'] } } }),
    payload.findGlobal({ slug: 'home-page', depth: 0 }),
  ])

  const products = all.docs
  const published = products.filter((p) => p._status === 'published')
  const outOfStock = published.filter((p) => (p.totalStock ?? 0) <= 0)
  const priceTBC = products.filter((p) => p.priceTBC)
  const demo = products.filter((p) => p.isDemo)
  const retailValue = products.reduce((sum, p) => sum + (p.variants ?? []).reduce((s, v) => s + (v.price ?? 0) * Math.max(0, v.stock ?? 0), 0), 0)
  const units = products.reduce((sum, p) => sum + (p.totalStock ?? 0), 0)

  // Low-stock variants (not just products), most urgent first
  const lowVariants = products
    .flatMap((p) =>
      (p.variants ?? [])
        .filter((v) => (v.stock ?? 0) <= (v.lowStockThreshold ?? 5))
        .map((v) => {
          const img = v.image && typeof v.image === 'object' ? v.image : null
          return {
            id: `${p.id}-${v.sku}`,
            productId: p.id,
            name: p.name,
            label: [v.label, v.option2].filter(Boolean).join(' / '),
            sku: v.sku,
            stock: v.stock ?? 0,
            image: img?.sizes?.thumb?.url || img?.url || null,
          }
        }),
    )
    .sort((a, b) => a.stock - b.stock)

  const byType = Object.entries(
    published.reduce<Record<string, number>>((acc, p) => {
      const t = p.productType ?? 'beauty'
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const maxType = Math.max(1, ...byType.map(([, n]) => n))

  const checklist = [
    { done: priceTBC.length === 0, title: 'Confirm product prices', text: `${priceTBC.length} products still marked “price to be confirmed”.`, href: '/admin/collections/products?tab=price-tbc', cta: 'Review prices' },
    { done: !site.contact.phone.includes('000 0000'), title: 'Add your contact details', text: 'Phone, WhatsApp and social links (store settings).', href: undefined, cta: 'Owner to provide' },
    { done: (home.rails?.length ?? 0) > 0, title: 'Set up the home page', text: 'Hero products and product rails.', href: '/admin/globals/home-page', cta: 'Edit home page' },
    { done: staff.totalDocs > 1, title: 'Invite your team', text: 'Give each staff member their own login and role.', href: '/admin/collections/users/create', cta: 'Add staff' },
    { done: false, title: 'Connect payments', text: 'PayHere, Koko and Mintpay (Sprint 5).', href: undefined, cta: 'Coming in Sprint 5' },
    { done: demo.length === 0, title: 'Remove demo products before launch', text: `${demo.length} sample products are live for design and testing.`, href: '/admin/collections/products?tab=demo', cta: 'View demo items' },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  const kpis = [
    { label: 'Live products', value: published.length.toLocaleString(), hint: `${products.length - published.length} drafts`, icon: IconBox, tone: '', href: '/admin/collections/products?tab=active' },
    { label: 'Low stock', value: String(lowVariants.filter((v) => v.stock > 0).length), hint: 'variants at or below threshold', icon: IconAlertTriangle, tone: 'warning', href: '/admin/inventory?filter=low' },
    { label: 'Sold out', value: String(outOfStock.length), hint: 'products with no stock', icon: IconPackageOff, tone: 'danger', href: '/admin/collections/products?tab=out' },
    { label: 'Stock value', value: LKRc(retailValue), hint: `${LKR(retailValue)} · ${units.toLocaleString()} units`, icon: IconCash, tone: 'success', href: '/admin/inventory' },
    { label: 'Prices to confirm', value: String(priceTBC.length), hint: 'imported with placeholder prices', icon: IconTag, tone: 'info', href: '/admin/collections/products?tab=price-tbc' },
    { label: 'Demo products', value: String(demo.length), hint: 'sample items for testing', icon: IconFlask, tone: '', href: '/admin/collections/products?tab=demo' },
  ]

  return (
    <div className="tos-page">
      <section className="tos-hello">
        <div>
          <h1>
            {greeting()}, {name}
          </h1>
          <p>
            {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Colombo' }).format(new Date())} · Here’s what needs your
            attention in the store today.
          </p>
        </div>
        <div className="tos-actions">
          <Link className="tos-btn tos-btn--primary" href="/admin/collections/products/create">
            <IconPlus size={17} /> Add product
          </Link>
          <Link className="tos-btn" href="/admin/inventory">
            <IconPackages size={17} /> Adjust stock
          </Link>
        </div>
      </section>

      <div className="tos-kpis">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="tos-card tos-kpi">
            <span className={`tos-kpi__icon${k.tone ? ` tos-kpi__icon--${k.tone}` : ''}`}>
              <k.icon size={19} />
            </span>
            <span className="tos-kpi__label">{k.label}</span>
            <span className="tos-kpi__value">{k.value}</span>
            <span className="tos-kpi__hint">{k.hint}</span>
          </Link>
        ))}
      </div>

      <div className="tos-grid">
        <div className="tos-stack">
          <section className="tos-card" aria-labelledby="d-sales">
            <div className="tos-card__head">
              <h2 id="d-sales">Sales</h2>
              <span className="tos-pill tos-pill--muted tos-pill--plain">Arrives with checkout · Sprint 4</span>
            </div>
            <div className="tos-empty">
              <IconReceipt size={28} />
              <p style={{ margin: '8px 0 0' }}>Orders, revenue and average order value will appear here once checkout goes live.</p>
            </div>
          </section>

          <section className="tos-card" aria-labelledby="d-attention">
            <div className="tos-card__head">
              <h2 id="d-attention">Needs attention · stock</h2>
              <Link href="/admin/inventory?filter=low">Open inventory →</Link>
            </div>
            {lowVariants.length ? (
              <ul className="tos-list">
                {lowVariants.slice(0, 7).map((v) => (
                  <li key={v.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {v.image ? <img className="tos-thumb" src={v.image} alt="" /> : <span className="tos-thumb" />}
                    <span className="tos-list__main">
                      <Link href={`/admin/collections/products/${v.productId}`}>{v.name}</Link>
                      <small>
                        {v.label} · <span className="tos-mono">{v.sku}</span>
                      </small>
                    </span>
                    <span className={`tos-pill ${v.stock <= 0 ? 'tos-pill--danger' : 'tos-pill--warning'}`}>{v.stock <= 0 ? 'Sold out' : `${v.stock} left`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="tos-empty">All variants are comfortably stocked.</div>
            )}
          </section>

          <section className="tos-card" aria-labelledby="d-activity">
            <div className="tos-card__head">
              <h2 id="d-activity">Recent stock activity</h2>
              <Link href="/admin/collections/stock-movements">Full history →</Link>
            </div>
            {movements.docs.length ? (
              <ul className="tos-list">
                {movements.docs.map((m) => {
                  const product = typeof m.product === 'object' ? m.product : null
                  const who = typeof m.user === 'object' && m.user ? (m.user.fullName || m.user.email) : 'System'
                  return (
                    <li key={m.id}>
                      <span className={`tos-change ${m.change >= 0 ? 'tos-change--up' : 'tos-change--down'}`} style={{ width: 44 }}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </span>
                      <span className="tos-list__main">
                        {product ? <Link href={`/admin/collections/products/${product.id}`}>{product.name}</Link> : m.sku}
                        <small>
                          {m.variantLabel} · {REASON[m.reason] ?? m.reason} · by {who}
                        </small>
                      </span>
                      <small className="tos-mono">{relative(m.createdAt)}</small>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="tos-empty">No stock changes yet.</div>
            )}
          </section>
        </div>

        <div className="tos-stack">
          <section className="tos-card" aria-labelledby="d-launch">
            <div className="tos-card__head">
              <h2 id="d-launch">Launch checklist</h2>
              <span className="tos-pill tos-pill--brand tos-pill--plain">
                {doneCount} of {checklist.length}
              </span>
            </div>
            <div style={{ padding: '14px 20px 0' }}>
              <div className="tos-progress" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={doneCount} aria-label="Launch readiness">
                <span style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
              </div>
            </div>
            <ul className="tos-checklist">
              {checklist.map((c) => (
                <li key={c.title}>
                  <span className={`tos-check${c.done ? ' tos-check--done' : ''}`} aria-hidden>
                    {c.done ? <IconCheck size={14} stroke={3} /> : <IconCircleDashed size={0} />}
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>{c.done ? 'Done' : c.text}</small>
                    {!c.done && c.href && (
                      <div>
                        <Link href={c.href}>{c.cta} →</Link>
                      </div>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="tos-card" aria-labelledby="d-mix">
            <div className="tos-card__head">
              <h2 id="d-mix">Catalogue mix</h2>
              <Link href="/admin/collections/products">All products →</Link>
            </div>
            <div className="tos-bars">
              {byType.map(([type, n]) => (
                <div key={type} className="tos-bar">
                  <span>{TYPE_LABEL[type] ?? type}</span>
                  <span className="tos-bar__track">
                    <i style={{ width: `${(n / maxType) * 100}%` }} />
                  </span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="tos-card" aria-labelledby="d-quick">
            <div className="tos-card__head">
              <h2 id="d-quick">Quick actions</h2>
            </div>
            <div className="tos-quick">
              <Link href="/admin/collections/products/create">
                <IconPlus size={18} /> Add product
              </Link>
              <Link href="/admin/inventory">
                <IconPackages size={18} /> Adjust stock
              </Link>
              <Link href="/admin/globals/home-page">
                <IconLayoutDashboard size={18} /> Edit home page
              </Link>
              <Link href="/admin/collections/brands/create">
                <IconArrowRight size={18} /> Add brand
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
