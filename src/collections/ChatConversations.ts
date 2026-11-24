import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { section } from '../fields/section'

const ro = { readOnly: true }

/**
 * Shopping assistant log: one document per chat. Written only by the chat endpoint
 * (src/endpoints/assistant.ts); staff read it to see what shoppers ask, spot gaps and stop abuse.
 * IP, location and device are kept for security and deleted with the chat after the retention period
 * (Admin › Settings › Chat assistant).
 */
export const ChatConversations: CollectionConfig = {
  slug: 'chat-conversations',
  labels: { singular: 'Chat', plural: 'Chat conversations' },
  admin: {
    hideAPIURL: true,
    group: 'Insights',
    useAsTitle: 'title',
    defaultColumns: ['title', 'who', 'location', 'messageCount', 'suspicious', 'unanswered', 'handoffClicked', 'createdAt'],
    listSearchableFields: ['title', 'who', 'ip', 'visitorId'],
    description: 'Every chat with the shopping assistant. Flags show questions it couldn’t answer and possible bots.',
  },
  access: {
    read: allowRoles('store-manager', 'marketing', 'support'),
    create: () => false,
    update: () => false,
    delete: allowRoles('store-manager'),
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'title', type: 'text', admin: { hidden: true } },
    // [{ role: 'user' | 'assistant', text, products?: string[], at }]
    { name: 'messages', type: 'json', admin: { hidden: true } },
    section('Conversation', 'What the shopper asked and what the assistant replied.', [
      { name: 'transcript', type: 'ui', admin: { components: { Field: '/components/admin/assistant/ChatTranscript#ChatTranscript' } } },
    ]),
    section('Unanswered', 'Questions the assistant couldn’t answer from the store’s information: add them under Chat assistant › Knowledge.', [
      { name: 'unanswered', type: 'checkbox', defaultValue: false, index: true, admin: ro },
      { name: 'unansweredQuestions', label: 'Questions', type: 'textarea', admin: { ...ro, condition: (d) => Boolean(d?.unanswered) } },
    ]),
    section('Block', 'Stop this shopper or bot from using the chat.', [
      { name: 'blockActions', type: 'ui', admin: { components: { Field: '/components/admin/assistant/BlockVisitor#BlockVisitor' } } },
    ], { sidebar: true }),
    section('Who', 'Signed-in customer, or a guest.', [
      { name: 'who', label: 'Shopper', type: 'text', defaultValue: 'Guest', admin: ro },
      { name: 'customer', type: 'relationship', relationTo: 'users', admin: { ...ro, condition: (d) => Boolean(d?.customer) } },
      { name: 'visitorId', label: 'Device ID', type: 'text', index: true, admin: { ...ro, description: 'Random ID kept in this browser.' } },
      { name: 'startPage', label: 'Started on', type: 'text', admin: ro },
      { name: 'product', label: 'Product being viewed', type: 'relationship', relationTo: 'products', admin: { ...ro, condition: (d) => Boolean(d?.product) } },
    ], { sidebar: true }),
    section('Where from', 'Worked out from the IP address. IP location by DB-IP (db-ip.com).', [
      { name: 'ip', label: 'IP address', type: 'text', index: true, admin: ro },
      { name: 'lastIp', label: 'Latest IP address', type: 'text', admin: { ...ro, condition: (d) => Boolean(d?.lastIp && d.lastIp !== d.ip) } },
      { name: 'location', type: 'text', admin: ro },
      { name: 'countryCode', label: 'Country code', type: 'text', index: true, admin: ro },
      { name: 'network', type: 'text', admin: { ...ro, description: 'Internet provider (ASN).' } },
      { name: 'datacenter', label: 'Hosting / datacenter network', type: 'checkbox', defaultValue: false, admin: { ...ro, description: 'Real shoppers rarely come from these; bots often do.' } },
      { name: 'device', type: 'text', admin: ro },
      { name: 'userAgent', label: 'Browser details', type: 'textarea', admin: ro },
      { name: 'referrer', type: 'text', admin: ro },
    ], { sidebar: true }),
    section('Signals', 'Automatic checks for bots and abuse.', [
      { name: 'suspicious', type: 'checkbox', defaultValue: false, index: true, admin: ro },
      { name: 'suspiciousReasons', label: 'Why', type: 'text', admin: { ...ro, condition: (d) => Boolean(d?.suspicious) } },
      {
        type: 'row',
        fields: [
          { name: 'limitHits', label: 'Limit hits', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
          { name: 'fastMessages', label: 'Too-fast messages', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
        ],
      },
    ], { sidebar: true }),
    section('Usage', 'Size of the chat and what it cost in Gemini tokens.', [
      {
        type: 'row',
        fields: [
          { name: 'messageCount', label: 'Shopper messages', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
          { name: 'productsShown', label: 'Products shown', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
        ],
      },
      { name: 'handoffClicked', label: 'Moved to WhatsApp', type: 'checkbox', defaultValue: false, index: true, admin: ro },
      {
        type: 'row',
        fields: [
          { name: 'inputTokens', label: 'Input tokens', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
          { name: 'outputTokens', label: 'Output tokens', type: 'number', defaultValue: 0, admin: { ...ro, width: '50%' } },
        ],
      },
      { name: 'day', type: 'text', index: true, admin: { ...ro, description: 'YYYY-MM-DD (Asia/Colombo)' } },
      { name: 'lastMessageAt', label: 'Last message', type: 'date', admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
    ], { sidebar: true }),
  ],
}
