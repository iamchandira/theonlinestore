import type { CollapsibleField, Condition, Field } from 'payload'

/**
 * A titled section card on an edit page: the title and a one-line hint in the card header, the fields
 * inside. Presentation only (a collapsible field), so field names and stored data don't change.
 * A page drops its single big card once every field on it (or in a tab) is inside a section.
 */
export function section(
  title: string,
  hint: string,
  fields: Field[],
  opts: { sidebar?: boolean; collapsed?: boolean; condition?: Condition } = {},
): CollapsibleField {
  return {
    type: 'collapsible',
    label: title,
    admin: {
      className: 'tos-section',
      description: hint,
      components: { Label: '/components/admin/SectionLabel#SectionLabel' },
      ...(opts.sidebar ? { position: 'sidebar' as const } : {}),
      ...(opts.collapsed ? { initCollapsed: true } : {}),
      ...(opts.condition ? { condition: opts.condition } : {}),
    },
    fields,
  }
}
