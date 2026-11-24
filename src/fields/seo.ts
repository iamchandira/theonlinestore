import { MetaDescriptionField, MetaImageField, MetaTitleField, OverviewField, PreviewField } from '@payloadcms/plugin-seo/fields'
import type { Field } from 'payload'

import { section } from './section'

/**
 * The SEO plugin's fields (stored as `meta`, as before) in a section card. Used where the plugin would
 * otherwise add them outside the cards; its "Auto-generate" buttons keep working.
 */
export const seoMeta = (): Field => ({
  name: 'meta',
  type: 'group',
  label: false,
  fields: [
    OverviewField({}),
    MetaTitleField({ hasGenerateFn: true }),
    MetaDescriptionField({ hasGenerateFn: true }),
    MetaImageField({ relationTo: 'media', hasGenerateFn: false }),
    PreviewField({ hasGenerateFn: false }),
  ],
})

export const seoSection = () =>
  section('Search engine listing', 'How this page appears in Google and when its link is shared. Leave empty to use the name and description.', [seoMeta()], {
    collapsed: true,
  })
