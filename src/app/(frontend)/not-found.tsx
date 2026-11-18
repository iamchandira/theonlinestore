import { IconArrowLeft, IconBrandWhatsapp } from '@tabler/icons-react'
import Link from 'next/link'

import { BrandLoader } from '@/components/brand/BrandLoader'
import { ButtonLink } from '@/components/ui/Button'
import { categories as allCategories, liveCategories } from '@/config/navigation'
import { getStoreSettings } from '@/lib/store/settings'

export const metadata = { title: 'Page not found' }

/** Friendly 404 with routes back into shopping: no dead ends. */
export default async function NotFound() {
  const { contact, categories: slugs } = await getStoreSettings()
  const categories = liveCategories(allCategories, new Set(slugs))
  return (
    <section className="container-site flex flex-col items-center py-16 text-center md:py-24">
      <BrandLoader size={96} label="Page not found" />
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">This page took a little detour</h1>
      <p className="mt-3 max-w-md text-ink-600">
        The page you’re looking for has moved, or it’s still being built. Let’s get you back to the good stuff.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          <IconArrowLeft size={19} /> Back to home
        </ButtonLink>
        {contact.whatsapp && (
          <ButtonLink href={`https://wa.me/${contact.whatsapp}`} size="lg" variant="outline">
            <IconBrandWhatsapp size={19} /> Ask us on WhatsApp
          </ButtonLink>
        )}
      </div>
      <nav aria-label="Popular categories" className="mt-10 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <Link key={c.slug} href={c.href} className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium leading-10 hover:border-ink-900">
            {c.name}
          </Link>
        ))}
      </nav>
    </section>
  )
}
