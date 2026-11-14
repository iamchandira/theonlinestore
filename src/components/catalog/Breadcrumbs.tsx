import { IconChevronRight, IconHome } from '@tabler/icons-react'
import Link from 'next/link'

import { site } from '@/config/site'
import type { Crumb } from '@/lib/catalog'

import { JsonLd } from './JsonLd'

/** Breadcrumb trail with BreadcrumbList structured data. The last crumb is the current page (not a link). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Home', href: '/' }, ...items]
  return (
    <nav aria-label="Breadcrumb" className="scrollbar-none -mx-4 overflow-x-auto px-4">
      <ol className="flex items-center gap-1 whitespace-nowrap text-sm text-ink-500">
        {all.map((c, i) => {
          const last = i === all.length - 1
          return (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <IconChevronRight size={14} className="text-ink-300" aria-hidden />}
              {last ? (
                <span aria-current="page" className="font-medium text-ink-800">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="inline-flex items-center gap-1 rounded hover:text-sunset-600">
                  {i === 0 ? (
                    <>
                      <IconHome size={15} aria-hidden />
                      <span className="sr-only">Home</span>
                    </>
                  ) : (
                    c.name
                  )}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${site.url}${c.href}` })),
        }}
      />
    </nav>
  )
}
