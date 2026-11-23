import { useLiveQuery } from 'dexie-react-hooks'
import { today } from '../../dates'
import { db, type Account, type AccountType } from '../../db/db'
import { newRecord } from '../../db/records'
import { addTransfer } from '../transactions/transactions'

export const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Bank',
  ewallet: 'E-wallet',
  cash: 'Cash',
}

export type AccountDraft = Pick<Account, 'name' | 'type' | 'openingBalance'>

export interface AccountWithBalance extends Account {
  balance: number
  totalBalance: number
  parentName?: string
}

export async function addAccount(draft: AccountDraft) {
  await db.accounts.add({
    ...draft,
    ...newRecord(),
    sortOrder: await db.accounts.count(),
  })
}

// The amount is moved with a transfer instead of an opening balance so the
// parent's total stays the same and both histories show it.
export async function addLinkedCategory(draft: {
  name: string
  parentUuid: string
  amount: number
}) {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const parent = await db.accounts.get(draft.parentUuid)
    if (!parent || parent.isDeleted || parent.parentUuid) {
      throw new Error('Categories can only link to a top-level account.')
    }

    const category = {
      ...newRecord(),
      name: draft.name,
      type: parent.type,
      openingBalance: 0,
      parentUuid: parent.uuid,
      sortOrder: await db.accounts.count(),
    }
    await db.accounts.add(category)
    if (draft.amount > 0) {
      await addTransfer({
        fromUuid: parent.uuid,
        toUuid: category.uuid,
        amount: draft.amount,
        date: today(),
        note: '',
      })
    }
  })
}

export async function updateAccount(uuid: string, draft: AccountDraft) {
  await db.transaction('rw', db.accounts, async () => {
    const updatedAt = Date.now()
    await db.accounts.update(uuid, { ...draft, updatedAt })
    await db.accounts
      .filter((a) => a.parentUuid === uuid && a.type !== draft.type)
      .modify({ type: draft.type, updatedAt })
  })
}

export async function deleteAccount(uuid: string) {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const account = await db.accounts.get(uuid)
    if (!account) return

    const categoryCount = await db.accounts
      .filter((a) => a.parentUuid === uuid && !a.isDeleted)
      .count()
    if (categoryCount > 0) {
      throw new Error('Delete its linked categories first.')
    }

    // Only this category's legs get deleted below, so whatever it still
    // holds has to go back to the parent first or it would vanish.
    if (account.parentUuid) {
      let balance = account.openingBalance
      await db.transactions
        .where('accountUuid')
        .equals(uuid)
        .each((t) => {
          if (!t.isDeleted) balance += t.amount
        })
      if (balance !== 0) {
        await addTransfer({
          fromUuid: uuid,
          toUuid: account.parentUuid,
          amount: balance,
          date: today(),
          note: '',
        })
      }
    }

    const now = Date.now()
    await db.accounts.update(uuid, { isDeleted: true, updatedAt: now })
    await db.transactions
      .where('accountUuid')
      .equals(uuid)
      .modify({ isDeleted: true, updatedAt: now })
  })
}

export async function loadAccountsWithBalances() {
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
  const balanceOf = (a: Account) => a.openingBalance + (sums.get(a.uuid) ?? 0)

  // A category whose parent was deleted on another device shows up on its own.
  const uuids = new Set(accounts.map((a) => a.uuid))
  const isLinked = (a: Account) => !!a.parentUuid && uuids.has(a.parentUuid)

  const result: AccountWithBalance[] = []
  for (const parent of accounts.filter((a) => !isLinked(a))) {
    const categories = accounts
      .filter((a) => isLinked(a) && a.parentUuid === parent.uuid)
      .map((a) => ({
        ...a,
        balance: balanceOf(a),
        totalBalance: balanceOf(a),
        parentName: parent.name,
      }))
    const balance = balanceOf(parent)
    const totalBalance = categories.reduce((sum, c) => sum + c.balance, balance)
    result.push({ ...parent, balance, totalBalance }, ...categories)
  }
  return result
}

export function useAccountsWithBalances() {
  return useLiveQuery(loadAccountsWithBalances)
}
