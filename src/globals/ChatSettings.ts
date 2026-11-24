import type { GlobalConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { audit } from '../lib/payload/audit'
import { section } from '../fields/section'

export const DEFAULT_GREETING =
  'Hi! I can help you find the right product, or answer questions about delivery, payment and returns. What are you looking for today?'

/**
 * Shopping assistant (chatbot): switch, wording, extra knowledge, model and usage limits. The Gemini API
 * key is never stored here: it lives in the server's .env as GEMINI_API_KEY.
 */
export const ChatSettings: GlobalConfig = {
  slug: 'chat-settings',
  label: 'Chat assistant',
  admin: {
    group: 'Settings',
    hideAPIURL: true,
    description: 'The shopping assistant on the store: what it says, what it knows and how much it can be used.',
  },
  access: { read: allowRoles('store-manager', 'marketing', 'support'), update: allowRoles('store-manager') },
  hooks: {
    afterChange: [
      async ({ req }) => {
        const { refreshStoreSettings } = await import('../lib/store/refresh')
        refreshStoreSettings()
        if (req.user) await audit(req, { action: 'content-change', collection: 'chat-settings', summary: 'Chat assistant settings updated' })
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            section('Assistant', 'Shown in the chat button and at the top of the chat.', [
              {
                name: 'enabled',
                label: 'Show the assistant on the store',
                type: 'checkbox',
                defaultValue: true,
                admin: { description: 'It also needs GEMINI_API_KEY in the server settings; without it the chat stays hidden.' },
              },
              {
                type: 'row',
                fields: [
                  { name: 'botName', label: 'Name', type: 'text', required: true, defaultValue: 'TOS Assistant', admin: { width: '50%' } },
                  { name: 'tagline', label: 'Line under the name', type: 'text', defaultValue: 'Usually replies instantly', admin: { width: '50%' } },
                ],
              },
              { name: 'greeting', label: 'Greeting', type: 'textarea', required: true, defaultValue: DEFAULT_GREETING },
              {
                name: 'starters',
                label: 'Suggested questions',
                type: 'array',
                maxRows: 6,
                labels: { singular: 'Question', plural: 'Questions' },
                admin: { description: 'Tappable questions under the greeting. Keep them short.' },
                defaultValue: [
                  { text: 'Help me choose a moisturiser' },
                  { text: 'Gift ideas under Rs 5,000' },
                  { text: 'How much is delivery?' },
                  { text: 'What is your return policy?' },
                ],
                fields: [{ name: 'text', type: 'text', required: true, maxLength: 60 }],
              },
              {
                name: 'tone',
                label: 'Tone and style',
                type: 'textarea',
                admin: { description: 'Optional, e.g. "Friendly and warm, like a helpful shop assistant. Use simple words."' },
              },
            ]),
          ],
        },
        {
          label: 'Knowledge',
          fields: [
            section(
              'Questions and answers',
              'Anything the assistant should know that isn’t already in Store details, Checkout, Payments or Policies.',
              [
                {
                  name: 'faqs',
                  label: false,
                  type: 'array',
                  labels: { singular: 'Question', plural: 'Questions' },
                  admin: { components: { RowLabel: '/components/admin/TitleRowLabel#TitleRowLabel' } },
                  fields: [
                    { name: 'title', label: 'Question', type: 'text', required: true },
                    { name: 'answer', type: 'textarea', required: true },
                  ],
                },
              ],
            ),
            section('Extra notes', 'Facts, rules or current news for the assistant, in plain sentences.', [
              {
                name: 'notes',
                label: false,
                type: 'textarea',
                admin: { placeholder: 'e.g. Our shop in Nugegoda is open for pick-ups Mon–Sat 10 am–6 pm. Avurudu orders close on 10 April.' },
              },
            ]),
          ],
        },
        {
          label: 'Limits',
          fields: [
            section('Per shopper', 'Stops one person or bot from using up the assistant.', [
              {
                type: 'row',
                fields: [
                  { name: 'perHour', label: 'Messages per hour', type: 'number', required: true, min: 1, max: 500, defaultValue: 20, admin: { width: '33%' } },
                  { name: 'perDay', label: 'Messages per day', type: 'number', required: true, min: 1, max: 2000, defaultValue: 60, admin: { width: '33%' } },
                  { name: 'perConversation', label: 'Messages per chat', type: 'number', required: true, min: 2, max: 200, defaultValue: 40, admin: { width: '33%' } },
                ],
              },
              {
                type: 'row',
                fields: [
                  { name: 'maxLength', label: 'Longest message (characters)', type: 'number', required: true, min: 50, max: 2000, defaultValue: 500, admin: { width: '50%' } },
                  {
                    name: 'ipMultiplier',
                    label: 'Shared connection allowance',
                    type: 'number',
                    required: true,
                    min: 1,
                    max: 50,
                    defaultValue: 5,
                    admin: { width: '50%', description: 'One IP address may send this many times the per-shopper limits (mobile networks share IPs).' },
                  },
                ],
              },
            ]),
            section('Whole store', 'Keeps the Gemini bill predictable.', [
              {
                name: 'dailyCap',
                label: 'Messages per day, all shoppers together',
                type: 'number',
                required: true,
                min: 1,
                defaultValue: 2000,
                admin: { description: 'When reached, the chat asks shoppers to use WhatsApp until midnight (Sri Lanka time).' },
              },
            ]),
            section('Automatic blocking', 'Blocks an IP address for 24 hours when it keeps hitting the limits.', [
              { name: 'autoBlock', label: 'Block automatically', type: 'checkbox', defaultValue: false },
              {
                name: 'autoBlockThreshold',
                label: 'Limit hits within an hour before blocking',
                type: 'number',
                min: 2,
                max: 100,
                defaultValue: 5,
                admin: { condition: (_, s) => Boolean(s?.autoBlock) },
              },
            ]),
          ],
        },
        {
          label: 'Model & privacy',
          fields: [
            section('Model', 'Which Gemini model answers. Change only if Google retires the current one.', [
              {
                type: 'row',
                fields: [
                  { name: 'model', label: 'Model ID', type: 'text', required: true, defaultValue: 'gemini-flash-latest', admin: { width: '50%' } },
                  {
                    name: 'backupModel',
                    label: 'Backup model',
                    type: 'text',
                    defaultValue: 'gemini-flash-lite-latest',
                    admin: { width: '50%', description: 'Answers when the main model is busy. Leave empty for none.' },
                  },
                ],
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'temperature',
                    label: 'Creativity (0–1)',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 1,
                    defaultValue: 0.4,
                    admin: { width: '25%', step: 0.1 },
                  },
                  { name: 'maxOutputTokens', label: 'Longest reply (tokens)', type: 'number', required: true, min: 200, max: 4000, defaultValue: 1200, admin: { width: '25%' } },
                ],
              },
            ]),
            section('Conversation log', 'Chats are saved with the IP address, location and device for security.', [
              {
                name: 'retentionDays',
                label: 'Delete chats after (days)',
                type: 'number',
                required: true,
                min: 1,
                max: 730,
                defaultValue: 90,
                admin: { description: 'Mention this in your Privacy policy. IP addresses and locations are deleted with the chat.' },
              },
            ]),
          ],
        },
      ],
    },
  ],
}
