import type { Access, CollectionConfig } from 'payload'

import { allowRoles, isStaff } from '../access/roles'

/** Staff see every photo; the public only sees photos attached to an approved review. */
const publicOrStaff: Access = ({ req }) => (isStaff(req.user) ? true : { public: { equals: true } })

/**
 * Shopper review photos (TOS-206). Kept apart from the product Media library so customer uploads
 * never mix with catalogue images, and so pending photos stay private until the review is approved.
 */
export const ReviewMedia: CollectionConfig = {
  slug: 'review-media',
  labels: { singular: 'Review photo', plural: 'Review photos' },
  admin: { group: 'Catalogue', description: 'Photos shoppers attached to reviews. Visible on the store once the review is approved.' },
  access: {
    read: publicOrStaff,
    create: allowRoles('store-manager', 'marketing', 'support'),
    update: allowRoles('store-manager', 'marketing', 'support'),
    delete: allowRoles('store-manager', 'marketing', 'support'),
  },
  fields: [
    { name: 'alt', type: 'text', defaultValue: 'Customer photo' },
    {
      name: 'public',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Set automatically when the review is approved.' },
    },
  ],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    imageSizes: [
      { name: 'thumb', width: 200, height: 200, fit: 'cover' },
      { name: 'large', width: 1200, withoutEnlargement: true },
    ],
    formatOptions: { format: 'webp', options: { quality: 80 } },
  },
}
