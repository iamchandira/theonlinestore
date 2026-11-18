import { expect, test, type Page } from '@playwright/test'

import { login } from '../helpers/login'
import { cleanupTestUser, makeTestUser, seedTestUser } from '../helpers/seedUser'

const testUser = makeTestUser('custom-admin')

const BASE = 'http://localhost:3000'

/** Sprint 1.5 custom admin: dashboard, products list, inventory stock adjustment (reverted afterwards). */
test.describe('Custom admin', () => {
  let page: Page
  test.beforeAll(async ({ browser }) => {
    await seedTestUser(testUser)
    page = await (await browser.newContext()).newPage()
    await login({ page, user: testUser })
  })
  test.afterAll(async () => {
    await cleanupTestUser(testUser)
  })

  test('dashboard shows KPIs, launch checklist and the custom sidebar', async () => {
    await page.goto(`${BASE}/admin`)
    await expect(page.locator('.tos-hello h1')).toContainText(/Good (morning|afternoon|evening)/)
    await expect(page.locator('.tos-kpi')).toHaveCount(6) // incl. "Reviews waiting" (Sprint 2); no demo KPI since launch prep
    await expect(page.getByRole('heading', { name: 'Launch checklist' })).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin"]')).toContainText('Inventory')
  })

  test('products list filters by tab and type', async () => {
    await page.goto(`${BASE}/admin/collections/products?type=footwear`)
    await expect(page.locator('.tos-page__title')).toHaveText('Products')
    const rows = page.locator('.tos-table tbody tr')
    await expect(rows).toHaveCount(5)
  })

  test('inventory: change stock with a reason, see it in history, then revert', async () => {
    const api = async (path: string, init?: RequestInit) => page.evaluate(async ([p, i]) => (await fetch(p as string, { credentials: 'include', ...(i as RequestInit) })).json(), [path, init] as const)
    const doc = (await api('/api/products?where[slug][equals]=demo-dark-chocolate-70-bar&depth=0&draft=true')).docs[0]
    const sku = doc.variants[0].sku as string
    const before = doc.variants[0].stock as number

    await page.goto(`${BASE}/admin/inventory`)
    await page.getByLabel('Search inventory').fill(sku)
    await page.getByLabel(/^Stock for Single-Origin Dark Chocolate 70%/).fill(String(before + 5))
    await page.getByLabel('Note').fill('E2E restock')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.tos-toast')).toContainText('Saved 1 change')

    const moves = await api(`/api/stock-movements?where[sku][equals]=${sku}&sort=-createdAt&limit=1&depth=0`)
    expect(moves.docs[0].change).toBe(5)
    expect(moves.docs[0].reason).toBe('restock')
    expect(moves.docs[0].note).toBe('E2E restock')

    // revert
    await api('/api/products/adjust-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: doc.id, changes: [{ sku, stock: before }], reason: 'count', note: 'E2E revert' }),
    })
  })

  test('Payload screens use the TOS design (eyebrow, card toolbar, primary Create)', async () => {
    await page.goto(`${BASE}/admin/collections/categories`)
    const eyebrow = await page.locator('.list-header').evaluate((el) => getComputedStyle(el, '::before').content)
    expect(eyebrow).toBe('"Catalogue"')
    await expect(page.locator('.list-controls')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.list-create-new-doc__create-new-button')).toHaveCSS('background-color', 'rgb(217, 57, 10)')
  })

  test('sidebar collapse is remembered on laptops and reopens from the menu button', async ({ browser }) => {
    // Fresh login + two reloads: give it room when the whole suite shares one dev server
    test.setTimeout(180_000)
    // Fresh context so the preference change can't leak into the tests above
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await ctx.newPage()
    await login({ page: p, user: testUser })
    const isOpen = () => p.locator('.template-default').evaluate((el) => el.classList.contains('template-default--nav-open'))
    // The stored sidebar preference (what a reload will use)
    const savedOpen = () => p.evaluate(async () => ((await (await fetch('/api/payload-preferences/nav', { credentials: 'include' })).json()) as { value?: { open?: boolean } }).value?.open)

    await p.goto(`${BASE}/admin/collections/tags`)
    await expect.poll(isOpen).toBe(true) // open by default on a 1280px laptop (Payload alone would close it)
    await expect(p.locator('.template-default__nav-toggler-wrapper')).toBeHidden() // no stray toggle over the logo

    await expect(p.locator('aside.nav--nav-hydrated')).toBeAttached() // interactive before we click
    await p.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect.poll(isOpen).toBe(false)
    await expect.poll(savedOpen, { timeout: 30_000 }).toBe(false) // stored before reloading
    await p.reload()
    await expect.poll(isOpen).toBe(false)

    await p.locator('.template-default__nav-toggler').click()
    await expect.poll(isOpen).toBe(true)
    await expect.poll(savedOpen, { timeout: 30_000 }).toBe(true)
    await p.reload()
    await expect.poll(isOpen).toBe(true)
    await ctx.close()
  })
})
