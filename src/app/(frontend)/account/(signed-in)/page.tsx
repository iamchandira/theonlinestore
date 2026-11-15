import { IconArrowRight, IconMapPin, IconPackage, IconShieldLock, IconUserCircle } from '@tabler/icons-react'
import Link from 'next/link'

import { FormAlert } from '@/components/account/Form'
import { WishlistCount } from '@/components/account/WishlistCount'
import { requireUser } from '@/lib/auth/server'

/** Account overview: one card per area, each with the most useful fact. */
export default async function AccountOverview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser('/account')
  const sp = await searchParams
  const def = user.addresses?.find((a) => a.isDefault) ?? user.addresses?.[0]
  const cards = [
    { href: '/account/orders', icon: IconPackage, title: 'Orders', text: 'No orders yet. Your orders and tracking will appear here.' },
    {
      href: '/account/addresses',
      icon: IconMapPin,
      title: 'Addresses',
      text: def ? `${def.recipientName}, ${def.line1}, ${def.city} (default)` : 'Save an address for one-tap checkout.',
    },
    { href: '/account/profile', icon: IconUserCircle, title: 'Profile & password', text: user.phone ? `${user.fullName ?? ''} · ${user.phone}` : 'Add your mobile for delivery updates.' },
    {
      href: '/account/privacy',
      icon: IconShieldLock,
      title: 'Privacy & data',
      text: user.marketingOptIn
        ? `You get offers by ${(user.marketingChannels ?? []).map((c) => ({ email: 'email', sms: 'SMS', whatsapp: 'WhatsApp' })[c]).join(', ')}.`
        : 'You don’t receive offers. Change any time.',
    },
  ]
  return (
    <div className="flex flex-col gap-6">
      {sp.reset && <FormAlert tone="success">Your password was changed and you’re signed in.</FormAlert>}
      {user.deletionRequestedAt && (
        <FormAlert tone="info">
          You asked us to delete this account. You can cancel the request in{' '}
          <Link href="/account/privacy" className="font-semibold underline">
            Privacy &amp; data
          </Link>
          .
        </FormAlert>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-card">
              <span className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-sunset-50 text-sunset-600">
                  <Icon size={22} />
                </span>
                <IconArrowRight size={18} className="text-ink-400 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="text-lg font-bold">{title}</span>
              <span className="text-sm text-ink-600">{text}</span>
            </Link>
          </li>
        ))}
        <li>
          <WishlistCount />
        </li>
      </ul>
    </div>
  )
}
