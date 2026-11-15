/**
 * Reads emails from the local Mailpit inbox (docker compose service, http://localhost:8026).
 * Used by account e2e tests to follow verification and password-reset links.
 */
const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8026'

type Summary = { ID: string; Subject: string; Created: string }

export async function latestEmail(to: string, subjectIncludes: string, timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=20`)
    const json = (await res.json()) as { messages?: Summary[] }
    const hit = (json.messages ?? []).find((m) => m.Subject.includes(subjectIncludes))
    if (hit) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { HTML: string; Subject: string }
      return msg
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No "${subjectIncludes}" email for ${to} within ${timeoutMs} ms`)
}

/** First link in the email whose URL contains `pathPart` (HTML entities decoded). */
export const linkIn = (html: string, pathPart: string) => {
  const m = html.match(new RegExp(`href="([^"]*${pathPart.replace(/[/?]/g, '\\$&')}[^"]*)"`))
  if (!m) throw new Error(`No link containing ${pathPart}`)
  return m[1].replace(/&amp;/g, '&')
}

export async function clearInbox(to: string) {
  await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`, { method: 'DELETE' }).catch(() => {})
}
