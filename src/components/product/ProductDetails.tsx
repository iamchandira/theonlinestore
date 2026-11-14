import { RichText } from '@payloadcms/richtext-lexical/react'
import { IconChevronDown } from '@tabler/icons-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { site } from '@/config/site'
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
export function ProductDetails({ product }: { product: ProductDetail }) {
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
          <li>Island-wide delivery in {site.deliveryEstimate}. Free on orders over {formatLKR(site.freeDeliveryThreshold)}.</li>
          <li>Pay by card, bank transfer, Koko, Mintpay or cash on delivery.</li>
          <li>Unopened items can be returned within 7 days. Opened beauty products can’t be returned for hygiene reasons.</li>
        </ul>
      </Row>
    </div>
  )
}
