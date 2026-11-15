import type { PayloadRequest } from 'payload'

import { clientIp } from '../server/rateLimit'

/**
 * Audit log (TOS-402): records sensitive actions (role changes, price changes, deletions, review
 * moderation, account deletion requests, content changes). Written with the request's transaction,
 * so a rolled-back change leaves no log entry. Never throws: auditing must not block the action.
 */
export type AuditAction = 'role-change' | 'staff-created' | 'price-change' | 'delete' | 'review-moderation' | 'deletion-request' | 'content-change' | 'csv-import'

/** afterDelete hook: logs the deletion of any document (TOS-402). */
export const auditDelete =
  (collection: string, title: (doc: Record<string, unknown>) => string) =>
  async ({ doc, req }: { doc: Record<string, unknown>; req: PayloadRequest }) => {
    await audit(req, { action: 'delete', collection, docId: doc.id as string, summary: `${collection}: “${title(doc)}” deleted` })
    return doc
  }

export async function audit(
  req: PayloadRequest,
  entry: { action: AuditAction; collection: string; docId?: string | number | null; summary: string; changes?: unknown },
) {
  try {
    const ip = req.headers ? clientIp(req.headers) : undefined
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        action: entry.action,
        resource: entry.collection,
        docId: entry.docId != null ? String(entry.docId) : undefined,
        summary: entry.summary.slice(0, 300),
        changes: (entry.changes ?? null) as never,
        user: req.user?.collection === 'users' ? req.user.id : undefined,
        userEmail: (req.user as { email?: string } | null)?.email,
        ip,
      },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err }, 'Audit log: could not record entry')
  }
}
