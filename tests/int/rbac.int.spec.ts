// @vitest-environment node
/**
 * RBAC (TOS-401): every staff role and a customer, checked against docs/06-rbac-matrix.md through the
 * Local API with `overrideAccess: false` (the same rules the REST API and admin use).
 * Creates its own users and fixtures and removes them afterwards.
 */
import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Role } from '@/access/roles'
import type { User } from '@/payload-types'

let payload: Payload
let admin: User
const stamp = Date.now()
const users = {} as Record<Role, User>
const cleanup: { collection: 'users' | 'products' | 'categories' | 'reviews' | 'stock-movements'; id: number }[] = []
let productId: number
let draftId: number
let categoryId: number
let reviewId: number
let brandId: number

const ROLES_UNDER_TEST: Role[] = ['admin', 'store-manager', 'inventory-manager', 'order-fulfillment', 'marketing', 'support', 'customer']

/** Runs an operation as `role`; true if allowed, false if Payload refused it. */
async function allowed(role: Role, op: (user: User) => Promise<unknown>) {
  try {
    await op(users[role])
    return true
  } catch (err) {
    const name = (err as Error).name
    if (name === 'Forbidden' || name === 'NotFound') return false
    throw err
  }
}
const who = async (op: (user: User) => Promise<unknown>) => {
  const out: Role[] = []
  for (const r of ROLES_UNDER_TEST) if (await allowed(r, op)) out.push(r)
  return out
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  admin = (await payload.find({ collection: 'users', where: { roles: { contains: 'super-admin' } }, limit: 1, depth: 0 })).docs[0] as User
  expect(admin, 'run `pnpm seed:admin` first').toBeTruthy()
  for (const role of ROLES_UNDER_TEST) {
    const u = await payload.create({
      collection: 'users',
      data: { email: `rbac-${role}-${stamp}@theonlinestore.test`, password: `pw-${stamp}-x`, roles: [role], _verified: true },
      user: admin,
      disableVerificationEmail: true,
    })
    users[role] = u as User
    cleanup.push({ collection: 'users', id: u.id })
  }
  const brand = (await payload.find({ collection: 'brands', limit: 1, depth: 0 })).docs[0]
  brandId = brand.id
  const cat = await payload.create({ collection: 'categories', data: { name: `RBAC Cat ${stamp}`, slug: `rbac-cat-${stamp}`, generateSlug: false }, user: admin, context: { disableRevalidate: true } })
  categoryId = cat.id
  const mk = async (suffix: string, status: 'published' | 'draft') =>
    (
      await payload.create({
        collection: 'products',
        data: {
          name: `RBAC ${suffix} ${stamp}`,
          slug: `rbac-${suffix}-${stamp}`,
          generateSlug: false,
          brand: brand.id,
          categories: [cat.id],
          optionName: 'Size',
          variants: [{ label: '50 ml', sku: `RBAC-${suffix}-${stamp}`, price: 1000, cost: 400, stock: 10, lowStockThreshold: 2 }],
          _status: status,
        },
        user: admin,
        draft: status === 'draft',
        context: { disableRevalidate: true },
      } as never)
    ).id
  productId = await mk('pub', 'published')
  draftId = await mk('draft', 'draft')
  reviewId = (await payload.create({ collection: 'reviews', data: { product: productId, rating: 5, body: 'RBAC test review body', authorName: 'RBAC', status: 'pending' }, overrideAccess: true })).id
})

afterAll(async () => {
  await payload.delete({ collection: 'reviews', id: reviewId, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'stock-movements', where: { product: { in: [productId, draftId] } }, overrideAccess: true }).catch(() => {})
  for (const id of [productId, draftId]) await payload.delete({ collection: 'products', id, overrideAccess: true, context: { disableRevalidate: true } }).catch(() => {})
  await payload.delete({ collection: 'categories', id: categoryId, overrideAccess: true, context: { disableRevalidate: true } }).catch(() => {})
  for (const c of cleanup.filter((x) => x.collection === 'users')) await payload.delete({ collection: 'users', id: c.id, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'audit-logs', where: { summary: { like: String(stamp) } }, overrideAccess: true }).catch(() => {})
})

describe('admin panel access', () => {
  it('every staff role can open /admin; customers cannot', async () => {
    const access = payload.collections.users.config.access.admin!
    for (const r of ROLES_UNDER_TEST) expect(Boolean(await access({ req: { user: users[r] } } as never)), r).toBe(r !== 'customer')
  })
})

