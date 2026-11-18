import type { Metadata } from 'next'
import Link from 'next/link'

import { PolicyPage, policyMetadata } from '@/components/layout/PolicyPage'

export const generateMetadata = (): Promise<Metadata> => policyMetadata('privacy', 'Privacy policy')

export default function PrivacyPage() {
  return (
    <PolicyPage kind="privacy" title="Privacy" intro="We collect only what we need to deliver your orders, and you stay in control of it.">
      <section>
        <h2>What we keep</h2>
        <ul>
          <li>Your name, email, mobile number and delivery addresses, to deliver orders and keep you updated.</li>
          <li>Your orders, wishlist and reviews.</li>
          <li>Your marketing choices (email, SMS, WhatsApp) and when you made them.</li>
        </ul>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          Under Sri Lanka’s Personal Data Protection Act you can see, download, correct or delete your data. Signed-in customers can do this themselves in{' '}
          <Link href="/account/privacy" className="font-semibold underline">
            Account › Privacy &amp; data
          </Link>
          ; anyone can also ask us by email.
        </p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>We share your delivery details only with the courier delivering your order, and payment details only with the payment provider you choose. We never sell your data.</p>
      </section>
    </PolicyPage>
  )
}
