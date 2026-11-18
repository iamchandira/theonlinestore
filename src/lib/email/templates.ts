/**
 * Branded transactional emails (Sprint 3: verify, reset, account requests).
 * Table-based, inline-styled HTML so it renders in Gmail, Outlook and phone mail apps.
 * Sprint 7 moves these to editable templates with SMS/WhatsApp variants.
 */

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

type Block = {
  heading: string
  intro: string
  cta?: { label: string; url: string }
  after?: string
  footnote?: string
}

export function layout({ heading, intro, cta, after, footnote }: Block) {
  const site = SITE()
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;color:#0e1a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece7e2">
<tr><td style="height:6px;background:linear-gradient(120deg,#ff8a00,#ff4d2e,#ff2d6f);background-color:#ff5a1f"></td></tr>
<tr><td style="padding:28px 32px 8px"><a href="${site}" style="text-decoration:none"><img src="${site}/brand/logo-header.png" alt="The Online Store" width="180" style="display:block;border:0;max-width:180px;height:auto"></a></td></tr>
<tr><td style="padding:12px 32px 0"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0e1a33">${esc(heading)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#344157">${intro}</p></td></tr>
${
  cta
    ? `<tr><td style="padding:0 32px 8px"><a href="${cta.url}" style="display:inline-block;background:#d9390a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px">${esc(cta.label)}</a>
<p style="margin:16px 0 0;font-size:12.5px;line-height:1.5;color:#5b6b85">Button not working? Copy this link into your browser:<br><a href="${cta.url}" style="color:#d9390a;word-break:break-all">${cta.url}</a></p></td></tr>`
    : ''
}
${after ? `<tr><td style="padding:16px 32px 0"><p style="margin:0;font-size:14px;line-height:1.6;color:#344157">${after}</p></td></tr>` : ''}
<tr><td style="padding:24px 32px 28px"><p style="margin:0;font-size:12.5px;line-height:1.6;color:#8090a8">${footnote ?? 'You received this email because of activity on your account at theonlinestore.lk.'}<br>The Online Store · Shop more. Live better. · Sri Lanka</p></td></tr>
</table></td></tr></table></body></html>`
}

const first = (name?: string | null) => (name ? esc(name.split(' ')[0]) : 'there')

export const verifyEmail = (name: string | null | undefined, token: string) =>
  layout({
    heading: 'Confirm your email',
    intro: `Hi ${first(name)}, welcome to The Online Store! Please confirm your email address so you can sign in, track orders and keep your wishlist on every device.`,
    cta: {
      label: 'Confirm my email',
      url: `${SITE()}/account/verify?token=${encodeURIComponent(token)}`,
    },
    footnote: 'If you didn’t create an account, you can ignore this email.',
  })

export const resetPassword = (name: string | null | undefined, token: string, isStaff: boolean) =>
  layout({
    heading: 'Reset your password',
    intro: `Hi ${first(name)}, we received a request to reset the password for your account. The link works once and expires in 1 hour.`,
    cta: {
      label: 'Choose a new password',
      url: isStaff
        ? `${SITE()}/admin/reset/${encodeURIComponent(token)}`
        : `${SITE()}/account/reset-password?token=${encodeURIComponent(token)}`,
    },
    footnote: 'If you didn’t ask for this, you can ignore this email; your password won’t change.',
  })

export const deletionRequested = (name: string | null | undefined) =>
  layout({
    heading: 'We’ve received your account deletion request',
    intro: `Hi ${first(name)}, our team will delete your account and personal data within 14 days, as required by Sri Lanka’s Personal Data Protection Act. Order records we must keep for tax purposes are anonymised.`,
    after:
      'Changed your mind? Sign in and cancel the request from <strong>Account › Privacy</strong> before then.',
    footnote: 'If you didn’t make this request, sign in and change your password straight away.',
  })

/* --------------------------------------------------------------- orders */

type OrderEmail = {
  orderNumber: string
  fullName: string
  items: {
    name: string
    brand?: string | null
    variant?: string | null
    quantity: number
    lineTotal: number
  }[]
  totals: {
    subtotal: number
    discountTotal: number
    delivery: number
    giftWrap: number
    total: number
    paymentFee?: number
  }
  discounts: { label: string; amount: number }[]
  address: {
    recipientName: string
    phone: string
    line1: string
    line2?: string | null
    city: string
    district: string
  }
  delivery: { method: string; eta?: string | null }
  paymentMethod: 'cod' | 'bank-transfer' | 'payhere' | 'koko' | 'mintpay'
  bankInstructions?: string
  bankAccounts?: { bankName: string; accountName: string; accountNumber: string; branch?: string | null; branchCode?: string | null; swift?: string | null }[]
  viewUrl: string
}

const rs = (n: number) => `Rs ${n.toLocaleString('en-LK')}`

export function orderConfirmation(o: OrderEmail) {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;color:#5b6b85;font-size:14px">${label}</td><td align="right" style="padding:4px 0;font-size:14px;${strong ? 'font-weight:700;color:#0e1a33;font-size:16px' : 'color:#0e1a33'}">${value}</td></tr>`
  const items = o.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #ece7e2;font-size:14px;color:#0e1a33"><strong>${esc(i.name)}</strong>${i.brand ? `<br><span style="color:#5b6b85;font-size:12px">${esc(i.brand)}${i.variant ? ` · ${esc(i.variant)}` : ''}</span>` : ''}<br><span style="color:#5b6b85;font-size:12px">Qty ${i.quantity}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #ece7e2;font-size:14px;white-space:nowrap">${rs(i.lineTotal)}</td></tr>`,
    )
    .join('')
  const paidOnline: Record<string, string> = {
    payhere: 'by card (PayHere)',
    koko: 'with Koko',
    mintpay: 'with Mintpay',
  }
  const payment =
    o.paymentMethod === 'cod'
      ? '<strong>Cash on delivery.</strong> Please keep the exact amount ready; most couriers also take cards.'
      : o.paymentMethod === 'bank-transfer'
        ? `<strong>Bank transfer.</strong> Please transfer <strong>${rs(o.totals.total)}</strong> using <strong>${esc(o.orderNumber)}</strong> as the reference, then upload the slip from your order page. We ship as soon as it’s confirmed.${(o.bankAccounts ?? []).map((b) => `<br><br><span style="display:inline-block;padding:10px 12px;border:1px solid #ece7e2;border-radius:10px"><strong>${esc(b.bankName)}</strong>${b.branch ? ` · ${esc(b.branch)}` : ''}<br>Account name: <strong>${esc(b.accountName)}</strong><br>Account no: <strong>${esc(b.accountNumber)}</strong>${b.branchCode ? `<br>Branch code: ${esc(b.branchCode)}` : ''}${b.swift ? `<br>SWIFT: ${esc(b.swift)}` : ''}</span>`).join('')}${o.bankInstructions ? `<br><span style="color:#5b6b85">${esc(o.bankInstructions)}</span>` : ''}`
        : `<strong>Paid ${paidOnline[o.paymentMethod]}.</strong> We’ve received ${rs(o.totals.total)}. Thank you!`
  const a = o.address
  const intro = `Hi ${first(o.fullName)}, thank you for your order <strong>${esc(o.orderNumber)}</strong>. Here’s your summary.
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px">${items}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Subtotal', rs(o.totals.subtotal))}
${o.discounts.map((d) => row(esc(d.label), `− ${rs(d.amount)}`)).join('')}
${row(`Delivery (${o.delivery.method === 'same-day' ? 'same-day' : 'standard'})`, o.totals.delivery ? rs(o.totals.delivery) : 'Free')}
${o.totals.giftWrap ? row('Gift wrap', rs(o.totals.giftWrap)) : ''}
${o.totals.paymentFee ? row(o.paymentMethod === 'cod' ? 'Cash on delivery fee' : 'Instalment fee', rs(o.totals.paymentFee)) : ''}
${row('Total', rs(o.totals.total), true)}
</table>
<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#344157">${payment}</p>
<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#344157"><strong>Delivering to</strong><br>${esc(a.recipientName)} · ${esc(a.phone)}<br>${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}<br>${esc(a.city)}, ${esc(a.district)} District${o.delivery.eta ? `<br><span style="color:#5b6b85">Expected: ${esc(o.delivery.eta)}</span>` : ''}</p>`
  return layout({
    heading: 'Order confirmed',
    intro,
    cta: { label: 'View your order', url: o.viewUrl },
    footnote:
      'Questions about your order? Reply to this email or message us on WhatsApp with your order number.',
  })
}

