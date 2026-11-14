import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Catalogue pages (Sprint 1)', () => {
  test('category page lists products and sorts by price', async ({ page }) => {
    await page.goto(`${BASE}/c/skincare/serums?sort=price-asc`)
    await expect(page.locator('h1')).toHaveText('Serums & Ampoules')
    // Read the selling price element itself (card text also contains "2 sizes", instalments, etc.)
    const prices = await page.locator('article').evaluateAll((cards) =>
      cards.map((c) => Number((c.querySelector('.tabular-nums')?.textContent?.match(/Rs\s?([\d,]+)/)?.[1] ?? '0').replace(/,/g, ''))),
    )
    expect(prices.length).toBeGreaterThan(5)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test('product page: variant from URL, change variant, add to bag', async ({ page }) => {
    await page.goto(`${BASE}/p/skin1004-madagascar-centella-ampoule?variant=TOS-012-2`)
    await expect(page.locator('h1')).toHaveText('Madagascar Centella Ampoule')
    await expect(page.getByRole('radio', { name: /100 ml/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('radio', { name: /55 ml/ }).click()
    await expect(page).toHaveURL(/variant=TOS-012-1/)
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await expect(page.getByRole('button', { name: /Open bag, 1 items/ })).toBeVisible()
    // Structured data is present
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached()
  })

  test('search results and empty categories are friendly', async ({ page }) => {
    await page.goto(`${BASE}/search?q=centella`)
    await expect(page.locator('article').first()).toBeVisible()
    // A filter with no matches shows a helpful empty state (every department has products now)
    await page.goto(`${BASE}/c/chocolates?concern=acne`)
    await expect(page.getByRole('heading', { name: /No matches for these filters/i })).toBeVisible()
  })
})

test.describe('Lifestyle catalogue (Sprint 1.5)', () => {
  test('two-option product: colour then size, sold-out size disabled', async ({ page }) => {
    await page.goto(`${BASE}/p/demo-cloud-runner-sneakers`)
    await page.getByRole('radio', { name: /^Black/ }).click()
    await expect(page.getByRole('radio', { name: /EU 38 \(sold out\)/ })).toBeDisabled()
    await page.getByRole('radio', { name: 'EU 39' }).click()
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await page.getByRole('button', { name: /Open bag, 1 items/ }).click()
    await expect(page.getByRole('dialog')).toContainText('Shoe size / Colour: EU 39 / Black')
  })

  test('gift shop spans departments and filters by recipient', async ({ page }) => {
    await page.goto(`${BASE}/gifts?recipient=for-him`)
    await expect(page.locator('h1')).toHaveText('Gifts for him')
    const brands = await page.locator('article p').evaluateAll((els) => els.map((e) => e.textContent?.trim()).filter(Boolean))
    expect(new Set(brands).size).toBeGreaterThan(1)
  })
})
