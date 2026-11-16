import type { Payload, PayloadRequest } from 'payload'

import type { PaymentSetting } from '@/payload-types'

import type { OnlineMethod, PaymentMethod } from '../../collections/Transactions'

/**
 * Resolved payment configuration (Sprint 5). Credentials come from environment variables first, then the
 * Payments settings page. Read on the server only; nothing here is ever sent to the browser.
 */

export type GatewayMode = 'test' | 'live'

export type MethodConfig = {
  id: PaymentMethod
  enabled: boolean
  sortOrder: number
  minOrder: number
  maxOrder: number // 0 = no limit
  label: string
}

export type PaymentConfig = {
  mode: GatewayMode
  onlineHoldMinutes: number
  /** The built-in test gateway may stand in for a gateway without credentials */
  simulatorAllowed: boolean
  methods: Record<PaymentMethod, MethodConfig>
  payhere: { merchantId: string; merchantSecret: string; appId: string; appSecret: string }
  koko: { merchantId: string; apiKey: string; privateKey: string; publicKey: string }
  mintpay: { merchantId: string; merchantSecret: string }
  cod: { fee: number; excludedDistricts: string[] }
  bankTransfer: { instructions: string; holdHours: number }
}

const env = (k: string) => (process.env[k] ?? '').trim()
const pick = (envKey: string, stored?: string | null) => env(envKey) || (stored ?? '').trim()

/**
 * The test gateway never runs on the live site: it needs Test mode and either a non-production build or
 * ALLOW_TEST_GATEWAY=true (set in local .env so production builds can be tested end to end).
 */
export function simulatorPermitted(mode: GatewayMode, setting: boolean) {
  if (!setting || mode !== 'test') return false
  return process.env.NODE_ENV !== 'production' || env('ALLOW_TEST_GATEWAY') === 'true'
}

export async function loadPaymentConfig(
  payload: Payload,
  req?: Partial<PayloadRequest>,
): Promise<PaymentConfig> {
  const s = (await payload.findGlobal({
    slug: 'payment-settings',
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    req,
  })) as PaymentSetting
  const mode: GatewayMode = s.mode === 'live' ? 'live' : 'test'
  const m = (
    id: PaymentMethod,
    g:
      | {
          enabled?: boolean | null
          sortOrder?: number | null
          minOrder?: number | null
          maxOrder?: number | null
          label?: string | null
        }
      | null
      | undefined,
    d: Omit<MethodConfig, 'id'>,
  ): MethodConfig => ({
    id,
    enabled: Boolean(g?.enabled ?? d.enabled),
    sortOrder: g?.sortOrder ?? d.sortOrder,
    minOrder: g?.minOrder ?? d.minOrder,
    maxOrder: g?.maxOrder ?? d.maxOrder,
    label: g?.label || d.label,
  })
  return {
    mode,
    onlineHoldMinutes: s.onlineHoldMinutes ?? 60,
    simulatorAllowed: simulatorPermitted(mode, s.simulateGateways ?? true),
    methods: {
      payhere: m('payhere', s.payhere, {
        enabled: true,
        sortOrder: 10,
        minOrder: 0,
        maxOrder: 0,
        label: 'Card, eZ Cash, mCash or Genie',
      }),
      koko: m('koko', s.koko, {
        enabled: true,
        sortOrder: 20,
        minOrder: 1000,
        maxOrder: 100000,
        label: 'Koko: 3 interest-free instalments',
      }),
      mintpay: m('mintpay', s.mintpay, {
        enabled: true,
        sortOrder: 30,
        minOrder: 1000,
        maxOrder: 150000,
        label: 'Mintpay: 3 interest-free instalments',
      }),
      cod: m('cod', s.cod, {
        enabled: true,
        sortOrder: 40,
        minOrder: 0,
        maxOrder: 50000,
        label: 'Cash on delivery',
      }),
      'bank-transfer': m('bank-transfer', s.bankTransfer as never, {
        enabled: true,
        sortOrder: 50,
        minOrder: 0,
        maxOrder: 0,
        label: 'Bank transfer',
      }),
    },
    payhere: {
      merchantId: pick('PAYHERE_MERCHANT_ID', s.payhere?.merchantId),
      merchantSecret: pick('PAYHERE_MERCHANT_SECRET', s.payhere?.merchantSecret),
      appId: pick('PAYHERE_APP_ID', s.payhere?.appId),
      appSecret: pick('PAYHERE_APP_SECRET', s.payhere?.appSecret),
    },
    koko: {
      merchantId: pick('KOKO_MERCHANT_ID', s.koko?.merchantId),
      apiKey: pick('KOKO_API_KEY', s.koko?.apiKey),
      privateKey: pick('KOKO_PRIVATE_KEY', s.koko?.privateKey),
      publicKey: pick('KOKO_PUBLIC_KEY', s.koko?.publicKey),
    },
    mintpay: {
      merchantId: pick('MINTPAY_MERCHANT_ID', s.mintpay?.merchantId),
      merchantSecret: pick('MINTPAY_MERCHANT_SECRET', s.mintpay?.merchantSecret),
    },
    cod: { fee: s.cod?.fee ?? 0, excludedDistricts: (s.cod?.excludedDistricts ?? []) as string[] },
    bankTransfer: {
      instructions: s.bankTransfer?.instructions ?? '',
      holdHours: s.bankTransfer?.holdHours ?? 48,
    },
  }
}

/**
 * How an online method would be paid right now:
 * - 'gateway'   real gateway (credentials present and the integration is verified)
 * - 'simulator' the built-in test gateway
 * - null        not usable (shown as unavailable)
 * Koko and Mintpay share their APIs only with signed-up merchants, so their live adapters are switched on
 * once the merchant guides arrive (see docs/04-architecture.md, "Payments"); until then only the test gateway runs them.
 */
export function gatewayRoute(
  cfg: PaymentConfig,
  method: OnlineMethod,
): 'gateway' | 'simulator' | null {
  const hasCreds =
    method === 'payhere' ? Boolean(cfg.payhere.merchantId && cfg.payhere.merchantSecret) : false
  if (hasCreds) return 'gateway'
  return cfg.simulatorAllowed ? 'simulator' : null
}
