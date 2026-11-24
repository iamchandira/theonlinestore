import type { Payload } from 'payload'
import type { sql } from '@payloadcms/db-postgres'

/** Raw SQL through Payload's Postgres connection (for counters that shouldn't run hooks). */
export function execSql<Row = Record<string, unknown>>(payload: Payload, query: ReturnType<typeof sql>) {
  const db = (payload.db as unknown as { drizzle: { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Row[] }> } }).drizzle
  return db.execute(query)
}
