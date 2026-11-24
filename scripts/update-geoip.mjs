#!/usr/bin/env node
/**
 * Downloads the free DB-IP "IP to City Lite" and "IP to ASN Lite" databases (CC BY 4.0, https://db-ip.com)
 * used to show where shopping-assistant chats come from. Files go to GEOIP_DIR (default ./.geoip; on the
 * server /srv/theonlinestore/geoip). Skips files newer than 30 days unless --force. DB-IP publishes a new
 * edition each month; if this month's isn't out yet, last month's is used.
 *
 *   node scripts/update-geoip.mjs [--force]
 */
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

const dir = process.env.GEOIP_DIR?.trim() || path.resolve(process.cwd(), '.geoip')
const force = process.argv.includes('--force')
const MAX_AGE = 30 * 24 * 3600_000

const month = (offset) => {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - offset)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function fetchEdition(name, file) {
  const target = path.join(dir, file)
  if (!force && fs.existsSync(target) && Date.now() - fs.statSync(target).mtimeMs < MAX_AGE) {
    console.log(`✓ ${file} is up to date`)
    return
  }
  for (const m of [month(0), month(1)]) {
    const url = `https://download.db-ip.com/free/${name}-${m}.mmdb.gz`
    const res = await fetch(url).catch(() => null)
    if (!res?.ok || !res.body) continue
    const tmp = `${target}.download`
    await pipeline(Readable.fromWeb(res.body), createGunzip(), fs.createWriteStream(tmp))
    // A valid MaxMind DB ends with its metadata marker
    const size = fs.statSync(tmp).size
    const tail = Buffer.alloc(Math.min(size, 128 * 1024))
    const fd = fs.openSync(tmp, 'r')
    fs.readSync(fd, tail, 0, tail.length, size - tail.length)
    fs.closeSync(fd)
    if (!tail.includes(Buffer.from('\xab\xcd\xefMaxMind.com', 'latin1'))) {
      fs.rmSync(tmp, { force: true })
      throw new Error(`${url} is not a valid database`)
    }
    fs.renameSync(tmp, target)
    console.log(`✓ ${file} updated (${m}, ${(fs.statSync(target).size / 1e6).toFixed(0)} MB)`)
    return
  }
  throw new Error(`Couldn't download ${name}`)
}

fs.mkdirSync(dir, { recursive: true })
let failed = false
for (const [name, file] of [
  ['dbip-city-lite', 'dbip-city-lite.mmdb'],
  ['dbip-asn-lite', 'dbip-asn-lite.mmdb'],
]) {
  try {
    await fetchEdition(name, file)
  } catch (e) {
    failed = true
    console.error(`✗ ${e.message}. Chat locations stay empty until this works.`)
  }
}
process.exit(failed ? 1 : 0)
