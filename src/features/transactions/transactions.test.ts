import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { addAccount, deleteAccount } from '../accounts/accounts'
import {
  addTransaction,
  addTransfer,
  deleteTransaction,
  loadAccountHistory,
  updateTransfer,
} from './transactions'

async function createAccount(name: string, openingBalance: number) {
  await addAccount({ name, type: 'bank', openingBalance })
  const account = await db.accounts
    .where('sortOrder')
    .equals((await db.accounts.count()) - 1)
    .first()
  return account!.uuid
}

async function history(uuid: string) {
  const result = await loadAccountHistory(uuid)
  if (!result) throw new Error('account missing')
  return result
}

beforeEach(async () => {
  // Real saves are never in the same millisecond; tests run fast enough to be.
  let now = Date.parse('2026-11-05T08:00:00+08:00')
  vi.spyOn(Date, 'now').mockImplementation(() => now++)
  await db.delete()
  await db.open()
})

describe('account history', () => {
  it('computes running balances, newest first, grouped by day', async () => {
    const bpi = await createAccount('BPI', 10000)
    await addTransaction({
      accountUuid: bpi,
      amount: -2500,
      date: '2026-11-01',
      note: 'Groceries',
    })
    await addTransaction({
      accountUuid: bpi,
      amount: 50000,
      date: '2026-11-03',
      note: 'Salary',
    })
    await addTransaction({
      accountUuid: bpi,
      amount: -1000,
      date: '2026-11-03',
      note: 'Load',
    })

    const { balance, days } = await history(bpi)

    expect(balance).toBe(56500)
    expect(days.map((d) => d.date)).toEqual(['2026-11-03', '2026-11-01'])
    expect(days[0].items.map((i) => [i.note, i.balanceAfter])).toEqual([
      ['Load', 56500],
      ['Salary', 57500],
    ])
    expect(days[1].items[0].balanceAfter).toBe(7500)
  })

  it('returns null for a deleted account', async () => {
    const bpi = await createAccount('BPI', 0)
    await deleteAccount(bpi)
    expect(await loadAccountHistory(bpi)).toBeNull()
  })
})

describe('transfers', () => {
  it('moves money between accounts and names the other side', async () => {
    const bpi = await createAccount('BPI', 100000)
    const gcash = await createAccount('GCash', 0)
    await addTransfer({
      fromUuid: bpi,
      toUuid: gcash,
      amount: 20000,
      date: '2026-11-05',
      note: '',
    })

    const from = await history(bpi)
    const to = await history(gcash)
    expect(from.balance).toBe(80000)
    expect(to.balance).toBe(20000)
    expect(from.days[0].items[0]).toMatchObject({
      amount: -20000,
      counterpartUuid: gcash,
      counterpartName: 'GCash',
    })
    expect(to.days[0].items[0]).toMatchObject({
      amount: 20000,
      counterpartUuid: bpi,
      counterpartName: 'BPI',
    })
  })

  it('updates both legs, including the destination account', async () => {
    const bpi = await createAccount('BPI', 100000)
    const gcash = await createAccount('GCash', 0)
    const rcbc = await createAccount('RCBC', 0)
    await addTransfer({
      fromUuid: bpi,
      toUuid: gcash,
      amount: 20000,
      date: '2026-11-05',
      note: '',
    })
    const { transferUuid } = (await history(bpi)).days[0].items[0]

    await updateTransfer(transferUuid!, {
      fromUuid: bpi,
      toUuid: rcbc,
      amount: 5000,
      date: '2026-11-06',
      note: 'oops',
    })

    expect((await history(bpi)).balance).toBe(95000)
    expect((await history(gcash)).balance).toBe(0)
    expect((await history(rcbc)).balance).toBe(5000)
  })

  it('deletes both legs together', async () => {
    const bpi = await createAccount('BPI', 100000)
    const gcash = await createAccount('GCash', 0)
    await addTransfer({
      fromUuid: bpi,
      toUuid: gcash,
      amount: 20000,
      date: '2026-11-05',
      note: '',
    })

    const leg = (await history(gcash)).days[0].items[0]
    await deleteTransaction(leg)

    expect((await history(bpi)).balance).toBe(100000)
    expect((await history(gcash)).balance).toBe(0)
    expect(await db.transactions.filter((t) => !t.isDeleted).count()).toBe(0)
  })

  it('labels the other side once that account is deleted', async () => {
    const bpi = await createAccount('BPI', 100000)
    const gcash = await createAccount('GCash', 0)
    await addTransfer({
      fromUuid: bpi,
      toUuid: gcash,
      amount: 20000,
      date: '2026-11-05',
      note: '',
    })
    await deleteAccount(gcash)

    expect((await history(bpi)).days[0].items[0].counterpartName).toBe(
      'deleted account',
    )
  })
})
