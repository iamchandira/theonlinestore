'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'

/**
 * Status in the product action bar: a coloured pill instead of "Status: Published" in grey text, plus an
 * "Unsaved changes" note while the form has edits. Same rules as Payload's own status (which stays for its
 * "Revert to published" action).
 */
export function ProductStatus() {
  const { id, hasPublishedDoc, unpublishedVersionCount } = useDocumentInfo()
  const modified = useFormModified()

  const status = !id ? 'new' : !hasPublishedDoc ? 'draft' : unpublishedVersionCount > 0 ? 'changed' : 'published'
  const pill = {
    new: { label: 'New product', tone: 'muted', hint: 'Not on the store until published' },
    draft: { label: 'Draft', tone: 'warning', hint: 'Not on the store yet' },
    changed: { label: 'Published', tone: 'success', hint: 'Has saved changes that aren’t published yet' },
    published: { label: 'Published', tone: 'success', hint: 'Live on the store' },
  }[status]

  return (
    <div className="tos-docstatus" role="status">
      {modified && <span className="tos-docstatus__unsaved">Unsaved changes</span>}
      <span className={`tos-pill tos-pill--${pill.tone}`} title={pill.hint}>
        {pill.label}
        {status === 'changed' && <span className="tos-docstatus__more">· changes not published</span>}
      </span>
    </div>
  )
}
