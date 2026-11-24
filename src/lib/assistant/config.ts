import type { Payload } from 'payload'

import type { ChatSetting } from '@/payload-types'

import { DEFAULT_GREETING } from '../../globals/ChatSettings'

/** Chat assistant settings with defaults filled in (Admin › Settings › Chat assistant). */
export type ChatConfig = {
  enabled: boolean
  botName: string
  tagline: string
  greeting: string
  starters: string[]
  tone: string
  faqs: { question: string; answer: string }[]
  notes: string
  model: string
  backupModel: string
  temperature: number
  maxOutputTokens: number
  limits: { perHour: number; perDay: number; perConversation: number; maxLength: number; ipMultiplier: number; dailyCap: number; autoBlock: boolean; autoBlockThreshold: number }
  retentionDays: number
}

/** True when the server has a Gemini key. The key itself never leaves the server. */
export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim())

export async function loadChatConfig(payload: Payload): Promise<ChatConfig> {
  const s = (await payload.findGlobal({ slug: 'chat-settings', depth: 0, overrideAccess: true }).catch(() => ({}))) as Partial<ChatSetting>
  return {
    enabled: s.enabled !== false,
    botName: s.botName || 'TOS Assistant',
    tagline: s.tagline ?? 'Usually replies instantly',
    greeting: s.greeting || DEFAULT_GREETING,
    starters: (s.starters ?? []).map((x) => x.text).filter(Boolean).slice(0, 6) as string[],
    tone: s.tone ?? '',
    faqs: (s.faqs ?? []).filter((f) => f.title && f.answer).map((f) => ({ question: f.title, answer: f.answer })),
    notes: s.notes ?? '',
    model: s.model?.trim() || 'gemini-flash-latest',
    backupModel: s.backupModel?.trim() ?? 'gemini-flash-lite-latest',
    temperature: s.temperature ?? 0.4,
    maxOutputTokens: s.maxOutputTokens ?? 1200,
    limits: {
      perHour: s.perHour ?? 20,
      perDay: s.perDay ?? 60,
      perConversation: s.perConversation ?? 40,
      maxLength: s.maxLength ?? 500,
      ipMultiplier: s.ipMultiplier ?? 5,
      dailyCap: s.dailyCap ?? 2000,
      autoBlock: Boolean(s.autoBlock),
      autoBlockThreshold: s.autoBlockThreshold ?? 5,
    },
    retentionDays: s.retentionDays ?? 90,
  }
}
