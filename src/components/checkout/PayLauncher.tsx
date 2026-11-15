'use client'

import { IconLock, IconRefresh } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { startPaymentAction } from '@/app/(frontend)/checkout/pay/actions'
import { Button } from '@/components/ui/Button'

/**
 * Hands the shopper to the payment gateway (Sprint 5). Starts a fresh attempt on the server, then either
 * submits PayHere's signed form or follows a redirect. Starts by itself once when arriving from checkout.
 */
export function PayLauncher({
  orderNumber,
  token,
  label,
  autoStart,
}: {
  orderNumber: string
  token: string
  label: string
  autoStart: boolean
}) {
  const [state, setState] = useState<'idle' | 'starting' | 'leaving'>(
    autoStart ? 'starting' : 'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<{ action: string; fields: Record<string, string> } | null>(null)
  const started = useRef(false)

  const go = async () => {
    setError(null)
    setState('starting')
    const res = await startPaymentAction(orderNumber, token)
    if ('error' in res) {
      setError(res.error)
      setState('idle')
      return
    }
    setState('leaving')
    if (res.kind === 'redirect') window.location.assign(res.url)
    else setForm({ action: res.action, fields: res.fields })
  }

  useEffect(() => {
    if (form) formRef.current?.submit()
  }, [form])

  useEffect(() => {
    if (!autoStart) return
    // Mark it started only when it actually runs: React runs effects twice in development
    const t = setTimeout(() => {
      if (started.current) return
      started.current = true
      void go()
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        block
        onClick={() => void go()}
        loading={state !== 'idle'}
        disabled={state !== 'idle'}
      >
        {state === 'idle' ? (
          <>
            {autoStart ? <IconLock size={18} /> : <IconRefresh size={18} />} {label}
          </>
        ) : (
          'Taking you to the secure payment page…'
        )}
      </Button>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}
      {form && (
        <form ref={formRef} method="post" action={form.action} className="hidden">
          {Object.entries(form.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  )
}
