import { RichText } from '@payloadcms/richtext-lexical/react'
import { IconChevronDown } from '@tabler/icons-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { getStoreSettings } from '@/lib/store/settings'
import type { ProductDetail } from '@/lib/catalog'
import { formatLKR } from '@/lib/format'

/** One accordion row: native <details> (keyboard and screen-reader friendly, no JS). */
function Row({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        {title}
        <IconChevronDown size={18} className="shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-5 text-[0.9375rem] leading-relaxed text-ink-700">{children}</div>
    </details>
  )
}

/** Product information accordions. Rows without content are hidden (no empty "Ingredients" panels). */
export async function ProductDetails({ product }: { product: ProductDetail }) {
  const store = await getStoreSettings()
  const hasDescription = Boolean(product.description && typeof product.description === 'object')
  return (
    <div className="border-t border-line">
      {(hasDescription || product.concernLabels.length > 0) && (
        <Row title="About this product" open>
          {hasDescription ? (
            <div className="prose-sm max-w-none [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3">
              <RichText data={product.description as never} />
            </div>
          ) : (
            <p>{product.shortDescription}</p>
          )}
          {product.concernLabels.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink-800">Good for:</span>
              {product.concernLabels.map((c) => (
                <Link key={c.slug} href={`/c/beauty?concern=${c.slug}`} className="inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-sm hover:border-ink-900">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </Row>
      )}
      {(product.facts.length > 0 || product.notes || product.contents.length > 0 || product.fit) && (
        <Row title={product.productType === 'gift' ? 'What’s inside' : 'Details'} open={!hasDescription}>
          {product.contents.length > 0 && (
            <ul className="mb-4 flex flex-col gap-1.5">
              {product.contents.map((c) => (
                <li key={c} className="ml-5 list-disc">
                  {c}
                </li>
              ))}
            </ul>
          )}
          {product.facts.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {product.facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-ink-800">{k}</dt>
                  <dd className="text-ink-700">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {product.notes && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['Top notes', product.notes.top],
                  ['Heart notes', product.notes.heart],
                  ['Base notes', product.notes.base],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-tint-fragrance p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{k}</p>
                    <p className="mt-1 text-sm font-medium text-ink-800">{v}</p>
                  </div>
                ))}
            </div>
          )}
          {product.fit && (
            <p className="mt-4 rounded-lg bg-tint-footwear p-3 text-sm">
              <strong className="font-semibold">Fit advice: </strong>
              {product.fit}
            </p>
          )}
        </Row>
      )}
      {(product.allergens || product.storage) && (
        <Row title="Allergens & storage">
          {product.allergens && (
            <p>
              <strong className="font-semibold">Allergens: </strong>
              {product.allergens}
            </p>
          )}
          {product.storage && (
            <p className="mt-2">
              <strong className="font-semibold">Storage: </strong>
              {product.storage}
            </p>
          )}
        </Row>
      )}
      {product.benefits.length > 0 && (
        <Row title="Benefits">
          <ul className="flex flex-col gap-1.5">
            {product.benefits.map((b) => (
              <li key={b} className="ml-5 list-disc">
                {b}
              </li>
            ))}
          </ul>
        </Row>
      )}
      {product.howToUse && (
        <Row title="How to use">
          <p className="whitespace-pre-line">{product.howToUse}</p>
        </Row>
      )}
      {product.ingredients && (
        <Row title="Ingredients">
          <p className="whitespace-pre-line text-sm">{product.ingredients}</p>
        </Row>
      )}
      <Row title="Delivery & returns">
        <ul className="flex flex-col gap-1.5">
          <li>
            Island-wide delivery in {store.deliveryEstimate}.
            {store.freeDeliveryThreshold != null ? ` Free on orders over ${formatLKR(store.freeDeliveryThreshold)}.` : ''}
          </li>
          {store.paymentMethods.length > 0 && <li>Pay by {store.paymentMethods.join(', ').toLowerCase()}.</li>}
          <li>
            {product.productType === 'footwear'
              ? 'Wrong size? Exchange unworn shoes within 7 days.'
              : product.productType === 'chocolate'
                ? 'Food items can’t be returned once delivered, unless they arrive damaged.'
                : 'Unopened items can be returned within 7 days. Opened beauty products can’t be returned for hygiene reasons.'}
          </li>
        </ul>
      </Row>
    </div>
  )
}
