import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Account, type AccountType } from '../../db/db'

export const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Bank',
  ewallet: 'E-wallet',
  cash: 'Cash',
}

export type AccountDraft = Pick<Account, 'name' | 'type' | 'openingBalance'>

export async function addAccount(draft: AccountDraft) {
  const now = Date.now()
  await db.accounts.add({
    ...draft,
    uuid: crypto.randomUUID(),
    sortOrder: await db.accounts.count(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  })
}

export async function updateAccount(uuid: string, draft: AccountDraft) {
  await db.accounts.update(uuid, { ...draft, updatedAt: Date.now() })
}

export async function deleteAccount(uuid: string) {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const now = Date.now()
    await db.accounts.update(uuid, { isDeleted: true, updatedAt: now })
    await db.transactions
      .where('accountUuid')
      .equals(uuid)
      .modify({ isDeleted: true, updatedAt: now })
  })
}

export function useAccountsWithBalances() {
  return useLiveQuery(async () => {
    const [accounts, transactions] = await Promise.all([
      db.accounts
        .orderBy('sortOrder')
        .filter((a) => !a.isDeleted)
        .toArray(),
      db.transactions.filter((t) => !t.isDeleted).toArray(),
    ])

    const sums = new Map<string, number>()
    for (const t of transactions) {
      sums.set(t.accountUuid, (sums.get(t.accountUuid) ?? 0) + t.amount)
    }

    return accounts.map((account) => ({
      ...account,
      balance: account.openingBalance + (sums.get(account.uuid) ?? 0),
    }))
  })
}
