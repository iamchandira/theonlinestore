import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

import { inCidr } from './ip'
import { execSql } from './sql'

/**
 * Chat blocks (Insights › Chat blocks), kept in memory and reloaded after any block is saved or deleted
 * (the collection hooks call bumpBlocks) or at most a minute later. Checked before Gemini is called.
 */

type Block = { id: number; type: 'ip' | 'range' | 'visitor' | 'customer'; value: string; customer: number | null; expiresAt: number | null }

const g = globalThis as { __tosChatBlocks?: { version: number; loadedVersion: number; at: number; blocks: Block[] } }
const state = (g.__tosChatBlocks ??= { version: 1, loadedVersion: 0, at: 0, blocks: [] })

export const bumpBlocks = () => {
  state.version++
}

async function load(payload: Payload) {
  if (state.loadedVersion === state.version && Date.now() - state.at < 60_000) return state.blocks
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'chat-blocks',
    where: { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }] },
    limit: 5000,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { type: true, value: true, customer: true, expiresAt: true },
  })
  state.blocks = res.docs.map((d) => ({
    id: d.id as number,
    type: d.type as Block['type'],
    value: String(d.value ?? '').toLowerCase(),
    customer: typeof d.customer === 'object' && d.customer ? (d.customer.id as number) : ((d.customer as number | null) ?? null),
    expiresAt: d.expiresAt ? new Date(d.expiresAt).getTime() : null,
  }))
  state.loadedVersion = state.version
  state.at = Date.now()
  return state.blocks
}

/** The block that applies to this shopper, if any. */
export async function findBlock(payload: Payload, who: { ip: string; visitorId: string | null; customerId: number | null }) {
  const blocks = await load(payload)
  const now = Date.now()
  return (
    blocks.find((b) => {
      if (b.expiresAt && b.expiresAt <= now) return false
      if (b.type === 'ip') return b.value === who.ip.toLowerCase()
      if (b.type === 'range') return inCidr(who.ip, b.value)
      if (b.type === 'visitor') return Boolean(who.visitorId) && b.value === who.visitorId
      return Boolean(who.customerId) && b.customer === who.customerId
    }) ?? null
  )
}

/** Counts a blocked attempt (plain SQL: no hooks, no audit entry, no cache reload). */
export async function recordBlockedAttempt(payload: Payload, blockId: number) {
  await execSql(payload, sql`UPDATE chat_blocks SET hits = COALESCE(hits, 0) + 1, last_hit_at = now() WHERE id = ${blockId}`).catch(() => {})
}

/** Automatic 24-hour IP block (Chat assistant › Limits › Automatic blocking). */
export async function autoBlockIp(payload: Payload, ip: string, conversationId: number | null, reason: string) {
  const blocks = await load(payload)
  if (blocks.some((b) => b.type === 'ip' && b.value === ip.toLowerCase())) return
  await payload.create({
    collection: 'chat-blocks',
    data: { type: 'ip', value: ip, reason, expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(), ...(conversationId ? { conversation: conversationId } : {}) },
    overrideAccess: true,
  })
}
