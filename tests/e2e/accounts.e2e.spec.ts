import { expect, test } from '@playwright/test'

import { clearInbox, latestEmail, linkIn } from '../helpers/mailpit'
import { deleteUserByEmail } from '../helpers/seedUser'

const BASE = 'http://localhost:3000'
const email = `e2e-shopper-${Date.now()}@theonlinestore.test`
const password = 'first-pass-123'
const newPassword = 'second-pass-456'

/**
 * Sprint 3 customer accounts, end to end with real emails (Mailpit):
 * register → confirm email → sign in → address book → wishlist sync → reset password → sign out.
 */
test.describe.serial('Customer accounts (Sprint 3)', () => {
  // A fresh client IP per run, so the per-IP rate limits (e.g. 5 reset requests an hour) don't carry over between runs
  test.use({ extraHTTPHeaders: { 'x-real-ip': `e2e-${Date.now()}` } })
  test.afterAll(async () => {
    await deleteUserByEmail(email)
    await clearInbox(email)
  })

  test('register, confirm by email, then sign in', async ({ page }) => {
    await page.goto(`${BASE}/account/register`)
    await page.getByLabel('Full name').fill('Nadeesha Test')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/Mobile number/).fill('0771234567')
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel(/I agree to the/).check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()

    // Unverified accounts can't sign in yet
    await page.goto(`${BASE}/account/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('confirm your email', { exact: false }).first()).toBeVisible()

    const mail = await latestEmail(email, 'Confirm your email')
    await page.goto(linkIn(mail.HTML, '/account/verify'))
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()
    await page.getByRole('link', { name: 'Sign in', exact: true }).click()
    await expect(page.getByText('Email confirmed', { exact: false }).first()).toBeVisible()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(`${BASE}/account`)
    await expect(page.getByText('Hi, Nadeesha')).toBeVisible()
  })

  test('address book and wishlist sync to the account', async ({ page }) => {
    // Wishlist saved before signing in is merged into the account
    await page.goto(`${BASE}/p/demo-velvet-jasmine-edp`)
    await page.getByRole('button', { name: 'Save to wishlist' }).click()
    await page.goto(`${BASE}/account/addresses`)
    await page.waitForURL(/\/account\/login\?next=%2Faccount%2Faddresses/)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(`${BASE}/account/addresses`)

    await page.getByRole('button', { name: 'Add your first address' }).click()
    const form = page.getByRole('dialog')
    await form.getByLabel('Recipient name').fill('Nadeesha Test')
    await form.getByLabel('Mobile number').fill('0771234567')
    await form.getByLabel('Address line 1').fill('12 Temple Road')
    await form.getByLabel('District').selectOption('Colombo')
    await form.getByLabel('Town / city').fill('Nugegoda')
    await form.getByRole('button', { name: 'Save address' }).click()
    await expect(page.locator('address')).toContainText('Nugegoda, Colombo District')
    await expect(page.getByText('Default', { exact: true })).toBeVisible()

    await page.goto(`${BASE}/account`)
    await expect(page.getByText(/1 saved product, synced to your account/)).toBeVisible()
    // The account copy survives a fresh browser (another device)
    const other = await page.context().browser()!.newContext()
    const p2 = await other.newPage()
    await p2.goto(`${BASE}/account/login`)
    await p2.getByLabel('Email').fill(email)
    await p2.getByLabel('Password', { exact: true }).fill(password)
    await p2.getByRole('button', { name: 'Sign in' }).click()
    await p2.waitForURL(`${BASE}/account`)
    await p2.goto(`${BASE}/wishlist`)
    await expect(p2.getByLabel('Wishlist products')).toContainText('Velvet Jasmine')
    await other.close()
  })

  test('forgot password: email link resets it once, then sign out', async ({ page }) => {
    await page.goto(`${BASE}/account/forgot-password`)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Email me a reset link' }).click()
    await expect(page.getByText('we’ve emailed a link', { exact: false }).first()).toBeVisible()
    const link = linkIn((await latestEmail(email, 'Reset your password')).HTML, '/account/reset-password')
    await page.goto(link)
    await page.getByLabel('New password', { exact: true }).fill(newPassword)
    await page.getByLabel('Confirm new password').fill(newPassword)
    await page.getByRole('button', { name: 'Save new password' }).click()
    await page.waitForURL(/\/account\?reset=1/)
    await expect(page.getByText('password was changed', { exact: false }).first()).toBeVisible()

    // The link works only once
    await page.goto(link)
    await page.getByLabel('New password', { exact: true }).fill('third-pass-789')
    await page.getByLabel('Confirm new password').fill('third-pass-789')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await expect(page.getByText('expired or was already used', { exact: false }).first()).toBeVisible()

    await page.goto(`${BASE}/account`)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL(`${BASE}/`)
    await page.goto(`${BASE}/account`)
    await page.waitForURL(/\/account\/login/)
  })

  test('the same answer whether or not an email has an account', async ({ page }) => {
    await page.goto(`${BASE}/account/forgot-password`)
    await page.getByLabel('Email').fill(`nobody-${Date.now()}@theonlinestore.test`)
    await page.getByRole('button', { name: 'Email me a reset link' }).click()
    await expect(page.getByText(/has an account, we’ve emailed a link/)).toBeVisible()
  })

  test('customers cannot open the admin', async ({ page }) => {
    await page.goto(`${BASE}/account/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(newPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(`${BASE}/account`)
    // A customer can only ever read their own user record (fetch from the page, so the session cookie is honoured)
    const emails = await page.evaluate(async () => ((await (await fetch('/api/users?limit=50')).json()) as { docs: { email: string }[] }).docs.map((u) => u.email))
    expect(emails).toEqual([email])
    await page.goto(`${BASE}/admin`)
    await expect(page.locator('nav[aria-label="Admin"]')).toHaveCount(0)
    await expect(page.getByText(/not allowed|unauthorized|don.t have permission/i).first()).toBeVisible()
  })
})
