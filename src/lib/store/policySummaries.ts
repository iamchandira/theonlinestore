/**
 * Plain-language policy summaries, shown at /terms, /returns and /privacy until the owner writes the full
 * text in Admin › Settings › Policies. The shopping assistant answers from the same summaries, so the page
 * and the chat never disagree. Links are written as [label](/path).
 */

export type PolicyKind = 'terms' | 'returns' | 'privacy'
export type SummarySection = { heading: string; text?: string; items?: string[] }
export type PolicySummary = { intro: string; sections: SummarySection[] }

export const POLICY_SUMMARIES: Record<PolicyKind, PolicySummary> = {
  terms: {
    intro: 'The essentials of buying from The Online Store.',
    sections: [
      {
        heading: 'Orders and prices',
        items: [
          'Prices are in Sri Lankan rupees and include all taxes. Delivery and any gift-wrap fee are shown before you place your order.',
          'Your order is confirmed when you see the confirmation page and receive the confirmation email.',
          'If an item becomes unavailable after you order, we’ll contact you and refund or replace it.',
        ],
      },
      {
        heading: 'Payment',
        items: [
          'Cash on delivery is available up to the limit shown at checkout.',
          'For bank transfers, we hold your items for the time shown at checkout and ship once the payment arrives.',
        ],
      },
      {
        heading: 'Delivery',
        text: 'We deliver island-wide. Fees and estimated times depend on your district and are shown at checkout. Same-day delivery is available in selected areas for orders placed before the cut-off.',
      },
      {
        heading: 'Discount codes',
        text: 'One code per order. Each code has its own conditions (minimum spend, dates, items it applies to), which are checked at checkout.',
      },
    ],
  },
  returns: {
    intro: 'If something isn’t right, tell us and we’ll make it right.',
    sections: [
      {
        heading: 'Damaged, wrong or missing items',
        text: 'Message us on WhatsApp or email within 48 hours of delivery with your order number and a photo. We’ll replace the item or refund you.',
      },
      {
        heading: 'Change of mind',
        items: [
          'Unopened items can be returned within 7 days of delivery.',
          'Wrong shoe size? Exchange unworn shoes within 7 days.',
          'For hygiene reasons, opened beauty products can’t be returned.',
          'Food items such as chocolates can’t be returned once delivered, unless they arrive damaged.',
        ],
      },
      {
        heading: 'Refunds',
        text: 'Refunds go back to the original payment method, or as store credit if you prefer. Online returns requests arrive with order tracking.',
      },
    ],
  },
  privacy: {
    intro: 'We collect only what we need to deliver your orders, and you stay in control of it.',
    sections: [
      {
        heading: 'What we keep',
        items: [
          'Your name, email, mobile number and delivery addresses, to deliver orders and keep you updated.',
          'Your orders, wishlist and reviews.',
          'Your marketing choices (email, SMS, WhatsApp) and when you made them.',
          'Chats with our shopping assistant, with your IP address, the approximate location worked out from it and your device, for security and to stop abuse. Chats are deleted automatically after a set time.',
        ],
      },
      {
        heading: 'Your rights',
        text: 'Under Sri Lanka’s Personal Data Protection Act you can see, download, correct or delete your data. Signed-in customers can do this themselves in [Account › Privacy & data](/account/privacy); anyone can also ask us by email.',
      },
      {
        heading: 'Sharing',
        text: 'We share your delivery details only with the courier delivering your order, and payment details only with the payment provider you choose. We never sell your data.',
      },
    ],
  },
}

/** A summary as plain text (for the shopping assistant). */
export function summaryText(kind: PolicyKind) {
  const s = POLICY_SUMMARIES[kind]
  const md = (t: string) => t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
  return [
    md(s.intro),
    ...s.sections.map((x) => [`${x.heading}:`, ...(x.text ? [md(x.text)] : []), ...(x.items ?? []).map((i) => `- ${md(i)}`)].join('\n')),
  ].join('\n')
}
