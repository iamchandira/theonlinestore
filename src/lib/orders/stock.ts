import type { Payload, PayloadRequest } from 'payload'

/** Puts items back into stock (logged as a "return" stock movement with a note). */
export async function restockItems(
  payload: Payload,
  items: { sku: string; quantity: number }[],
  note: string,
  req?: Partial<PayloadRequest>,
) {
  const bySku = new Map<string, number>()
  for (const i of items) if (i.quantity > 0) bySku.set(i.sku, (bySku.get(i.sku) ?? 0) + i.quantity)
  if (!bySku.size) return
  const products = await payload.find({
    collection: 'products',
    where: { 'variants.sku': { in: [...bySku.keys()] } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  for (const p of products.docs) {
    const variants = (p.variants ?? []).map((v) =>
      bySku.has(v.sku) ? { ...v, stock: (v.stock ?? 0) + bySku.get(v.sku)! } : v,
    )
    await payload.update({
      collection: 'products',
      id: p.id,
      data: { variants },
      overrideAccess: true,
      req,
      context: { stockReason: 'return', stockNote: note },
    })
  }
}
