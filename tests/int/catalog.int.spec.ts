// @vitest-environment node
/**
 * Catalogue business rules (Sprint 1): computed fields, stock movement log, RBAC field access,
 * drafts visibility and SKU uniqueness. Runs against the local dev database and cleans up after itself.
 */
import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

let payload: Payload
let admin: User
let inventory: User
let brandId: number
let categoryId: number
const createdProducts: number[] = []
const createdUsers: number[] = []
const stamp = Date.now()

async function makeStaff(role: 'inventory-manager', by: User) {
  const u = await payload.create({
    collection: 'users',
    data: { email: `int-${role}-${stamp}@theonlinestore.test`, password: `pw-${stamp}-x`, roles: [role] },
    user: by,
  })
  createdUsers.push(u.id)
  return u
}

const baseProduct = (suffix: string, extra: Record<string, unknown> = {}) => ({
  name: `Int Test Product ${suffix}`,
  slug: `int-test-${suffix}-${stamp}`,
  generateSlug: false,
  brand: brandId,
  categories: [categoryId],
  optionName: 'Size' as const,
  variants: [
    { label: '50 ml', sku: `INT-${suffix}-${stamp}-1`, price: 2000, compareAtPrice: 2500, stock: 10, lowStockThreshold: 5 },
    { label: '100 ml', sku: `INT-${suffix}-${stamp}-2`, price: 3500, stock: 3, lowStockThreshold: 5 },
  ],
  _status: 'published' as const,
  ...extra,
})

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'super-admin' } }, limit: 1, depth: 0 })
  admin = admins.docs[0] as User
  expect(admin, 'run `pnpm seed:admin` first').toBeTruthy()
  inventory = await makeStaff('inventory-manager', admin)
  brandId = (await payload.find({ collection: 'brands', limit: 1, depth: 0 })).docs[0].id
  categoryId = (await payload.find({ collection: 'categories', where: { slug: { equals: 'serums' } }, limit: 1, depth: 0 })).docs[0].id
}, 60_000)

afterAll(async () => {
  for (const id of createdProducts) {
    await payload.delete({ collection: 'stock-movements', where: { product: { equals: id } }, overrideAccess: true })
    await payload.delete({ collection: 'products', id, overrideAccess: true, context: { disableRevalidate: true } })
  }
  for (const id of createdUsers) await payload.delete({ collection: 'users', id, overrideAccess: true })
})

describe('Products', () => {
  it('computes price range, stock, low-stock and on-sale flags on save', async () => {
    const p = await payload.create({ collection: 'products', data: baseProduct('calc') as never, user: admin, context: { disableRevalidate: true } })
    createdProducts.push(p.id)
    expect(p.minPrice).toBe(2000)
    expect(p.maxPrice).toBe(3500)
    expect(p.totalStock).toBe(13)
    expect(p.lowStock).toBe(true) // the 100 ml variant has 3 ≤ threshold 5
    expect(p.onSale).toBe(true)
    expect(p.searchText).toContain('int test product calc')
  })

  it('uses the first extra photo for variants without their own photo', async () => {
    const media = (await payload.find({ collection: 'media', limit: 2, depth: 0, overrideAccess: true })).docs
    expect(media.length).toBe(2)
    const base = baseProduct('photo') as { variants: Record<string, unknown>[] }
    const variants = base.variants.map((v, i) => ({ ...v, image: i === 0 ? null : media[1].id }))
    const p = await payload.create({
      collection: 'products',
      data: { ...base, variants, gallery: [media[0].id, media[1].id] } as never,
      user: admin,
      context: { disableRevalidate: true },
    })
    createdProducts.push(p.id)
    const ids = p.variants.map((v) => (typeof v.image === 'object' && v.image ? v.image.id : v.image))
    expect(ids).toEqual([media[0].id, media[1].id]) // empty one filled, own photo kept
  })

  it('logs opening stock and later adjustments with the user who made them', async () => {
    const p = await payload.create({ collection: 'products', data: baseProduct('log') as never, user: admin, context: { disableRevalidate: true } })
    createdProducts.push(p.id)
    const opening = await payload.find({ collection: 'stock-movements', where: { product: { equals: p.id } }, depth: 0, overrideAccess: true })
    expect(opening.totalDocs).toBe(2)
    expect(opening.docs.every((m) => m.reason === 'initial')).toBe(true)

    const variants = p.variants.map((v) => (v.sku.endsWith('-1') ? { ...v, stock: 7 } : v))
    await payload.update({ collection: 'products', id: p.id, data: { variants }, user: inventory, overrideAccess: false, context: { disableRevalidate: true } })
    const after = await payload.find({ collection: 'stock-movements', where: { and: [{ product: { equals: p.id } }, { reason: { equals: 'adjustment' } }] }, depth: 0, overrideAccess: true })
    expect(after.totalDocs).toBe(1)
    expect(after.docs[0].change).toBe(-3)
    expect(after.docs[0].resultingStock).toBe(7)
    expect(after.docs[0].user).toBe(inventory.id)
  })

  it('lets an inventory manager change stock but not prices', async () => {
    const p = await payload.create({ collection: 'products', data: baseProduct('rbac') as never, user: admin, context: { disableRevalidate: true } })
    createdProducts.push(p.id)
    const variants = p.variants.map((v) => ({ ...v, price: 1, stock: 42 }))
    const updated = await payload.update({ collection: 'products', id: p.id, data: { variants }, user: inventory, overrideAccess: false, context: { disableRevalidate: true } })
    expect(updated.variants.map((v) => v.stock)).toEqual([42, 42])
    expect(updated.variants.map((v) => v.price)).toEqual([2000, 3500]) // price edits are ignored for this role
  })

  it('hides drafts from the public', async () => {
    const draft = await payload.create({ collection: 'products', data: baseProduct('draft', { _status: 'draft' }) as never, draft: true, user: admin, context: { disableRevalidate: true } })
    createdProducts.push(draft.id)
    const publicView = await payload.find({ collection: 'products', where: { slug: { equals: draft.slug } }, overrideAccess: false, depth: 0 })
    expect(publicView.totalDocs).toBe(0)
    const staffView = await payload.find({ collection: 'products', where: { slug: { equals: draft.slug } }, overrideAccess: false, user: admin, draft: true, depth: 0 })
    expect(staffView.totalDocs).toBe(1)
  })

  it('rejects a SKU that another product already uses', async () => {
    const a = await payload.create({ collection: 'products', data: baseProduct('skua') as never, user: admin, context: { disableRevalidate: true } })
    createdProducts.push(a.id)
    const dup = { ...baseProduct('skub'), variants: [{ label: 'x', sku: a.variants[0].sku, price: 100, stock: 1 }] }
    await expect(payload.create({ collection: 'products', data: dup as never, user: admin, context: { disableRevalidate: true } })).rejects.toThrow(/already used/)
  })
})
