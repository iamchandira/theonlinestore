import { IconDownload } from '@tabler/icons-react'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'

import { AdminPage } from './AdminPage'
import { ImportPanel } from './ImportPanel'

/** Import / export (TOS-109) at /admin/import-export: download every SKU as CSV, or update prices and stock from a CSV. */
export async function ImportExport(props: AdminViewServerProps) {
  const user = props.initPageResult.req.user
  const canPrices = hasRole(user, 'admin', 'store-manager')
  const canStock = hasRole(user, 'admin', 'store-manager', 'inventory-manager')
  const canExport = canStock || hasRole(user, 'marketing')
  const variants = await props.initPageResult.req.payload.count({ collection: 'products' })
  return (
    <AdminPage props={props}>
      <div className="tos-page">
        <header className="tos-page__header">
          <div>
            <p className="tos-page__eyebrow">Catalogue</p>
            <h1 className="tos-page__title">Import / export</h1>
            <p className="tos-page__subtitle">Download every SKU as a spreadsheet, edit prices or stock, and upload it back. Nothing changes until you review and confirm.</p>
          </div>
        </header>
        <div className="tos-grid tos-grid--2">
          <section className="tos-card">
            <div className="tos-card__head">
              <h2>Export products</h2>
            </div>
            <div className="tos-card__body tos-stack">
              <p>One row per SKU ({variants.totalDocs} products): product, brand, type, status, options, SKU, prices{canPrices ? ', cost' : ''} and stock. Opens in Excel, Numbers and Google Sheets.</p>
              {canExport ? (
                <a className="tos-btn tos-btn--primary" href="/api/products/export" download style={{ alignSelf: 'flex-start' }}>
                  <IconDownload size={17} /> Download CSV
                </a>
              ) : (
                <p className="tos-muted">Your role can’t export products.</p>
              )}
            </div>
          </section>
          <section className="tos-card">
            <div className="tos-card__head">
              <h2>How importing works</h2>
            </div>
            <div className="tos-card__body">
              <ol className="tos-steps">
                <li>Start from an export so the <code>sku</code> column is right.</li>
                <li>
                  Change <code>price</code>, <code>compare_at_price</code>, <code>cost</code>, <code>stock</code> or <code>low_stock_threshold</code>. Delete columns you don’t want to touch.
                </li>
                <li>Blank cells mean “no change”. A was-price of 0 removes it.</li>
                <li>Upload, check the preview, then apply. Stock changes are logged as “Stock count · CSV import”.</li>
              </ol>
              <p className="tos-muted" style={{ marginTop: 10 }}>
                Your role can update {[canPrices && 'prices', canStock && 'stock'].filter(Boolean).join(' and ') || 'nothing'}. New products are added in the Products screen.
              </p>
            </div>
          </section>
        </div>
        {(canPrices || canStock) && <ImportPanel />}
      </div>
    </AdminPage>
  )
}
