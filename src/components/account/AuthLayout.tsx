import { IconHeart, IconMapPin, IconPackage, IconShieldCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { SmileUnderline } from '@/components/ui/SectionHeader'

const PERKS = [
  { icon: IconPackage, text: 'Track every order in one place' },
  { icon: IconMapPin, text: 'Save addresses for one-tap checkout' },
  { icon: IconHeart, text: 'Your wishlist on every device' },
  { icon: IconShieldCheck, text: 'Early access to offers, if you want them' },
]

/** Sign-in / sign-up pages: the form card, with a warm brand panel beside it on larger screens. */
export function AuthLayout({ title, subtitle, children, aside = true }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: boolean }) {
  return (
    <div className="container-site py-8 md:py-14">
      <div className={aside ? 'mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : 'mx-auto max-w-lg'}>
        {aside && (
          <div className="relative hidden flex-col justify-between gap-8 bg-tint-gifts p-10 md:flex">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-700">Your account</p>
              <p className="mt-2 font-display text-3xl font-bold leading-tight">Shop more. Live better.</p>
              <SmileUnderline className="mt-1" />
            </div>
            <ul className="flex flex-col gap-4">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-ink-800">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-sunset-600 shadow-soft">
                    <Icon size={20} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-600">Genuine brands · Island-wide delivery · Cash on delivery</p>
          </div>
        )}
        <div className={aside ? 'p-6 sm:p-10' : 'rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-10'}>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
