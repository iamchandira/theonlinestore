import type { Metadata } from 'next'

import { PolicyPage, policyMetadata } from '@/components/layout/PolicyPage'

export const generateMetadata = (): Promise<Metadata> => policyMetadata('terms', 'Terms & conditions')

export default function TermsPage() {
  return (
    <PolicyPage kind="terms" title="Terms & conditions" intro="The essentials of buying from The Online Store.">
      <section>
        <h2>Orders and prices</h2>
        <ul>
          <li>Prices are in Sri Lankan rupees and include all taxes. Delivery and any gift-wrap fee are shown before you place your order.</li>
          <li>Your order is confirmed when you see the confirmation page and receive the confirmation email.</li>
          <li>If an item becomes unavailable after you order, we’ll contact you and refund or replace it.</li>
        </ul>
      </section>
      <section>
        <h2>Payment</h2>
        <ul>
          <li>Cash on delivery is available up to the limit shown at checkout.</li>
          <li>For bank transfers, we hold your items for the time shown at checkout and ship once the payment arrives.</li>
        </ul>
      </section>
      <section>
        <h2>Delivery</h2>
        <p>We deliver island-wide. Fees and estimated times depend on your district and are shown at checkout. Same-day delivery is available in selected areas for orders placed before the cut-off.</p>
      </section>
      <section>
        <h2>Discount codes</h2>
        <p>One code per order. Each code has its own conditions (minimum spend, dates, items it applies to), which are checked at checkout.</p>
      </section>
    </PolicyPage>
  )
}
