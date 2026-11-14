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
    await expect(page.locator('.tos-kpi')).toHaveCount(6)
    await expect(page.getByRole('heading', { name: 'Launch checklist' })).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin"]')).toContainText('Inventory')
  })

  test('products list filters by tab and type', async () => {
    await page.goto(`${BASE}/admin/collections/products?tab=demo&type=footwear`)
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
})