/** Bank transfer confirmed by staff (Sprint 5). */
export const paymentReceived = (o: {
  orderNumber: string
  fullName: string
  amount: number
  viewUrl: string
}) =>
  layout({
    heading: 'Payment received',
    intro: `Hi ${first(o.fullName)}, we’ve confirmed your bank transfer of <strong>${rs(o.amount)}</strong> for order <strong>${esc(o.orderNumber)}</strong>. We’re getting it ready to ship.`,
    cta: { label: 'View your order', url: o.viewUrl },
  })

/** A bank slip we couldn't match (Sprint 5). */
export const slipRejected = (o: {
  orderNumber: string
  fullName: string
  reason: string
  viewUrl: string
}) =>
  layout({
    heading: 'We couldn’t confirm your payment',
    intro: `Hi ${first(o.fullName)}, we couldn’t match the slip you sent for order <strong>${esc(o.orderNumber)}</strong>: ${esc(o.reason)}`,
    cta: { label: 'Upload a new slip', url: o.viewUrl },
    after: 'Reply to this email or message us on WhatsApp if you need help.',
  })

/** Order shipped (Sprint 6): courier, tracking number and link. */
export const orderShipped = (o: {
  orderNumber: string
  fullName: string
  courier: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  orderUrl: string
  eta?: string | null
}) =>
  layout({
    heading: 'Your order is on its way',
    intro: `Hi ${first(o.fullName)}, order <strong>${esc(o.orderNumber)}</strong> has left our store with <strong>${esc(o.courier)}</strong>${o.trackingNumber ? ` (tracking <strong>${esc(o.trackingNumber)}</strong>)` : ''}.${o.eta ? ` Expected: ${esc(o.eta)}.` : ''} The courier will call you before delivery.`,
    cta: o.trackingUrl
      ? { label: 'Track with the courier', url: o.trackingUrl }
      : { label: 'See your order', url: o.orderUrl },
    after: o.trackingUrl
      ? `You can also follow it on <a href="${o.orderUrl}">your order page</a>.`
      : undefined,
  })

