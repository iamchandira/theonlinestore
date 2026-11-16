import { IconTruckDelivery } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { TrackForm } from '@/components/orders/TrackForm'

export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Find your order with its number and the mobile number you used at checkout.',
}

/** Guest order tracking (TOS-705). Signed-in shoppers can also use Account › Orders. */
export default function TrackOrderPage() {
  return (
    <div className="container-site py-10 md:py-16">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-sunset-50 text-sunset-600">
            <IconTruckDelivery size={28} />
          </span>
          <h1 className="text-3xl font-extrabold">Track your order</h1>
          <p className="text-ink-700">
            Enter your order number (it’s in your confirmation email) and the mobile number you used
            at checkout.
          </p>
        </header>
        <TrackForm />
        <p className="text-center text-sm text-ink-600">
          Have an account?{' '}
          <Link href="/account/orders" className="font-semibold underline underline-offset-2">
            See all your orders
          </Link>
        </p>
      </div>
    </div>
  )
}
