/**
 * Deletes media documents (and their files) that no product, category or brand references.
 * Usage: pnpm prune:media           (dry run, lists what would be removed)
 *        pnpm prune:media --apply   (actually delete)
 */
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const apply = process.argv.includes('--apply')
const payload = await getPayload({ config })
const used = new Set<number>()
const products = await payload.find({ collection: 'products', limit: 0, pagination: false, depth: 0, draft: true })
for (const p of products.docs) {
  for (const v of p.variants ?? []) if (typeof v.image === 'number') used.add(v.image)
  for (const g of p.gallery ?? []) if (typeof g === 'number') used.add(g)
  if (typeof p.meta?.image === 'number') used.add(p.meta.image)
}
for (const c of (await payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0 })).docs) if (typeof c.image === 'number') used.add(c.image)
for (const b of (await payload.find({ collection: 'brands', limit: 0, pagination: false, depth: 0 })).docs) if (typeof b.logo === 'number') used.add(b.logo)
const all = await payload.find({ collection: 'media', limit: 0, pagination: false, depth: 0 })
const orphans = all.docs.filter((m) => !used.has(m.id as number))
console.log(`media: ${all.docs.length}, referenced: ${used.size}, unreferenced: ${orphans.length}`)
if (apply) {
  for (const m of orphans) await payload.delete({ collection: 'media', id: m.id })
  console.log(`deleted ${orphans.length}`)
} else if (orphans.length) console.log('dry run; re-run with --apply to delete:', orphans.slice(0, 5).map((m) => m.filename).join(', '), '…')
process.exit(0)
