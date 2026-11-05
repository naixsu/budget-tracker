import { useId, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { AmountInput, Hint, Label, SubmitButton } from '../../components/form'
import { today } from '../../dates'
import { centavosToInput, formatPesos, parsePesos } from '../../money'
import { addTransaction } from './transactions'

interface Props {
  accountUuid: string
  balance: number
  onClose: () => void
}

export function AdjustBalanceSheet({ accountUuid, balance, onClose }: Props) {
  const inputId = useId()
  const [input, setInput] = useState(centavosToInput(balance))

  const actual = parsePesos(input)
  const difference = actual === null ? null : actual - balance

  async function handleSubmit() {
    if (!difference) return
    await addTransaction({
      accountUuid,
      amount: difference,
      date: today(),
      note: 'Balance adjustment',
    })
    onClose()
  }

  let hint = 'Enter an amount like 1,234.56'
  if (difference === 0) {
    hint = 'Matches the balance here. Nothing to adjust.'
  } else if (difference !== null) {
    hint = `Records ${difference > 0 ? '+' : ''}${formatPesos(difference)} today as a balance adjustment.`
  }

  return (
    <Sheet title="Adjust balance" onClose={onClose} onSubmit={handleSubmit}>
      <Label htmlFor={inputId}>Actual balance, from your bank app</Label>
      <AmountInput id={inputId} value={input} onChange={setInput} autoFocus />
      <Hint isError={difference === null}>{hint}</Hint>

      <SubmitButton disabled={!difference}>Adjust</SubmitButton>
    </Sheet>
  )
}
