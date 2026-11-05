import { useId, useState, type FormEvent } from 'react'
import type { Account, AccountType } from '../../db/db'
import { centavosToInput, parsePesos } from '../../money'
import {
  accountTypeLabels,
  addAccount,
  deleteAccount,
  updateAccount,
} from './accounts'

interface Props {
  account?: Account
  onClose: () => void
}

const accountTypes = Object.keys(accountTypeLabels) as AccountType[]

export function AccountSheet({ account, onClose }: Props) {
  const nameId = useId()
  const balanceId = useId()
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [balanceInput, setBalanceInput] = useState(
    account ? centavosToInput(account.openingBalance) : '',
  )

  const openingBalance =
    balanceInput.trim() === '' ? 0 : parsePesos(balanceInput)
  const canSave = name.trim() !== '' && openingBalance !== null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return

    const draft = { name: name.trim(), type, openingBalance }
    if (account) {
      await updateAccount(account.uuid, draft)
    } else {
      await addAccount(draft)
    }
    onClose()
  }

  async function handleDelete() {
    if (!account) return
    if (
      !confirm(`Delete ${account.name}? Its transactions will be deleted too.`)
    ) {
      return
    }
    await deleteAccount(account.uuid)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-h-[92dvh] w-full max-w-xl animate-sheet-up overflow-y-auto rounded-t-[20px] bg-page px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <header className="flex h-16 items-center justify-between">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">
            {account ? 'Edit account' : 'New account'}
          </h2>
          <button
            type="button"
            className="h-11 text-[15px] font-medium text-muted"
            onClick={onClose}
          >
            Cancel
          </button>
        </header>

        <label
          htmlFor={nameId}
          className="mt-4 block text-[13px] font-medium text-muted"
        >
          Name
        </label>
        <input
          id={nameId}
          className="w-full border-b-2 border-line bg-transparent py-2 text-[24px] font-extrabold outline-none placeholder:font-medium placeholder:text-faint focus:border-ink"
          placeholder="BPI Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={!account}
        />

        <p className="mt-8 text-[13px] font-medium text-muted">Type</p>
        <div className="mt-2 flex gap-2">
          {accountTypes.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === type}
              className={`h-11 rounded-full px-5 text-[15px] font-medium ${t === type ? 'bg-ink text-page' : 'bg-surface'}`}
              onClick={() => setType(t)}
            >
              {accountTypeLabels[t]}
            </button>
          ))}
        </div>

        <label
          htmlFor={balanceId}
          className="mt-8 block text-[13px] font-medium text-muted"
        >
          Starting balance
        </label>
        <div className="flex items-baseline border-b-2 border-line focus-within:border-ink">
          <span className="text-[32px] font-extrabold text-faint">₱</span>
          <input
            id={balanceId}
            className="w-full bg-transparent py-2 pl-1 text-[32px] font-extrabold tabular-nums outline-none placeholder:text-faint"
            placeholder="0.00"
            inputMode="decimal"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
        </div>
        <p
          className={`mt-2 text-[13px] ${openingBalance === null ? 'text-negative' : 'text-muted'}`}
        >
          {openingBalance === null
            ? 'Enter an amount like 1,234.56'
            : 'What the account has right now. Later changes go in as transactions.'}
        </p>

        <button
          type="submit"
          className="mt-10 h-14 w-full rounded-full bg-accent text-[17px] font-medium text-on-accent disabled:opacity-40"
          disabled={!canSave}
        >
          Save
        </button>

        {account && (
          <button
            type="button"
            className="mt-2 h-12 w-full text-[15px] font-medium text-negative"
            onClick={handleDelete}
          >
            Delete account
          </button>
        )}
      </form>
    </div>
  )
}
