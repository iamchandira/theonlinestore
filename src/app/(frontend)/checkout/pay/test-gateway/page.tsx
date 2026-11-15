import { IconCheck, IconFlask, IconX } from '@tabler/icons-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { Transaction } from '@/payload-types'

import { Button } from '@/components/ui/Button'
import { getPayloadClient } from '@/lib/catalog/server'
import { formatLKR } from '@/lib/format'
import { loadPaymentConfig } from '@/lib/payments/config'
import { getShopperOrder } from '@/lib/payments/shopperOrder'

import { simulateGatewayAction } from '../actions'

export const metadata: Metadata = { title: 'Test gateway', robots: { index: false, follow: false } }

const NAMES: Record<string, string> = {
  payhere: 'PayHere (card)',
  koko: 'Koko',
  mintpay: 'Mintpay',
}

/**
 * Built-in test gateway (Sprint 5). Only in Test mode and never on the live site. Stands in for PayHere,
 * Koko or Mintpay until their credentials are set, so checkout can be tried end to end without real money.
 */
export default async function TestGatewayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const payload = await getPayloadClient()
  const cfg = await loadPaymentConfig(payload)
  if (!cfg.simulatorAllowed) notFound()
  const tx = (
    await payload.find({
      collection: 'transactions',
      where: { reference: { equals: String(sp.ref ?? '') } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
  ).docs[0] as Transaction | undefined
  const order = tx && typeof tx.order === 'object' ? tx.order : null
  if (!tx || !order || !tx.simulated || !(await getShopperOrder(order.orderNumber, sp.t)))
    notFound()
  const instalment =
    tx.method === 'koko' || tx.method === 'mintpay' ? Math.ceil(tx.amount / 3) : null

  return (
    <div className="min-h-[70vh] bg-ink-50 py-10 md:py-16">
      <div className="mx-auto flex max-w-md flex-col gap-5 rounded-3xl border-2 border-dashed border-warning-600 bg-surface p-6 sm:p-8">
        <p className="flex items-center gap-2 self-start rounded-full bg-warning-50 px-3 py-1 text-sm font-semibold text-warning-600">
          <IconFlask size={16} /> Test gateway · no real money
        </p>
        <div>
          <h1 className="text-2xl font-extrabold">{NAMES[tx.method] ?? tx.method}</h1>
          <p className="text-ink-700">
            The Online Store · order <span className="font-mono">{order.orderNumber}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-ink-50 p-4">
          <p className="text-sm text-ink-600">Amount</p>
          <p className="text-3xl font-extrabold tabular-nums">{formatLKR(tx.amount)}</p>
          {instalment && (
            <p className="text-sm text-ink-600">3 instalments of {formatLKR(instalment)}</p>
          )}
          <p className="mt-2 font-mono text-xs text-ink-500">Ref {tx.reference}</p>
        </div>
        <form action={simulateGatewayAction} className="flex flex-col gap-3">
          <input type="hidden" name="ref" value={tx.reference} />
          <input type="hidden" name="t" value={String(sp.t ?? '')} />
          <Button type="submit" name="outcome" value="approve" size="lg" block>
            <IconCheck size={18} /> Approve payment
          </Button>
          <Button type="submit" name="outcome" value="decline" variant="outline" size="lg" block>
            <IconX size={18} /> Decline
          </Button>
          <Button type="submit" name="outcome" value="cancel" variant="ghost" block>
            Cancel and go back to the store
          </Button>
        </form>
        <p className="text-xs text-ink-500">
          Shown because Settings › Payments is in Test mode and this gateway has no credentials yet.
        </p>
      </div>
    </div>
  )
}
