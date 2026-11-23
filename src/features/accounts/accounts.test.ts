import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { addTransaction } from '../transactions/transactions'
import {
  addAccount,
  addLinkedCategory,
  deleteAccount,
  loadAccountsWithBalances,
  updateAccount,
} from './accounts'

beforeEach(async () => {
  let now = Date.parse('2026-11-05T08:00:00+08:00')
  vi.spyOn(Date, 'now').mockImplementation(() => now++)
  await db.delete()
  await db.open()
})

async function byName(name: string) {
  const account = (await loadAccountsWithBalances()).find(
    (a) => a.name === name,
  )
  if (!account) throw new Error(`${name} missing`)
  return account
}

async function seed() {
  await addAccount({ name: 'RCBC', type: 'bank', openingBalance: 5000000 })
  const rcbc = await byName('RCBC')
  await addLinkedCategory({
    name: 'Emergency',
    parentUuid: rcbc.uuid,
    amount: 1000000,
  })
  return { rcbc, emergency: await byName('Emergency') }
}

describe('linked categories', () => {
  it('moves the starting amount from the parent with both transfer legs', async () => {
    const { rcbc, emergency } = await seed()

    expect(emergency).toMatchObject({
      type: 'bank',
      openingBalance: 0,
      parentUuid: rcbc.uuid,
      parentName: 'RCBC',
      balance: 1000000,
    })
    const legs = await db.transactions.toArray()
    expect(legs).toHaveLength(2)
    expect(legs[0].transferUuid).toBe(legs[1].transferUuid)
    expect(legs.map((t) => [t.accountUuid, t.amount])).toEqual(
      expect.arrayContaining([
        [rcbc.uuid, -1000000],
        [emergency.uuid, 1000000],
      ]),
    )
  })

  it('gives the parent a total that includes its categories', async () => {
    await seed()
    const rcbc = await byName('RCBC')
    expect(rcbc.balance).toBe(4000000)
    expect(rcbc.totalBalance).toBe(5000000)
  })

  it('lists each parent followed by its categories', async () => {
    const { rcbc } = await seed()
    await addAccount({ name: 'GCash', type: 'ewallet', openingBalance: 0 })
    await addLinkedCategory({
      name: 'Travel',
      parentUuid: rcbc.uuid,
      amount: 0,
    })

    const names = (await loadAccountsWithBalances()).map((a) => a.name)
    expect(names).toEqual(['RCBC', 'Emergency', 'Travel', 'GCash'])
  })

  it('does not double count in the grand total', async () => {
    const { emergency } = await seed()
    await addTransaction({
      accountUuid: emergency.uuid,
      amount: -50000,
      date: '2026-11-05',
      note: 'Meds',
    })

    const accounts = await loadAccountsWithBalances()
    expect(accounts.reduce((s, a) => s + a.balance, 0)).toBe(4950000)
  })

  it('refuses to link to another linked category', async () => {
    const { emergency } = await seed()
    await expect(
      addLinkedCategory({
        name: 'Nested',
        parentUuid: emergency.uuid,
        amount: 0,
      }),
    ).rejects.toThrow('top-level')
  })

  it('returns what is left to the parent when deleted', async () => {
    const { emergency } = await seed()
    await addTransaction({
      accountUuid: emergency.uuid,
      amount: -50000,
      date: '2026-11-05',
      note: 'Meds',
    })

    await deleteAccount(emergency.uuid)

    const accounts = await loadAccountsWithBalances()
    expect(accounts).toMatchObject([
      { name: 'RCBC', balance: 4950000, totalBalance: 4950000 },
    ])
  })

  it('blocks deleting a parent that still has categories', async () => {
    const { rcbc } = await seed()
    await expect(deleteAccount(rcbc.uuid)).rejects.toThrow(
      'Delete its linked categories first.',
    )
    expect(await loadAccountsWithBalances()).toHaveLength(2)
  })

  it('keeps categories on the parent type when it changes', async () => {
    const { rcbc } = await seed()
    await updateAccount(rcbc.uuid, {
      name: 'RCBC',
      type: 'ewallet',
      openingBalance: 5000000,
    })
    expect((await byName('Emergency')).type).toBe('ewallet')
  })
})
