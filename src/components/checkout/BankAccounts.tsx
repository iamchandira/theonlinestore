import type { BankAccount } from '@/lib/payments/config'

/** Bank accounts to pay into (Admin › Settings › Payments › Bank transfer), with an optional note. */
export function BankAccounts({ accounts, note }: { accounts: BankAccount[]; note?: string }) {
  if (!accounts.length && !note) return null
  return (
    <div className="flex flex-col gap-2">
      {accounts.map((a) => (
        <dl key={`${a.bankName}-${a.accountNumber}`} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg bg-white/80 px-3 py-2.5 text-sm">
          <dt className="text-ink-500">Bank</dt>
          <dd className="font-semibold">
            {a.bankName}
            {a.branch ? ` · ${a.branch}` : ''}
          </dd>
          <dt className="text-ink-500">Account name</dt>
          <dd className="font-semibold">{a.accountName}</dd>
          <dt className="text-ink-500">Account no.</dt>
          <dd className="font-mono font-semibold tracking-wide">{a.accountNumber}</dd>
          {a.branchCode ? (
            <>
              <dt className="text-ink-500">Branch code</dt>
              <dd>{a.branchCode}</dd>
            </>
          ) : null}
          {a.swift ? (
            <>
              <dt className="text-ink-500">SWIFT</dt>
              <dd>{a.swift}</dd>
            </>
          ) : null}
        </dl>
      ))}
      {note ? <p className="whitespace-pre-line text-sm">{note}</p> : null}
    </div>
  )
}
