'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { IconAlertTriangle, IconExternalLink, IconHistory, IconStarFilled } from '@tabler/icons-react'
import Link from 'next/link'

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`

/**
 * Product summary at the top of the edit page's sidebar: price range, stock, units sold and rating, in place
 * of eight greyed-out inputs. The numbers are worked out by the server when the product is saved.
 */
export function ProductOverview() {
  const { id } = useDocumentInfo()
  const v = useFormFields(([fields]) => ({
    minPrice: fields.minPrice?.value as number | null | undefined,
    maxPrice: fields.maxPrice?.value as number | null | undefined,
    totalStock: fields.totalStock?.value as number | null | undefined,
    lowStock: Boolean(fields.lowStock?.value),
    onSale: Boolean(fields.onSale?.value),
    salesCount: fields.salesCount?.value as number | null | undefined,
    rating: fields.rating?.value as number | null | undefined,
    reviewCount: fields.reviewCount?.value as number | null | undefined,
    variants: (fields.variants?.value as number | undefined) ?? 0,
    slug: fields.slug?.value as string | undefined,
    status: fields._status?.value as string | undefined,
  }))

  // New product: nothing to summarise until it's saved
  if (!id) {
    return (
      <section className="tos-pov" aria-label="Product summary">
        <h2 className="tos-pov__title">Summary</h2>
        <p className="tos-pov__empty">Price range, stock, sales and rating appear here once the product is saved.</p>
      </section>
    )
  }

  const price =
    typeof v.minPrice === 'number'
      ? v.maxPrice && v.maxPrice !== v.minPrice
        ? `${lkr(v.minPrice)} – ${lkr(v.maxPrice)}`
        : lkr(v.minPrice)
      : '—'
  const stock = v.totalStock ?? 0
  const stockTone = stock <= 0 ? 'danger' : v.lowStock ? 'warning' : 'success'
  const stockNote = stock <= 0 ? 'Sold out' : v.lowStock ? 'Low on a variant' : 'In stock'

  return (
    <section className="tos-pov" aria-label="Product summary">
      <h2 className="tos-pov__title">Summary</h2>
      <dl className="tos-pov__stats">
        <div className="tos-pov__stat tos-pov__stat--wide">
          <dt>Price</dt>
          <dd>
            {price}
            {v.onSale && <span className="tos-pill tos-pill--brand">On sale</span>}
          </dd>
        </div>
        <div className="tos-pov__stat">
          <dt>Stock</dt>
          <dd>
            {stock.toLocaleString('en-LK')}
            <span className={`tos-pov__note tos-pov__note--${stockTone}`}>
              {stockTone !== 'success' && <IconAlertTriangle size={13} aria-hidden />}
              {stockNote}
            </span>
          </dd>
        </div>
        <div className="tos-pov__stat">
          <dt>Sold</dt>
          <dd>
            {(v.salesCount ?? 0).toLocaleString('en-LK')}
            <span className="tos-pov__note">units</span>
          </dd>
        </div>
        <div className="tos-pov__stat tos-pov__stat--wide">
          <dt>Rating</dt>
          <dd>
            {v.reviewCount ? (
              <>
                <IconStarFilled size={15} className="tos-pov__star" aria-hidden />
                {Number(v.rating ?? 0).toFixed(1)}
                <span className="tos-pov__note">
                  {v.reviewCount} review{v.reviewCount === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="tos-pov__note">No reviews yet</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="tos-pov__hint">Updated each time the product is saved.</p>
      <div className="tos-pov__links">
        {v.slug && v.status === 'published' && (
          <a href={`/p/${v.slug}`} target="_blank" rel="noopener noreferrer">
            <IconExternalLink size={15} aria-hidden /> View on store
          </a>
        )}
        <Link href={`/admin/collections/stock-movements?where[product][equals]=${id}`} prefetch={false}>
          <IconHistory size={15} aria-hidden /> Stock history
        </Link>
      </div>
    </section>
  )
}