/** Refund issued (Sprint 6). */
export const refundIssued = (o: {
  orderNumber: string
  fullName: string
  amount: number
  method: string
  orderUrl: string
}) =>
  layout({
    heading: 'Your refund is on its way',
    intro: `Hi ${first(o.fullName)}, we’ve refunded <strong>${rs(o.amount)}</strong> for order <strong>${esc(o.orderNumber)}</strong> ${esc(o.method)}. Card refunds usually reach your account in 5 to 10 working days; bank transfers in 1 to 2.`,
    cta: { label: 'See your order', url: o.orderUrl },
  })

/** Return request decision (Sprint 6). */
export const returnUpdate = (o: {
  orderNumber: string
  fullName: string
  returnNumber: string
  approved: boolean
  note?: string | null
  orderUrl: string
}) =>
  layout({
    heading: o.approved ? 'Your return is approved' : 'About your return request',
    intro: o.approved
      ? `Hi ${first(o.fullName)}, return <strong>${esc(o.returnNumber)}</strong> for order <strong>${esc(o.orderNumber)}</strong> is approved. Please pack the items in their original packaging; we’ll arrange a pickup or you can drop them at our store. We refund as soon as they arrive.${o.note ? `<br><br>${esc(o.note)}` : ''}`
      : `Hi ${first(o.fullName)}, we can’t accept return <strong>${esc(o.returnNumber)}</strong> for order <strong>${esc(o.orderNumber)}</strong>${o.note ? `: ${esc(o.note)}` : '.'}`,
    cta: { label: 'See your order', url: o.orderUrl },
    after: 'Questions? Reply to this email or message us on WhatsApp.',
  })
