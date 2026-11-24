import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

import type { Policy } from '@/payload-types'

import { getPayloadClient } from '@/lib/catalog/server'
import { POLICY_SUMMARIES, type PolicyKind } from '@/lib/store/policySummaries'

import { SmileUnderline } from '@/components/ui/SectionHeader'

/** Simple policy page layout. The full legal texts are finalised with the owner before launch (Sprint 9). */
type Kind = PolicyKind
type Body = NonNullable<Policy['termsBody']>

const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' })

async function loadPolicy(kind: Kind) {
  const payload = await getPayloadClient()
  const p = (await payload.findGlobal({ slug: 'policies', depth: 0 })) as Policy
  const body = p[`${kind}Body`] as Body | null | undefined
  const written = Boolean(body?.root?.children?.some((c) => JSON.stringify(c).includes('"text":"') && !JSON.stringify(c).includes('"text":""')))
  return { title: (p[`${kind}Title`] as string | null | undefined) || null, body: written ? body : null, version: kind === 'terms' ? p.termsVersion : null, updatedAt: p.updatedAt }
}

/** Page title from Admin › Settings › Policies; only indexed by search engines once the owner has written it. */
export async function policyMetadata(kind: Kind, fallbackTitle: string): Promise<Metadata> {
  const p = await loadPolicy(kind)
  return { title: p.title ?? fallbackTitle, robots: { index: Boolean(p.body) } }
}

/**
 * Policy pages (/terms, /returns, /privacy). Show the text written in Admin › Settings › Policies; until
 * it is written, the plain-language summary from lib/store/policySummaries.ts with a note that the full policy is coming.
 */
/** Summary text with [label](/path) links turned into internal links. */
function withLinks(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\(\/[^)]*\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/)
    return m ? (
      <Link key={i} href={m[2]} className="font-semibold underline">
        {m[1]}
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  })
}

export async function PolicyPage({ kind, title }: { kind: Kind; title: string }) {
  const summary = POLICY_SUMMARIES[kind]
  const p = await loadPolicy(kind)
  return (
    <article className="container-site max-w-3xl py-10 md:py-14">
      <h1 className="text-3xl font-extrabold md:text-4xl">{p.title ?? title}</h1>
      <SmileUnderline className="mt-1" />
      {p.body ? (
        <>
          <p className="mt-3 text-sm text-ink-500">
            Last updated {p.updatedAt ? dayFmt.format(new Date(p.updatedAt)) : 'recently'}
            {p.version ? ` · Version ${p.version}` : ''}
          </p>
          <div className="mt-8 flex flex-col gap-4 leading-relaxed text-ink-800 [&_a]:font-semibold [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
            <RichText data={p.body} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-lg text-ink-700">{summary.intro}</p>
          <p className="mt-3 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
            This is a plain-language summary of how we work today. The full policy will be published soon; questions are welcome on WhatsApp or email.
          </p>
          <div className="mt-8 flex flex-col gap-6 leading-relaxed text-ink-800 [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5">
            {summary.sections.map((sec) => (
              <section key={sec.heading}>
                <h2>{sec.heading}</h2>
                {sec.text ? <p>{withLinks(sec.text)}</p> : null}
                {sec.items?.length ? (
                  <ul>
                    {sec.items.map((item) => (
                      <li key={item}>{withLinks(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  )
}
