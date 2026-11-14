import { expect, test } from '@playwright/test'

test.describe('Storefront', () => {
  test('home page renders the brand shell and hero', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/The Online Store/)
    await expect(page.locator('h1').first()).toContainText('Beauty, gifts')
    await expect(page.getByRole('search').first()).toBeVisible()
  })

  test('quick add puts a product in the bag', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.getByRole('button', { name: /^Add .* to bag$/ }).first().click()
    await page.getByRole('button', { name: /Open bag, 1 items/ }).click()
    await expect(page.getByRole('dialog')).toContainText('Your bag')
  })
})
