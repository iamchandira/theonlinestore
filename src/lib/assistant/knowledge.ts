import type { Payload } from 'payload'

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Policy } from '@/payload-types'

import { PRODUCT_TYPES } from '../../collections/Products'
import { getBrands, getCategoryTree } from '../catalog/server'
import type { CategoryNode } from '../catalog/types'
import { liveNow, loadCheckoutConfig } from '../checkout/server'
import { formatLKR } from '../format'
import { catalogVersion } from '../payload/revalidate'
import { getStoreSettings } from '../store/settings'
import { summaryText, type PolicyKind } from '../store/policySummaries'
import { settingsVersion } from '../store/refresh'
import type { ChatConfig } from './config'

/**
 * Everything the shopping assistant knows about the store, as text for the system prompt: store
 * details, delivery, payment, policies, live promotions, the owner's FAQs and the catalogue's
 * categories, brands and filters. Rebuilt after any catalogue or settings change, or every 10 minutes.
 */

export type Vocabulary = {
  categories: { slug: string; name: string; href: string }[]
  brands: { slug: string; name: string }[]
  concerns: { slug: string; name: string }[]
  recipients: { slug: string; name: string }[]
  occasions: { slug: string; name: string }[]
  productTypes: { slug: string; name: string }[]
}

type Cached = { key: string; at: number; text: string; vocab: Vocabulary }
const g = globalThis as { __tosChatKnowledge?: Cached }

