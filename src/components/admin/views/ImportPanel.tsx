'use client'

import { IconCheck, IconFileUpload, IconRefresh } from '@tabler/icons-react'
import { useRef, useState } from 'react'

import type { ImportResult } from '@/endpoints/productsCsv'

const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-LK'))

/** Upload → preview every change → apply. */
export function ImportPanel() {
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const run = async (csv: string, apply: boolean) => {
    setBusy(apply ? 'apply' : 'preview')
    setError(null)
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, apply }),
      })
      const json = (await res.json()) as ImportResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      setPreview(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(null)
    }
  }
  const load = async (f?: File | null) => {
    if (!f) return
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') return setError('Choose a .csv file (in Excel: File › Save As › CSV UTF-8).')
    const csv = await f.text()
    setFile({ name: f.name, csv })
    setPreview(null)
    void run(csv, false)
  }
  const reset = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (input.current) input.current.value = ''
  }

  const s = preview?.summary
  return (
    <section className="tos-card" style={{ marginTop: 20 }}>
      <div className="tos-card__head">
        <h2>Import prices &amp; stock</h2>
        {file && (
          <button type="button" className="tos-btn tos-btn--sm tos-btn--ghost" onClick={reset}>
            <IconRefresh size={15} /> Start over
          </button>
        )}
      </div>
      <div className="tos-card__body tos-stack">
        {!file && (
          <label
            className={`tos-dropzone${drag ? ' tos-dropzone--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              void load(e.dataTransfer.files?.[0])
            }}
          >
            <IconFileUpload size={28} />
            <strong>Drop a CSV here, or choose a file</strong>
            <span>Up to 5,000 rows · 5 MB</span>
            <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => void load(e.target.files?.[0])} className="tos-sr-only" />
          </label>
        )}
        {busy === 'preview' && <p className="tos-muted">Checking {file?.name}…</p>}
        {error && <div className="tos-alert tos-alert--error">{error}</div>}

        {s && (
          <>
            <div className={`tos-alert ${s.applied ? 'tos-alert--success' : s.errors ? 'tos-alert--warning' : 'tos-alert--info'}`}>
              {s.applied ? (
                <>
                  <IconCheck size={16} /> Done: {s.changes} change{s.changes === 1 ? '' : 's'} saved across {s.productsUpdated} product{s.productsUpdated === 1 ? '' : 's'}.
                </>
              ) : (
                <>
                  {file?.name}: {s.lines} rows, {s.matched} matched SKUs, <strong>{s.changes} change{s.changes === 1 ? '' : 's'}</strong>
                  {s.errors ? `, ${s.errors} row${s.errors === 1 ? '' : 's'} with problems (they’ll be skipped)` : ''}. Nothing has been saved yet.
                </>
              )}
            </div>
            {preview!.rows.length > 0 && (
              <div className="tos-table-wrap" style={{ maxHeight: 460 }}>
                <table className="tos-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview!.rows.map((r) => (
                      <tr key={r.line}>
                        <td className="tos-mono">{r.line}</td>
                        <td className="tos-mono">{r.sku || '—'}</td>
                        <td>
                          {r.product ?? '—'}
                          {r.variant && <small style={{ display: 'block', color: 'var(--tos-muted)' }}>{r.variant}</small>}
                        </td>
                        <td>
                          {r.error ? (
                            <span className="tos-pill tos-pill--danger tos-pill--plain">{r.error}</span>
                          ) : (
                            <span className="tos-changes">
                              {r.changes.map((c) => (
                                <span key={c.field}>
                                  {c.field}: <s>{fmt(c.from)}</s> → <strong>{fmt(c.to)}</strong>
                                </span>
                              ))}
                              {r.skipped.map((k) => (
                                <span key={k} className="tos-muted">
                                  Skipped {k}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!s.applied && (
              <div className="tos-actions">
                <button type="button" className="tos-btn tos-btn--primary" disabled={!s.changes || busy !== null} onClick={() => file && run(file.csv, true)}>
                  <IconCheck size={17} /> {busy === 'apply' ? 'Saving…' : `Apply ${s.changes} change${s.changes === 1 ? '' : 's'}`}
                </button>
                <button type="button" className="tos-btn" onClick={reset} disabled={busy !== null}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
