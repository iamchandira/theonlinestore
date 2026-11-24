'use client'

import { useRowLabel } from '@payloadcms/ui'

/** Collapsed array rows show their title (e.g. a home-page rail's "Deals of the day") instead of "Rail 03". */
export function TitleRowLabel() {
  const { data, rowNumber, path } = useRowLabel<{ title?: string; label?: string; name?: string }>()
  const title = data?.title || data?.label || data?.name
  const fallback = `${String(path ?? '').includes('rails') ? 'Rail' : 'Row'} ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  return (
    <span className="tos-rowlabel">
      <strong>{title || fallback}</strong>
    </span>
  )
}
