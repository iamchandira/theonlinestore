'use client'

import { useRowLabel } from '@payloadcms/ui'

import { AnnouncementIcon } from '../../../lib/store/announcementIcons'

/** Collapsed announcement rows show their icon and text instead of "Message 01". */
export function AnnouncementRowLabel() {
  const { data, rowNumber } = useRowLabel<{ text?: string; icon?: string | null }>()
  return (
    <span className="tos-rowlabel">
      <AnnouncementIcon icon={data?.icon} index={rowNumber ?? 0} size={17} stroke={1.75} />
      <strong>{data?.text || `Message ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</strong>
    </span>
  )
}
