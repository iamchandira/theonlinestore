'use client'

import { useRowLabel } from '@payloadcms/ui'

type Row = { label?: string; option2?: string; sku?: string; price?: number; stock?: number; lowStockThreshold?: number }

/** Collapsed variant rows read like a table line: "55 ml · TOS-012-1 · Rs 4,950 · 24 in stock". */
export function VariantRowLabel() {
  const { data, rowNumber } = useRowLabel<Row>()
  const name = [data?.label, data?.option2].filter(Boolean).join(' / ') || `Variant ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  const stock = Number(data?.stock ?? 0)
  const low = stock > 0 && stock <= Number(data?.lowStockThreshold ?? 5)
  return (
    <span className="tos-rowlabel">
      <strong>{name}</strong>
      {data?.sku && <span className="tos-rowlabel__muted">{data.sku}</span>}
      {typeof data?.price === 'number' && <span>Rs {data.price.toLocaleString('en-LK')}</span>}
      <span className={`tos-pill ${stock <= 0 ? 'tos-pill--danger' : low ? 'tos-pill--warning' : 'tos-pill--success'}`}>
        {stock <= 0 ? 'Out of stock' : `${stock} in stock`}
      </span>
    </span>
  )
}
