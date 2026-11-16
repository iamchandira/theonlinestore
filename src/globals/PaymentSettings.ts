import type { Field, FieldAccess, GlobalConfig } from 'payload'

import { allowRoles, fieldSuperAdminOnly } from '../access/roles'
import { DISTRICT_NAMES } from '../config/districts'
import { audit } from '../lib/payload/audit'

/**
 * Payment settings (Sprint 5, TOS-601). One switch, order and limits per method. Gateway credentials can
 * only be read or changed by a Super Admin (RBAC matrix), and an environment variable with the same purpose
 * always wins over the stored value (see lib/payments/config.ts). Checkout reads this on the server only.
 */
const secret: FieldAccess = fieldSuperAdminOnly

const methodBasics = (
  defaults: { enabled: boolean; sortOrder: number; minOrder?: number; maxOrder?: number },
  opts: { limits?: boolean } = {},
): Field[] => [
  {
    type: 'row',
    fields: [
      {
        name: 'enabled',
        type: 'checkbox',
        defaultValue: defaults.enabled,
        admin: { width: '25%' },
      },
      {
        name: 'sortOrder',
        label: 'Position at checkout',
        type: 'number',
        defaultValue: defaults.sortOrder,
        admin: { width: '25%', description: 'Lower shows first' },
      },
      ...(opts.limits === false
        ? []
        : ([
            {
              name: 'minOrder',
              label: 'Minimum order (Rs)',
              type: 'number',
              min: 0,
              defaultValue: defaults.minOrder ?? 0,
              admin: { width: '25%' },
            },
            {
              name: 'maxOrder',
              label: 'Maximum order (Rs)',
              type: 'number',
              min: 0,
              defaultValue: defaults.maxOrder ?? 0,
              admin: { width: '25%', description: '0 = no limit' },
            },
          ] as Field[])),
    ],
  },
]

const credential = (name: string, label: string, description?: string, textarea = false): Field =>
  ({
    name,
    label,
    type: textarea ? 'textarea' : 'text',
    access: { read: secret, update: secret },
    admin: {
      description: description ?? 'Super Admin only. An environment variable overrides this.',
    },
  }) as Field

