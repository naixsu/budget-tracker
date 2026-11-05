import { db, type Account, type Transaction } from '../../db/db'
import {
  isAccount,
  isRecord,
  isTransaction,
  mergeRecords,
} from '../../db/records'
import { today } from '../../dates'

export interface Backup {
  app: 'budget-tracker'
  version: 1
  exportedAt: string
  accounts: Account[]
  transactions: Transaction[]
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

export function restoreBackup(backup: Backup) {
  return mergeRecords(backup.accounts, backup.transactions)
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
