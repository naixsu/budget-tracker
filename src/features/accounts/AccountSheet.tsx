import { useState, type FormEvent } from 'react'
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
        className="mx-auto max-h-[92dvh] w-full max-w-xl animate-sheet-up overflow-y-auto rounded-t-[10px] bg-grouped px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <header className="flex h-14 items-center justify-between text-[17px]">
          <button type="button" className="text-tint" onClick={onClose}>
            Cancel
          </button>
          <h2 className="font-semibold">
            {account ? 'Edit Account' : 'New Account'}
          </h2>
          <button
            type="submit"
            className="font-semibold text-tint disabled:opacity-30"
            disabled={!canSave}
          >
            Save
          </button>
        </header>

        <div className="overflow-hidden rounded-[10px] bg-cell">
          <input
            className="w-full bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-label-secondary"
            placeholder="Name, e.g. BPI Savings"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!account}
          />
        </div>

        <div className="mt-6 flex rounded-lg bg-fill p-0.5">
          {accountTypes.map((t) => (
            <button
              key={t}
              type="button"
              className={`flex-1 rounded-[7px] py-1.5 text-[13px] font-medium ${t === type ? 'bg-segment-selected shadow-sm' : ''}`}
              onClick={() => setType(t)}
            >
              {accountTypeLabels[t]}
            </button>
          ))}
        </div>

        <p className="mt-6 px-4 pb-1.5 text-[13px] text-label-secondary uppercase">
          Starting balance
        </p>
        <div className="flex items-center overflow-hidden rounded-[10px] bg-cell px-4">
          <span className="text-[17px] text-label-secondary">₱</span>
          <input
            className="w-full bg-transparent py-3 pl-1 text-[17px] tabular-nums outline-none placeholder:text-label-secondary"
            placeholder="0.00"
            inputMode="decimal"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
        </div>
        <p className="px-4 pt-1.5 text-[13px] text-label-secondary">
          {openingBalance === null
            ? 'Enter an amount like 1,234.56'
            : 'What the account has right now. Later changes go in as transactions.'}
        </p>

        {account && (
          <button
            type="button"
            className="mt-8 w-full rounded-[10px] bg-cell py-3 text-[17px] text-negative"
            onClick={handleDelete}
          >
            Delete Account
          </button>
        )}
      </form>
    </div>
  )
}
