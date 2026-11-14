import { expect, test } from '@playwright/test'

test.describe('Storefront', () => {
  test('smooth scrolling is on for desktop and off for reduced motion', async ({ browser }) => {
    const desktop = await browser.newPage()
    await desktop.goto('http://localhost:3000')
    await expect(desktop.locator('html')).toHaveClass(/\blenis\b/)
    await desktop.close()
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const reduced = await ctx.newPage()
    await reduced.goto('http://localhost:3000')
    await reduced.waitForTimeout(500)
    await expect(reduced.locator('html')).not.toHaveClass(/\blenis\b/)
    await ctx.close()
  })

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

test.describe('Header scroll stability (regression: Sprint 0 page-jump bug)', () => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    test(`page does not drift or jump after scrolling at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('http://localhost:3000')
      await page.mouse.move(viewport.width / 2, 400)
      const headerHeights = new Set<number>()
      const sample = async () => {
        const [y, h] = await page.evaluate(() => [scrollY, document.querySelector('header')!.getBoundingClientRect().height])
        headerHeights.add(Math.round(h))
        return y
      }
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel(0, 60)
        await page.waitForTimeout(40)
        await sample()
      }
      // Smooth scrolling (Lenis) glides for a moment: wait until the page has come to rest
      let settled = await sample()
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(100)
        const y = await sample()
        if (Math.abs(y - settled) < 1) break
        settled = y
      }
      await page.waitForTimeout(800)
      const later = await sample()
      // The page must stay where the user scrolled it, and the header must never change its layout height
      expect(Math.abs(later - settled)).toBeLessThanOrEqual(1)
      expect(settled).toBeGreaterThan(1000)
      expect(headerHeights.size).toBe(1)
    })
  }
})
