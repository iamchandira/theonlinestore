'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * Phones show admin tables as one card per row (see `.tos-table` in custom.scss). Each cell needs its
 * column name to show beside the value, so this copies every table's headings onto its cells as
 * `data-label`, and marks the first named column as the row's title. Runs again whenever rows change
 * (paging, filters, tabs).
 */
export function TableLabels({ children }: { children?: ReactNode }) {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>('table.tos-table').forEach((table) => {
        const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent?.trim() ?? '')
        const primary = heads.findIndex((h) => h)
        table.querySelectorAll('tbody tr').forEach((tr) => {
          ;[...tr.children].forEach((td, i) => {
            if (td.getAttribute('data-label') === null) td.setAttribute('data-label', heads[i] ?? '')
            if (i === primary) td.setAttribute('data-primary', '')
          })
        })
      })
    }
    label()
    const observer = new MutationObserver(label)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return <>{children}</>
}
