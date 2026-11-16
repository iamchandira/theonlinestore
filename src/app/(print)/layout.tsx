import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { fontVariables } from '../(frontend)/fonts'
import './print.css'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Bare layout for printable documents (invoices, packing slips): no store header, nav or chat. */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
