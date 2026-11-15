import type { Metadata } from 'next'

import { PolicyPage } from '@/components/layout/PolicyPage'

export const metadata: Metadata = { title: 'Returns & refunds', robots: { index: false } }

export default function ReturnsPage() {
  return (
    <PolicyPage title="Returns & refunds" intro="If something isn’t right, tell us and we’ll make it right.">
      <section>
        <h2>Damaged, wrong or missing items</h2>
        <p>Message us on WhatsApp or email within 48 hours of delivery with your order number and a photo. We’ll replace the item or refund you.</p>
      </section>
      <section>
        <h2>Change of mind</h2>
        <ul>
          <li>Unopened items can be returned within 7 days of delivery.</li>
          <li>Wrong shoe size? Exchange unworn shoes within 7 days.</li>
          <li>For hygiene reasons, opened beauty products can’t be returned.</li>
          <li>Food items such as chocolates can’t be returned once delivered, unless they arrive damaged.</li>
        </ul>
      </section>
      <section>
        <h2>Refunds</h2>
        <p>Refunds go back to the original payment method, or as store credit if you prefer. Online returns requests arrive with order tracking.</p>
      </section>
    </PolicyPage>
  )
}
