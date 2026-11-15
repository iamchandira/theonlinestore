import type { Endpoint, PayloadRequest } from 'payload'

import { hasRole } from '../access/roles'

/**
 * CSV export and import for products and stock (TOS-109).
 *
 * Export: one row per variant (SKU) with product info, prices and stock.
 * Import: updates EXISTING variants by SKU (price, compare-at price, cost, stock, low-stock threshold).
 *   - Blank cells mean "no change"; a compare-at price of 0 removes it.
 *   - Always run as a preview first (`apply: false`), then apply. Stock changes are logged with the
 *     reason "Stock count" and the note "CSV import". New products are still created in the admin.
 *   - Field permissions follow the RBAC matrix: prices need Store Manager, stock needs Inventory Manager.
 */

const PRICE_FIELDS = ['price', 'compare_at_price', 'cost'] as const
const STOCK_FIELDS = ['stock', 'low_stock_threshold'] as const
type Field = (typeof PRICE_FIELDS)[number] | (typeof STOCK_FIELDS)[number]
const FIELD_KEY: Record<Field, 'price' | 'compareAtPrice' | 'cost' | 'stock' | 'lowStockThreshold'> = {
  price: 'price',
  compare_at_price: 'compareAtPrice',
  cost: 'cost',
  stock: 'stock',
  low_stock_threshold: 'lowStockThreshold',
}
const FIELD_LABEL: Record<Field, string> = { price: 'Price', compare_at_price: 'Was price', cost: 'Cost', stock: 'Stock', low_stock_threshold: 'Low-stock alert' }

const canPrices = (req: PayloadRequest) => hasRole(req.user, 'admin', 'store-manager')
const canStock = (req: PayloadRequest) => hasRole(req.user, 'admin', 'store-manager', 'inventory-manager')
const canExport = (req: PayloadRequest) => hasRole(req.user, 'admin', 'store-manager', 'inventory-manager', 'marketing')

