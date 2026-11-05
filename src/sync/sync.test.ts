import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { addAccount, updateAccount } from '../features/accounts/accounts'
import { addTransfer } from '../features/transactions/transactions'
import code from '../../apps-script/Code.gs?raw'
import { connectSync, disconnectSync, sync } from './sync'

interface StoredRow {
  record: Record<string, unknown>
  serverSeq: number
}
interface Table {
  fields: string[]
}

// Runs the real merge logic from the Apps Script, outside Google.
const { mergeTable_, TABLES } = new Function(
  `${code}; return { mergeTable_, TABLES }`,
)() as {
  TABLES: Record<'accounts' | 'transactions', Table>
  mergeTable_: (
    table: Table,
    rows: StoredRow[],
    incoming: unknown[],
    cursor: number,
    seq: number,
  ) => {
    rows: StoredRow[]
    updates: Record<string, unknown>[]
    seq: number
  }
}

// Same request handling as doPost, with the sheet kept in memory.
function createServer(token = 'secret') {
  const sheet: Record<'accounts' | 'transactions', StoredRow[]> = {
    accounts: [],
    transactions: [],
  }
  let seq = 0
  const requests: { accounts: unknown[]; transactions: unknown[] }[] = []

  const handler = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string)
    requests.push(body)
    if (body.token !== token) {
      return new Response(JSON.stringify({ ok: false, error: 'wrong-token' }))
    }
    const cursor = body.cursor <= seq ? body.cursor : 0
    const response: Record<string, unknown> = { ok: true }
    for (const name of ['accounts', 'transactions'] as const) {
      const result = mergeTable_(
        TABLES[name],
        sheet[name],
        body[name],
        cursor,
        seq,
      )
      sheet[name] = result.rows
      seq = result.seq
      response[name] = result.updates
    }
    response.cursor = seq
    return new Response(JSON.stringify(response))
  }

  return { sheet, requests, handler }
}

let server: ReturnType<typeof createServer>

beforeEach(async () => {
  let now = Date.parse('2026-11-05T08:00:00+08:00')
  vi.spyOn(Date, 'now').mockImplementation(() => now++)
  server = createServer()
  vi.stubGlobal('fetch', vi.fn(server.handler))
  await db.delete()
  await db.open()
  await connectSync({
    url: 'https://script.google.com/macros/s/abc/exec',
    token: 'secret',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function meta(key: string) {
  return (await db.meta.get(key))?.value
}

describe('sync', () => {
  it('pushes local records to the sheet', async () => {
    await addAccount({ name: 'BPI', type: 'bank', openingBalance: 100000 })
    await addAccount({ name: 'GCash', type: 'ewallet', openingBalance: 0 })
    const [bpi, gcash] = await db.accounts.orderBy('sortOrder').toArray()
    await addTransfer({
      fromUuid: bpi.uuid,
      toUuid: gcash.uuid,
      amount: 5000,
      date: '2026-11-05',
      note: '',
    })

    await sync()

    expect(await meta('syncError')).toBeUndefined()
    expect(server.sheet.accounts).toHaveLength(2)
    expect(server.sheet.transactions).toHaveLength(2)
    expect(await meta('lastSyncedAt')).toEqual(expect.any(Number))
  })

  it('only sends what changed since the last sync', async () => {
    await addAccount({ name: 'BPI', type: 'bank', openingBalance: 0 })
    await addAccount({ name: 'RCBC', type: 'bank', openingBalance: 0 })
    await sync()

    const bpi = (await db.accounts.orderBy('sortOrder').first())!
    await updateAccount(bpi.uuid, {
      name: 'BPI Savings',
      type: 'bank',
      openingBalance: 0,
    })
    await sync()

    const last = server.requests.at(-1)!
    expect(last.accounts).toHaveLength(1)
    expect(server.sheet.accounts.map((r) => r.record.name)).toContain(
      'BPI Savings',
    )
  })

  it('pulls records another device added', async () => {
    await sync()
    const other = {
      uuid: 'from-ipad',
      name: 'Wallet',
      type: 'cash',
      openingBalance: 2000,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 2,
      isDeleted: false,
    }
    // Another device's request, straight to the server.
    await server.handler('', {
      body: JSON.stringify({
        token: 'secret',
        cursor: 0,
        accounts: [other],
        transactions: [],
      }),
    })

    await sync()

    expect(await db.accounts.get('from-ipad')).toEqual(other)
  })

  it('restores everything onto a fresh device', async () => {
    await addAccount({ name: 'BPI', type: 'bank', openingBalance: 123456 })
    await sync()

    await db.delete()
    await db.open()
    await connectSync({
      url: 'https://script.google.com/macros/s/abc/exec',
      token: 'secret',
    })
    await sync()

    const accounts = await db.accounts.toArray()
    expect(accounts).toMatchObject([{ name: 'BPI', openingBalance: 123456 }])
    expect(accounts[0].isDeleted).toBe(false)
    expect(accounts[0]).not.toHaveProperty('serverSeq')
  })

  it('keeps transfers without a note intact through the sheet', async () => {
    await addAccount({ name: 'BPI', type: 'bank', openingBalance: 0 })
    const bpi = (await db.accounts.toArray())[0]
    const { addTransaction } =
      await import('../features/transactions/transactions')
    await addTransaction({
      accountUuid: bpi.uuid,
      amount: -1,
      date: '2026-11-05',
      note: '',
    })
    await sync()
    const stored = (await db.transactions.toArray())[0]

    await db.transactions.clear()
    await db.meta.delete('serverCursor')
    await sync()

    expect((await db.transactions.toArray())[0]).toEqual(stored)
  })

  it('reports a wrong token', async () => {
    await connectSync({
      url: 'https://script.google.com/macros/s/abc/exec',
      token: 'nope',
    })
    await sync()
    expect(await meta('syncError')).toMatch(/token/)
  })

  it('reports a sign-in page instead of JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Sign in</html>')),
    )
    await sync()
    expect(await meta('syncError')).toMatch(/deployed for Anyone/)
  })

  it('does nothing when not connected', async () => {
    await disconnectSync()
    await sync()
    expect(fetch).not.toHaveBeenCalled()
  })
})
