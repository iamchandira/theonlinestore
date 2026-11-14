/**
 * Creates (or updates) the local development super-admin from .env values.
 * Usage: pnpm seed:admin    Requires SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env (never commit real values).
 */
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!email || !password) {
  console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.')
  process.exit(1)
}

const payload = await getPayload({ config })
const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
if (existing.docs[0]) {
  await payload.update({ collection: 'users', id: existing.docs[0].id, data: { password, roles: ['super-admin'] }, overrideAccess: true })
  console.log(`Updated dev admin ${email}`)
} else {
  await payload.create({ collection: 'users', data: { email, password, fullName: 'Dev Admin', roles: ['super-admin'] }, overrideAccess: true })
  console.log(`Created dev admin ${email}`)
}
process.exit(0)