const plain = (body: unknown) => {
  try {
    const t = convertLexicalToPlaintext({ data: body as Parameters<typeof convertLexicalToPlaintext>[0]['data'] }).trim()
    return t
  } catch {
    return ''
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

async function policyText(payload: Payload, kind: PolicyKind) {
  const p = (await payload.findGlobal({ slug: 'policies', depth: 0, overrideAccess: true })) as Policy
  const body = plain(p[`${kind}Body`])
  return body ? clip(body, 4000) : summaryText(kind)
}

async function vocabulary(payload: Payload): Promise<Vocabulary> {
  const [{ roots }, brands, ...tax] = await Promise.all([
    getCategoryTree(),
    getBrands(),
    ...(['concerns', 'recipients', 'occasions'] as const).map((c) =>
      payload.find({ collection: c, limit: 0, pagination: false, depth: 0, sort: 'name', overrideAccess: true, select: { name: true, slug: true } }),
    ),
  ])
  const cats: Vocabulary['categories'] = []
  const walk = (n: CategoryNode, prefix: string) => {
    cats.push({ slug: n.slug, name: prefix ? `${prefix} › ${n.name}` : n.name, href: n.href })
    n.children.forEach((c) => walk(c, prefix ? `${prefix} › ${n.name}` : n.name))
  }
  roots.forEach((r) => walk(r, ''))
  const pick = (r: (typeof tax)[number]) => r.docs.map((d) => ({ slug: String(d.slug ?? ''), name: String(d.name ?? '') })).filter((d) => d.slug)
  return {
    categories: cats,
    brands: brands.map((b) => ({ slug: b.slug, name: b.name })),
    concerns: pick(tax[0]),
    recipients: pick(tax[1]),
    occasions: pick(tax[2]),
    productTypes: PRODUCT_TYPES.map((t) => ({ slug: t.value, name: t.label })),
  }
}

async function build(payload: Payload, cfg: ChatConfig): Promise<Omit<Cached, 'key' | 'at'>> {
  const [store, checkout, vocab, returns, terms, privacy, promos] = await Promise.all([
    getStoreSettings(),
    loadCheckoutConfig(payload),
    vocabulary(payload),
    policyText(payload, 'returns'),
    policyText(payload, 'terms'),
    policyText(payload, 'privacy'),
    payload.find({ collection: 'discounts', where: { and: [liveNow(new Date()), { mode: { equals: 'automatic' } }] }, limit: 20, depth: 0, overrideAccess: true }),
  ])
  const d = checkout.delivery
  const c = store.contact
  const lines: string[] = []
  const add = (title: string, body: string | string[]) => {
    const text = Array.isArray(body) ? body.filter(Boolean).join('\n') : body
    if (text.trim()) lines.push(`## ${title}\n${text.trim()}`)
  }

  add('Store', [
    `Name: ${store.name}`,
    store.description && `About: ${store.description}`,
    'Website: theonlinestore.lk (a Sri Lankan online store: beauty and skincare, fragrances, footwear, gifts and hampers, chocolates, accessories).',
    c.phone && `Phone: ${c.phone}`,
    c.whatsapp && `WhatsApp: +${c.whatsapp.replace(/^\+/, '')}`,
    c.email && `Email: ${c.email}`,
    c.hours && `Customer care hours: ${c.hours}`,
    c.address && `Address: ${c.address.replace(/\n/g, ', ')}`,
    store.announcements.length ? `Current highlights: ${store.announcements.map((a) => a.text).join(' · ')}` : '',
  ])

  add('Delivery', [
    `Usual delivery time: ${store.deliveryEstimate}.`,
    d.freeThreshold !== null ? `Free standard delivery on orders of ${formatLKR(d.freeThreshold)} or more (after discounts).` : 'There is no free-delivery offer at the moment.',
    ...d.zones.map((z) => `${z.name} (${z.districts.join(', ')}): ${formatLKR(z.fee)}, ${z.eta}.`),
    `Everywhere else in Sri Lanka: ${formatLKR(d.fallback.fee)}, ${d.fallback.eta}.`,
    `Delivery includes ${d.includedKg} kg; each extra kg costs ${formatLKR(d.perKgFee)}.`,
    d.sameDay.enabled
      ? `Same-day delivery in ${d.sameDay.districts.join(', ')}: ${formatLKR(d.sameDay.fee)}, ${d.sameDay.eta}, for orders placed before ${checkout.cutoffHour}:00 (Sri Lanka time), Monday to Saturday.`
      : 'Same-day delivery is not available at the moment.',
    `Gift wrapping: ${formatLKR(checkout.giftWrapFee)} (choose it at checkout).`,
    'Exact fees for an address are shown at checkout. Orders can be tracked at /track-order with the order number and mobile number.',
  ])

  add('Payment', [
    store.paymentMethods.length ? `Ways to pay now: ${store.paymentMethods.join(', ')}.` : 'Payment options are shown at checkout.',
    store.instalments
      ? `Pay in 3 interest-free instalments with ${store.instalments.providers.join(' or ')}${store.instalments.feePercent ? ` (a ${store.instalments.feePercent}% fee is added)` : ''}.`
      : '',
  ])

  add('Current promotions (applied automatically at checkout)', promos.docs.map((p) => `- ${p.name}: ${(p as { offer?: string }).offer ?? ''}${p.firstOrderOnly ? ' (first order only)' : ''}${p.endsAt ? `, until ${new Date(p.endsAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' })}` : ''}`))
  add('Returns and refunds policy (/returns)', [
    `Return window: ${store.returns.windowDays ? `${store.returns.windowDays} days after delivery` : 'online return requests are not available'}. Not returnable: ${store.returns.nonReturnableTypes.join(', ') || 'none'}.`,
    returns,
  ])
  add('Terms (/terms)', terms)
  add('Privacy (/privacy)', privacy)

  if (cfg.faqs.length) add('Questions and answers from the store', cfg.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'))
  if (cfg.notes.trim()) add('Notes from the store', cfg.notes)

  add('Useful pages', [
    '/offers (products on sale), /gifts (gift finder), /brands, /categories, /search?q=… (search), /track-order, /returns, /terms, /privacy, /account (sign in, orders, wishlist), /wishlist.',
  ])
  add('Catalogue filters you can use with search_products (use the slug)', [
    `Categories: ${vocab.categories.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    `Brands: ${vocab.brands.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    `Concerns / skin and hair needs: ${vocab.concerns.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    `Recipients (who it's for): ${vocab.recipients.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    `Occasions: ${vocab.occasions.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    `Product types: ${vocab.productTypes.map((x) => `${x.slug} (${x.name})`).join('; ')}`,
    'Gender (fragrance, footwear, accessories): women, men, unisex, kids.',
  ])
  return { text: lines.join('\n\n'), vocab }
}

export async function getKnowledge(payload: Payload, cfg: ChatConfig) {
  const key = `${catalogVersion()}:${settingsVersion()}:${cfg.faqs.length}:${cfg.notes.length}`
  const c = g.__tosChatKnowledge
  if (c && c.key === key && Date.now() - c.at < 10 * 60_000) return c
  const built = await build(payload, cfg)
  g.__tosChatKnowledge = { key, at: Date.now(), ...built }
  return g.__tosChatKnowledge
}
