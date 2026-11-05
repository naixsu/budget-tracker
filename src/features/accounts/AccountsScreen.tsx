import { useState } from 'react'
import type { Account } from '../../db/db'
import { formatPesos } from '../../money'
import { AccountSheet } from './AccountSheet'
import { accountTypeLabels, useAccountsWithBalances } from './accounts'

export function AccountsScreen() {
  const accounts = useAccountsWithBalances()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)

  if (!accounts) return null

  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <main className="mx-auto max-w-xl px-4 pb-10">
      <header className="flex h-11 items-center justify-end">
        <button
          type="button"
          className="text-[17px] text-tint"
          onClick={() => setEditing('new')}
        >
          Add
        </button>
      </header>

      <h1 className="text-[34px] leading-tight font-bold tracking-tight">
        Accounts
      </h1>

      <p className="mt-1 text-[15px] text-label-secondary">
        Total{' '}
        <span className="font-semibold text-label tabular-nums">
          {formatPesos(total)}
        </span>
      </p>

      {accounts.length === 0 ? (
        <p className="mt-6 rounded-[10px] bg-cell px-4 py-3 text-label-secondary">
          No accounts yet. Tap Add to create one.
        </p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-[10px] bg-cell">
          {accounts.map((account) => (
            <li key={account.uuid} className="group">
              <button
                type="button"
                className="w-full pl-4 text-left active:bg-separator/30"
                onClick={() => setEditing(account)}
              >
                <div className="flex items-center gap-3 border-b-[0.5px] border-separator py-2.5 pr-4 group-last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px]">{account.name}</div>
                    <div className="text-[13px] text-label-secondary">
                      {accountTypeLabels[account.type]}
                    </div>
                  </div>
                  <div
                    className={`text-[17px] tabular-nums ${account.balance < 0 ? 'text-negative' : ''}`}
                  >
                    {formatPesos(account.balance)}
                  </div>
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
