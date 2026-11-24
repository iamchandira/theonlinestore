/**
 * Bot and abuse signals for the chat log. Simple, explainable checks: each adds a reason, and a chat
 * with any reason is marked suspicious so staff can review and block it.
 */

const BOT_UA = /bot|crawl|spider|slurp|curl|wget|python|httpclient|http-client|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|headless|phantom|puppeteer|playwright|selenium|scrapy|postman|insomnia/i

export function parseDevice(ua: string) {
  if (!ua) return ''
  const os = /iphone|ipad/i.test(ua)
    ? /ipad/i.test(ua)
      ? 'iPad'
      : 'iPhone'
    : /android/i.test(ua)
      ? 'Android'
      : /windows/i.test(ua)
        ? 'Windows'
        : /mac os x|macintosh/i.test(ua)
          ? 'Mac'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Other'
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /samsungbrowser/i.test(ua)
      ? 'Samsung Internet'
      : /opr\/|opera/i.test(ua)
        ? 'Opera'
        : /firefox|fxios/i.test(ua)
          ? 'Firefox'
          : /chrome|crios/i.test(ua)
            ? 'Chrome'
            : /safari/i.test(ua)
              ? 'Safari'
              : 'Other'
  const mobile = /mobile|iphone|android/i.test(ua) && !/ipad|tablet/i.test(ua) ? 'phone' : /ipad|tablet/i.test(ua) ? 'tablet' : 'computer'
  return `${browser} on ${os} (${mobile})`
}

export type Signals = { limitHits: number; fastMessages: number; datacenter: boolean; userAgent: string }

/** Reasons this chat looks automated or abusive; empty when it looks like a real shopper. */
export function suspiciousReasons(s: Signals) {
  const reasons: string[] = []
  if (!s.userAgent) reasons.push('no browser details')
  else if (BOT_UA.test(s.userAgent)) reasons.push('automated browser or script')
  if (s.datacenter) reasons.push('hosting/datacenter network')
  if (s.limitHits >= 3) reasons.push(`hit the limits ${s.limitHits} times`)
  if (s.fastMessages >= 3) reasons.push(`${s.fastMessages} messages sent within 2 s`)
  return reasons
}
