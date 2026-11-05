import { useEffect, useState } from 'react'
import { BigPesos } from '../../components/BigPesos'
import { formatDay } from '../../dates'
import { formatPesos } from '../../money'
import { AdjustBalanceSheet } from '../transactions/AdjustBalanceSheet'
import { TransactionSheet } from '../transactions/TransactionSheet'
import {
  useAccountHistory,
  type HistoryItem,
} from '../transactions/transactions'
import { AccountSheet } from './AccountSheet'
import { accountTypeLabels } from './accounts'

type OpenSheet =
  | { kind: 'account' }
  | { kind: 'adjust' }
  | { kind: 'transaction'; transaction?: HistoryItem }

function describe(item: HistoryItem) {
  if (item.transferUuid) {
    return `${item.amount < 0 ? 'To' : 'From'} ${item.counterpartName ?? 'deleted account'}`
  }
  return item.note || (item.amount < 0 ? 'Money out' : 'Money in')
}

export function AccountScreen({ uuid }: { uuid: string }) {
  const data = useAccountHistory(uuid)
  const [sheet, setSheet] = useState<OpenSheet | null>(null)

  useEffect(() => {
    if (data === null) window.location.hash = ''
  }, [data])

  if (!data) return null

  const { account, balance, days } = data

  return (
    <main className="mx-auto max-w-xl px-6 pb-12">
      <header className="mt-2 flex h-11 items-center justify-between">
        <a
          href="#"
          className="-ml-1 flex h-11 items-center gap-1 pr-2 text-[17px] font-medium"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 3 5 8l5 5" />
          </svg>
          Accounts
        </a>
        <button
          type="button"
          className="h-11 pl-2 text-[17px] font-medium"
          onClick={() => setSheet({ kind: 'account' })}
        >
          Edit
        </button>
      </header>

      <p className="mt-1 text-[13px] font-medium text-muted">
        {accountTypeLabels[account.type]}
      </p>
      <h1 className="text-[32px] leading-tight font-extrabold tracking-[-0.02em] break-words">
        {account.name}
      </h1>
      <BigPesos className="mt-3" centavos={balance} />

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="h-11 rounded-full bg-accent px-5 text-[15px] font-medium text-on-accent"
          onClick={() => setSheet({ kind: 'transaction' })}
        >
          Add transaction
        </button>
        <button
          type="button"
          className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium"
          onClick={() => setSheet({ kind: 'adjust' })}
        >
          Adjust balance
        </button>
      </div>

      {days.length === 0 ? (
        <p className="mt-12 text-[17px] text-muted">No transactions yet.</p>
      ) : (
        days.map((day) => (
          <section key={day.date} className="mt-10">
            <h2 className="text-[13px] font-medium text-muted">
              {formatDay(day.date)}
            </h2>
            <ul>
              {day.items.map((item) => (
                <li key={item.uuid}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 py-3 text-left"
                    onClick={() =>
                      setSheet({ kind: 'transaction', transaction: item })
                    }
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[17px] font-medium">
                        {describe(item)}
                      </div>
                      {item.transferUuid && item.note && (
                        <div className="truncate text-[13px] text-muted">
                          {item.note}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div
                        className={`text-[17px] font-medium ${item.amount > 0 ? 'text-accent' : ''}`}
                      >
                        {item.amount > 0 ? '+' : ''}
                        {formatPesos(item.amount)}
                      </div>
                      <div className="text-[13px] text-faint">
                        {formatPesos(item.balanceAfter)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {sheet?.kind === 'account' && (
        <AccountSheet account={account} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'adjust' && (
        <AdjustBalanceSheet
          accountUuid={account.uuid}
          balance={balance}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'transaction' && (
        <TransactionSheet
          accountUuid={account.uuid}
          transaction={sheet.transaction}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  )
}
