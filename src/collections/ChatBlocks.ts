import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { section } from '../fields/section'
import { isIp, parseCidr } from '../lib/assistant/ip'
import { audit } from '../lib/payload/audit'

export const BLOCK_TYPES = [
  { label: 'IP address', value: 'ip' },
  { label: 'IP range (CIDR)', value: 'range' },
  { label: 'Device (this browser)', value: 'visitor' },
  { label: 'Customer account', value: 'customer' },
] as const

/**
 * Shopping assistant blocks: shoppers or bots that may not use the chat. Checked by the chat endpoint
 * before Gemini is called (src/lib/assistant/blocks.ts keeps them in memory and reloads after changes).
 */
export const ChatBlocks: CollectionConfig = {
  slug: 'chat-blocks',
  labels: { singular: 'Chat block', plural: 'Chat blocks' },
  admin: {
    hideAPIURL: true,
    group: 'Insights',
    useAsTitle: 'label',
    defaultColumns: ['label', 'type', 'reason', 'expiresAt', 'hits', 'createdAt'],
    description: 'IP addresses, devices and accounts that can’t use the shopping assistant.',
  },
  access: {
    read: allowRoles('store-manager', 'support'),
    create: allowRoles('store-manager'),
    update: allowRoles('store-manager'),
    delete: allowRoles('store-manager'),
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data
        if (data.type !== 'customer') data.value = String(data.value ?? '').trim().toLowerCase()
        if (operation === 'create' && req.user && !data.blockedBy) data.blockedBy = req.user.id
        return data
      },
    ],
    beforeChange: [
      async ({ data, req }) => {
        // Readable title for the list: "IP 203.0.113.7", "Device 3f2a…", "Customer jane@example.com"
        if (data.type === 'customer' && data.customer) {
          const id = typeof data.customer === 'object' ? data.customer.id : data.customer
          const u = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req }).catch(() => null)
          data.label = `Customer ${u?.email ?? id}`
        } else {
          const kind = { ip: 'IP', range: 'IP range', visitor: 'Device' }[data.type as 'ip'] ?? 'Block'
          data.label = `${kind} ${data.type === 'visitor' ? String(data.value).slice(0, 8) + '…' : data.value}`
        }
        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation, previousDoc }) => {
        const { bumpBlocks } = await import('../lib/assistant/blocks')
        bumpBlocks()
        // Hit counters change on every blocked attempt; only log real edits
        if (req.user && (operation === 'create' || doc.expiresAt !== previousDoc?.expiresAt || doc.reason !== previousDoc?.reason)) {
          await audit(req, { action: 'content-change', collection: 'chat-blocks', docId: doc.id, summary: `${operation === 'create' ? 'Blocked' : 'Updated block'}: ${doc.label}` })
        }
      },
    ],
    afterDelete: [
      async ({ req, doc }) => {
        const { bumpBlocks } = await import('../lib/assistant/blocks')
        bumpBlocks()
        if (req.user) await audit(req, { action: 'content-change', collection: 'chat-blocks', docId: doc.id, summary: `Unblocked: ${doc.label}` })
      },
    ],
  },
  fields: [
    { name: 'label', type: 'text', admin: { hidden: true } },
    section('Who is blocked', 'They see “Chat isn’t available right now” with a WhatsApp link instead of the assistant.', [
      { name: 'type', type: 'select', required: true, defaultValue: 'ip', options: [...BLOCK_TYPES] },
      {
        name: 'value',
        type: 'text',
        admin: {
          condition: (_, s) => s?.type !== 'customer',
          description: 'IP address (e.g. 203.0.113.7), range (e.g. 203.0.113.0/24) or the device ID from a chat.',
        },
        validate: (value: string | null | undefined, { siblingData }: { siblingData: { type?: string } }) => {
          if (siblingData?.type === 'customer') return true
          const v = String(value ?? '').trim().toLowerCase()
          if (!v) return 'Required'
          if (siblingData?.type === 'ip' && !isIp(v)) return 'Enter an IPv4 or IPv6 address, e.g. 203.0.113.7'
          if (siblingData?.type === 'range' && !parseCidr(v)) return 'Enter a range like 203.0.113.0/24'
          if (siblingData?.type === 'visitor' && !/^[a-f0-9-]{16,64}$/.test(v)) return 'Copy the device ID from a chat'
          return true
        },
      },
      {
        name: 'customer',
        type: 'relationship',
        relationTo: 'users',
        admin: { condition: (_, s) => s?.type === 'customer' },
        validate: (value: unknown, { siblingData }: { siblingData: { type?: string } }) => (siblingData?.type === 'customer' && !value ? 'Pick the customer' : true),
      },
      { name: 'reason', type: 'textarea', admin: { placeholder: 'e.g. Sent 300 messages in 10 minutes' } },
    ]),
    section('Duration', 'Leave empty to block until you remove it.', [
      { name: 'expiresAt', label: 'Blocked until', type: 'date', index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ], { sidebar: true }),
    section('Record', 'Filled in automatically.', [
      { name: 'blockedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
      { name: 'conversation', label: 'From chat', type: 'relationship', relationTo: 'chat-conversations', admin: { readOnly: true } },
      { name: 'hits', label: 'Blocked attempts', type: 'number', defaultValue: 0, admin: { readOnly: true } },
      { name: 'lastHitAt', label: 'Last attempt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    ], { sidebar: true }),
  ],
}
