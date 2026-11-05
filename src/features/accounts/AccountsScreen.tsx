import { useState } from 'react'
import type { Account } from '../../db/db'
import { formatPesos } from '../../money'
import { AccountSheet } from './AccountSheet'
import { accountTypeLabels, useAccountsWithBalances } from './accounts'

export function AccountsScreen() {
  const accounts = useAccountsWithBalances()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)

  if (!accounts) return null

  const total = formatPesos(accounts.reduce((sum, a) => sum + a.balance, 0))
  const dot = total.lastIndexOf('.')

  return (
    <main className="mx-auto max-w-xl px-6 pb-12">
      <header className="mt-3 flex h-11 items-center justify-between">
        <span className="text-[15px] font-medium text-muted">Total</span>
        <button
          type="button"
          aria-label="Add account"
          className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent active:opacity-80"
          onClick={() => setEditing('new')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M10 3v14M3 10h14" />
          </svg>
        </button>
      </header>

      <p className="mt-1 text-[min(52px,13vw)] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
        {total.slice(0, dot)}
        <span className="text-faint">{total.slice(dot)}</span>
      </p>

      {accounts.length === 0 ? (
        <p className="mt-14 text-[17px] text-muted">
          No accounts yet. Tap + to add your first one.
        </p>
      ) : (
        <ul className="mt-12 flex flex-col gap-2">
          {accounts.map((account) => (
            <li key={account.uuid}>
              <button
                type="button"
                className="flex w-full items-end justify-between gap-3 py-2.5 text-left active:opacity-60"
                onClick={() => setEditing(account)}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-muted">
                    {accountTypeLabels[account.type]}
                  </div>
                  <div className="mt-0.5 truncate text-[24px] font-extrabold tracking-[-0.02em]">
                    {account.name}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-[20px] font-medium tabular-nums ${account.balance < 0 ? 'text-negative' : ''}`}
                >
                  {formatPesos(account.balance)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AccountSheet
          account={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}
