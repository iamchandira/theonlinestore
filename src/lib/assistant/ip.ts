/**
 * IP address helpers for chat blocks: parse IPv4/IPv6, match CIDR ranges. Pure functions (safe in
 * collection configs and tests).
 */

/** IPv4 or IPv6 → [bits, version], or null. IPv4-mapped IPv6 (::ffff:1.2.3.4) is treated as IPv4. */
export function parseIp(raw: string): { value: bigint; v: 4 | 6 } | null {
  const ip = raw.trim().toLowerCase().replace(/^\[|\]$/g, '')
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return parseIp(mapped[1])
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split('.').map(Number)
    if (parts.some((n) => n > 255)) return null
    return { value: parts.reduce((acc, n) => (acc << 8n) | BigInt(n), 0n), v: 4 }
  }
  if (!ip.includes(':') || !/^[0-9a-f:.]+$/.test(ip)) return null
  // Expand "::" and an embedded IPv4 tail
  let groups: string[]
  const tail4 = ip.match(/(\d+\.\d+\.\d+\.\d+)$/)
  let src = ip
  if (tail4) {
    const v4 = parseIp(tail4[1])
    if (!v4) return null
    src = ip.slice(0, -tail4[1].length) + ((v4.value >> 16n) & 0xffffn).toString(16) + ':' + (v4.value & 0xffffn).toString(16)
  }
  const halves = src.split('::')
  if (halves.length > 2) return null
  if (halves.length === 2) {
    const head = halves[0] ? halves[0].split(':') : []
    const rest = halves[1] ? halves[1].split(':') : []
    const fill = 8 - head.length - rest.length
    if (fill < 1) return null
    groups = [...head, ...Array(fill).fill('0'), ...rest]
  } else groups = src.split(':')
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return { value: groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n), v: 6 }
}

export const isIp = (raw: string) => parseIp(raw) !== null

/** "203.0.113.0/24" or "2001:db8::/32" → network and prefix, or null. */
export function parseCidr(raw: string): { net: bigint; bits: number; v: 4 | 6 } | null {
  const [addr, prefix] = raw.trim().split('/')
  const ip = parseIp(addr ?? '')
  const bits = Number(prefix)
  if (!ip || prefix === undefined || !/^\d+$/.test(prefix)) return null
  const max = ip.v === 4 ? 32 : 128
  if (bits < (ip.v === 4 ? 8 : 7) || bits > max) return null
  const mask = ((1n << BigInt(bits)) - 1n) << BigInt(max - bits)
  return { net: ip.value & mask, bits, v: ip.v }
}

export function inCidr(rawIp: string, cidr: string) {
  const ip = parseIp(rawIp)
  const c = parseCidr(cidr)
  if (!ip || !c || ip.v !== c.v) return false
  const max = c.v === 4 ? 32 : 128
  const mask = ((1n << BigInt(c.bits)) - 1n) << BigInt(max - c.bits)
  return (ip.value & mask) === c.net
}

/** The /24 (IPv4) or /64 (IPv6) range around an address, for "Block IP range". */
export function rangeOf(rawIp: string) {
  const ip = parseIp(rawIp)
  if (!ip) return null
  if (ip.v === 4) {
    const net = ip.value & ~0xffn
    return `${[24n, 16n, 8n].map((s) => String((net >> s) & 0xffn)).join('.')}.0/24`
  }
  const net = ip.value >> 64n
  const groups = [48n, 32n, 16n, 0n].map((s) => ((net >> s) & 0xffffn).toString(16))
  return `${groups.join(':')}::/64`
}

/** Private, loopback and link-local addresses (no location lookup). */
export function isPrivateIp(rawIp: string) {
  const ip = parseIp(rawIp)
  if (!ip) return true
  if (ip.v === 4) return ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '169.254.0.0/16', '100.64.0.0/10'].some((c) => inCidr(rawIp, c))
  return ip.value === 1n || ['fc00::/7', 'fe80::/10'].some((c) => inCidr(rawIp, c))
}
