import { expect, test, type Locator, type Page } from '@playwright/test'

import { latestEmail } from '../helpers/mailpit'

const BASE = 'http://localhost:3000'
const stamp = Date.now()
const vis = (l: Locator) => l.filter({ visible: true }).first()

async function checkoutWith(page: Page, method: RegExp, tag: string) {
  await page.goto(`${BASE}/p/vaseline-original-petroleum-jelly`)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('button', { name: /Open bag, [1-9]\d* items/ })).toBeVisible()
  await page.goto(`${BASE}/checkout`)
  await page.getByLabel('Full name').fill('E2E Payer')
  await page
    .getByLabel('Email', { exact: true })
    .fill(`e2e-pay-${tag}-${stamp}@theonlinestore.test`)
  await page.getByLabel('Mobile number').fill(`07${String(stamp + tag.length).slice(-8)}`)
  await page.getByLabel('Address line 1').fill('3 Lake Drive')
  await page.getByLabel('District', { exact: true }).selectOption('Kandy')
  await page.getByLabel('Town / city').fill('Kandy')
  await page.getByRole('radio', { name: method }).check()
  await page.getByRole('checkbox', { name: /I accept the/ }).check()
}

/** Sprint 5 "Payments": card through the test gateway (decline, retry, approve), Koko instalments, bank slip upload. */
test.describe('Payments (Sprint 5)', () => {
  test('card: declined, retried, then paid; confirmation email after payment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await checkoutWith(page, /Card, eZ Cash/, 'card')
    await vis(page.getByRole('button', { name: /Continue to payment · Rs/ })).click()

    await page.waitForURL(/\/checkout\/pay\/test-gateway\?ref=TOS-\d{6}-[A-Z0-9]{4}-P1/)
    await expect(page.getByText('Test gateway · no real money')).toBeVisible()
    const orderNumber = page.url().match(/TOS-\d{6}-[A-Z0-9]{4}/)![0]
    await page.getByRole('button', { name: 'Decline' }).click()

    await page.waitForURL(/\/checkout\/success\//)
    await expect(page.getByRole('heading', { name: 'Almost done' })).toBeVisible()
    await expect(page.getByText('The payment didn’t go through')).toBeVisible()
    await page.getByRole('link', { name: /Try again · Rs/ }).click()
    await page.getByRole('button', { name: /Try again · Rs/ }).click()

    await page.waitForURL(/test-gateway\?ref=.*-P2/)
    await page.getByRole('button', { name: 'Approve payment' }).click()
    await page.waitForURL(/\/checkout\/success\//)
    await expect(page.getByRole('heading', { name: /Thank you, E2E!/ })).toBeVisible()
    await expect(page.getByText('Paid by card (PayHere)')).toBeVisible()
    const mail = await latestEmail(
      `e2e-pay-card-${stamp}@theonlinestore.test`,
      `Order ${orderNumber} confirmed`,
    )
    expect(mail.HTML).toContain('Paid by card (PayHere)')
  })

  test('Koko shows 3 instalments and pays through the gateway', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await checkoutWith(page, /Koko/, 'koko')
    await expect(
      page.getByText(/3 × Rs [\d,]+, today and over the next 2 months/).first(),
    ).toBeVisible()
    await vis(page.getByRole('button', { name: /Continue to payment/ })).click()
    await page.waitForURL(/test-gateway/)
    await expect(page.getByText(/3 instalments of Rs/)).toBeVisible()
    await page.getByRole('button', { name: 'Approve payment' }).click()
    await page.waitForURL(/\/checkout\/success\//)
    await expect(page.getByText('Paid with Koko').or(page.getByText('Paid by Koko'))).toBeVisible()
  })

  test('bank transfer: the shopper uploads a slip from the order page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await checkoutWith(page, /Bank transfer/, 'bank')
    await vis(page.getByRole('button', { name: /Place order · Rs/ })).click()
    await page.waitForURL(/\/checkout\/success\//)
    await expect(page.getByRole('heading', { name: /Next: transfer Rs/ })).toBeVisible()
    await page.locator('#slip-file').setInputFiles({
      name: 'slip.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      ),
    })
    await page.getByRole('button', { name: 'Send slip' }).click()
    await expect(page.getByRole('heading', { name: /Slip received/ })).toBeVisible()
  })
})
