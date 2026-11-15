import { sql } from '@payloadcms/db-postgres'
import type { Access, CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, FieldAccess, Payload, PayloadRequest, Where } from 'payload'

import { allowRoles, hasRole, isStaff } from '../access/roles'
import { revalidate } from '../lib/payload/revalidate'
import { allow, clientIp } from '../lib/server/rateLimit'

/**
 * Product reviews (TOS-206).
 * - Shoppers submit through `POST /api/reviews/submit` (no account needed until Sprint 3); every review
 *   is held as "pending" until staff approve it.
 * - The public only ever reads approved reviews, and never sees reviewer emails.
 * - Approving, rejecting or deleting a review recalculates the product's rating and review count.
 */

type Row = Record<string, unknown>
type Exec = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Row[] }> }
type Adapter = { drizzle: Exec; sessions?: Record<string | number, { db?: Exec }> }

/** Raw SQL on the request's open transaction when there is one (so hooks see the row being saved). */
async function db(payload: Payload, req?: PayloadRequest): Promise<Exec> {
  const adapter = payload.db as unknown as Adapter
  const id = req?.transactionID ? await req.transactionID : null
  return (id != null && adapter.sessions?.[id]?.db) || adapter.drizzle
}

const MODERATORS = ['store-manager', 'marketing', 'support'] as const
const staffOnlyField: FieldAccess = ({ req }) => isStaff(req.user)
const approvedOrStaff: Access = ({ req }) => (isStaff(req.user) ? true : { status: { equals: 'approved' } })

/** Average rating and count of approved reviews for a product. */
export async function reviewAggregate(payload: Payload, productId: number, req?: PayloadRequest) {
  const { rows } = await (await db(payload, req)).execute(
    sql`SELECT count(*)::int AS n, coalesce(round(avg(rating)::numeric, 1), 0) AS avg FROM reviews WHERE product_id = ${productId} AND status = 'approved'`,
  )
  return { reviewCount: Number(rows[0]?.n ?? 0), rating: Number(rows[0]?.avg ?? 0) }
}

/** Writes the aggregate straight to the product row (no new product version, no hooks) and refreshes its page. */
async function syncProduct(payload: Payload, productId: number, req?: PayloadRequest) {
  const { reviewCount, rating } = await reviewAggregate(payload, productId, req)
  const { rows } = await (await db(payload, req)).execute(
    sql`UPDATE products SET rating = ${reviewCount ? rating : null}, review_count = ${reviewCount} WHERE id = ${productId} RETURNING slug`,
  )
  const slug = rows[0]?.slug
  await revalidate(['/', ...(slug ? [`/p/${slug}`] : [])])
}

const idOf = (v: unknown) => (typeof v === 'object' && v ? Number((v as { id: number }).id) : Number(v))

