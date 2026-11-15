import { IconPackage } from '@tabler/icons-react'

import { ButtonLink } from '@/components/ui/Button'
import { requireUser } from '@/lib/auth/server'

/** Order history (TOS-305). Orders arrive with checkout (Sprint 4); history, tracking and reorder with Sprint 6. */
export default async function OrdersPage() {
  await requireUser('/account/orders')
  return (
    <section aria-labelledby="orders-title" className="flex flex-col gap-4">
      <h2 id="orders-title" className="text-2xl font-bold">
        Orders
      </h2>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-sunset-50 text-sunset-600">
          <IconPackage size={30} />
        </span>
        <p className="text-xl font-bold">No orders yet</p>
        <p className="max-w-md text-ink-600">When you place an order, it appears here with its status, tracking and a one-tap reorder.</p>
        <ButtonLink href="/c/beauty?sort=bestsellers" variant="dark">
          Start shopping
        </ButtonLink>
      </div>
    </section>
  )
}
