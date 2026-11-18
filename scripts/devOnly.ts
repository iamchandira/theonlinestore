/**
 * Seed scripts fill a database with sample or starter data. They must never touch the live store:
 * products, prices, photos and content are added in the admin. Refuses unless the database is local.
 */
export function assertLocalDatabase(script: string) {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URI ?? ''
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    /* unparseable: treat as not local */
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(host)
  if (process.env.NODE_ENV === 'production' || !local) {
    console.error(`${script} only runs against a local development database (this one is "${host || 'unknown'}"). Add products and content in the admin instead.`)
    process.exit(1)
  }
}
