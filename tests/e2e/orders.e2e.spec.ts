import { expect, test, type Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const stamp = Date.now()
const phone = `07${String(stamp).slice(-8)}`

/** Places a cash-on-delivery order through the API (like checkout does) and returns its number. */
async function placeOrder(page: Page) {
  const res = await page.request.post(`${BASE}/api/orders/place`, {
    headers: { Origin: BASE, 'Content-Type': 'application/json' },
    data: {
      items: [{ sku: 'TOS-050-1', qty: 2 }],
      payment: 'cod',
      acceptTerms: true,
      contact: { fullName: 'E2E Tracker', email: `e2e-track-${stamp}@theonlinestore.test`, phone },
      address: { line1: '4 Hill Road', city: 'Kandy', district: 'Kandy' },
    },
  })
  const json = (await res.json()) as { orderNumber: string }
  expect(json.orderNumber).toMatch(/^TOS-/)
  return json.orderNumber
}

/** Sprint 6 "Orders & delivery": guest tracking, the order page, Buy again and the invoice. */
test.describe('Orders (Sprint 6)', () => {
  test('track an order with its number and mobile; wrong mobile gets the same polite answer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const orderNumber = await placeOrder(page)
    await page.goto(`${BASE}/track-order`)
    await page.getByLabel('Order number').fill(orderNumber.toLowerCase())
    await page.getByLabel('Mobile number').fill('077 000 0000')
    await page.getByRole('button', { name: 'Track order' }).click()
    await expect(page.getByText(/couldn’t find an order with that number and mobile/)).toBeVisible()

    await page.getByLabel('Mobile number').fill(phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'))
    await page.getByRole('button', { name: 'Track order' }).click()
    await page.waitForURL(new RegExp(`/orders/${orderNumber}\\?t=`))
    await expect(page.getByRole('heading', { name: orderNumber })).toBeVisible()
    await expect(page.getByLabel('Order progress')).toContainText('Placed')
    await expect(page.getByText('Cash on delivery · Not paid yet')).toBeVisible()

    // Buy again puts the items in the bag and opens it
    await page.getByRole('button', { name: 'Buy again' }).click()
    await expect(page.getByRole('dialog')).toContainText('Your bag')
    await expect(page.getByRole('dialog')).toContainText('Original Petroleum Jelly')
  })

  test('the shopper’s invoice opens as a printable page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const orderNumber = await placeOrder(page)
    await page.goto(`${BASE}/track-order`)
    await page.getByLabel('Order number').fill(orderNumber)
    await page.getByLabel('Mobile number').fill(phone)
    await page.getByRole('button', { name: 'Track order' }).click()
    await page.waitForURL(/\/orders\//)
    const [invoice] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: 'Invoice' }).click(),
    ])
    await invoice.waitForLoadState()
    await expect(invoice.getByText('Invoice', { exact: true })).toBeVisible()
    await expect(invoice.getByText(orderNumber)).toBeVisible()
    await expect(invoice.getByText('Pay on delivery')).toBeVisible()
    await expect(invoice.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible()
  })
})
