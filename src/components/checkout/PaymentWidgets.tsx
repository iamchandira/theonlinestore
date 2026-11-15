'use client'

import { IconCloudUpload, IconLoader2 } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'

/** Checks every few seconds whether the gateway has confirmed the payment, then refreshes the page. */
export function PaymentPoller({ orderNumber, token }: { orderNumber: string; token: string }) {
  const router = useRouter()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    let tries = 0
    let stop = false
    const tick = async () => {
      if (stop) return
      tries += 1
      const res = await fetch(
        `/api/orders/payment-status?n=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      ).catch(() => null)
      const json = res?.ok ? ((await res.json()) as { paymentStatus: string }) : null
      if (json && json.paymentStatus !== 'pending' && json.paymentStatus !== 'unpaid')
        return router.refresh()
      if (tries === 10) setSlow(true)
      if (tries < 40) setTimeout(tick, tries < 10 ? 2000 : 6000)
    }
    const t = setTimeout(tick, 1500)
    return () => {
      stop = true
      clearTimeout(t)
    }
  }, [orderNumber, token, router])
  return (
    <p className="flex items-center gap-2 text-sm text-ink-600">
      <IconLoader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
      {slow
        ? 'Still waiting for the gateway. We’ll email you as soon as it’s confirmed; it’s safe to close this page.'
        : 'Checking…'}
    </p>
  )
}

/** Bank transfer slip upload (TOS-605): photo or PDF, up to 8 MB. */
export function SlipUpload({ orderNumber, token }: { orderNumber: string; token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [name, setName] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const file = fd.get('file')
    if (!(file instanceof File) || !file.size)
      return setError('Choose a photo or PDF of your slip first.')
    if (file.size > 8 * 1024 * 1024)
      return setError('That file is over 8 MB. Please choose a smaller photo.')
    setBusy(true)
    fd.set('orderNumber', orderNumber)
    fd.set('t', token)
    const res = await fetch('/api/orders/slip', { method: 'POST', body: fd }).catch(() => null)
    const json = res
      ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string })
      : { error: 'No connection. Please try again.' }
    setBusy(false)
    if (!json.ok) return setError(json.error ?? 'Upload failed. Please try again.')
    setDone(true)
    setName('')
    if (input.current) input.current.value = ''
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2 rounded-xl bg-white/80 p-3">
      <label htmlFor="slip-file" className="text-sm font-semibold">
        {done ? 'Slip sent. Send another?' : 'Upload your payment slip'}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 text-sm text-ink-700 hover:border-ink-900">
          <IconCloudUpload size={18} aria-hidden />
          <span className="truncate">{name || 'Choose a photo or PDF'}</span>
          <input
            ref={input}
            id="slip-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="sr-only"
            onChange={(e) => setName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
        <Button type="submit" loading={busy} disabled={busy}>
          Send slip
        </Button>
      </div>
      <input
        name="note"
        maxLength={300}
        placeholder="Note (optional), e.g. paid from my husband’s account"
        className="h-10 rounded-lg border border-line-strong px-3 text-sm"
        aria-label="Note for our team"
      />
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </form>
  )
}
