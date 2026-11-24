'use client'

import type { CollapsibleFieldLabelClientComponent } from 'payload'

/** Section card header on edit pages: the title with its one-line hint underneath. */
export const SectionLabel: CollapsibleFieldLabelClientComponent = ({ field }) => {
  const title = typeof field?.label === 'string' ? field.label : ''
  const hint = typeof field?.admin?.description === 'string' ? field.admin.description : ''
  return (
    <span className="tos-section__head">
      <span className="tos-section__title">{title}</span>
      {hint && <span className="tos-section__hint">{hint}</span>}
    </span>
  )
}
