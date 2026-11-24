import type { ChatConfig } from './config'
import { streamModel, type Content, type Part } from './gemini'
import { runTool, TOOL_DECLARATIONS, type ToolContext, type TurnEffects } from './tools'

/** Events streamed to the chat widget (one JSON object per line). */
export type ChatEvent =
  | { type: 'start'; conversationId: number }
  | { type: 'text'; delta: string }
  | { type: 'products'; slugs: string[]; title: string }
  | { type: 'replies'; options: string[] }
  | { type: 'handoff'; summary: string }
  | { type: 'bag'; items: { slug: string; sku: string | null; qty: number }[] }
  | { type: 'limit'; message: string }
  | { type: 'blocked'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done'; conversationId: number | null }

export type TurnResult = { text: string; effects: TurnEffects; usage: { input: number; output: number } }

const MAX_TOOL_ROUNDS = 4

/**
 * One shopper message → one assistant reply. Gemini may call tools up to MAX_TOOL_ROUNDS times; the last
 * round must answer in words. Text streams to the shopper as it arrives; cards, quick replies and the
 * WhatsApp button are sent once the reply is complete.
 */
export async function runTurn(opts: {
  cfg: ChatConfig
  system: string
  history: Content[]
  message: string
  extraContext?: string
  ctx: Omit<ToolContext, 'effects'>
  emit: (e: ChatEvent) => void
  signal?: AbortSignal
}): Promise<TurnResult> {
  const effects: TurnEffects = { products: null, replies: [], handoff: null, unanswered: [] }
  const ctx: ToolContext = { ...opts.ctx, effects }
  const userParts: Part[] = [...(opts.extraContext ? [{ text: opts.extraContext }] : []), { text: opts.message }]
  const contents: Content[] = [...opts.history, { role: 'user', parts: userParts }]
  const usage = { input: 0, output: 0 }
  let text = ''
  // The model that answers the first round answers the rest of the turn too (its tool-call
  // "thought signatures" belong to it); others only step in if it becomes busy
  let models = [opts.cfg.model, opts.cfg.backupModel]

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const parts: Part[] = []
    let roundUsage = { input: 0, output: 0 }
    for await (const chunk of streamModel({
      models,
      system: opts.system,
      contents,
      tools: TOOL_DECLARATIONS,
      temperature: opts.cfg.temperature,
      maxOutputTokens: opts.cfg.maxOutputTokens,
      toolMode: round === MAX_TOOL_ROUNDS ? 'none' : 'auto',
      signal: opts.signal,
    })) {
      if (chunk.text) {
        // Separate a pre-tool remark ("Let me check…") from the answer that follows it
        const delta = text && !text.endsWith('\n') && parts.every((p) => !p.text) ? `\n\n${chunk.text}` : chunk.text
        text += delta
        opts.emit({ type: 'text', delta })
      }
      parts.push(...chunk.parts)
      if (chunk.model && chunk.model !== models[0]) models = [chunk.model, ...models.filter((m) => m !== chunk.model)]
      if (chunk.usage) roundUsage = chunk.usage
    }
    usage.input += roundUsage.input
    usage.output += roundUsage.output
    const calls = parts.filter((p) => p.functionCall)
    if (parts.length) contents.push({ role: 'model', parts })
    if (!calls.length || round === MAX_TOOL_ROUNDS) break
    const responses: Part[] = []
    for (const p of calls) {
      const call = p.functionCall!
      const response = await runTool(ctx, call.name ?? '', call.args)
      responses.push({ functionResponse: { id: call.id, name: call.name, response } })
    }
    contents.push({ role: 'user', parts: responses })
  }

  // The reply points to WhatsApp but the model forgot the button: add it, with the question as context
  if (!effects.handoff && /whatsapp|වට්ස්ඇප්|வாட்ஸ்அப்/i.test(text)) effects.handoff = `Question from the website chat: “${opts.message.slice(0, 200)}”`

  // The reply admits a gap ("isn't listed on our website", "we don't have that information") but the
  // model didn't flag it: flag it, so staff see the question under "Unanswered"
  if (
    !effects.unanswered.length &&
    /(isn['’]t|is not|aren['’]t|are not|not) (yet )?(listed|available|shown|mentioned) on our (website|site|store)|don['’]t have (that|this|the|any) (information|detail|details)|don['’]t have [^.]{0,60}(listed|on our (website|site))|not (listed|available) (on our (website|site))? ?yet/i.test(text)
  )
    effects.unanswered.push(opts.message.slice(0, 200))

  if (effects.products) opts.emit({ type: 'products', ...effects.products })
  if (effects.replies.length) opts.emit({ type: 'replies', options: effects.replies })
  if (effects.handoff) opts.emit({ type: 'handoff', summary: effects.handoff })
  if (effects.bag?.length) opts.emit({ type: 'bag', items: effects.bag })
  return { text: text.trim(), effects, usage }
}
