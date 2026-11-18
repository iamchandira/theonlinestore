// After `next build` (output: 'standalone'): the self-contained server needs the public folder and the
// static assets next to it. Runs as part of `pnpm build`.
import { cpSync, existsSync, mkdirSync } from 'node:fs'

if (existsSync('.next/standalone')) {
  cpSync('public', '.next/standalone/public', { recursive: true })
  mkdirSync('.next/standalone/.next', { recursive: true })
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })
  console.log('✓ standalone server ready: node .next/standalone/server.js')
}
