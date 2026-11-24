/**
 * Gemini over its REST API (https://ai.google.dev/api/generate-content), streamed as server-sent events.
 * Plain fetch, no SDK: the official SDK hung inside the Next.js production build. The rest of the assistant
 * only sees `streamModel`, so tests can replace it. The key comes from GEMINI_API_KEY on the server.
 */

/** A piece of a message: text, a tool call from the model, or a tool result. Other fields (e.g. the
 *  model's thoughtSignature) are passed back to Gemini untouched. */
export type Part = {
  text?: string
  thought?: boolean
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> }
  functionResponse?: { id?: string; name?: string; response?: Record<string, unknown> }
  [key: string]: unknown
}
export type Content = { role: 'user' | 'model'; parts: Part[] }

export type ModelChunk = { text: string; parts: Part[]; usage?: { input: number; output: number }; model: string }

export type ModelRequest = {
  /** Tried in order: when Google is busy (429/5xx/timeout) before the reply starts, the next one answers */
  models: string[]
  system: string
  contents: Content[]
  tools: readonly { name: string; description: string; parametersJsonSchema: unknown }[]
  temperature: number
  maxOutputTokens: number
  /** 'none' forces a plain answer (used after the last tool round) */
  toolMode?: 'auto' | 'none'
  signal?: AbortSignal
}

const API = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Time allowed for Google to start answering (not for the whole reply) */
const CONNECT_TIMEOUT = 40_000

type Chunk = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** CHAT_DEBUG=1 logs which model answered and how long Google took (no message text). */
const debug = (msg: string) => {
  if (process.env.CHAT_DEBUG === '1') console.info(`[assistant] ${msg}`)
}

const busy = (status: number) => status === 0 || status === 408 || status === 429 || status >= 500

// A model that just said it was busy is skipped for a couple of minutes (while another model can answer)
const COOLDOWN = 2 * 60_000
const g = globalThis as { __tosGeminiBusy?: Map<string, number> }
const busyUntil = (g.__tosGeminiBusy ??= new Map())

async function open(model: string, req: ModelRequest, key: string): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONNECT_TIMEOUT)
  const onAbort = () => ctrl.abort()
  req.signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(`${API}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.contents,
        tools: [{ functionDeclarations: req.tools }],
        toolConfig: { functionCallingConfig: { mode: req.toolMode === 'none' ? 'NONE' : 'AUTO' } },
        generationConfig: { temperature: req.temperature, maxOutputTokens: req.maxOutputTokens },
      }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new GeminiError(`Gemini ${model}: ${res.status} ${detail.slice(0, 300)}`, res.status)
    }
    return res
  } catch (e) {
    if (e instanceof GeminiError) throw e
    // Timeout or network failure: treat like "busy" so the backup model gets a go
    throw new GeminiError(`Gemini ${model}: ${e instanceof Error ? e.message : 'network error'}`, 0)
  } finally {
    clearTimeout(timer)
    req.signal?.removeEventListener('abort', onAbort)
  }
}

export async function* streamModel(req: ModelRequest): AsyncGenerator<ModelChunk> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new GeminiError('GEMINI_API_KEY is not set', 401)
  const unique = [...new Set(req.models.filter(Boolean))]
  const now = Date.now()
  const ready = unique.filter((m) => (busyUntil.get(m) ?? 0) <= now)
  const models = ready.length ? [...ready, ...unique.filter((m) => !ready.includes(m))] : unique
  let res: Response | null = null
  let answered = ''
  let lastError: unknown
  // Main model, then the backup straight away; then one more round after a short pause. Busy errors
  // arrive before any text, so the shopper only notices a slightly slower start.
  for (const [i, model] of [...models, ...models].entries()) {
    if (i === models.length) await new Promise((r) => setTimeout(r, 1000))
    const t0 = Date.now()
    try {
      res = await open(model, req, key)
      answered = model
      busyUntil.delete(model)
      debug(`${model}: answering after ${Date.now() - t0} ms`)
      break
    } catch (e) {
      const status = e instanceof GeminiError ? e.status : 0
      debug(`${model}: ${status || 'no answer'} after ${Date.now() - t0} ms`)
      lastError = e
      if (!busy(status)) throw e
      if (models.length > 1) busyUntil.set(model, Date.now() + COOLDOWN)
    }
  }
  if (!res?.body) throw lastError

  // Server-sent events: "data: {json}" lines separated by blank lines
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    // At the end, a last event without the closing blank line still counts
    buffer += done ? '\n\n' : decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const event = buffer.slice(0, sep)
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, '')
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('')
      if (!data) continue
      let chunk: Chunk
      try {
        chunk = JSON.parse(data) as Chunk
      } catch {
        continue
      }
      const parts = chunk.candidates?.[0]?.content?.parts ?? []
      const finish = chunk.candidates?.[0]?.finishReason
      if (finish && finish !== 'STOP') debug(`${answered}: reply ended with ${finish}`)
      const text = parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')
      const u = chunk.usageMetadata
      yield {
        text,
        parts,
        usage: u ? { input: u.promptTokenCount ?? 0, output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) } : undefined,
        model: answered,
      }
    }
    if (done) break
  }
}
