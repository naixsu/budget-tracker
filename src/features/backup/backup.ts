import { db, type Account, type Transaction } from '../../db/db'
import { today } from '../../dates'

export interface Backup {
  app: 'budget-tracker'
  version: 1
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function hasSyncFields(r: UnknownRecord) {
  return (
    typeof r.uuid === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number' &&
    typeof r.isDeleted === 'boolean'
  )
}

function isAccount(value: unknown): value is Account {
  return (
    isRecord(value) &&
    hasSyncFields(value) &&
    typeof value.name === 'string' &&
    ['bank', 'ewallet', 'cash'].includes(value.type as string) &&
    Number.isInteger(value.openingBalance) &&
    typeof value.sortOrder === 'number'
  )
}

function isTransaction(value: unknown): value is Transaction {
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

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a backup from this app.")
  }

  if (
    !isRecord(data) ||
    data.app !== 'budget-tracker' ||
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.transactions)
  ) {
    throw new Error("That file isn't a backup from this app.")
  }
  if (data.version !== 1) {
    throw new Error('That backup is from a newer version of the app.')
  }
  if (
    !data.accounts.every(isAccount) ||
    !data.transactions.every(isTransaction)
  ) {
    throw new Error('That backup is damaged and was not restored.')
  }
  return data as unknown as Backup
}

export async function createBackup(): Promise<Backup> {
  const [accounts, transactions] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
  ])
  return {
    app: 'budget-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
  }
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

// Merges instead of replacing: whichever copy of a record was edited last
// wins, so restoring an old backup never undoes newer changes.
export async function restoreBackup(backup: Backup) {
  return db.transaction('rw', db.accounts, db.transactions, async () => {
    const accounts = await pickNewer(db.accounts, backup.accounts)
    const transactions = await pickNewer(db.transactions, backup.transactions)
    await db.accounts.bulkPut(accounts)
    await db.transactions.bulkPut(transactions)
    return { accounts: accounts.length, transactions: transactions.length }
  })
}

// Returns false if the person closed the share sheet without saving.
export async function exportBackup() {
  const backup = await createBackup()
  const file = new File(
    [JSON.stringify(backup, null, 2)],
    `budget-backup-${today()}.json`,
    { type: 'application/json' },
  )

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false
      }
      throw error
    }
  } else {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  await db.meta.put({ key: 'lastExportedAt', value: Date.now() })
  return true
}
