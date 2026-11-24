import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

import { allow } from '../server/rateLimit'
import type { ChatConfig } from './config'
import { execSql } from './sql'

/**
 * Chat usage limits (Admin › Settings › Chat assistant › Limits).
 * Per shopper and per IP: in memory (resets on restart, which is fine for burst protection).
 * Store-wide daily cap: counted from the conversation log, so restarts don't reset the bill.
 */

export const colomboDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(d)

export type LimitResult = { ok: true } | { ok: false; reason: 'hour' | 'day' | 'store' | 'chat'; message: string }

const HOUR = 3600_000
const DAY = 24 * HOUR

// Daily total, cached briefly and bumped locally between reads
const g = globalThis as { __tosChatDaily?: { day: string; count: number; at: number } }

async function usedToday(payload: Payload) {
  const day = colomboDay()
  const c = g.__tosChatDaily
  if (c && c.day === day && Date.now() - c.at < 30_000) return c.count
  const res = await execSql<{ n: number }>(payload, sql`SELECT COALESCE(SUM(message_count), 0)::int AS n FROM chat_conversations WHERE day = ${day}`)
  const count = Number(res.rows?.[0]?.n ?? 0)
  g.__tosChatDaily = { day, count, at: Date.now() }
  return count
}

/** Call after a message is counted, so the cached daily total stays close between reads. */
export function countMessage() {
  if (g.__tosChatDaily) g.__tosChatDaily.count++
}

export async function checkLimits(
  payload: Payload,
  cfg: ChatConfig,
  who: { visitorId: string; ip: string },
  chatMessages: number,
): Promise<LimitResult> {
  const l = cfg.limits
  if (chatMessages >= l.perConversation)
    return { ok: false, reason: 'chat', message: 'This chat has reached its length limit. Start a new chat to keep going.' }
  if ((await usedToday(payload)) >= l.dailyCap)
    return { ok: false, reason: 'store', message: 'The assistant is resting for today. Message us on WhatsApp and a person will help you.' }
  const m = l.ipMultiplier
  const hourOk = allow(`chat:h:v:${who.visitorId}`, l.perHour, HOUR) && allow(`chat:h:ip:${who.ip}`, l.perHour * m, HOUR)
  if (!hourOk) return { ok: false, reason: 'hour', message: 'You’ve sent a lot of messages in the last hour. Please try again a little later, or message us on WhatsApp.' }
  const dayOk = allow(`chat:d:v:${who.visitorId}`, l.perDay, DAY) && allow(`chat:d:ip:${who.ip}`, l.perDay * m, DAY)
  if (!dayOk) return { ok: false, reason: 'day', message: 'You’ve reached today’s chat limit. Message us on WhatsApp and we’ll help you.' }
  return { ok: true }
}

/** Limit hits per IP within the last hour (for automatic blocking). */
export function limitHitBurst(ip: string, threshold: number) {
  // allow() returns false once `threshold` hits are recorded in the window
  return !allow(`chat:hits:${ip}`, threshold - 1, HOUR)
}
