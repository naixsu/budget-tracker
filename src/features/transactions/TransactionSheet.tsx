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
import { today } from '../../dates'
import { centavosToInput, parsePesos } from '../../money'
import { useAccountsWithBalances } from '../accounts/accounts'
import {
  addTransaction,
  addTransfer,
  deleteTransaction,
  updateTransaction,
  updateTransfer,
  type HistoryItem,
} from './transactions'

type Kind = 'out' | 'in' | 'transfer'

const kindOptions: { value: Kind; label: string }[] = [
  { value: 'out', label: 'Money out' },
  { value: 'in', label: 'Money in' },
  { value: 'transfer', label: 'Transfer' },
]

interface Props {
  accountUuid: string
  transaction?: HistoryItem
  onClose: () => void
}

function initialKind(transaction?: HistoryItem): Kind {
  if (!transaction) return 'out'
  if (transaction.transferUuid) return 'transfer'
  return transaction.amount < 0 ? 'out' : 'in'
}

export function TransactionSheet({ accountUuid, transaction, onClose }: Props) {
  const amountId = useId()
  const dateId = useId()
  const noteId = useId()
  const accounts = useAccountsWithBalances()

  const [kind, setKind] = useState<Kind>(initialKind(transaction))
  const [amountInput, setAmountInput] = useState(
    transaction ? centavosToInput(Math.abs(transaction.amount)) : '',
  )
  const [counterpartUuid, setCounterpartUuid] = useState(
    transaction?.counterpartUuid ?? '',
  )
  const [date, setDate] = useState(transaction?.date ?? today())
  const [note, setNote] = useState(transaction?.note ?? '')

  // Viewing the receiving side of a transfer: this account is "to", not "from".
  const isIncomingTransfer =
    !!transaction?.transferUuid && transaction.amount > 0
  const isTransfer = kind === 'transfer'
  const otherAccounts = (accounts ?? []).filter((a) => a.uuid !== accountUuid)

  const parsed = parsePesos(amountInput)
  const amount = parsed !== null && parsed > 0 ? parsed : null
  const canSave =
    amount !== null && date !== '' && (!isTransfer || counterpartUuid !== '')

  async function handleSubmit() {
    if (amount === null || !canSave) return

    if (isTransfer) {
      const draft = {
        fromUuid: isIncomingTransfer ? counterpartUuid : accountUuid,
        toUuid: isIncomingTransfer ? accountUuid : counterpartUuid,
        amount,
        date,
        note: note.trim(),
      }
      if (transaction?.transferUuid) {
        await updateTransfer(transaction.transferUuid, draft)
      } else {
        await addTransfer(draft)
      }
    } else {
      const draft = {
        amount: kind === 'out' ? -amount : amount,
        date,
        note: note.trim(),
      }
      if (transaction) {
        await updateTransaction(transaction.uuid, draft)
      } else {
        await addTransaction({ ...draft, accountUuid })
      }
    }
    onClose()
  }

  async function handleDelete() {
    if (!transaction) return
    const message = transaction.transferUuid
      ? 'Delete this transfer from both accounts?'
      : 'Delete this transaction?'
    if (!confirm(message)) return
    await deleteTransaction(transaction)
    onClose()
  }

  // A saved transfer can't become money in/out (or the reverse) because
  // that would mean adding or removing its other half.
  const visibleKinds = transaction
    ? kindOptions.filter((k) => (k.value === 'transfer') === isTransfer)
    : kindOptions

  return (
    <Sheet
      title={transaction ? 'Edit transaction' : 'New transaction'}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      {visibleKinds.length > 1 && (
        <div className="mt-4">
          <Pills options={visibleKinds} value={kind} onChange={setKind} />
        </div>
      )}

      <Label htmlFor={amountId}>Amount</Label>
      <AmountInput
        id={amountId}
        value={amountInput}
        onChange={setAmountInput}
        autoFocus={!transaction}
      />
      {amountInput.trim() !== '' && amount === null && (
        <Hint isError>Enter an amount above zero, like 1,234.56</Hint>
      )}

      {isTransfer && (
        <>
          <Label>{isIncomingTransfer ? 'From' : 'To'}</Label>
          {otherAccounts.length === 0 ? (
            <Hint>Add another account first.</Hint>
          ) : (
            <Pills
              options={otherAccounts.map((a) => ({
                value: a.uuid,
                label: a.name,
              }))}
              value={counterpartUuid}
              onChange={setCounterpartUuid}
            />
          )}
        </>
      )}

      <Label htmlFor={dateId}>Date</Label>
      <input
        id={dateId}
        type="date"
        className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium outline-none"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <Label htmlFor={noteId}>Note</Label>
      <input
        id={noteId}
        className="w-full border-b-2 border-line bg-transparent py-2 text-[17px] font-medium outline-none placeholder:text-faint focus:border-ink"
        placeholder={isTransfer ? 'Optional' : 'Groceries, salary, load…'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <SubmitButton disabled={!canSave}>Save</SubmitButton>
      {transaction && (
        <DeleteButton onClick={handleDelete}>Delete transaction</DeleteButton>
      )}
    </Sheet>
  )
}
