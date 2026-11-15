import { getCurrentUser } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'

/** "Download my data" (TOS-306, PDPA right of access): the signed-in customer's own data as JSON. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return new Response('Sign in first', { status: 401 })
  const payload = await getPayloadClient()
  const reviews = await payload.find({ collection: 'reviews', where: { user: { equals: user.id } }, limit: 0, pagination: false, depth: 0, overrideAccess: true })
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { email: user.email, fullName: user.fullName, phone: user.phone, createdAt: user.createdAt },
    addresses: (user.addresses ?? []).map(({ id: _id, ...a }) => a),
    wishlist: user.wishlist ?? [],
    marketing: { optIn: user.marketingOptIn, channels: user.marketingChannels ?? [], consentRecordedAt: user.marketingConsentAt },
    reviews: reviews.docs.map((r) => ({ product: r.product, rating: r.rating, title: r.title, body: r.body, status: r.status, createdAt: r.createdAt })),
    deletionRequestedAt: user.deletionRequestedAt ?? null,
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="theonlinestore-my-data.json"',
      'Cache-Control': 'no-store',
    },
  })
}
