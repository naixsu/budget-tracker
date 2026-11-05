import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction } from '../../db/db'

export interface TransactionDraft {
  accountUuid: string
  amount: number
  date: string
  note: string
}

export interface TransferDraft {
  fromUuid: string
  toUuid: string
  amount: number
  date: string
  note: string
}

export interface HistoryItem extends Transaction {
  balanceAfter: number
  counterpartUuid?: string
  counterpartName?: string
}

function newRecord() {
  const now = Date.now()
  return {
    uuid: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  }
}

export async function addTransaction(draft: TransactionDraft) {
  await db.transactions.add({ ...draft, ...newRecord() })
}

export async function updateTransaction(
  uuid: string,
  draft: Omit<TransactionDraft, 'accountUuid'>,
) {
  await db.transactions.update(uuid, { ...draft, updatedAt: Date.now() })
}

export async function addTransfer(draft: TransferDraft) {
  const { fromUuid, toUuid, amount, date, note } = draft
  const transferUuid = crypto.randomUUID()
  await db.transactions.bulkAdd([
    {
      ...newRecord(),
      transferUuid,
      accountUuid: fromUuid,
      amount: -amount,
      date,
      note,
    },
    { ...newRecord(), transferUuid, accountUuid: toUuid, amount, date, note },
  ])
}

export async function updateTransfer(
  transferUuid: string,
  draft: TransferDraft,
) {
  const { fromUuid, toUuid, amount, date, note } = draft
  await db.transaction('rw', db.transactions, async () => {
    const legs = await db.transactions
      .where('transferUuid')
      .equals(transferUuid)
      .toArray()
    const from = legs.find((leg) => leg.amount < 0)
    const to = legs.find((leg) => leg.amount > 0)
    if (!from || !to) throw new Error(`Transfer ${transferUuid} is incomplete`)

    const updatedAt = Date.now()
    await db.transactions.update(from.uuid, {
      accountUuid: fromUuid,
      amount: -amount,
      date,
      note,
      updatedAt,
    })
    await db.transactions.update(to.uuid, {
      accountUuid: toUuid,
      amount,
      date,
      note,
      updatedAt,
    })
  })
}

export async function deleteTransaction(transaction: Transaction) {
  const changes = { isDeleted: true, updatedAt: Date.now() }
  if (transaction.transferUuid) {
    await db.transactions
      .where('transferUuid')
      .equals(transaction.transferUuid)
      .modify(changes)
  } else {
    await db.transactions.update(transaction.uuid, changes)
  }
}

export function useAccountHistory(accountUuid: string) {
  return useLiveQuery(() => loadAccountHistory(accountUuid), [accountUuid])
}

export async function loadAccountHistory(accountUuid: string) {
  const account = await db.accounts.get(accountUuid)
  if (!account || account.isDeleted) return null

  const transactions = await db.transactions
    .where('accountUuid')
    .equals(accountUuid)
    .filter((t) => !t.isDeleted)
    .toArray()
  transactions.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt - b.createdAt ||
      a.uuid.localeCompare(b.uuid),
  )

  const transferUuids = transactions.flatMap((t) =>
    t.transferUuid ? [t.transferUuid] : [],
  )
  const [otherLegs, accounts] = await Promise.all([
    db.transactions
      .where('transferUuid')
      .anyOf(transferUuids)
      .filter((t) => t.accountUuid !== accountUuid)
      .toArray(),
    db.accounts.toArray(),
  ])
  const counterparts = new Map(
    otherLegs.map((leg) => [leg.transferUuid, leg.accountUuid]),
  )
  const names = new Map(
    accounts.map((a) => [a.uuid, a.isDeleted ? 'deleted account' : a.name]),
  )

  const items: HistoryItem[] = []
  for (const t of transactions) {
    const previous = items.at(-1)?.balanceAfter ?? account.openingBalance
    const counterpartUuid = t.transferUuid
      ? counterparts.get(t.transferUuid)
      : undefined
    items.push({
      ...t,
      balanceAfter: previous + t.amount,
      counterpartUuid,
      counterpartName: counterpartUuid ? names.get(counterpartUuid) : undefined,
    })
  }
  const balance = items.at(-1)?.balanceAfter ?? account.openingBalance

  const days: { date: string; items: HistoryItem[] }[] = []
  for (const item of items.reverse()) {
    const day = days.at(-1)
    if (day?.date === item.date) {
      day.items.push(item)
    } else {
      days.push({ date: item.date, items: [item] })
    }
  }

  return { account, balance, days }
}
