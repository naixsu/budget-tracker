import { useId, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import {
  AmountInput,
  DeleteButton,
  Hint,
  Label,
  Pills,
  SubmitButton,
} from '../../components/form'
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

const typeOptions = Object.entries(accountTypeLabels).map(([value, label]) => ({
  value: value as AccountType,
  label,
}))

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

  async function handleSubmit() {
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
    <Sheet
      title={account ? 'Edit account' : 'New account'}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Label htmlFor={nameId}>Name</Label>
      <input
        id={nameId}
        className="w-full border-b-2 border-line bg-transparent py-2 text-[24px] font-extrabold outline-none placeholder:font-medium placeholder:text-faint focus:border-ink"
        placeholder="BPI Savings"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus={!account}
      />

      <Label>Type</Label>
      <Pills options={typeOptions} value={type} onChange={setType} />

      <Label htmlFor={balanceId}>Starting balance</Label>
      <AmountInput
        id={balanceId}
        value={balanceInput}
        onChange={setBalanceInput}
      />
      {openingBalance === null ? (
        <Hint isError>Enter an amount like 1,234.56</Hint>
      ) : (
        account && (
          <Hint>
            What the account had before the first transaction logged here.
          </Hint>
        )
      )}

      <SubmitButton disabled={!canSave}>Save</SubmitButton>
      {account && (
        <DeleteButton onClick={handleDelete}>Delete account</DeleteButton>
      )}
    </Sheet>
  )
}
