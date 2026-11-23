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
import { centavosToInput, formatPesos, parsePesos } from '../../money'
import {
  accountTypeLabels,
  addAccount,
  addLinkedCategory,
  deleteAccount,
  updateAccount,
  useAccountsWithBalances,
} from './accounts'

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

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
  const [parentUuid, setParentUuid] = useState(account?.parentUuid ?? '')
  const [balanceInput, setBalanceInput] = useState(
    account ? centavosToInput(account.openingBalance) : '',
  )

  const accounts = useAccountsWithBalances()

  const parent = accounts?.find((a) => a.uuid === parentUuid)
  const isLinked = parentUuid !== ''
  const parentOptions = (accounts ?? []).filter((a) => !a.parentUuid)

  const trimmedName = name.trim().replace(/\s+/g, ' ')
  const isDuplicate = (accounts ?? []).some(
    (a) =>
      a.uuid !== account?.uuid &&
      normalizeName(a.name) === normalizeName(trimmedName),
  )
  const amount = balanceInput.trim() === '' ? 0 : parsePesos(balanceInput)
  const canSave =
    trimmedName !== '' &&
    !isDuplicate &&
    accounts !== undefined &&
    amount !== null &&
    (!isLinked || amount >= 0)

  async function handleSubmit() {
    if (!canSave || amount === null) return

    if (account) {
      await updateAccount(account.uuid, {
        name: trimmedName,
        type,
        openingBalance: amount,
      })
    } else if (isLinked) {
      await addLinkedCategory({ name: trimmedName, parentUuid, amount })
    } else {
      await addAccount({ name: trimmedName, type, openingBalance: amount })
    }
    onClose()
  }

  async function handleDelete() {
    if (!account) return
    if (accounts?.some((a) => a.parentUuid === account.uuid)) {
      alert('Delete its linked categories first.')
      return
    }
    const balance = accounts?.find((a) => a.uuid === account.uuid)?.balance
    let message = `Delete ${account.name}? Its transactions will be deleted too.`
    if (parent && balance) {
      message += ` ${formatPesos(balance)} goes back to ${parent.name}.`
    }
    if (!confirm(message)) return
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
        className="w-full border-b-2 border-line bg-transparent py-2 text-[24px] font-extrabold outline-none focus:border-ink"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus={!account}
      />
      {isDuplicate && (
        <Hint isError>You already have an account named {trimmedName}.</Hint>
      )}

      {account && parent && (
        <>
          <Label>Linked to</Label>
          <p className="text-[17px] font-medium">{parent.name}</p>
        </>
      )}
      {!account && parentOptions.length > 0 && (
        <>
          <Label>Linked to</Label>
          <Pills
            options={[
              { value: '', label: 'None' },
              ...parentOptions.map((a) => ({ value: a.uuid, label: a.name })),
            ]}
            value={parentUuid}
            onChange={setParentUuid}
          />
        </>
      )}

      {!isLinked && (
        <>
          <Label>Type</Label>
          <Pills options={typeOptions} value={type} onChange={setType} />
        </>
      )}

      {!(account && isLinked) && (
        <>
          <Label htmlFor={balanceId}>
            {isLinked
              ? `Amount to move from ${parent?.name}`
              : 'Starting balance'}
          </Label>
          <AmountInput
            id={balanceId}
            value={balanceInput}
            onChange={setBalanceInput}
            allowNegative={!isLinked}
          />
          {account && (
            <Hint>
              What the account had before the first transaction logged here.
            </Hint>
          )}
          {isLinked && parent && amount !== null && amount > parent.balance && (
            <Hint>
              That's more than the {formatPesos(parent.balance)} unassigned in{' '}
              {parent.name}.
            </Hint>
          )}
        </>
      )}

      <SubmitButton disabled={!canSave}>Save</SubmitButton>
      {account && (
        <DeleteButton onClick={handleDelete}>Delete account</DeleteButton>
      )}
    </Sheet>
  )
}
