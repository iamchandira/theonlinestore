import { expect, test, type Page } from '@playwright/test'

import { login } from '../helpers/login'
import { cleanupTestUser, makeTestUser, seedTestUser } from '../helpers/seedUser'

const BASE = 'http://localhost:3000'
const testUser = makeTestUser('discovery')

/** Sprint 2 "Find it fast": search, filters, wishlist, recently viewed, reviews, CSV import. */
test.describe('Discovery (Sprint 2)', () => {
  test('search corrects a typo in the dropdown and on the results page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(BASE)
    const box = page.getByRole('combobox', { name: /search products/i })
    await box.fill('cervae')
    await expect(page.getByRole('listbox')).toContainText('Showing results for cerave')
    await expect(page.getByRole('option').first()).toContainText(/CeraVe/i)
    await box.press('Enter')
    await page.waitForURL(/\/search\?q=cervae/)
    await expect(page.getByText(/No exact matches for “cervae”\. Showing results for/)).toBeVisible()
    await expect(page.locator('section[aria-label$="products"] article').first()).toContainText(/CeraVe/i)
  })

  test('desktop filters update the results and the URL; back restores them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE}/c/skincare`)
    const count = page.locator('p[aria-live="polite"]').first()
    await expect(count).toContainText(/of \d+ products/)
    const before = await count.innerText()
    // The visible box is a styled label; the native checkbox underneath is visually hidden
    await page.getByRole('complementary', { name: 'Filters' }).getByRole('checkbox', { name: /CeraVe/ }).check({ force: true })
    await page.waitForURL(/brand=cerave/)
    await expect(count).not.toHaveText(before)
    await expect(page.getByRole('link', { name: 'Remove filter: CeraVe' })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(`${BASE}/c/skincare`)
    await expect(count).toHaveText(before)
  })

  test('wishlist and recently viewed work without an account', async ({ page }) => {
    await page.goto(`${BASE}/p/demo-velvet-jasmine-edp`)
    await page.getByRole('button', { name: /save to wishlist|add to wishlist/i }).first().click()
    await page.goto(`${BASE}/p/demo-cloud-runner-sneakers`)
    await expect(page.getByRole('heading', { name: 'Recently viewed' })).toBeVisible()
    await expect(page.locator('#recently-viewed').locator('xpath=ancestor::section[1]')).toContainText('Velvet Jasmine')
    await page.goto(`${BASE}/wishlist`)
    await expect(page.getByRole('heading', { name: 'Your wishlist' })).toBeVisible()
    await expect(page.getByLabel('Wishlist products')).toContainText('Velvet Jasmine')
    // A shared list can be saved in one tap
    await page.goto(`${BASE}/wishlist?items=demo-cloud-runner-sneakers`)
    await page.getByRole('button', { name: 'Save all to my wishlist' }).click()
    await expect(page.getByRole('button', { name: 'Saved to your wishlist' })).toBeDisabled()
  })
})

test.describe('Reviews and import (Sprint 2, admin)', () => {
  let admin: Page
  const title = `E2E review ${Date.now()}`
  test.beforeAll(async ({ browser }) => {
    await seedTestUser(testUser)
    admin = await (await browser.newContext()).newPage()
    await login({ page: admin, user: testUser })
  })
  test.afterAll(async () => {
    // Remove the test review (its approval changed the demo product's rating; deleting restores it)
    const res = await admin.request.get(`${BASE}/api/reviews?where[title][equals]=${encodeURIComponent(title)}&depth=0`)
    for (const r of (await res.json()).docs ?? []) await admin.request.delete(`${BASE}/api/reviews/${r.id}`, { headers: { origin: BASE } })
    await cleanupTestUser(testUser)
  })

  test('a shopper review is held for moderation, then published when approved', async ({ page }) => {
    await page.goto(`${BASE}/p/demo-pearl-strap-flats#reviews`)
    await page.getByRole('button', { name: 'Write a review' }).first().click()
    const form = page.getByRole('dialog')
    await form.locator('label', { has: page.getByRole('radio', { name: '4 stars' }) }).click() // click the star, as a shopper would
    await form.getByLabel('Headline').fill(title)
    await form.getByLabel('Your review').fill('Comfortable from the first wear, true to size.')
    await form.getByLabel('Name to show').fill('E2E Tester')
    await form.getByLabel(/^Email/).fill('e2e@example.com')
    await form.getByRole('button', { name: 'Submit review' }).click()
    await expect(form.getByText('Your review is on its way')).toBeVisible()

    // Not public yet
    await page.goto(`${BASE}/p/demo-pearl-strap-flats`)
    await expect(page.locator('#reviews')).not.toContainText(title)

    // Approve it from the moderation screen
    await admin.goto(`${BASE}/admin/collections/reviews`)
    const row = admin.locator('tr', { hasText: title })
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect(admin.locator('.tos-toast')).toContainText('Published 1 review')

    await page.reload()
    await expect(page.locator('#reviews')).toContainText(title)
    await expect(page.locator('#reviews')).not.toContainText('e2e@example.com')
  })

  test('CSV import previews changes and catches unknown SKUs without saving', async () => {
    await admin.goto(`${BASE}/admin/import-export`)
    await admin.locator('input[type=file]').setInputFiles({
      name: 'prices.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('sku,price\nDEMO-01-01,7100\nNOT-A-SKU,100\n'),
    })
    await expect(admin.locator('.tos-alert')).toContainText('1 change')
    await expect(admin.locator('.tos-table')).toContainText('Unknown SKU')
    await expect(admin.locator('.tos-table')).toContainText('Price')
    await admin.getByRole('button', { name: 'Cancel' }).click()
    await expect(admin.getByText('Drop a CSV here, or choose a file')).toBeVisible()
  })
})