const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const products = new Set([idOf(doc.product), ...(previousDoc?.product ? [idOf(previousDoc.product)] : [])].filter(Boolean))
  for (const id of products) await syncProduct(req.payload, id, req)
  // Photos become visible only with an approved review
  const isPublic = doc.status === 'approved'
  for (const photo of (doc.photos ?? []) as unknown[]) {
    await req.payload.update({ collection: 'review-media', id: idOf(photo), data: { public: isPublic }, overrideAccess: true, req })
  }
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (doc.product) await syncProduct(req.payload, idOf(doc.product), req)
  return doc
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    group: 'Catalogue',
    useAsTitle: 'title',
    defaultColumns: ['product', 'rating', 'title', 'authorName', 'status', 'createdAt'],
    description: 'Shopper reviews. New reviews wait for approval before they appear on the store.',
    components: { views: { list: { Component: '/components/admin/views/ReviewsList#ReviewsList' } } },
  },
  access: {
    read: approvedOrStaff,
    create: allowRoles(...MODERATORS),
    update: allowRoles(...MODERATORS),
    delete: allowRoles('store-manager', 'marketing'),
  },
  defaultSort: '-createdAt',
  hooks: { afterChange: [afterChange], afterDelete: [afterDelete] },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5, admin: { step: 1, description: '1 to 5 stars' } },
    { name: 'title', type: 'text', maxLength: 100 },
    { name: 'body', label: 'Review', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'photos', type: 'upload', relationTo: 'review-media', hasMany: true, maxRows: 3 },
    {
      name: 'reply',
      label: 'Public reply',
      type: 'textarea',
      maxLength: 1000,
      admin: { description: 'Shown under the review as "Reply from The Online Store".' },
    },
    {
      type: 'row',
      fields: [
        { name: 'authorName', label: 'Name shown', type: 'text', required: true, maxLength: 60, admin: { width: '50%' } },
        {
          name: 'authorEmail',
          label: 'Email (private)',
          type: 'email',
          access: { read: staffOnlyField },
          admin: { width: '50%', description: 'Never shown on the store.' },
        },
      ],
    },
    // ----- sidebar -----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending approval', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'verifiedBuyer',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Bought this product from us. Set from orders once checkout launches (Sprint 6).' },
    },
    { name: 'helpfulCount', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true } },
    { name: 'user', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true }, access: { read: staffOnlyField } },
    {
      name: 'isSample',
      label: 'Sample review',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Illustrative review on a demo product. Removed with the demo products.' },
    },
    {
      name: 'moderationNote',
      type: 'textarea',
      access: { read: staffOnlyField },
      admin: { position: 'sidebar', description: 'Internal note (why it was rejected, etc.).' },
    },
  ],
  endpoints: [
    {
      // GET /api/reviews/list?product=ID&page=2&sort=recent|helpful|highest|lowest&rating=5&photos=1 (approved only)
      path: '/list',
      method: 'get',
      handler: async (req) => {
        const sp = req.searchParams
        const product = Number(sp.get('product'))
        if (!product) return Response.json({ reviews: [], totalPages: 0 })
        const sorts: Record<string, string> = { recent: '-createdAt', helpful: '-helpfulCount', highest: '-rating', lowest: 'rating' }
        const rating = Number(sp.get('rating'))
        const and: Where[] = [{ product: { equals: product } }, { status: { equals: 'approved' } }]
        if (rating >= 1 && rating <= 5) and.push({ rating: { equals: rating } })
        if (sp.get('photos') === '1') and.push({ photos: { exists: true } })
        const res = await req.payload.find({
          collection: 'reviews',
          where: { and },
          sort: sorts[sp.get('sort') ?? 'recent'] ?? sorts.recent,
          page: Math.max(1, Math.min(100, Number(sp.get('page')) || 1)),
          limit: 6,
          depth: 1,
          overrideAccess: false,
          req,
        })
        const { toPublicReview } = await import('../lib/catalog/server')
        return Response.json(
          { reviews: res.docs.map((d) => toPublicReview(d as unknown as Record<string, unknown>)), totalPages: res.totalPages, total: res.totalDocs },
          { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
        )
      },
    },
    {
      // POST /api/reviews/submit (multipart form): productId, rating, title, body, name, email, photos[] (≤3)
      path: '/submit',
      method: 'post',
      handler: async (req) => {
        const ip = clientIp(req.headers)
        if (!allow(`review:${ip}`, 5, 60 * 60 * 1000)) {
          return Response.json({ error: 'You’ve sent a few reviews already. Please try again in an hour.' }, { status: 429 })
        }
        const form = await req.formData?.().catch(() => null)
        if (!form) return Response.json({ error: 'Please send the review as a form.' }, { status: 400 })
        // Honeypot: bots fill every field; people never see this one
        if (String(form.get('website') ?? '')) return Response.json({ ok: true })

        const text = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max)
        const productId = Number(form.get('productId'))
        const rating = Math.round(Number(form.get('rating')))
        const title = text('title', 100)
        const body = text('body', 2000)
        const name = text('name', 60)
        const email = text('email', 120)
        const errors: Record<string, string> = {}
        if (!(rating >= 1 && rating <= 5)) errors.rating = 'Choose a star rating.'
        if (body.length < 10) errors.body = 'Tell us a little more (at least 10 characters).'
        if (name.length < 2) errors.name = 'Add the name to show with your review.'
        if (!EMAIL.test(email)) errors.email = 'Enter a valid email address.'
        const files = form.getAll('photos').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f && (f as File).size > 0)
        if (files.length > 3) errors.photos = 'You can add up to 3 photos.'
        if (files.some((f) => !PHOTO_TYPES.includes(f.type))) errors.photos = 'Photos must be JPG, PNG or WebP.'
        if (files.some((f) => f.size > MAX_PHOTO_BYTES)) errors.photos = 'Each photo must be under 5 MB.'
        if (Object.keys(errors).length) return Response.json({ error: 'Please check the highlighted fields.', errors }, { status: 400 })

        const product = await req.payload
          .find({ collection: 'products', where: { and: [{ id: { equals: productId } }, { _status: { equals: 'published' } }] }, limit: 1, depth: 0, select: { name: true } })
          .then((r) => r.docs[0])
        if (!product) return Response.json({ error: 'We couldn’t find that product.' }, { status: 404 })

        const photos: number[] = []
        for (const [i, f] of files.slice(0, 3).entries()) {
          const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'
          const media = await req.payload.create({
            collection: 'review-media',
            data: { alt: `Customer photo of ${product.name}`, public: false },
            file: { data: Buffer.from(await f.arrayBuffer()), mimetype: f.type, name: `review-${productId}-${Date.now()}-${i}.${ext}`, size: f.size },
            overrideAccess: true,
          })
          photos.push(media.id)
        }
        await req.payload.create({
          collection: 'reviews',
          data: {
            product: productId,
            rating,
            title: title || undefined,
            body,
            authorName: name,
            authorEmail: email,
            photos,
            status: 'pending',
            user: req.user && !isStaff(req.user) ? req.user.id : undefined,
          },
          overrideAccess: true,
        })
        return Response.json({ ok: true })
      },
    },
    {
      // POST /api/reviews/:id/helpful → +1 "helpful" (approved reviews only, once per visitor per review)
      path: '/:id/helpful',
      method: 'post',
      handler: async (req) => {
        const id = Number(req.routeParams?.id)
        if (!id) return Response.json({ error: 'Unknown review' }, { status: 400 })
        if (!allow(`helpful:${clientIp(req.headers)}:${id}`, 1, 24 * 60 * 60 * 1000)) return Response.json({ ok: true, duplicate: true })
        const { rows } = await (await db(req.payload)).execute(
          sql`UPDATE reviews SET helpful_count = coalesce(helpful_count, 0) + 1 WHERE id = ${id} AND status = 'approved' RETURNING helpful_count`,
        )
        if (!rows[0]) return Response.json({ error: 'Unknown review' }, { status: 404 })
        return Response.json({ ok: true, helpfulCount: Number(rows[0].helpful_count) })
      },
    },
    {
      // POST /api/reviews/moderate { ids: number[], status: 'approved' | 'rejected' } (admin Reviews screen)
      path: '/moderate',
      method: 'post',
      handler: async (req) => {
        if (!req.user || !hasRole(req.user, 'admin', ...MODERATORS)) return Response.json({ error: 'Not allowed' }, { status: 403 })
        const body = (await req.json?.()) as { ids?: number[]; status?: string }
        const status = body?.status === 'approved' || body?.status === 'rejected' ? body.status : null
        const ids = (body?.ids ?? []).map(Number).filter(Boolean).slice(0, 200)
        if (!status || !ids.length) return Response.json({ error: 'ids and status are required' }, { status: 400 })
        const res = await req.payload.update({ collection: 'reviews', where: { id: { in: ids } }, data: { status }, req, overrideAccess: false })
        return Response.json({ ok: true, updated: res.docs.length, errors: res.errors.length })
      },
    },
  ],
}
