import fs from 'node:fs'
import path from 'node:path'

import type { AsnResponse, CityResponse, Reader } from 'maxmind'

import { isPrivateIp } from './ip'

/**
 * Offline IP location for the chat log: DB-IP "IP to City Lite" and "IP to ASN Lite" (CC BY 4.0,
 * https://db-ip.com), downloaded by scripts/update-geoip.mjs into GEOIP_DIR. No visitor IP is sent to a
 * third party. Without the files, every lookup is empty and nothing breaks.
 */

export type GeoInfo = { country: string; countryCode: string; region: string; city: string; asn: number | null; asnOrg: string; datacenter: boolean }

const EMPTY: GeoInfo = { country: '', countryCode: '', region: '', city: '', asn: null, asnOrg: '', datacenter: false }

export const geoDir = () => process.env.GEOIP_DIR?.trim() || path.resolve(process.cwd(), '.geoip')

type Readers = { city: Reader<CityResponse> | null; asn: Reader<AsnResponse> | null; at: number }
const g = globalThis as { __tosGeo?: Promise<Readers> }

async function readers(): Promise<Readers> {
  const cached = await g.__tosGeo
  // Re-open once a day so a monthly refresh is picked up without a restart
  if (cached && Date.now() - cached.at < 24 * 3600_000) return cached
  g.__tosGeo = (async () => {
    const { default: maxmind } = await import('maxmind')
    const open = async <T extends CityResponse | AsnResponse>(file: string) => {
      const p = path.join(geoDir(), file)
      if (!fs.existsSync(p)) return null
      return maxmind.open<T>(p).catch(() => null)
    }
    const [city, asn] = await Promise.all([open<CityResponse>('dbip-city-lite.mmdb'), open<AsnResponse>('dbip-asn-lite.mmdb')])
    return { city, asn, at: Date.now() }
  })()
  return g.__tosGeo
}

// Networks of hosting providers and clouds: real shoppers rarely browse from these, bots often do
const DATACENTER =
  /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|hetzner|ovh|linode|akamai|vultr|choopa|contabo|hostinger|oracle|alibaba|tencent|leaseweb|m247|scaleway|cloudflare|fastly|datacamp|hostwinds|kamatera|ionos|godaddy|namecheap|hosting|datacenter|data center|server|vps|colo/i

export async function lookupIp(ip: string): Promise<GeoInfo> {
  if (!ip || isPrivateIp(ip)) return EMPTY
  try {
    const r = await readers()
    const c = r.city?.get(ip) ?? null
    const a = r.asn?.get(ip) ?? null
    const org = a?.autonomous_system_organization ?? ''
    return {
      country: c?.country?.names?.en ?? '',
      countryCode: c?.country?.iso_code ?? '',
      region: c?.subdivisions?.[0]?.names?.en ?? '',
      city: c?.city?.names?.en ?? '',
      asn: a?.autonomous_system_number ?? null,
      asnOrg: org,
      datacenter: Boolean(org && DATACENTER.test(org)),
    }
  } catch {
    return EMPTY
  }
}

export const locationText = (g: GeoInfo) => [g.city, g.region, g.countryCode || g.country].filter(Boolean).join(', ')
export const networkText = (g: GeoInfo) => (g.asn ? `AS${g.asn}${g.asnOrg ? ` ${g.asnOrg}` : ''}` : '')
