import type { ReactNode } from 'react'

import { SmileUnderline } from '@/components/ui/SectionHeader'

/** Simple policy page layout. The full legal texts are finalised with the owner before launch (Sprint 9). */
export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="container-site max-w-3xl py-10 md:py-14">
      <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
      <SmileUnderline className="mt-1" />
      <p className="mt-4 text-lg text-ink-700">{intro}</p>
      <p className="mt-3 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
        This is a plain-language summary of how we work today. The full policy will be published before launch; questions are welcome on WhatsApp or email.
      </p>
      <div className="mt-8 flex flex-col gap-6 leading-relaxed text-ink-800 [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </article>
  )
}
