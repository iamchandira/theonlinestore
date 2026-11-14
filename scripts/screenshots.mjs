/**
 * Visual QA: full-page screenshots of storefront routes at desktop and mobile widths.
 * Usage: node scripts/screenshots.mjs <outDir> [path ...]   (dev server must be running on :3000)
 */
import { chromium } from '@playwright/test'

const [outDir = 'screenshots', ...paths] = process.argv.slice(2)
const routes = paths.length ? paths : ['/']
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
]

const browser = await chromium.launch()
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${vp.name}] pageerror:`, e.message))
  page.on('console', (m) => m.type() === 'error' && console.log(`[${vp.name}] console:`, m.text()))
  for (const route of routes) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    // scroll through so whileInView / ScrollTrigger content reveals
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto'
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 180)) }
      await new Promise((r) => setTimeout(r, 800))
      window.scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 800))
    })
    const name = `${vp.name}${route.replace(/\//g, '_') || '_home'}`
    await page.screenshot({ path: `${outDir}/${name}-top.png` })
    await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true })
    console.log('saved', name)
  }
  await ctx.close()
}
await browser.close()