/* ---------------------------------------------------------------- CSV utils */

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Quotes a cell; text starting with = + - @ is prefixed with ' so spreadsheets never run it as a formula. */
const cellOut = (v: unknown) => {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* ------------------------------------------------------------------- export */

export const exportEndpoint: Endpoint = {
  path: '/export',
  method: 'get',
  handler: async (req) => {
    if (!canExport(req)) return Response.json({ error: 'Not allowed' }, { status: 403 })
    const withCost = canPrices(req)
    const res = await req.payload.find({ collection: 'products', limit: 0, pagination: false, depth: 1, draft: true, sort: 'name', req, overrideAccess: false })
    const header = [
      'product_id',
      'product_slug',
      'product_name',
      'brand',
      'type',
      'status',
      'option1_name',
      'option1',
      'option2_name',
      'option2',
      'sku',
      'price',
      'compare_at_price',
      ...(withCost ? ['cost'] : []),
      'stock',
      'low_stock_threshold',
      'price_tbc',
    ]
    const lines = [header.join(',')]
    for (const p of res.docs) {
      for (const v of p.variants ?? []) {
        lines.push(
          [
            p.id,
            p.slug,
            p.name,
            typeof p.brand === 'object' && p.brand ? p.brand.name : '',
            p.productType ?? 'beauty',
            p._status ?? 'draft',
            p.optionName ?? '',
            v.label,
            p.option2Name ?? '',
            v.option2 ?? '',
            v.sku,
            v.price,
            v.compareAtPrice ?? '',
            ...(withCost ? [v.cost ?? ''] : []),
            v.stock ?? 0,
            v.lowStockThreshold ?? '',
            p.priceTBC ? 'yes' : 'no',
          ]
            .map(cellOut)
            .join(','),
        )
      }
    }
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
    return new Response(`﻿${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="theonlinestore-products-${day}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  },
}

/* ------------------------------------------------------------------- import */

export type ImportChange = { field: string; from: number | null; to: number | null }
export type ImportRow = { line: number; sku: string; product?: string; variant?: string; changes: ImportChange[]; skipped: string[]; error?: string }
export type ImportResult = { rows: ImportRow[]; summary: { lines: number; matched: number; changes: number; errors: number; applied: boolean; productsUpdated: number } }

export const importEndpoint: Endpoint = {
  path: '/import',
  method: 'post',
  handler: async (req) => {
    if (!canStock(req) && !canPrices(req)) return Response.json({ error: 'Not allowed' }, { status: 403 })
    const body = (await req.json?.().catch(() => null)) as { csv?: string; apply?: boolean } | null
    const csv = String(body?.csv ?? '')
    if (!csv.trim()) return Response.json({ error: 'The file is empty.' }, { status: 400 })
    if (csv.length > 5_000_000) return Response.json({ error: 'The file is too large (max 5 MB).' }, { status: 400 })

    const table = parseCsv(csv)
    const header = (table[0] ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const skuCol = header.indexOf('sku')
    if (skuCol < 0) return Response.json({ error: 'The first row must contain a "sku" column.' }, { status: 400 })
    const fields = ([...PRICE_FIELDS, ...STOCK_FIELDS] as Field[]).filter((f) => header.includes(f))
    if (!fields.length) return Response.json({ error: 'Add at least one column to update: price, compare_at_price, cost, stock or low_stock_threshold.' }, { status: 400 })
    if (table.length > 5001) return Response.json({ error: 'Up to 5,000 rows per import, please split the file.' }, { status: 400 })

    const allowed = (f: Field) => ((PRICE_FIELDS as readonly string[]).includes(f) ? canPrices(req) : canStock(req))
    const dataRows = table.slice(1).map((cells, i) => ({ line: i + 2, cells }))
    const skus = [...new Set(dataRows.map((r) => r.cells[skuCol]?.trim()).filter(Boolean))]

    // Load every product that owns one of these SKUs (latest version, drafts included)
    const products = skus.length
      ? (await req.payload.find({ collection: 'products', where: { 'variants.sku': { in: skus } }, limit: 0, pagination: false, depth: 0, draft: true, overrideAccess: true })).docs
      : []
    const bySku = new Map<string, { productId: number; product: string; variant: string }>()
    for (const p of products) for (const v of p.variants ?? []) bySku.set(v.sku, { productId: p.id, product: p.name, variant: [v.label, v.option2].filter(Boolean).join(' / ') })
    const variantOf = (sku: string) => {
      const owner = bySku.get(sku)
      return owner ? products.find((p) => p.id === owner.productId)?.variants?.find((v) => v.sku === sku) : undefined
    }

    const rows: ImportRow[] = []
    const updates = new Map<number, Map<string, Partial<Record<(typeof FIELD_KEY)[Field], number | null>>>>()
    const seen = new Set<string>()
    for (const { line, cells } of dataRows) {
      const sku = cells[skuCol]?.trim() ?? ''
      const row: ImportRow = { line, sku, changes: [], skipped: [] }
      rows.push(row)
      if (!sku) {
        row.error = 'Missing SKU'
        continue
      }
      if (seen.has(sku)) {
        row.error = 'This SKU appears more than once in the file'
        continue
      }
      seen.add(sku)
      const owner = bySku.get(sku)
      const variant = variantOf(sku)
      if (!owner || !variant) {
        row.error = 'Unknown SKU (create new products in the admin)'
        continue
      }
      row.product = owner.product
      row.variant = owner.variant
      const patch: Partial<Record<(typeof FIELD_KEY)[Field], number | null>> = {}
      for (const f of fields) {
        const raw = (cells[header.indexOf(f)] ?? '').trim().replace(/[,\s]/g, '').replace(/^rs\.?/i, '')
        if (raw === '') continue
        const n = Number(raw)
        const isInt = f === 'stock' || f === 'low_stock_threshold'
        if (!Number.isFinite(n) || n < 0 || (isInt && !Number.isInteger(n))) {
          row.error = `${FIELD_LABEL[f]} must be ${isInt ? 'a whole number' : 'a number'} of 0 or more (got “${cells[header.indexOf(f)]}”)`
          break
        }
        const key = FIELD_KEY[f]
        const next = f === 'compare_at_price' && n === 0 ? null : Math.round(n * 100) / 100
        const prev = (variant[key] as number | null | undefined) ?? null
        if (prev === next) continue
        if (!allowed(f)) {
          row.skipped.push(`${FIELD_LABEL[f]} (your role can’t change it)`)
          continue
        }
        if (f === 'price' && next === 0) {
          row.error = 'Price can’t be 0'
          break
        }
        patch[key] = next
        row.changes.push({ field: FIELD_LABEL[f], from: prev, to: next })
      }
      if (row.error) {
        row.changes = []
        continue
      }
      if (row.changes.length) {
        if (!updates.has(owner.productId)) updates.set(owner.productId, new Map())
        updates.get(owner.productId)!.set(sku, patch)
      }
    }

    let productsUpdated = 0
    const errors = rows.filter((r) => r.error).length
    if (body?.apply && updates.size) {
      for (const [productId, patches] of updates) {
        // Update the published document (as the Inventory screen does); drafts stay as they are
        const current = await req.payload.findByID({ collection: 'products', id: productId, depth: 0, overrideAccess: true })
        const variants = (current.variants ?? []).map((v) => (patches.has(v.sku) ? ({ ...v, ...patches.get(v.sku) } as typeof v) : v))
        await req.payload.update({
          collection: 'products',
          id: productId,
          data: { variants, _status: current._status ?? 'published' },
          req,
          overrideAccess: false,
          context: { stockReason: 'count', stockNote: 'CSV import' },
        })
        productsUpdated++
      }
      const { audit } = await import('../lib/payload/audit')
      const changeCount = rows.reduce((n, r) => n + r.changes.length, 0)
      await audit(req, {
        action: 'csv-import',
        collection: 'products',
        summary: `CSV import: ${changeCount} change${changeCount === 1 ? '' : 's'} across ${productsUpdated} product${productsUpdated === 1 ? '' : 's'}`,
        changes: rows.filter((r) => r.changes.length).map((r) => ({ sku: r.sku, changes: r.changes })),
      })
    }
    const result: ImportResult = {
      rows: rows.filter((r) => r.error || r.changes.length || r.skipped.length),
      summary: {
        lines: dataRows.length,
        matched: rows.filter((r) => r.product).length,
        changes: rows.reduce((n, r) => n + r.changes.length, 0),
        errors,
        applied: Boolean(body?.apply),
        productsUpdated,
      },
    }
    return Response.json(result)
  },
}