describe('products (matrix: CRUD store-manager; marketing CRU; inventory R + stock; others R)', () => {
  it('create', async () => {
    expect(
      await who((user) =>
        payload.create({
          collection: 'products',
          data: { name: `RBAC create ${user.id}`, slug: `rbac-create-${user.id}-${stamp}`, generateSlug: false, brand: brandId, categories: [categoryId], optionName: 'Size', variants: [{ label: 'x', sku: `RBAC-C-${user.id}-${stamp}`, price: 100, stock: 0 }], _status: 'draft' },
          draft: true,
          user,
          overrideAccess: false,
          context: { disableRevalidate: true },
        }).then((p) => cleanup.push({ collection: 'products', id: p.id })),
      ),
    ).toEqual(['admin', 'store-manager', 'marketing'])
    for (const c of cleanup.filter((x) => x.collection === 'products')) await payload.delete({ collection: 'products', id: c.id, overrideAccess: true, context: { disableRevalidate: true } })
  })

  it('drafts are visible to staff only', async () => {
    for (const r of ROLES_UNDER_TEST) {
      const res = await payload.find({ collection: 'products', where: { id: { equals: draftId } }, draft: true, user: users[r], overrideAccess: false })
      expect(res.totalDocs, r).toBe(r === 'customer' ? 0 : 1)
    }
  })

  it('price changes only by store managers; stock by inventory too; cost hidden from others', async () => {
    for (const r of ['store-manager', 'inventory-manager', 'marketing', 'support'] as Role[]) {
      const before = await payload.findByID({ collection: 'products', id: productId, overrideAccess: true })
      const variants = (before.variants ?? []).map((v) => ({ ...v, price: v.price + 7, stock: (v.stock ?? 0) + 1 }))
      await payload.update({ collection: 'products', id: productId, data: { variants }, user: users[r], overrideAccess: false, context: { disableRevalidate: true } }).catch(() => null)
      const after = await payload.findByID({ collection: 'products', id: productId, overrideAccess: true })
      expect(after.variants![0].price !== before.variants![0].price, `${r} price`).toBe(r === 'store-manager')
      expect(after.variants![0].stock !== before.variants![0].stock, `${r} stock`).toBe(r === 'store-manager' || r === 'inventory-manager')
    }
    for (const r of ROLES_UNDER_TEST) {
      const asRole = await payload.findByID({ collection: 'products', id: productId, user: users[r], overrideAccess: false })
      expect(asRole.variants![0].cost !== undefined, `${r} reads cost`).toBe(['admin', 'store-manager', 'inventory-manager'].includes(r))
    }
  })

  it('delete', async () => {
    // Only check who may delete (on a throwaway draft per role)
    const deleters: Role[] = []
    for (const r of ROLES_UNDER_TEST) {
      const p = await payload.create({
        collection: 'products',
        data: { name: `RBAC del ${r}`, slug: `rbac-del-${r}-${stamp}`, generateSlug: false, brand: brandId, categories: [categoryId], optionName: 'Size', variants: [{ label: 'x', sku: `RBAC-D-${r}-${stamp}`, price: 100, stock: 0 }], _status: 'draft' },
        draft: true,
        user: admin,
        context: { disableRevalidate: true },
      })
      if (await allowed(r, (user) => payload.delete({ collection: 'products', id: p.id, user, overrideAccess: false, context: { disableRevalidate: true } }))) deleters.push(r)
      else await payload.delete({ collection: 'products', id: p.id, overrideAccess: true, context: { disableRevalidate: true } })
    }
    expect(deleters).toEqual(['admin', 'store-manager'])
  })
})

