import type { CollectionConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'
import { uploadDir } from '../lib/payload/uploads'

/** Product photos, banners and editorial images. Sizes match storefront usage (4:5 product cards). */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content', description: 'Product photos, banners and logos. Uploads are converted to WebP automatically.' },
  access: {
    read: anyone,
    create: allowRoles('store-manager', 'inventory-manager', 'marketing'),
    update: allowRoles('store-manager', 'inventory-manager', 'marketing'),
    delete: allowRoles('store-manager'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Describe the image for screen readers and SEO, e.g. "CeraVe Hydrating Facial Cleanser 236 ml bottle".' },
    },
    { name: 'credit', type: 'text' },
  ],
  upload: {
    staticDir: uploadDir('media'),
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 160, height: 200, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } },
      { name: 'card', width: 600, height: 750, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } },
      { name: 'large', width: 1400 },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
  },
}
