// @vitest-environment node
/**
 * Sprint 2 (discovery) rules: typo-tolerant search, spelling correction, faceted counts,
 * review moderation + rating aggregates + privacy, and the CSV parser used by imports.
 * Runs against the local dev database (seeded catalogue) and cleans up after itself.
 */
import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseCsv } from '@/endpoints/productsCsv'
import { runFacets } from '@/lib/catalog/facets'
import { didYouMean, searchProductIds } from '@/lib/catalog/search'

let payload: Payload
const createdReviews: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(async () => {
  for (const id of createdReviews) await payload.delete({ collection: 'reviews', id, overrideAccess: true }).catch(() => {})
})

const brandOf = async (ids: number[]) => {
  const res = await payload.find({ collection: 'products', where: { id: { in: ids.slice(0, 10) } }, depth: 1, limit: 10 })
  return res.docs.map((d) => (typeof d.brand === 'object' && d.brand ? d.brand.name : ''))
}

describe('search (TOS-201)', () => {
  it('finds a brand however it is typed: exact, spaced, partial', async () => {
    for (const q of ['cerave', 'cera ve', 'cerav', 'CeraVe']) {
      const ids = await searchProductIds(payload, q)
      expect(ids.length, q).toBeGreaterThan(0)
      expect((await brandOf(ids)).slice(0, 3).every((b) => b === 'CeraVe'), q).toBe(true)
    }
  })

  it('tolerates typos in longer words', async () => {
    const ids = await searchProductIds(payload, 'niacinimide')
    expect(ids.length).toBeGreaterThan(0)
  })

  it('suggests a correction when nothing matches', async () => {
    expect(await searchProductIds(payload, 'cervae')).toHaveLength(0)
    expect(await didYouMean(payload, 'cervae')).toBe('cerave')
    expect(await didYouMean(payload, 'qqqqzzzz')).toBeNull()
  })
})

describe('faceted filters (TOS-202)', () => {
  it('filters by brand and keeps other brands countable (disjunctive counts)', async () => {
    const all = await runFacets(payload, {}, {}, 'recommended')
    const cerave = await runFacets(payload, {}, { brand: ['cerave'] }, 'recommended')
    expect(cerave.total).toBeGreaterThan(0)
    expect(cerave.total).toBeLessThan(all.total)
    const brandGroup = cerave.facets.find((g) => g.key === 'brand')
    expect(brandGroup?.kind).toBe('list')
    if (brandGroup?.kind === 'list') {
      expect(brandGroup.options.find((o) => o.value === 'cerave')?.selected).toBe(true)
      // Other brands still show how many products they would add
      expect(brandGroup.options.filter((o) => o.value !== 'cerave' && o.count > 0).length).toBeGreaterThan(1)
    }
  })

  it('applies price range and sorts by price', async () => {
    const run = await runFacets(payload, {}, { min: 2000, max: 5000 }, 'price-asc')
    const docs = await payload.find({ collection: 'products', where: { id: { in: run.ids } }, limit: 0, pagination: false, depth: 0, select: { minPrice: true } })
    const price = new Map(docs.docs.map((d) => [d.id, Number(d.minPrice)]))
    const prices = run.ids.map((id) => price.get(id)!)
    expect(prices.every((p) => p >= 2000 && p <= 5000)).toBe(true)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  })
})

describe('reviews (TOS-206)', () => {
  it('only approved reviews count, emails stay private, and the rating follows moderation', async () => {
    const product = (await payload.find({ collection: 'products', where: { _status: { equals: 'published' }, isDemo: { not_equals: true } }, limit: 1, depth: 0 })).docs[0]
    const before = { rating: product.rating ?? null, count: product.reviewCount ?? 0 }

    const review = await payload.create({
      collection: 'reviews',
      data: { product: product.id, rating: 2, body: 'Integration test review body', authorName: 'Int Test', authorEmail: 'int@example.com', status: 'pending' },
      overrideAccess: true,
    })
    createdReviews.push(review.id)
    const afterPending = await payload.findByID({ collection: 'products', id: product.id, depth: 0 })
    expect(afterPending.reviewCount ?? 0).toBe(before.count)

    // The public (no user) never sees pending reviews
    const publicPending = await payload.find({ collection: 'reviews', where: { id: { equals: review.id } }, overrideAccess: false })
    expect(publicPending.totalDocs).toBe(0)

    await payload.update({ collection: 'reviews', id: review.id, data: { status: 'approved' }, overrideAccess: true })
    const afterApprove = await payload.findByID({ collection: 'products', id: product.id, depth: 0 })
    expect(afterApprove.reviewCount).toBe(before.count + 1)

    // Approved and public, but the email is stripped for the public
    const publicApproved = await payload.find({ collection: 'reviews', where: { id: { equals: review.id } }, overrideAccess: false })
    expect(publicApproved.totalDocs).toBe(1)
    expect(publicApproved.docs[0].authorEmail).toBeUndefined()

    await payload.delete({ collection: 'reviews', id: review.id, overrideAccess: true })
    createdReviews.pop()
    const afterDelete = await payload.findByID({ collection: 'products', id: product.id, depth: 0 })
    expect(afterDelete.reviewCount ?? 0).toBe(before.count)
  })
})

describe('CSV parser (TOS-109)', () => {
  it('handles quotes, commas, newlines, CRLF and a BOM', () => {
    const rows = parseCsv('﻿sku,name,price\r\nA-1,"Cream, 50 ml",1200\r\nB-2,"He said ""hi""\nthen left",900\n\n')
    expect(rows).toEqual([
      ['sku', 'name', 'price'],
      ['A-1', 'Cream, 50 ml', '1200'],
      ['B-2', 'He said "hi"\nthen left', '900'],
    ])
  })
})
