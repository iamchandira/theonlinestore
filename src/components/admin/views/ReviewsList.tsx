import Link from 'next/link'
import type { ListViewServerProps, Where } from 'payload'

import { ReviewsTable, type ReviewRow } from './ReviewsTable'
import { CleanListURL } from './CleanListURL'

const TABS = [
  { key: 'pending', label: 'Waiting for approval' },
  { key: 'approved', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const
type TabKey = (typeof TABS)[number]['key']
const PAGE_SIZE = 20

/** Reviews moderation (TOS-206): replaces Payload's default list for the reviews collection. */
export async function ReviewsList(props: ListViewServerProps) {
  const { payload, searchParams } = props as ListViewServerProps & { searchParams?: Record<string, string | string[] | undefined> }
  const sp = (k: string) => {
    const v = searchParams?.[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const tab = (TABS.some((t) => t.key === sp('tab')) ? sp('tab') : 'pending') as TabKey
  const q = sp('q').trim().slice(0, 80)
  const page = Math.max(1, Number.parseInt(sp('page') || '1', 10) || 1)

  const base: Where[] = q ? [{ or: [{ body: { like: q } }, { title: { like: q } }, { authorName: { like: q } }, { authorEmail: { like: q } }] }] : []
  const whereFor = (t: TabKey): Where => {
    const parts = [...base, ...(t === 'all' ? [] : [{ status: { equals: t } }])]
    return parts.length ? { and: parts } : {}
  }
  const [res, ...counts] = await Promise.all([
    payload.find({ collection: 'reviews', where: whereFor(tab), sort: tab === 'pending' ? 'createdAt' : '-createdAt', page, limit: PAGE_SIZE, depth: 2, overrideAccess: true }),
    ...TABS.map((t) => payload.count({ collection: 'reviews', where: whereFor(t.key), overrideAccess: true })),
  ])

  const rows: ReviewRow[] = res.docs.map((r) => {
    const product = r.product && typeof r.product === 'object' ? r.product : null
    const img = product?.variants?.[0]?.image
    const media = img && typeof img === 'object' ? img : null
    return {
      id: r.id,
      productId: product?.id ?? null,
      productName: product ? product.name : 'Deleted product',
      productSlug: product?.slug ?? null,
      productImage: media?.sizes?.thumb?.url || media?.url || null,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body,
      authorName: r.authorName,
      authorEmail: r.authorEmail ?? null,
      status: r.status,
      verifiedBuyer: Boolean(r.verifiedBuyer),
      photos: ((r.photos as unknown[]) ?? [])
        .map((p) => (p && typeof p === 'object' ? (p as { sizes?: { thumb?: { url?: string } }; url?: string }) : null))
        .map((p) => p?.sizes?.thumb?.url || p?.url || '')
        .filter(Boolean),
      createdAt: r.createdAt,
    }
  })

  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const merged = { tab, q, ...o }
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'tab' && v === 'pending') && !(k === 'page' && String(v) === '1')) p.set(k, String(v))
    return `/admin/collections/reviews${p.size ? `?${p}` : ''}`
  }
  const pending = counts[0].totalDocs

  return (
    <div className="tos-page">
      <CleanListURL href={href({ page })} />
      <header className="tos-page__header">
        <div>
          <p className="tos-page__eyebrow">Catalogue</p>
          <h1 className="tos-page__title">Reviews</h1>
          <p className="tos-page__subtitle">
            {pending ? `${pending} review${pending === 1 ? '' : 's'} waiting for approval. ` : 'All caught up. '}
            Approved reviews appear on the product page and update its rating straight away.
          </p>
        </div>
      </header>
      <section className="tos-card">
        <div className="tos-toolbar">
          <nav className="tos-tabs" aria-label="Filter reviews">
            {TABS.map((t, i) => (
              <Link key={t.key} href={href({ tab: t.key, page: 1 })} aria-current={t.key === tab ? 'page' : undefined}>
                {t.label} <em>{counts[i].totalDocs}</em>
              </Link>
            ))}
          </nav>
          <form className="tos-search" role="search" action="/admin/collections/reviews">
            {tab !== 'pending' && <input type="hidden" name="tab" value={tab} />}
            <input name="q" defaultValue={q} placeholder="Search text, name or email" aria-label="Search reviews" />
          </form>
        </div>
        <ReviewsTable rows={rows} tab={tab} />
        <div className="tos-pager">
          <span>{res.totalDocs ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(res.totalDocs, page * PAGE_SIZE)} of ${res.totalDocs}` : ''}</span>
          <span className="tos-actions">
            {res.hasPrevPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page - 1 })}>
                ← Previous
              </Link>
            )}
            {res.hasNextPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page + 1 })}>
                Next →
              </Link>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
