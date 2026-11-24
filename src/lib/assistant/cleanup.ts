import type { Payload } from 'payload'

import { loadChatConfig } from './config'

/** Deletes chats older than the retention period (Chat assistant › Model & privacy) and long-expired blocks. */
export async function cleanupChats(payload: Payload) {
  const cfg = await loadChatConfig(payload)
  const before = new Date(Date.now() - cfg.retentionDays * 24 * 3600_000).toISOString()
  const chats = await payload.delete({ collection: 'chat-conversations', where: { createdAt: { less_than: before } }, overrideAccess: true })
  const expired = new Date(Date.now() - 90 * 24 * 3600_000).toISOString()
  await payload.delete({ collection: 'chat-blocks', where: { expiresAt: { less_than: expired } }, overrideAccess: true })
  return chats.docs.length
}
