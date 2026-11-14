import { IconFileExport, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import type { ListViewServerProps, Where } from 'payload'

import { ProductsTable, type Row } from './ProductsTable'
import { ProductsToolbar } from './ProductsToolbar'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Drafts' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Sold out' },
  { key: 'price-tbc', label: 'Price to confirm' },
  { key: 'demo', label: 'Demo' },
] as const
type TabKey = (typeof TABS)[number]['key']

const tabWhere = (tab: TabKey): Where | null => {
  switch (tab) {
    case 'active':
      return { _status: { equals: 'published' } }
    case 'draft':
      return { _status: { equals: 'draft' } }
    case 'low':
      return { and: [{ lowStock: { equals: true } }, { totalStock: { greater_than: 0 } }] }
    case 'out':
      return { totalStock: { less_than_equal: 0 } }
    case 'price-tbc':
      return { priceTBC: { equals: true } }
    case 'demo':
      return { isDemo: { equals: true } }
    default:
      return null
  }
}

const SORTS: Record<string, string> = {
  updated: '-updatedAt',
  name: 'name',
  'price-asc': 'minPrice',
  'price-desc': '-minPrice',
  'stock-asc': 'totalStock',
  'stock-desc': '-totalStock',
}

const PAGE_SIZE = 25

/** Products list (replaces Payload's default list view for this collection). */
export async function ProductsList(props: ListViewServerProps) {
  const { payload, searchParams } = props as ListViewServerProps & { searchParams?: Record<string, string | string[] | undefined> }
  const sp = (k: string) => {
    const v = searchParams?.[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const tab = (TABS.some((t) => t.key === sp('tab')) ? sp('tab') : 'all') as TabKey
  const q = sp('q').trim().toLowerCase().slice(0, 80)
  const type = sp('type')
  const sortKey = SORTS[sp('sort')] ? sp('sort') : 'updated'
  const page = Math.max(1, Number.parseInt(sp('page') || '1', 10) || 1)

  const base: Where[] = []
  if (q) base.push({ or: [{ searchText: { like: q } }, { 'variants.sku': { like: q } }, { name: { like: q } }] })
  if (type) base.push({ productType: { equals: type } })
  const whereFor = (t: TabKey): Where => {
    const parts = [...base, tabWhere(t)].filter(Boolean) as Where[]
    return parts.length ? { and: parts } : {}
  }

  const [res, ...counts] = await Promise.all([
    payload.find({ collection: 'products', where: whereFor(tab), sort: SORTS[sortKey], page, limit: PAGE_SIZE, depth: 1, draft: true }),
    ...TABS.map((t) => payload.count({ collection: 'products', where: whereFor(t.key) })),
  ])

  const rows: Row[] = res.docs.map((p) => {
    const v0 = p.variants?.[0]
    const img = v0?.image && typeof v0.image === 'object' ? v0.image : null
    const cat = p.categories?.[0] && typeof p.categories[0] === 'object' ? p.categories[0] : null
    return {
      id: p.id,
      name: p.name,
      slug: p.slug ?? '',
      brand: p.brand && typeof p.brand === 'object' ? p.brand.name : '',
      category: cat?.name ?? '',
      type: p.productType ?? 'beauty',
      status: (p._status ?? 'draft') as 'draft' | 'published',
      image: img?.sizes?.thumb?.url || img?.url || null,
      variants: p.variants?.length ?? 0,
      stock: p.totalStock ?? 0,
      lowStock: Boolean(p.lowStock),
      minPrice: p.minPrice ?? null,
      maxPrice: p.maxPrice ?? null,
      onSale: Boolean(p.onSale),
      priceTBC: Boolean(p.priceTBC),
      isDemo: Boolean(p.isDemo),
      updatedAt: p.updatedAt,
    }
  })

  const keep = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    const merged = { tab, q, type, sort: sortKey === 'updated' ? '' : sortKey, ...overrides }
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'tab' && v === 'all') && !(k === 'page' && String(v) === '1')) params.set(k, String(v))
    const s = params.toString()
    return `/admin/collections/products${s ? `?${s}` : ''}`
  }

  return (
    <div className="tos-page">
      <header className="tos-page__header">
        <div>
          <p className="tos-page__eyebrow">Catalogue</p>
          <h1 className="tos-page__title">Products</h1>
          <p className="tos-page__subtitle">
            {counts[0].totalDocs} products across beauty, fragrance, footwear, gifts and chocolates.
          </p>
        </div>
        <div className="tos-actions">
          <span className="tos-btn" aria-disabled="true" title="CSV import and export arrive in Sprint 2" style={{ opacity: 0.55, cursor: 'not-allowed' }}>
            <IconFileExport size={17} /> Import / export
          </span>
          <Link className="tos-btn tos-btn--primary" href="/admin/collections/products/create">
            <IconPlus size={17} /> Add product
          </Link>
        </div>
      </header>

      <section className="tos-card">
        <div className="tos-toolbar">
          <nav className="tos-tabs" aria-label="Filter products">
            {TABS.map((t, i) => (
              <Link key={t.key} href={keep({ tab: t.key, page: 1 })} aria-current={t.key === tab ? 'page' : undefined}>
                {t.label} <em>{counts[i].totalDocs}</em>
              </Link>
            ))}
          </nav>
          <ProductsToolbar q={q} type={type} sort={sortKey} />
        </div>
        <ProductsTable
          rows={rows}
          sort={sortKey}
          sortLinks={Object.fromEntries(['name', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'].map((s) => [s, keep({ sort: s, page: 1 })]))}
        />
        <div className="tos-pager">
          <span>
            {res.totalDocs ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(res.totalDocs, page * PAGE_SIZE)} of ${res.totalDocs}` : 'No products match'}
          </span>
          <span className="tos-actions">
            {res.hasPrevPage && (
              <Link className="tos-btn tos-btn--sm" href={keep({ page: page - 1 })}>
                ← Previous
              </Link>
            )}
            {res.hasNextPage && (
              <Link className="tos-btn tos-btn--sm" href={keep({ page: page + 1 })}>
                Next →
              </Link>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
