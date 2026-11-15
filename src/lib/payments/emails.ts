import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

import { loadPaymentConfig } from './config'
import { orderUrl } from './service'

/**
 * Payment emails (Sprint 5). Online orders get their confirmation once the gateway confirms payment
 * (not when the order is placed); bank transfer shoppers hear back when their slip is checked.
 * Email failures are logged and never undo a payment.
 */

export function confirmationEmailFor(order: Order, bankInstructions: string) {
  return import('../email/templates').then(({ orderConfirmation }) =>
    orderConfirmation({
      orderNumber: order.orderNumber,
      fullName: order.contact.fullName,
      items: order.items.map((i) => ({
        name: i.name,
        brand: i.brand,
        variant: i.variant,
        quantity: i.quantity,
        lineTotal: i.lineTotal ?? 0,
      })),
      totals: {
        subtotal: order.totals?.subtotal ?? 0,
        discountTotal: order.totals?.discountTotal ?? 0,
        delivery: order.totals?.delivery ?? 0,
        giftWrap: order.totals?.giftWrap ?? 0,
        total: order.totals?.total ?? 0,
      },
      discounts: (order.discounts ?? []).map((d) => ({
        label: d.label ?? 'Discount',
        amount: d.amount ?? 0,
      })),
      address: order.shippingAddress,
      delivery: { method: order.delivery?.method ?? 'standard', eta: order.delivery?.eta },
      paymentMethod: order.paymentMethod,
      bankInstructions,
      viewUrl: orderUrl(order, order.accessToken ?? ''),
    }),
  )
}

export async function sendPaidConfirmation(payload: Payload, orderId: number) {
  try {
    const order = (await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as Order
    const cfg = await loadPaymentConfig(payload)
    await payload.sendEmail({
      to: order.contact.email,
      subject: `Order ${order.orderNumber} confirmed · The Online Store`,
      html: await confirmationEmailFor(order, cfg.bankTransfer.instructions),
    })
  } catch (err) {
    payload.logger.error({ err, orderId }, 'Paid confirmation email failed')
  }
}

export async function sendSlipDecision(
  payload: Payload,
  order: Order,
  decision: { ok: true } | { ok: false; reason: string },
) {
  try {
    const { paymentReceived, slipRejected } = await import('../email/templates')
    const viewUrl = orderUrl(order, order.accessToken ?? '')
    await payload.sendEmail(
      decision.ok
        ? {
            to: order.contact.email,
            subject: `Payment received for ${order.orderNumber}`,
            html: paymentReceived({
              orderNumber: order.orderNumber,
              fullName: order.contact.fullName,
              amount: order.totals?.total ?? 0,
              viewUrl,
            }),
          }
        : {
            to: order.contact.email,
            subject: `About your payment for ${order.orderNumber}`,
            html: slipRejected({
              orderNumber: order.orderNumber,
              fullName: order.contact.fullName,
              reason: decision.reason,
              viewUrl,
            }),
          },
    )
  } catch (err) {
    payload.logger.error({ err, orderId: order.id }, 'Slip decision email failed')
  }
}
