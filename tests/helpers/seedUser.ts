import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/** A separate admin test user per spec file, so parallel specs never delete each other's account. */
export const makeTestUser = (name: string) => ({
  email: `e2e-${name}@theonlinestore.test`,
  password: 'e2e-test-password',
  roles: ['admin' as const],
})

export const testUser = {
  email: 'e2e-admin@theonlinestore.test',
  password: 'e2e-test-password',
  roles: ['admin' as const],
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(user: { email: string; password: string; roles: 'admin'[] } = testUser): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: user.email,
      },
    },
  })

  // Create fresh test user *as the seeded super-admin*: the Users hook only lets admins grant staff roles
  // (public sign-ups are always customers), so the admin must be the acting user. Run `pnpm seed:admin` first.
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'super-admin' } }, limit: 1, depth: 0 })
  if (!admins.docs[0]) throw new Error('No super-admin found. Run `pnpm seed:admin` first.')
  await payload.create({
    collection: 'users',
    data: user,
    user: admins.docs[0],
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(user: { email: string } = testUser): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: user.email,
      },
    },
  })
}

/** Deletes any user with this email (storefront test customers). */
export async function deleteUserByEmail(email: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true })
}