export const PaymentSettings: GlobalConfig = {
  slug: 'payment-settings',
  label: 'Payments',
  admin: {
    group: 'Settings',
    description:
      'Which payment methods shoppers see, in what order, with what limits; gateway credentials.',
  },
  access: {
    read: allowRoles('store-manager', 'support'),
    update: allowRoles(), // admins; credential fields are Super Admin only
  },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc }) => {
        if (!req.user) return
        const methods = ['payhere', 'koko', 'mintpay', 'cod', 'bankTransfer'] as const
        const changes = methods
          .filter(
            (m) =>
              Boolean((doc as Record<string, { enabled?: boolean }>)[m]?.enabled) !==
              Boolean((previousDoc as Record<string, { enabled?: boolean }>)?.[m]?.enabled),
          )
          .map(
            (m) =>
              `${m} ${(doc as Record<string, { enabled?: boolean }>)[m]?.enabled ? 'on' : 'off'}`,
          )
        await audit(req, {
          action: 'content-change',
          collection: 'payment-settings',
          summary: `Payment settings updated${changes.length ? ` (${changes.join(', ')})` : ''}; mode ${doc.mode}`,
        })
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'mode',
          type: 'select',
          defaultValue: 'test',
          required: true,
          options: [
            { label: 'Test (sandbox gateways)', value: 'test' },
            { label: 'Live (real money)', value: 'live' },
          ],
          admin: {
            width: '50%',
            description:
              'Test uses each gateway’s sandbox. Switch to Live only with live credentials.',
          },
        },
        {
          name: 'onlineHoldMinutes',
          label: 'Hold unpaid card / instalment orders for (minutes)',
          type: 'number',
          min: 15,
          defaultValue: 60,
          admin: {
            width: '50%',
            description: 'Then the order is cancelled and its stock goes back.',
          },
        },
      ],
    },
    {
      name: 'simulateGateways',
      label: 'Use the built-in test gateway when credentials are missing (never in production)',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Lets you try card, Koko and Mintpay checkout locally with Approve / Decline buttons. Ignored on the live site.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Card (PayHere)',
          fields: [
            {
              name: 'payhere',
              type: 'group',
              label: false,
              fields: [
                ...methodBasics({ enabled: true, sortOrder: 10 }),
                {
                  name: 'label',
                  type: 'text',
                  defaultValue: 'Card, eZ Cash, mCash or Genie',
                  admin: { description: 'Shown at checkout' },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      ...credential(
                        'merchantId',
                        'Merchant ID',
                        'Super Admin only. PAYHERE_MERCHANT_ID overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                    {
                      ...credential(
                        'merchantSecret',
                        'Merchant secret',
                        'Super Admin only. PAYHERE_MERCHANT_SECRET overrides this. Generated per domain in PayHere › Settings › Domains & Credentials.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      ...credential(
                        'appId',
                        'App ID (for refunds)',
                        'Super Admin only. PAYHERE_APP_ID overrides this. Create a Business App with the Payment Refund permission in PayHere.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                    {
                      ...credential(
                        'appSecret',
                        'App secret (for refunds)',
                        'Super Admin only. PAYHERE_APP_SECRET overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Koko',
          description:
            'Live Koko payments switch on once Koko sends its merchant integration guide for this account (their API is private). Until then Koko runs on the built-in test gateway in Test mode only and is hidden on the live site.',
          fields: [
            {
              name: 'koko',
              type: 'group',
              label: false,
              fields: [
                ...methodBasics({ enabled: true, sortOrder: 20, minOrder: 1000, maxOrder: 100000 }),
                { name: 'label', type: 'text', defaultValue: 'Koko: 3 interest-free instalments' },
                {
                  type: 'row',
                  fields: [
                    {
                      ...credential(
                        'merchantId',
                        'Merchant ID',
                        'Super Admin only. KOKO_MERCHANT_ID overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                    {
                      ...credential(
                        'apiKey',
                        'API key',
                        'Super Admin only. KOKO_API_KEY overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                  ],
                },
                credential(
                  'privateKey',
                  'Merchant private key (PEM)',
                  'Super Admin only. KOKO_PRIVATE_KEY overrides this.',
                  true,
                ),
                credential(
                  'publicKey',
                  'Koko public key (PEM)',
                  'Super Admin only. Used to check Koko’s callbacks. KOKO_PUBLIC_KEY overrides this.',
                  true,
                ),
              ],
            },
          ],
        },
        {
          label: 'Mintpay',
          description:
            'Live Mintpay payments switch on once Mintpay sends its merchant integration guide for this account (their API is private). Until then Mintpay runs on the built-in test gateway in Test mode only and is hidden on the live site.',
          fields: [
            {
              name: 'mintpay',
              type: 'group',
              label: false,
              fields: [
                ...methodBasics({ enabled: true, sortOrder: 30, minOrder: 1000, maxOrder: 150000 }),
                {
                  name: 'label',
                  type: 'text',
                  defaultValue: 'Mintpay: 3 interest-free instalments',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      ...credential(
                        'merchantId',
                        'Merchant ID',
                        'Super Admin only. MINTPAY_MERCHANT_ID overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                    {
                      ...credential(
                        'merchantSecret',
                        'Merchant secret',
                        'Super Admin only. MINTPAY_MERCHANT_SECRET overrides this.',
                      ),
                      admin: { width: '50%' },
                    } as Field,
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Cash on delivery',
          fields: [
            {
              name: 'cod',
              type: 'group',
              label: false,
              fields: [
                ...methodBasics({ enabled: true, sortOrder: 40, maxOrder: 50000 }),
                { name: 'fee', label: 'COD fee (Rs)', type: 'number', min: 0, defaultValue: 0 },
                {
                  name: 'excludedDistricts',
                  label: 'Not available in',
                  type: 'select',
                  hasMany: true,
                  options: DISTRICT_NAMES,
                  admin: { description: 'Districts the couriers can’t collect cash in.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Bank transfer',
          fields: [
            {
              name: 'bankTransfer',
              type: 'group',
              label: false,
              fields: [
                ...methodBasics({ enabled: true, sortOrder: 50 }, { limits: false }),
                {
                  name: 'instructions',
                  type: 'textarea',
                  defaultValue:
                    'Bank: [Bank name] · Account name: The Online Store (Pvt) Ltd · Account no: [to be added] · Branch: [branch]',
                  admin: {
                    description:
                      'Shown after ordering and in the confirmation email. Shoppers use their order number as the reference.',
                  },
                },
                {
                  name: 'holdHours',
                  label: 'Hold the order for (hours)',
                  type: 'number',
                  min: 1,
                  defaultValue: 48,
                  admin: {
                    description:
                      'Unpaid orders with no slip are cancelled after this and the stock goes back.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