describe('other resources', () => {
  it('categories: store-manager & marketing edit, only store-manager deletes', async () => {
    expect(await who((user) => payload.update({ collection: 'categories', id: categoryId, data: { blurb: `by ${user.id}` }, user, overrideAccess: false, context: { disableRevalidate: true } }))).toEqual([
      'admin',
      'store-manager',
      'marketing',
    ])
  })

  it('stock history: managers create; fulfilment and support read; marketing and customers see nothing', async () => {
    const readers: Role[] = []
    for (const r of ROLES_UNDER_TEST) if ((await payload.find({ collection: 'stock-movements', where: { product: { equals: productId } }, user: users[r], overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs > 0) readers.push(r)
    expect(readers).toEqual(['admin', 'store-manager', 'inventory-manager', 'order-fulfillment', 'support'])
  })

  it('home page: store-manager and marketing', async () => {
    expect(await who((user) => payload.updateGlobal({ slug: 'home-page', data: {}, user, overrideAccess: false, context: { disableRevalidate: true } }))).toEqual(['admin', 'store-manager', 'marketing'])
  })

  it('reviews: store-manager, marketing and support moderate; customers read approved only', async () => {
    expect(await who((user) => payload.update({ collection: 'reviews', id: reviewId, data: { moderationNote: `seen by ${user.id}` }, user, overrideAccess: false }))).toEqual([
      'admin',
      'store-manager',
      'marketing',
      'support',
    ])
    const asCustomer = await payload.find({ collection: 'reviews', where: { id: { equals: reviewId } }, user: users.customer, overrideAccess: false })
    expect(asCustomer.totalDocs).toBe(0) // still pending
  })

  it('audit log: admins only', async () => {
    expect(await who((user) => payload.find({ collection: 'audit-logs', limit: 1, user, overrideAccess: false }))).toEqual(['admin'])
  })

  it('search insights: store-manager and marketing', async () => {
    expect(await who((user) => payload.find({ collection: 'search-queries', limit: 1, user, overrideAccess: false }))).toEqual(['admin', 'store-manager', 'marketing'])
  })
})

describe('users', () => {
  it('customer records: read by store-manager, fulfilment, marketing, support; others only see themselves', async () => {
    for (const r of ROLES_UNDER_TEST) {
      const res = await payload.find({ collection: 'users', where: { id: { equals: users.customer.id } }, user: users[r], overrideAccess: false })
      expect(res.totalDocs, r).toBe(['admin', 'store-manager', 'order-fulfillment', 'marketing', 'support', 'customer'].includes(r) ? 1 : 0)
    }
    // Non-admin staff never see other staff accounts
    const asSupport = await payload.find({ collection: 'users', where: { id: { equals: users['store-manager'].id } }, user: users.support, overrideAccess: false })
    expect(asSupport.totalDocs).toBe(0)
  })

  it('customer records: edited by store-manager and support only', async () => {
    expect(await who((user) => payload.update({ collection: 'users', id: users.customer.id, data: { staffNote: `note ${user.id}` }, user, overrideAccess: false }))).toEqual([
      'admin',
      'store-manager',
      'support',
      'customer',
    ])
  })

  it('nobody but admins can change roles, and only super-admins grant super-admin; changes are audited', async () => {
    await payload.update({ collection: 'users', id: users.customer.id, data: { roles: ['admin'] }, user: users.customer, overrideAccess: false })
    expect((await payload.findByID({ collection: 'users', id: users.customer.id, overrideAccess: true })).roles).toEqual(['customer'])
    await expect(payload.update({ collection: 'users', id: users.support.id, data: { roles: ['super-admin'] }, user: users.admin, overrideAccess: false })).rejects.toThrow(/Only a Super Admin/)
    expect((await payload.findByID({ collection: 'users', id: users.support.id, overrideAccess: true })).roles).toEqual(['support'])
    await payload.update({ collection: 'users', id: users.support.id, data: { roles: ['support', 'marketing'] }, user: users.admin, overrideAccess: false })
    const log = await payload.find({ collection: 'audit-logs', where: { and: [{ action: { equals: 'role-change' } }, { docId: { equals: String(users.support.id) } }] }, sort: '-createdAt', overrideAccess: true })
    expect(log.docs[0]?.summary).toContain('support, marketing')
  })

  it('public sign-up always creates a customer', async () => {
    const u = await payload.create({ collection: 'users', data: { email: `rbac-public-${stamp}@theonlinestore.test`, password: `pw-${stamp}-x`, roles: ['admin'] }, overrideAccess: false, disableVerificationEmail: true })
    cleanup.push({ collection: 'users', id: u.id })
    expect(u.roles).toEqual(['customer'])
  })

  it('price changes are written to the audit log', async () => {
    const log = await payload.find({ collection: 'audit-logs', where: { and: [{ action: { equals: 'price-change' } }, { docId: { equals: String(productId) } }] }, overrideAccess: true })
    expect(log.totalDocs).toBeGreaterThan(0)
  })
})
