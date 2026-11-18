import { DefaultTemplate } from '@payloadcms/next/templates'
import { IconHistory } from '@tabler/icons-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'

import { InventoryTable, type InvRow } from './InventoryTable'

/**
 * Inventory (custom admin view at /admin/inventory): every variant in one table with inline stock editing.
 * New admin routes aren't wrapped by Payload automatically, so this view renders the DefaultTemplate itself.
 */
export async function Inventory({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user } = req

  const canAdjust = hasRole(user, 'admin', 'store-manager', 'inventory-manager')
  const canView = canAdjust || hasRole(user, 'order-fulfillment', 'support')
  const products = await payload.find({ collection: 'products', limit: 0, pagination: false, depth: 1, draft: true, sort: 'name' })
  const rows: InvRow[] = products.docs.flatMap((p) =>
    (p.variants ?? []).map((v) => {
      const img = v.image && typeof v.image === 'object' ? v.image : null
      return {
        productId: p.id,
        product: p.name,
        brand: p.brand && typeof p.brand === 'object' ? p.brand.name : '',
        type: p.productType ?? 'beauty',
        variant: [v.label, v.option2].filter(Boolean).join(' / '),
        sku: v.sku,
        stock: v.stock ?? 0,
        threshold: v.lowStockThreshold ?? 5,
        price: v.price ?? 0,
        image: img?.sizes?.thumb?.url || img?.url || null,
      }
    }),
  )
  const filter = typeof searchParams?.filter === 'string' ? searchParams.filter : 'all'

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user ?? undefined}
      viewActions={payload.config.admin?.components?.actions}
      visibleEntities={{ collections: visibleEntities?.collections, globals: visibleEntities?.globals }}
    >
      <div className="tos-page">
        <header className="tos-page__header">
          <div>
            <p className="tos-page__eyebrow">Catalogue</p>
            <h1 className="tos-page__title">Inventory</h1>
            <p className="tos-page__subtitle">
              {rows.length} variants across {products.docs.length} products.{' '}
              {canAdjust ? 'Change quantities inline, choose a reason, then save. Every change is logged.' : 'Read-only for your role.'}
            </p>
          </div>
          <div className="tos-actions">
            <Link className="tos-btn" href="/admin/collections/stock-movements">
              <IconHistory size={17} /> Stock history
            </Link>
          </div>
        </header>
        {canView ? (
          <InventoryTable rows={rows} readOnly={!canAdjust} initialFilter={['all', 'low', 'out'].includes(filter) ? (filter as 'all' | 'low' | 'out') : 'all'} />
        ) : (
          <div className="tos-card tos-empty">Inventory is available to Store Managers, Inventory Managers, Fulfilment and Support.</div>
        )}
      </div>
    </DefaultTemplate>
  )
}
