import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { addAccount, updateAccount } from '../accounts/accounts'
import { addTransaction } from '../transactions/transactions'
import { createBackup, parseBackup, restoreBackup } from './backup'

beforeEach(async () => {
  let now = Date.parse('2026-11-05T08:00:00+08:00')
  vi.spyOn(Date, 'now').mockImplementation(() => now++)
  await db.delete()
  await db.open()
})

async function seed() {
  await addAccount({ name: 'BPI', type: 'bank', openingBalance: 100000 })
  const bpi = (await db.accounts.toArray())[0]
  await addTransaction({
    accountUuid: bpi.uuid,
    amount: -2500,
    date: '2026-11-05',
    note: 'Lunch',
  })
  return bpi
}

describe('parseBackup', () => {
  it('round-trips an exported backup', async () => {
    await seed()
    const backup = await createBackup()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it.each([
    ['not json', "isn't a backup"],
    ['{"hello":1}', "isn't a backup"],
    [
      '{"app":"budget-tracker","version":2,"accounts":[],"transactions":[]}',
      'newer version',
    ],
    [
      '{"app":"budget-tracker","version":1,"accounts":[{"uuid":"x"}],"transactions":[]}',
      'damaged',
    ],
  ])('rejects %s', (text, message) => {
    expect(() => parseBackup(text)).toThrow(message)
  })

  it('rejects fractional amounts', async () => {
    await seed()
    const backup = await createBackup()
    backup.transactions[0].amount = 12.5
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('damaged')
  })
})

describe('restoreBackup', () => {
  it('restores everything onto an empty device', async () => {
    await seed()
    const backup = await createBackup()
    await db.delete()
    await db.open()

    expect(await restoreBackup(backup)).toEqual({
      accounts: 1,
      transactions: 1,
    })
    expect(await db.transactions.count()).toBe(1)
  })

  it('keeps edits made after the backup', async () => {
    const bpi = await seed()
    const backup = await createBackup()
    await updateAccount(bpi.uuid, {
      name: 'BPI Savings',
      type: 'bank',
      openingBalance: 100000,
    })

    expect(await restoreBackup(backup)).toEqual({
      accounts: 0,
      transactions: 0,
    })
    expect((await db.accounts.get(bpi.uuid))?.name).toBe('BPI Savings')
  })
})
