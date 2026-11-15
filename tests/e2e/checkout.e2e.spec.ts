import { expect, test, type Locator, type Page } from '@playwright/test'

import { latestEmail, linkIn } from '../helpers/mailpit'
import { deleteUserByEmail } from '../helpers/seedUser'

const BASE = 'http://localhost:3000'
const stamp = Date.now()
const guestEmail = `e2e-checkout-${stamp}@theonlinestore.test`
// Unique per run: first-order coupons are checked against email AND phone
const guestPhone = `07${String(stamp).slice(-8)}`

/** The order summary is rendered twice (mobile drawer + desktop column); act on the one on screen. */
const vis = (l: Locator) => l.filter({ visible: true }).first()

async function addToBag(page: Page, slug: string) {
  await page.goto(`${BASE}/p/${slug}`)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByRole('button', { name: /Open bag, [1-9]\d* items/ })).toBeVisible()
}

async function fillGuest(page: Page) {
  await page.getByLabel('Full name').fill('E2E Shopper')
  await page.getByLabel('Email', { exact: true }).fill(guestEmail)
  await page.getByLabel('Mobile number').fill(guestPhone)
  await page.getByLabel('Address line 1').fill('12 Temple Road')
  await page.getByLabel('District', { exact: true }).selectOption('Kandy')
  await page.getByLabel('Town / city').fill('Kandy')
}

/** Sprint 4 "Checkout": guest checkout with a coupon and gift wrap, form errors, confirmation email, account from order. */
test.describe('Checkout (Sprint 4)', () => {
  test.afterAll(async () => {
    await deleteUserByEmail(guestEmail)
  })

  test('the form points to what is missing instead of placing the order', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await addToBag(page, 'esse-naturals-lip-balm')
    await page.goto(`${BASE}/checkout`)
    await vis(page.getByRole('button', { name: /Place order/ })).click()
    await expect(page.getByText('Enter your name.').first()).toBeVisible()
    await expect(page.getByText(/accept the terms/i).first()).toBeVisible()
    await expect(page).toHaveURL(`${BASE}/checkout`)
  })

  test('guest checkout with a coupon and gift wrap, then an account from the order', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await addToBag(page, 'vaseline-original-petroleum-jelly')
    await page.goto(`${BASE}/checkout`)
    await fillGuest(page)

    await vis(page.getByPlaceholder('Discount code')).fill('welcome10')
    await vis(page.getByRole('button', { name: 'Apply' })).click()
    await expect(vis(page.getByLabel('Order summary'))).toContainText('WELCOME10')

    await page.getByRole('radio', { name: /Bank transfer/ }).check()
    await page.getByRole('checkbox', { name: /gift wrap/i }).check()
    await page.getByLabel('Gift message').fill('Happy birthday!')
    await expect(vis(page.getByLabel('Order summary'))).toContainText('Gift wrap')

    await page.getByRole('checkbox', { name: /I accept the/ }).check()
    await vis(page.getByRole('button', { name: /Place order · Rs/ })).click()

    await page.waitForURL(/\/checkout\/success\/TOS-\d{6}-[A-Z0-9]{4}\?t=/)
    await expect(page.getByRole('heading', { name: /Thank you, E2E!/ })).toBeVisible()
    await expect(page.getByText(/Next: transfer Rs/)).toBeVisible()
    const orderNumber = page.url().match(/TOS-\d{6}-[A-Z0-9]{4}/)![0]
    // The bag empties once the order is in
    await expect(page.getByRole('button', { name: /Open bag/ })).not.toContainText(/[1-9]/)

    const mail = await latestEmail(guestEmail, `Order ${orderNumber} confirmed`)
    expect(mail.HTML).toContain(orderNumber)
    expect(mail.HTML).toMatch(/Bank transfer|bank transfer/)

    // TOS-307: turn the guest order into an account
    await page.getByLabel(`Password for ${guestEmail}`).fill(`E2e-${stamp}-pass`)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Almost there')).toBeVisible()
    await page.goto(
      linkIn((await latestEmail(guestEmail, 'Confirm your email')).HTML, '/account/verify'),
    )
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()
    await page.goto(`${BASE}/account/login`)
    await page.getByLabel('Email', { exact: true }).fill(guestEmail)
    await page.getByLabel('Password', { exact: true }).fill(`E2e-${stamp}-pass`)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(`${BASE}/account`)
    // The guest order is linked to the new account at sign-in
    await page.goto(`${BASE}/account/orders`)
    await expect(page.getByText(orderNumber)).toBeVisible()
  })
})
