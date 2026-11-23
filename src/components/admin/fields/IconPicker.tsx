'use client'

import { FieldLabel, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

import { ANNOUNCEMENT_ICONS, NO_ICON } from '../../../lib/store/announcementIcons'

/** Announcement bar message icon: a grid of icons to click instead of a dropdown of names. */
export const IconPicker: SelectFieldClientComponent = ({ field, path }) => {
  const { value, setValue, readOnly } = useField<string | null>({ path: path ?? field.name })
  const options = [...ANNOUNCEMENT_ICONS, { value: NO_ICON, label: 'No icon', Icon: null }]
  return (
    <div className="field-type tos-iconpick">
      <FieldLabel label={field.label ?? 'Icon'} path={path} />
      <div className="tos-iconpick__grid" role="radiogroup" aria-label="Icon">
        {options.map(({ value: v, label, Icon }) => {
          const selected = (value || '') === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              title={label}
              disabled={readOnly}
              className={`tos-iconpick__opt${selected ? ' tos-iconpick__opt--on' : ''}`}
              onClick={() => setValue(selected ? null : v)}
            >
              {Icon ? <Icon size={20} stroke={1.75} aria-hidden /> : <span className="tos-iconpick__none">Aa</span>}
              <span className="tos-iconpick__label">{label}</span>
            </button>
          )
        })}
      </div>
      {!value && <p className="field-description">No icon picked: the bar uses a standard icon for this position.</p>}
    </div>
  )
}
