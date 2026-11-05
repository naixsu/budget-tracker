import { db, type Account, type Transaction } from './db'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasSyncFields(r: Record<string, unknown>) {
  return (
    typeof r.uuid === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number' &&
    typeof r.isDeleted === 'boolean'
  )
}

export function isAccount(value: unknown): value is Account {
  return (
    isRecord(value) &&
    hasSyncFields(value) &&
    typeof value.name === 'string' &&
    ['bank', 'ewallet', 'cash'].includes(value.type as string) &&
    Number.isInteger(value.openingBalance) &&
    typeof value.sortOrder === 'number'
  )
}

export function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    hasSyncFields(value) &&
    typeof value.accountUuid === 'string' &&
    Number.isInteger(value.amount) &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.note === 'string' &&
    (value.transferUuid === undefined || typeof value.transferUuid === 'string')
  )
}

async function pickNewer<T extends { uuid: string; updatedAt: number }>(
  table: { bulkGet(keys: string[]): Promise<(T | undefined)[]> },
  incoming: T[],
) {
  const existing = await table.bulkGet(incoming.map((r) => r.uuid))
  return incoming.filter((record, i) => {
    const current = existing[i]
    return !current || record.updatedAt > current.updatedAt
  })
}

// Whichever copy of a record was edited last wins. Used by both restore
// and sync, so an older copy never undoes a newer change.
export async function mergeRecords(
  accounts: Account[],
  transactions: Transaction[],
) {
  return db.transaction('rw', db.accounts, db.transactions, async () => {
    const newerAccounts = await pickNewer(db.accounts, accounts)
    const newerTransactions = await pickNewer(db.transactions, transactions)
    await db.accounts.bulkPut(newerAccounts)
    await db.transactions.bulkPut(newerTransactions)
    return {
      accounts: newerAccounts.length,
      transactions: newerTransactions.length,
    }
  })
}
