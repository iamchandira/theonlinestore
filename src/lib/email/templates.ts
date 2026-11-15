/**
 * Branded transactional emails (Sprint 3: verify, reset, account requests).
 * Table-based, inline-styled HTML so it renders in Gmail, Outlook and phone mail apps.
 * Sprint 7 moves these to editable templates with SMS/WhatsApp variants.
 */

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

type Block = { heading: string; intro: string; cta?: { label: string; url: string }; after?: string; footnote?: string }

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
    cta: { label: 'Confirm my email', url: `${SITE()}/account/verify?token=${encodeURIComponent(token)}` },
    footnote: 'If you didn’t create an account, you can ignore this email.',
  })

export const resetPassword = (name: string | null | undefined, token: string, isStaff: boolean) =>
  layout({
    heading: 'Reset your password',
    intro: `Hi ${first(name)}, we received a request to reset the password for your account. The link works once and expires in 1 hour.`,
    cta: {
      label: 'Choose a new password',
      url: isStaff ? `${SITE()}/admin/reset/${encodeURIComponent(token)}` : `${SITE()}/account/reset-password?token=${encodeURIComponent(token)}`,
    },
    footnote: 'If you didn’t ask for this, you can ignore this email; your password won’t change.',
  })

export const deletionRequested = (name: string | null | undefined) =>
  layout({
    heading: 'We’ve received your account deletion request',
    intro: `Hi ${first(name)}, our team will delete your account and personal data within 14 days, as required by Sri Lanka’s Personal Data Protection Act. Order records we must keep for tax purposes are anonymised.`,
    after: 'Changed your mind? Sign in and cancel the request from <strong>Account › Privacy</strong> before then.',
    footnote: 'If you didn’t make this request, sign in and change your password straight away.',
  })
