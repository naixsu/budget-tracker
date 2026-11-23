import { useState } from 'react'
import { BigPesos } from '../../components/BigPesos'
import { Sheet } from '../../components/Sheet'
import { SyncSection } from '../../sync/SyncSection'
import { BackupSection } from '../backup/BackupSection'
import { formatPesos } from '../../money'
import { AccountSheet } from './AccountSheet'
import { accountTypeLabels, useAccountsWithBalances } from './accounts'

export function AccountsScreen() {
  const accounts = useAccountsWithBalances()
  const [isAdding, setIsAdding] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (!accounts) return null
  const topLevel = accounts.filter((a) => !a.parentName)

  return (
    <main className="mx-auto max-w-xl px-6 pb-12">
      <header className="mt-2 flex h-11 items-center justify-end">
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-full bg-surface"
            onClick={() => setIsSettingsOpen(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="4" cy="10" r="1.75" />
              <circle cx="10" cy="10" r="1.75" />
              <circle cx="16" cy="10" r="1.75" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Add account"
            className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent"
            onClick={() => setIsAdding(true)}
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
        </div>
      </header>

      <p className="mt-4 text-[15px] font-medium text-muted">Total</p>
      <BigPesos
        className="mt-1"
        centavos={accounts.reduce((sum, a) => sum + a.balance, 0)}
      />

      {accounts.length === 0 ? (
        <p className="mt-14 text-[17px] text-muted">
          No accounts yet. Tap + to add your first one.
        </p>
      ) : (
        <ul className="mt-10 -mx-4">
          {topLevel.map((account) => {
            const categories = accounts.filter(
              (a) => a.parentUuid === account.uuid,
            )
            return (
              <li key={account.uuid} className="rounded-2xl odd:bg-stripe">
                <a
                  href={`#/accounts/${account.uuid}`}
                  className="flex items-end justify-between gap-3 px-4 py-4"
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
                    className={`shrink-0 text-[20px] font-medium tabular-nums ${account.totalBalance < 0 ? 'text-negative' : ''}`}
                  >
                    {formatPesos(account.totalBalance)}
                  </div>
                </a>
                {categories.length > 0 && (
                  <ul className="-mt-2 pb-2">
                    {categories.map((category) => (
                      <li key={category.uuid}>
                        <a
                          href={`#/accounts/${category.uuid}`}
                          className="flex items-baseline justify-between gap-3 py-2 pr-4 pl-8"
                        >
                          <span className="truncate text-[17px] font-medium">
                            {category.name}
                          </span>
                          <span
                            className={`shrink-0 text-[17px] font-medium tabular-nums ${category.balance < 0 ? 'text-negative' : 'text-muted'}`}
                          >
                            {formatPesos(category.balance)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {isAdding && <AccountSheet onClose={() => setIsAdding(false)} />}
      {isSettingsOpen && (
        <Sheet
          title="Settings"
          closeLabel="Done"
          onClose={() => setIsSettingsOpen(false)}
        >
          <SyncSection />
          <BackupSection />
        </Sheet>
      )}
    </main>
  )
}
