'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import type { Transaction } from '@/payload-types'

import { loadPaymentConfig } from '@/lib/payments/config'
import { sendPaidConfirmation } from '@/lib/payments/emails'
import {
  parsePayhereNotify,
  payhereAmount,
  payhereNotifySig,
  type GatewayResult,
} from '@/lib/payments/payhere'
import { applyGatewayResult } from '@/lib/payments/service'
import {
  signSimulated,
  SIMULATOR_MERCHANT,
  simulatorSecret,
  verifySimulated,
} from '@/lib/payments/simulator'
import { getShopperOrder } from '@/lib/payments/shopperOrder'
import { clientIp } from '@/lib/server/rateLimit'

/**
 * The built-in test gateway's buttons (local and test mode only). It signs its message the way the real
 * gateway would and goes through the same checks, so the whole flow is exercised without real money.
 */
export async function simulateGatewayAction(formData: FormData) {
  const reference = String(formData.get('ref') ?? '').slice(0, 60)
  const token = String(formData.get('t') ?? '').slice(0, 100)
  const outcome = String(formData.get('outcome') ?? '') as 'approve' | 'decline' | 'cancel'
  const result: GatewayResult =
    outcome === 'approve' ? 'paid' : outcome === 'decline' ? 'failed' : 'cancelled'

  const { getPayloadClient } = await import('@/lib/catalog/server')
  const payload = await getPayloadClient()
  const cfg = await loadPaymentConfig(payload)
  if (!cfg.simulatorAllowed) throw new Error('The test gateway is switched off.')
  const tx = (
    await payload.find({
      collection: 'transactions',
      where: { reference: { equals: reference } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
  ).docs[0] as Transaction | undefined
  const order = tx && typeof tx.order === 'object' ? tx.order : null
  if (!tx || !order || !tx.simulated) throw new Error('Unknown test payment')
  const found = await getShopperOrder(order.orderNumber, token)
  if (!found) throw new Error('Unknown test payment')
  const back = `/checkout/${outcome === 'cancel' ? 'pay' : 'success'}/${order.orderNumber}?t=${encodeURIComponent(found.token)}${outcome === 'cancel' ? '&cancelled=1' : '&from=gateway'}`

  if (outcome !== 'cancel') {
    const amount = payhereAmount(tx.amount)
    let valid: boolean
    if (tx.method === 'payhere') {
      // Same PayHere signature check as a real notification, with the test gateway's own merchant id and secret
      const status_code = {
        paid: '2',
        failed: '-2',
        cancelled: '-1',
        pending: '0',
        chargeback: '-3',
      }[result]
      const fields = {
        merchant_id: SIMULATOR_MERCHANT,
        order_id: reference,
        payhere_amount: amount,
        payhere_currency: 'LKR',
        status_code,
      }
      valid = parsePayhereNotify(
        {
          ...fields,
          md5sig: payhereNotifySig(fields, simulatorSecret()),
          payment_id: `TEST-${Date.now()}`,
        },
        SIMULATOR_MERCHANT,
        simulatorSecret(),
      ).valid
    } else {
      valid = verifySimulated(
        { reference, result, amount },
        signSimulated({ reference, result, amount }),
      )
    }
    const out = await applyGatewayResult(payload, {
      reference,
      result,
      amount: Number(amount),
      currency: 'LKR',
      providerRef: `TEST-${Date.now()}`,
      message:
        outcome === 'decline' ? 'Declined on the test gateway' : 'Approved on the test gateway',
      valid,
      ip: clientIp(await headers()),
      data: { testGateway: true, outcome },
    })
    if (out.newlyPaid && out.orderId) await sendPaidConfirmation(payload, out.orderId)
  } else {
    await applyGatewayResult(payload, {
      reference,
      result: 'cancelled',
      amount: tx.amount,
      currency: 'LKR',
      valid: true,
      message: 'Cancelled on the test gateway',
      data: { testGateway: true },
    })
  }
  redirect(back)
}
